#!/usr/bin/env python3
"""Fetch ERA5-Land surface-state variables via Open-Meteo Historical Weather API.

ERA5-Land is used for antecedent soil moisture and evapotranspiration context.
It is not labelled as NASA data. Requests are split year-by-year to keep hourly
responses manageable and easier to retry.
"""
from __future__ import annotations

import argparse
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
HOURLY = [
    "soil_moisture_0_to_7cm",
    "soil_moisture_7_to_28cm",
    "soil_moisture_28_to_100cm",
]
DAILY = [
    "et0_fao_evapotranspiration",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_hours",
]


def year_ranges(start: str, end: str):
    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)
    for year in range(start_ts.year, end_ts.year + 1):
        y0 = max(start_ts, pd.Timestamp(year=year, month=1, day=1))
        y1 = min(end_ts, pd.Timestamp(year=year, month=12, day=31))
        yield year, y0.strftime("%Y-%m-%d"), y1.strftime("%Y-%m-%d")


def fetch_period(name: str, lat: float, lon: float, start: str, end: str) -> pd.DataFrame:
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
    r = requests.get(BASE, params=params, timeout=120)
    r.raise_for_status()
    j = r.json()

    if "hourly" not in j or "daily" not in j:
        raise RuntimeError(f"ERA5-Land response missing expected sections for {name}: {j}")

    hourly = pd.DataFrame(j["hourly"])
    hourly["time"] = pd.to_datetime(hourly["time"])
    hourly["date"] = hourly["time"].dt.floor("D")
    soil_daily = hourly.groupby("date", as_index=False)[HOURLY].mean()

    daily = pd.DataFrame(j["daily"])
    daily["date"] = pd.to_datetime(daily["time"])
    daily = daily.drop(columns=["time"])

    out = daily.merge(soil_daily, on="date", how="left")
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
    args = ap.parse_args()

    parts = []
    for name, (lat, lon) in LOCATIONS.items():
        for year, y0, y1 in year_ranges(args.start, args.end):
            print(f"Fetching ERA5-Land: {name} · {year}")
            parts.append(fetch_period(name, lat, lon, y0, y1))

    out = pd.concat(parts, ignore_index=True).sort_values(["location", "date"])
    out = out.drop_duplicates(["location", "date"], keep="last")

    expected_days = (pd.Timestamp(args.end) - pd.Timestamp(args.start)).days + 1
    expected_rows = expected_days * len(LOCATIONS)
    if len(out) < expected_rows * 0.98:
        raise RuntimeError(f"ERA5-Land coverage too low: {len(out):,}/{expected_rows:,} expected location-days")

    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(path, index=False)
    print(f"Wrote {len(out):,} rows to {path}")


if __name__ == "__main__":
    main()
