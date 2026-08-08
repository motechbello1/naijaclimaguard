#!/usr/bin/env python3
"""Fetch historical GloFAS v4 daily river discharge for validation locations.

Primary data source: Copernicus/ECMWF GloFAS v4, accessed through Open-Meteo Flood API.
This script preserves GloFAS attribution and writes raw discharge in m3/s.

IMPORTANT: returned grid cells must be manually audited against the intended river reach.
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

BASE = "https://flood-api.open-meteo.com/v1/flood"


def fetch_one(name: str, lat: float, lon: float, start: str, end: str) -> pd.DataFrame:
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "river_discharge",
        "start_date": start,
        "end_date": end,
        "models": "consolidated_v4",
    }
    r = requests.get(BASE, params=params, timeout=60)
    r.raise_for_status()
    j = r.json()
    daily = j.get("daily") or {}
    if not daily.get("time") or not daily.get("river_discharge"):
        raise RuntimeError(f"No discharge returned for {name}: {j}")
    return pd.DataFrame({
        "date": pd.to_datetime(daily["time"]),
        "location": name,
        "latitude_requested": lat,
        "longitude_requested": lon,
        "river_discharge_m3s": daily["river_discharge"],
        "source": "Copernicus/ECMWF GloFAS v4 via Open-Meteo Flood API",
        "glofas_model": "consolidated_v4",
    })


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2018-01-01")
    ap.add_argument("--end", default="2023-12-31")
    ap.add_argument("--out", default="validation/raw/glofas_daily.csv")
    args = ap.parse_args()

    parts = []
    for name, (lat, lon) in LOCATIONS.items():
        print(f"Fetching GloFAS: {name}")
        parts.append(fetch_one(name, lat, lon, args.start, args.end))

    out = pd.concat(parts, ignore_index=True).sort_values(["location", "date"])
    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(path, index=False)
    print(f"Wrote {len(out):,} rows to {path}")
    print("NEXT: audit each location against the intended river reach before modelling.")


if __name__ == "__main__":
    main()
