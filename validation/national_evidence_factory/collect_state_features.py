#!/usr/bin/env python3
"""Build a countrywide v0 ERA5-Land feature layer for the national retrospective benchmark."""
from __future__ import annotations

import argparse
import csv
import json
import math
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests

GEOCODE = "https://geocoding-api.open-meteo.com/v1/search"
ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"


def get_json(url: str, params: dict, tries=4):
    last = None
    for attempt in range(tries):
        try:
            r = requests.get(url, params=params, timeout=90, headers={"User-Agent": "NaIjaClimaGuard/1.0"})
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            last = exc
            if attempt + 1 < tries:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"request failed {url}: {last}")


def geocode(name: str) -> tuple[float, float, float | None]:
    q = f"{name}, Nigeria"
    data = get_json(GEOCODE, {"name": q, "countryCode": "NG", "count": 5, "language": "en", "format": "json"})
    results = data.get("results") or []
    if not results:
        # Second try with the unqualified capital name.
        data = get_json(GEOCODE, {"name": name, "count": 10, "language": "en", "format": "json"})
        results = [r in (data.get("results") or []) if r.get("country_code") == "NG"] or data.get("results") or []
    if not results:
        raise RuntimeError(f"no Nigerian geocode for {name}")
    r = results[0]
    return float(r["latitude"]), float(r["longitude"]), float(r["elevation"]) if r.get("elevation") is not None else None


def fetch_daily(lat: float, lon: float, start: str, end: str) -> pd.DataFrame:
    params = {
        "latitude": lat, "longitude": lon,
        "start_date": start, "end_date": end,
        "daily": "precipitation_sum,et0_fao_evapotranspiration",
        "models": "era5_land", "timezone": "UTC",
    }
    data = get_json(ARCHIVE, params)
    daily = data.get("daily") or {}
    if not daily.get("time"):
        raise RuntimeError("ERA5-Land daily payload missing time")
    out = pd.DataFrame(daily)
    out["date"] = pd.to_datetime(out.pop("time"))
    out = out.rename(columns={"precipitation_sum": "precip_mm", "et0_fao_evapotranspiration": "et0_mm"})
    return out


def derive(fg: pd.DataFrame) -> pd.DataFrame:
    df = fg.sort_values("date").copy()
    df["precip_mm"] = pd.to_numeric(df["precip_mm"], errors="coerce").fillna(0.0)
    df["et0_mm"] = pd.to_numeric(df.get("et0_mm"), errors="coerce")
    for w in [3, 7, 14, 30]:
        df[f"rain{w}d_mm"] = df["precip_mm"].rolling(w, min_periods=1).sum()
    df["rain3d_max_30d"] = df["rain3d_mm"].rolling(30, min_periods=1).max()
    denom = df["et0_mm"].rolling(14, min_periods=3).mean().fillna(0) + 1.0
    df["wetness_proxy_14d"] = df["rain14d_mm"] / denom
    doy = df["date"].dt.dayofyear
    df["season_sin"] = doy.map(lambda x: math.sin(2 * math.pi * x / 365.25))
    df["season_cos"] = doy.map(lambda x: math.cos(2 * math.pi * x / 365.25))
    return df


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jurisdictions", default="validation/national_evidence_factory/jurisdictions.csv")
    ap.add_argument("--start", default="2018-01-01")
    ap.add_argument("--end", default="2025-12-31")
    ap.add_argument("--out", default="validation/national_evidence_factory/out/state_daily_features.csv")
    args = ap.parse_args()

    juris = pd.read_csv(args.jurisdictions)
    rows = []; geos = []
    for itp, row in juris.iterrows():
        state, capital = row["state"], row["capital"]
        lat, lon, elev = geocode(capital)
        print(f"{idx+1}/{len(juris)} {state}: {capital} @{lat:.4f},{lon:.4f}", flush=True)
        one = derive(fetch_daily(lat, lon, args.start, args.end))
        one["state"] = state; one["capital"] = capital; one["latitude"] = lat; one["longitude"] = lon; one["elevation_m"] = elev
        rows.append(one)
        geos.append({"state":state,"capital":capital,"latitude":lat,"longitude":lon,"elevation_m":elev})
        time.sleep(0.15)

    out = Path(args.out); out.parent.mkdir(parents=True, exist_ok=True)
    pd.concat(rows, ignore_index=True).to_csv(out, index=False)
    manifest = {
        "generated_at": datetime.utcnow().isoformat()+"Z",
        "source": "Open-Meteo Historical Weather API (ERA5-Land model)",
        "temporal_range": [args.start, args.end],
        "jurisdictions": len(geos), "anchor_method": "single state-capital point per jurisdiction (v0 research benchmark)",
        "derived_features": ["rain3d_mm","rain7d_mm","rain14d_mm","rain30d_mm","rain3d_max_30d","wetness_proxy_14d","season_sin","season_cos"],
        "limitation": "A capital-point anchor does not represent every flood process in a state. V1 should use ADM1 multipoint/polygon sampling, NASA GPM IMERG, hydrography/river distance, terrain and local hydrology where available.",
    }
    Path(out.parent / "state_feature_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"wrote {sum(len(r) for r in rows)} state-days to {out}")

if __name__ == "__main__":
    main()
