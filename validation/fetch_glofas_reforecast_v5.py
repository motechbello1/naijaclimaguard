#!/usr/bin/env python3
"""Fetch GloFAS control reforecasts for Model v5 operational-native development.

The EWDS reforecast archive is forecast-structured development data. It is NOT
presented as the forecast that was actually issued historically. We retrieve
+24/+48/+72 hour river discharge for all five pilot sites.
"""
from __future__ import annotations

import argparse
import calendar
import os
from pathlib import Path
import shutil
import tempfile
import time
import zipfile

import cdsapi
import cfgrib
import numpy as np
import pandas as pd
import requests
import xarray as xr

EWDS_URL = "https://ewds.climate.copernicus.eu/api"
DATASET = "cems-glofas-reforecast"
LOCATIONS = {
    "Lokoja": (7.8023, 6.7333),
    "Makurdi": (7.7322, 8.5391),
    "Onitsha": (6.1407, 6.7869),
    "Yenagoa": (4.9247, 6.2642),
    "Hadejia": (12.4494, 10.0447),
}
AREA = [13.0, 5.0, 4.0, 11.0]  # North, West, South, East; contains all pilot sites.


def reference_days(month: int, reference_year: int, target_year: int) -> list[str]:
    """Month-days corresponding to Monday/Thursday reference cycles.

    GloFAS reforecasts are produced twice weekly for reference cycles and hindcast
    the same month/day across prior years. The reference-year schedule is frozen
    as part of source provenance rather than inferred from target-year weekday.
    """
    days: list[str] = []
    _, max_target_day = calendar.monthrange(target_year, month)
    for day in range(1, calendar.monthrange(reference_year, month)[1] + 1):
        ref = pd.Timestamp(year=reference_year, month=month, day=day)
        if ref.weekday() in (0, 3) and day <= max_target_day:  # Monday / Thursday
            days.append(f"{day:02d}")
    return days


def is_capacity_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(token in text for token in (
        "queued requests", "temporarily limited", "too many requests", "capacity", "429"
    ))


def retrieve_month(
    client: cdsapi.Client,
    year: int,
    month: int,
    hdays: list[str],
    lead_hours: list[int],
    system_version: str,
    raw_dir: Path,
) -> Path:
    target = raw_dir / f"glofas_reforecast_{system_version}_{year}_{month:02d}.zip"
    if target.exists() and target.stat().st_size > 0:
        return target
    request = {
        "system_version": [system_version],
        "hydrological_model": "lisflood",
        "product_type": "control_reforecast",
        "variable": "river_discharge_in_the_last_24_hours",
        "hyear": [str(year)],
        "hmonth": f"{month:02d}",
        "hday": hdays,
        "leadtime_hour": [str(x) for x in lead_hours],
        "area": AREA,
        "data_format": "grib2",
        "download_format": "zip",
    }
    last: Exception | None = None
    for attempt in range(1, 8):
        try:
            print(f"EWDS reforecast {year}-{month:02d}: {len(hdays)} issue dates, attempt {attempt}/7", flush=True)
            client.retrieve(DATASET, request).download(str(target))
            return target
        except (requests.HTTPError, requests.ConnectionError, requests.Timeout, Exception) as exc:
            last = exc
            if attempt == 7 or not is_capacity_error(exc):
                if attempt == 7:
                    break
                raise
            delay = min(120, 10 * (2 ** (attempt - 1)))
            print(f"EWDS capacity-limited; sleeping {delay}s", flush=True)
            time.sleep(delay)
    raise RuntimeError(f"GloFAS reforecast retrieval failed for {year}-{month:02d}: {last}")


def discharge_variable(ds: xr.Dataset) -> str:
    for name in ("dis24", "river_discharge_in_the_last_24_hours", "river_discharge"):
        if name in ds.data_vars:
            return name
    for name, da in ds.data_vars.items():
        long_name = str(da.attrs.get("long_name", "")).lower()
        if "discharge" in name.lower() or "discharge" in long_name:
            return name
    raise KeyError(f"No river-discharge variable found: {list(ds.data_vars)}")


def lat_lon_names(ds: xr.Dataset) -> tuple[str, str]:
    lat = next((x for x in ("latitude", "lat", "y") if x in ds.coords), None)
    lon = next((x for x in ("longitude", "lon", "x") if x in ds.coords), None)
    if not lat or not lon:
        raise KeyError(f"Latitude/longitude coordinates missing: {list(ds.coords)}")
    return lat, lon


def time_name(da: xr.DataArray) -> str:
    name = next((x for x in ("time", "forecast_reference_time", "valid_time") if x in da.coords), None)
    if not name:
        raise KeyError(f"No issue/reference-time coordinate found: {list(da.coords)}")
    return name


def lead_name(da: xr.DataArray) -> str:
    name = next((x for x in ("step", "leadtime_hour", "leadtime", "forecast_period") if x in da.coords), None)
    if not name:
        raise KeyError(f"No lead-time coordinate found: {list(da.coords)}")
    return name


