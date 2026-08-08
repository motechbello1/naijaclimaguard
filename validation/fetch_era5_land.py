#!/usr/bin/env python3
"""Fetch ERA5-Land surface-state variables via Open-Meteo Historical Weather API.

ERA5-Land is used for antecedent soil moisture and evapotranspiration context.
It is not labelled as NASA data.

Requests are split into six-month chunks and retried with backoff so a transient
Open-Meteo TLS/read timeout cannot invalidate the entire multi-year benchmark.

ET0 is requested hourly and summed to daily totals. This avoids silently
accepting all-null daily ET0 responses from model-specific archive requests.
"""
from __future__ import annotations

import argparse
import time
from pathlib import Path

import pandas as pd
import requests

LOCATIONS = {
    "Lokoja": (7.8023, 6.7333),
    "Makurdi": (7.7322, 8.5391),
    "Onitsha": (6.1407, 6.7869),
    "Yenagoa": (4.9247, 6.2642),
    "Hadejia": (12.4494, 10.0447),
}

BASE = "https://archive-api.open-meteo.com/v1/archive"
SOIL_HOURLY = [
    "soil_moisture_0_to_7cm",
    "soil_moisture_7_to_28cm",
    "soil_moisture_28_to_100cm",
]
ET0 = "et0_fao_evapotranspiration"
HOURLY = SOIL_HOURLY + [ET0]
DAILY = [
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_hours",
]


def period_ranges(start: str, end: str, months: int = 6):
    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)
    cur = start_ts
    while cur <= end_ts:
        nxt = cur + pd.DateOffset(months=months)
        stop = min(end_ts, nxt - pd.Timedelta(days=1))
        yield cur.strftime("%Y-%m-%d"), stop.strftime("%Y-%m-%d")
        cur = stop + pd.Timedelta(days=1)


def request_json(session: requests.Session, params: dict, label: str, attempts: int = 5) -> dict:
    last_exc: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            r = session.get(BASE, params=params, timeout=(30, 180))
            r.raise_for_status()
            return r.json()
        except (requests.Timeout, requests.ConnectionError, requests.HTTPError) as exc:
            last_exc = exc
            if attempt == attempts:
                break
            delay = min(30, 2 ** attempt)
            print(f"  retry {attempt}/{attempts - 1} for {label} after {type(exc).__name__}; sleeping {delay}s")
            time.sleep(delay)
    raise RuntimeError(f"ERA5-Land request failed after {attempts} attempts for {label}: {last_exc}")


def fetch_period(
    session: requests.Session,
    name: str,
    lat: float,
    lon: float,
    start: str,
    end: str,
) -> pd.DataFrame:
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start,
        "end_date": end,
        "models": "era5_land",
        "hourly": ",".join(HOURLY),
        "daily": ",".join(DAILY),
        "timezone": "Africa/Lagos",
    }
    j = request_json(session, params, f"{name} {start}->{end}")

    if "hourly" not in j or "daily" not in j:
        raise RuntimeError(f"ERA5-Land response missing expected sections for {name} {start}->{end}: {j}")

    hourly = pd.DataFrame(j["hourly"])
    hourly["time"] = pd.to_datetime(hourly["time"])
    hourly["date"] = hourly["time"].dt.floor("D")

    # Soil moisture is an instantaneous state -> daily mean.
    soil_daily = hourly.groupby("date", as_index=False)[SOIL_HOURLY].mean()
    # ET0 is an hourly accumulated amount -> daily sum with min_count=1 so an
    # entirely missing day remains NaN rather than being converted to zero.
    et0_daily = (
        hourly.groupby("date", as_index=False)[ET0]
        .agg(lambda s: s.sum(min_count=1))
    )

    daily = pd.DataFrame(j["daily"])
    daily["date"] = pd.to_datetime(daily["time"])
    daily = daily.drop(columns=["time"])

    out = daily.merge(soil_daily, on="date", how="left")
    out = out.merge(et0_daily, on="date", how="left")
    out.insert(1, "location", name)
    out["latitude"] = lat
    out["longitude"] = lon
    out["source_surface_state"] = "ERA5-Land via Open-Meteo Historical Weather API"
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2018-01-01")
    ap.add_argument("--end", default="2023-12-31")
    ap.add_argument("--out", default="validation/raw/era5_land_daily.csv")
    ap.add_argument("--chunk-months", type=int, default=6)
    args = ap.parse_args()

    session = requests.Session()
    session.headers.update({"User-Agent": "NaijaClimaGuard-Validation-v2/1.0"})

    parts = []
    for name, (lat, lon) in LOCATIONS.items():
        for p0, p1 in period_ranges(args.start, args.end, args.chunk_months):
            print(f"Fetching ERA5-Land: {name} · {p0} -> {p1}")
            parts.append(fetch_period(session, name, lat, lon, p0, p1))

    out = pd.concat(parts, ignore_index=True).sort_values(["location", "date"])
    out = out.drop_duplicates(["location", "date"], keep="last")

    expected_days = (pd.Timestamp(args.end) - pd.Timestamp(args.start)).days + 1
    expected_rows = expected_days * len(LOCATIONS)
    if len(out) < expected_rows * 0.98:
        raise RuntimeError(f"ERA5-Land coverage too low: {len(out):,}/{expected_rows:,} expected location-days")
    et0_fraction = float(out[ET0].notna().mean())
    if et0_fraction < 0.95:
        raise RuntimeError(f"ERA5-Land ET0 non-null fraction below 95%: {et0_fraction:.3f}")

    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(path, index=False)
    print(f"Wrote {len(out):,} rows to {path}; ET0 non-null fraction={et0_fraction:.3f}")


if __name__ == "__main__":
    main()
