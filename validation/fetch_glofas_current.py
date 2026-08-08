#!/usr/bin/env python3
"""Fetch current GloFAS operational control forecasts for five pilot sites."""
from __future__ import annotations

import argparse
import os
import time
from pathlib import Path

import cdsapi
import numpy as np
import pandas as pd
import requests
import xarray as xr

EWDS_URL = "https://ewds.climate.copernicus.eu/api"
DATASET = "cems-glofas-forecast"
LOCATIONS = {
    "Lokoja": (7.8023, 6.7333),
    "Makurdi": (7.7322, 8.5391),
    "Onitsha": (6.1407, 6.7869),
    "Yenagoa": (4.9247, 6.2642),
    "Hadejia": (12.4494, 10.0447),
}


def bbox(lat: float, lon: float, margin: float = 0.15) -> list[float]:
    return [lat + margin, lon - margin, lat - margin, lon + margin]


def discharge_variable(ds: xr.Dataset) -> str:
    for name in ("river_discharge_in_the_last_24_hours", "river_discharge", "dis24"):
        if name in ds.data_vars:
            return name
    for name, da in ds.data_vars.items():
        units = str(da.attrs.get("units", "")).lower()
        long_name = str(da.attrs.get("long_name", "")).lower()
        if (("m3" in units or "m**3" in units or "m³" in units) and "discharge" in long_name) or "discharge" in name.lower():
            return name
    raise KeyError(f"Could not identify discharge variable. Variables: {list(ds.data_vars)}")


def lat_lon_names(ds: xr.Dataset) -> tuple[str, str]:
    lat = next((n for n in ("latitude", "lat", "y") if n in ds.coords), None)
    lon = next((n for n in ("longitude", "lon", "x") if n in ds.coords), None)
    if not lat or not lon:
        raise KeyError(f"Latitude/longitude coordinates not found: {list(ds.coords)}")
    return lat, lon


def is_capacity_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(x in text for x in ("queued requests", "temporarily limited", "too many requests", "capacity", "429"))


def retrieve(client: cdsapi.Client, location: str, issue_date: pd.Timestamp, lead_hours: list[int], raw_dir: Path) -> Path:
    lat, lon = LOCATIONS[location]
    target = raw_dir / f"glofas_current_{location.lower()}_{issue_date:%Y%m%d}.nc"
    request = {
        "system_version": "operational",
        "hydrological_model": "lisflood",
        "product_type": "control_forecast",
        "variable": "river_discharge_in_the_last_24_hours",
        "year": issue_date.strftime("%Y"),
        "month": issue_date.strftime("%m"),
        "day": issue_date.strftime("%d"),
        "leadtime_hour": [str(h) for h in lead_hours],
        "area": bbox(lat, lon),
        "data_format": "netcdf",
        "download_format": "unarchived",
    }
    last = None
    for attempt in range(1, 7):
        try:
            client.retrieve(DATASET, request).download(str(target))
            return target
        except Exception as exc:
            last = exc
            if attempt == 6 or not is_capacity_error(exc):
                if attempt == 6:
                    break
                raise
            time.sleep(min(90, 10 * (2 ** (attempt - 1))))
    raise RuntimeError(f"GloFAS current retrieval failed for {location}: {last}")


def extract(path: Path, location: str, issue_date: pd.Timestamp) -> list[dict]:
    qlat, qlon = LOCATIONS[location]
    ds = xr.open_dataset(path)
    var = discharge_variable(ds)
    lat_name, lon_name = lat_lon_names(ds)
    da = ds[var].sel({lat_name: qlat, lon_name: qlon}, method="nearest")
    for dim in list(da.dims):
        if da.sizes[dim] == 1 and dim not in {"step", "leadtime_hour", "leadtime", "forecast_period", "number"}:
            da = da.isel({dim: 0})
    lead_coord = next((n for n in ("step", "leadtime_hour", "leadtime", "forecast_period") if n in da.coords), None)
    if lead_coord is None:
        raise KeyError(f"No forecast lead coordinate found in {path.name}")
    rows = []
    for lead_raw in np.atleast_1d(da.coords[lead_coord].values):
        lead_h = int(pd.Timedelta(lead_raw).total_seconds() // 3600) if np.issubdtype(np.asarray(lead_raw).dtype, np.timedelta64) else int(lead_raw)
        selected = da.sel({lead_coord: lead_raw})
        if "number" in selected.dims:
            selected = selected.isel(number=0)
        rows.append({
            "issue_date": issue_date.strftime("%Y-%m-%d"),
            "valid_time": (issue_date + pd.Timedelta(hours=lead_h)).isoformat(),
            "lead_time_hours": lead_h,
            "location": location,
            "latitude_requested": qlat,
            "longitude_requested": qlon,
            "forecast_discharge_m3s": float(np.asarray(selected.values).squeeze()),
            "product_type": "control_forecast",
            "system_version_request": "operational",
            "hydrological_model": "lisflood",
            "source": "Copernicus CEMS GloFAS operational forecast via EWDS",
        })
    ds.close()
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--issue-date", help="UTC issue date YYYY-MM-DD; default today")
    ap.add_argument("--lead-hours", nargs="+", type=int, default=[24, 48, 72])
    ap.add_argument("--raw-dir", default="validation/prospective/work/glofas_raw")
    ap.add_argument("--out", default="validation/prospective/work/glofas_current.csv")
    args = ap.parse_args()
    key = os.getenv("EWDS_API_KEY")
    if not key:
        raise RuntimeError("EWDS_API_KEY is required")
    issue_date = pd.Timestamp(args.issue_date) if args.issue_date else pd.Timestamp.now(tz="UTC").normalize().tz_localize(None)
    client = cdsapi.Client(url=EWDS_URL, key=key)
    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for location in LOCATIONS:
        path = retrieve(client, location, issue_date, args.lead_hours, raw_dir)
        rows.extend(extract(path, location, issue_date))
    out = pd.DataFrame(rows).sort_values(["location", "lead_time_hours"])
    if out["location"].nunique() != len(LOCATIONS):
        raise RuntimeError("GloFAS current fetch did not return all five pilot locations")
    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(path, index=False)
    print(f"Wrote {len(out)} current GloFAS forecast rows to {path}")


if __name__ == "__main__":
    main()
