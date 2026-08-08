#!/usr/bin/env python3
"""Retrieve archived *operational* GloFAS forecasts for lead-time reconstruction.

This script is intentionally separate from historical/reanalysis ingestion.
It retrieves what the operational GloFAS archive issued on each forecast date,
so T-24/T-48/T-72 claims are not reconstructed from later reanalysis.

For the September/early-October 2022 Lokoja case, `system_version=operational`
corresponds to the operational GloFAS system at that time (v3.2 before the
19 October 2022 v3.3 operational release).

Requirements
------------
- Free CEMS Early Warning Data Store (EWDS) account.
- Accept the CEMS-FLOODS dataset licence for `cems-glofas-forecast`.
- Set EWDS_API_KEY in the environment. Never commit the key.

EWDS endpoint: https://ewds.climate.copernicus.eu/api
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Iterable

import cdsapi
import numpy as np
import pandas as pd
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


def dates(start: str, end: str) -> Iterable[pd.Timestamp]:
    yield from pd.date_range(start=start, end=end, freq="D")


def bbox(lat: float, lon: float, margin: float = 0.15) -> list[float]:
    # EWDS ordering: North, West, South, East.
    return [lat + margin, lon - margin, lat - margin, lon + margin]


def discharge_variable(ds: xr.Dataset) -> str:
    preferred = [
        "river_discharge_in_the_last_24_hours",
        "river_discharge",
        "dis24",
    ]
    for name in preferred:
        if name in ds.data_vars:
            return name
    for name, da in ds.data_vars.items():
        units = str(da.attrs.get("units", "")).lower()
        long_name = str(da.attrs.get("long_name", "")).lower()
        if ("m3" in units or "m**3" in units or "m³" in units) and "discharge" in long_name:
            return name
        if "discharge" in name.lower():
            return name
    raise KeyError(f"Could not identify discharge variable. Variables: {list(ds.data_vars)}")


def lat_lon_names(ds: xr.Dataset) -> tuple[str, str]:
    lat_candidates = ["latitude", "lat", "y"]
    lon_candidates = ["longitude", "lon", "x"]
    lat = next((n for n in lat_candidates if n in ds.coords), None)
    lon = next((n for n in lon_candidates if n in ds.coords), None)
    if not lat or not lon:
        raise KeyError(f"Latitude/longitude coordinates not found: {list(ds.coords)}")
    return lat, lon


def lead_values_hours(da: xr.DataArray) -> list[int]:
    # EWDS NetCDF commonly exposes forecast lead as `step` or leadtime_hour.
    for name in ("step", "leadtime_hour", "leadtime", "forecast_period"):
        if name in da.coords:
            values = da.coords[name].values
            out = []
            for v in np.atleast_1d(values):
                if np.issubdtype(np.asarray(v).dtype, np.timedelta64):
                    out.append(int(pd.Timedelta(v).total_seconds() // 3600))
                else:
                    out.append(int(v))
            return out
    return []


def extract_point(path: Path, location: str, issue_date: pd.Timestamp, qlat: float, qlon: float) -> list[dict]:
    ds = xr.open_dataset(path)
    var = discharge_variable(ds)
    lat_name, lon_name = lat_lon_names(ds)
    da = ds[var].sel({lat_name: qlat, lon_name: qlon}, method="nearest")

    # Remove singleton dimensions that are not forecast lead/member dimensions.
    for dim in list(da.dims):
        if da.sizes[dim] == 1 and dim not in {"step", "leadtime_hour", "leadtime", "forecast_period", "number"}:
            da = da.isel({dim: 0})

    lead_coord = next((n for n in ("step", "leadtime_hour", "leadtime", "forecast_period") if n in da.coords), None)
    if lead_coord is None:
        raise KeyError(f"No lead-time coordinate found in {path.name}: coords={list(da.coords)}")

    rows = []
    for lead_raw in np.atleast_1d(da.coords[lead_coord].values):
        if np.issubdtype(np.asarray(lead_raw).dtype, np.timedelta64):
            lead_h = int(pd.Timedelta(lead_raw).total_seconds() // 3600)
            selector = lead_raw
        else:
            lead_h = int(lead_raw)
            selector = lead_raw

        selected = da.sel({lead_coord: selector})
        # We request control_forecast only, but collapse a singleton member if present.
        if "number" in selected.dims:
            selected = selected.isel(number=0)
        value = float(np.asarray(selected.values).squeeze())
        valid_time = issue_date + pd.Timedelta(hours=lead_h)
        rows.append({
            "issue_date": issue_date.strftime("%Y-%m-%d"),
            "valid_time": valid_time.isoformat(),
            "lead_time_hours": lead_h,
            "location": location,
            "latitude_requested": qlat,
            "longitude_requested": qlon,
            "latitude_grid": float(np.asarray(selected[lat_name].values).squeeze()) if lat_name in selected.coords else None,
            "longitude_grid": float(np.asarray(selected[lon_name].values).squeeze()) if lon_name in selected.coords else None,
            "forecast_discharge_m3s": value,
            "product_type": "control_forecast",
            "system_version_request": "operational",
            "hydrological_model": "lisflood",
            "source": "Copernicus CEMS GloFAS archived operational forecast via EWDS",
        })
    ds.close()
    return rows


def retrieve_one(client: cdsapi.Client, location: str, issue_date: pd.Timestamp, lead_hours: list[int], raw_dir: Path) -> Path:
    lat, lon = LOCATIONS[location]
    target = raw_dir / f"glofas_operational_{location.lower()}_{issue_date:%Y%m%d}.nc"
    if target.exists() and target.stat().st_size > 0:
        return target

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
    print(f"Retrieving {location} GloFAS operational forecast issued {issue_date.date()} ...")
    client.retrieve(DATASET, request).download(str(target))
    return target


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--location", choices=sorted(LOCATIONS), default="Lokoja")
    ap.add_argument("--start", default="2022-09-21", help="Forecast issue-date start")
    ap.add_argument("--end", default="2022-10-06", help="Forecast issue-date end")
    ap.add_argument("--lead-hours", nargs="+", type=int, default=[24, 48, 72])
    ap.add_argument("--raw-dir", default="validation/raw/glofas_operational_forecasts")
    ap.add_argument("--out", default="validation/glofas_operational_forecasts.csv")
    args = ap.parse_args()

    key = os.getenv("EWDS_API_KEY")
    if not key:
        raise RuntimeError(
            "EWDS_API_KEY is not configured. Create a free EWDS account, accept the cems-glofas-forecast licence, "
            "and store the personal access token as a secret."
        )

    client = cdsapi.Client(url=EWDS_URL, key=key)
    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)

    qlat, qlon = LOCATIONS[args.location]
    rows: list[dict] = []
    for issue_date in dates(args.start, args.end):
        path = retrieve_one(client, args.location, issue_date, args.lead_hours, raw_dir)
        rows.extend(extract_point(path, args.location, issue_date, qlat, qlon))

    out = pd.DataFrame(rows).sort_values(["issue_date", "lead_time_hours"])
    expected = len(pd.date_range(args.start, args.end, freq="D")) * len(args.lead_hours)
    if len(out) < expected:
        print(f"WARNING: extracted {len(out)} rows; expected up to {expected}. Inspect missing forecast cycles.")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(out_path, index=False)
    print(f"Wrote {len(out):,} operational forecast rows to {out_path}")


if __name__ == "__main__":
    main()