def lead_hours(value) -> int:
    arr = np.asarray(value)
    if np.issubdtype(arr.dtype, np.timedelta64):
        return int(pd.Timedelta(value).total_seconds() // 3600)
    return int(value)


def extract_grib(path: Path, system_version: str, reference_year: int) -> list[dict]:
    rows: list[dict] = []
    datasets = cfgrib.open_datasets(str(path), backend_kwargs={"indexpath": ""})
    for ds in datasets:
        try:
            var = discharge_variable(ds)
        except KeyError:
            continue
        lat_name, lon_name = lat_lon_names(ds)
        da = ds[var]
        tname = time_name(da)
        lname = lead_name(da)
        times = np.atleast_1d(da.coords[tname].values)
        leads = np.atleast_1d(da.coords[lname].values)
        for issue_raw in times:
            issue = pd.Timestamp(issue_raw).tz_localize(None)
            for lead_raw in leads:
                lh = lead_hours(lead_raw)
                selected = da.sel({tname: issue_raw, lname: lead_raw})
                if "number" in selected.dims:
                    selected = selected.isel(number=0)
                for location, (qlat, qlon) in LOCATIONS.items():
                    point = selected.sel({lat_name: qlat, lon_name: qlon}, method="nearest")
                    value = float(np.asarray(point.values).squeeze())
                    rows.append({
                        "issue_date": issue.strftime("%Y-%m-%d"),
                        "issue_time_utc": issue.strftime("%Y-%m-%dT00:00:00Z"),
                        "valid_time": (issue + pd.Timedelta(hours=lh)).isoformat(),
                        "lead_time_hours": lh,
                        "location": location,
                        "latitude_requested": qlat,
                        "longitude_requested": qlon,
                        "forecast_discharge_m3s": value,
                        "product_type": "control_reforecast",
                        "system_version_request": system_version,
                        "hydrological_model": "lisflood",
                        "schedule_reference_year": reference_year,
                        "source": "Copernicus CEMS GloFAS medium-range reforecast via EWDS",
                        "source_file": path.name,
                    })
        ds.close()
    return rows


def extract_zip(zip_path: Path, system_version: str, reference_year: int) -> list[dict]:
    rows: list[dict] = []
    with tempfile.TemporaryDirectory(prefix="glofas_v5_") as td:
        root = Path(td)
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(root)
        files = [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in {".grib", ".grib2", ".grb", ".grb2"}]
        if not files:
            raise RuntimeError(f"No GRIB files found inside {zip_path}")
        for path in files:
            rows.extend(extract_grib(path, system_version, reference_year))
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--reference-year", type=int, default=2024)
    ap.add_argument("--system-version", default="operational")
    ap.add_argument("--lead-hours", nargs="+", type=int, default=[24, 48, 72])
    ap.add_argument("--raw-dir", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    key = os.getenv("EWDS_API_KEY")
    if not key:
        raise RuntimeError("EWDS_API_KEY is required")
    if sorted(set(args.lead_hours)) != [24, 48, 72]:
        raise ValueError("Model v5 primary source contract requires exactly 24, 48, 72 hour leads")

    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    client = cdsapi.Client(url=EWDS_URL, key=key)
    rows: list[dict] = []
    expected_issue_dates: set[str] = set()

    for month in range(1, 13):
        hdays = reference_days(month, args.reference_year, args.year)
        if not hdays:
            continue
        expected_issue_dates.update(f"{args.year}-{month:02d}-{day}" for day in hdays)
        archive = retrieve_month(
            client, args.year, month, hdays, args.lead_hours,
            args.system_version, raw_dir,
        )
        rows.extend(extract_zip(archive, args.system_version, args.reference_year))

    out = pd.DataFrame(rows)
    if out.empty:
        raise RuntimeError(f"No GloFAS reforecast rows extracted for {args.year}")
    out["issue_date"] = pd.to_datetime(out["issue_date"]).dt.strftime("%Y-%m-%d")
    out = out[out["lead_time_hours"].isin([24, 48, 72])].copy()
    out = out.sort_values(["issue_date", "location", "lead_time_hours"]).drop_duplicates(
        ["issue_date", "location", "lead_time_hours"], keep="last"
    )

    actual_dates = set(out["issue_date"].unique())
    missing_dates = sorted(expected_issue_dates - actual_dates)
    expected_rows = len(expected_issue_dates) * len(LOCATIONS) * 3
    coverage = len(out) / expected_rows if expected_rows else 0.0
    if coverage < 0.90:
        raise RuntimeError(
            f"GloFAS reforecast coverage below 90% for {args.year}: {len(out)}/{expected_rows} "
            f"({coverage:.1%}); missing issue dates sample={missing_dates[:10]}"
        )
    if out["location"].nunique() != len(LOCATIONS):
        raise RuntimeError("GloFAS reforecast output does not contain all five pilot locations")

    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(path, index=False)
    print(
        f"Wrote {len(out):,} GloFAS reforecast rows for {args.year} to {path}; "
        f"issue-date coverage={coverage:.1%}; missing_dates={len(missing_dates)}"
    )


if __name__ == "__main__":
    main()
