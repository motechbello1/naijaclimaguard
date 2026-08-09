#!/usr/bin/env python3
"""Fetch archived operational GloFAS control forecasts for Model v5.

This uses the actual archived forecast product (`cems-glofas-forecast`) rather than
reforecasts. Only +24/+48/+72 h river-discharge leads are retained for the five
pilot locations.

EWDS applies request-cost limits. To keep requests small and reproducible, this
fetcher retrieves one compact bounding box per pilot location per month instead
of a single Nigeria-wide grid for all locations.
"""
from __future__ import annotations

import argparse
import calendar
import os
from pathlib import Path
import tempfile
import time
import zipfile

import cdsapi
import cfgrib
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
ARCHIVE_START = pd.Timestamp("2019-11-05")


def bbox(lat: float, lon: float, margin: float = 0.15) -> list[float]:
    # EWDS order: North, West, South, East.
    return [lat + margin, lon - margin, lat - margin, lon + margin]


def is_capacity_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(x in text for x in (
        "429", "capacity", "queued requests", "too many requests",
        "temporarily limited", "cost limits exceeded"
    ))


def retrieve_location_month(
    client: cdsapi.Client,
    location: str,
    year: int,
    month: int,
    leads: list[int],
    raw_dir: Path,
) -> Path | None:
    month_start = pd.Timestamp(year=year, month=month, day=1)
    month_end = pd.Timestamp(year=year, month=month, day=calendar.monthrange(year, month)[1])
    if month_end < ARCHIVE_START:
        return None

    first_day = max(month_start, ARCHIVE_START).day
    days = [f"{d:02d}" for d in range(first_day, month_end.day + 1)]
    lat, lon = LOCATIONS[location]
    target = raw_dir / f"glofas_operational_{location.lower()}_{year}_{month:02d}.zip"
    if target.exists() and target.stat().st_size > 0:
        return target

    request = {
        "system_version": "operational",
        "hydrological_model": "lisflood",
        "product_type": "control_forecast",
        "variable": "river_discharge_in_the_last_24_hours",
        "year": str(year),
        "month": f"{month:02d}",
        "day": days,
        "leadtime_hour": [str(x) for x in leads],
        "area": bbox(lat, lon),
        "data_format": "grib2",
        "download_format": "zip",
    }

    last: Exception | None = None
    for attempt in range(1, 8):
        try:
            print(
                f"EWDS operational {location} {year}-{month:02d}: "
                f"{len(days)} issue dates, attempt {attempt}/7",
                flush=True,
            )
            client.retrieve(DATASET, request).download(str(target))
            return target
        except Exception as exc:
            last = exc
            if attempt == 7 or not is_capacity_error(exc):
                raise
            delay = min(120, 10 * (2 ** (attempt - 1)))
            print(f"EWDS capacity/cost limited; sleeping {delay}s", flush=True)
            time.sleep(delay)

    raise RuntimeError(
        f"GloFAS operational retrieval failed for {location} {year}-{month:02d}: {last}"
    )


def discharge_variable(ds: xr.Dataset) -> str:
    for name in ("dis24", "river_discharge_in_the_last_24_hours", "river_discharge"):
        if name in ds.data_vars:
            return name
    for name, da in ds.data_vars.items():
        if "discharge" in name.lower() or "discharge" in str(da.attrs.get("long_name", "")).lower():
            return name
    raise KeyError(f"No river-discharge variable found: {list(ds.data_vars)}")


def coord_name(da: xr.DataArray, choices: tuple[str, ...]) -> str:
    name = next((x for x in choices if x in da.coords), None)
    if not name:
        raise KeyError(f"Missing coordinate from {choices}; coords={list(da.coords)}")
    return name


def lead_hours(value) -> int:
    arr = np.asarray(value)
    if np.issubdtype(arr.dtype, np.timedelta64):
        return int(pd.Timedelta(value).total_seconds() // 3600)
    return int(value)


def extract_grib(path: Path, location: str) -> list[dict]:
    qlat, qlon = LOCATIONS[location]
    rows: list[dict] = []
    for ds in cfgrib.open_datasets(str(path), backend_kwargs={"indexpath": ""}):
        try:
            var = discharge_variable(ds)
            da = ds[var]
            lat = coord_name(da, ("latitude", "lat", "y"))
            lon = coord_name(da, ("longitude", "lon", "x"))
            tname = coord_name(da, ("time", "forecast_reference_time"))
            lname = coord_name(da, ("step", "leadtime_hour", "leadtime", "forecast_period"))
        except KeyError:
            ds.close()
            continue

        times = np.atleast_1d(da.coords[tname].values)
        leads = np.atleast_1d(da.coords[lname].values)
        for issue_raw in times:
            issue = pd.Timestamp(issue_raw).tz_localize(None)
            for lead_raw in leads:
                lh = lead_hours(lead_raw)
                if lh not in (24, 48, 72):
                    continue
                selected = da.sel({tname: issue_raw, lname: lead_raw})
                if "number" in selected.dims:
                    selected = selected.isel(number=0)
                point = selected.sel({lat: qlat, lon: qlon}, method="nearest")
                rows.append({
                    "issue_date": issue.strftime("%Y-%m-%d"),
                    "issue_time_utc": issue.strftime("%Y-%m-%dT00:00:00Z"),
                    "valid_time": (issue + pd.Timedelta(hours=lh)).isoformat(),
                    "lead_time_hours": lh,
                    "location": location,
                    "latitude_requested": qlat,
                    "longitude_requested": qlon,
                    "forecast_discharge_m3s": float(np.asarray(point.values).squeeze()),
                    "product_type": "control_forecast",
                    "system_version_request": "operational",
                    "hydrological_model": "lisflood",
                    "source": "Copernicus CEMS GloFAS archived operational forecast via EWDS",
                    "source_file": path.name,
                })
        ds.close()
    return rows


def extract_archive(archive: Path, location: str) -> list[dict]:
    rows: list[dict] = []
    with tempfile.TemporaryDirectory(prefix="glofas_v5_operational_") as td:
        root = Path(td)
        try:
            with zipfile.ZipFile(archive) as zf:
                zf.extractall(root)
            files = [
                p for p in root.rglob("*")
                if p.is_file() and p.suffix.lower() in {".grib", ".grib2", ".grb", ".grb2"}
            ]
        except zipfile.BadZipFile:
            files = [archive]
        if not files:
            raise RuntimeError(f"No GRIB files found in {archive}")
        for path in files:
            rows.extend(extract_grib(path, location))
    return rows


def selected_expected_dates(year: int, months: list[int]) -> pd.DatetimeIndex:
    chunks: list[pd.DatetimeIndex] = []
    for month in months:
        month_start = pd.Timestamp(year=year, month=month, day=1)
        month_end = pd.Timestamp(year=year, month=month, day=calendar.monthrange(year, month)[1])
        start = max(month_start, ARCHIVE_START)
        if month_end >= start:
            chunks.append(pd.date_range(start, month_end, freq="D"))
    if not chunks:
        return pd.DatetimeIndex([])
    values = np.concatenate([chunk.values for chunk in chunks])
    return pd.DatetimeIndex(values)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument(
        "--months", nargs="+", type=int, default=list(range(1, 13)),
        help="Months to retrieve; defaults to all 12"
    )
    ap.add_argument("--lead-hours", nargs="+", type=int, default=[24, 48, 72])
    ap.add_argument("--raw-dir", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    if args.year < 2019:
        raise ValueError("Operational GloFAS river-discharge archive begins 2019-11-05")
    months = sorted(set(args.months))
    if not months or any(month < 1 or month > 12 for month in months):
        raise ValueError("--months must contain values from 1 through 12")
    if sorted(set(args.lead_hours)) != [24, 48, 72]:
        raise ValueError("Model v5 contract requires exactly 24, 48, 72 hour leads")

    key = os.getenv("EWDS_API_KEY")
    if not key:
        raise RuntimeError("EWDS_API_KEY is required")

    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    client = cdsapi.Client(url=EWDS_URL, key=key)
    rows: list[dict] = []

    for month in months:
        for location in LOCATIONS:
            archive = retrieve_location_month(
                client, location, args.year, month, args.lead_hours, raw_dir
            )
            if archive is not None:
                rows.extend(extract_archive(archive, location))

    out = pd.DataFrame(rows)
    if out.empty:
        raise RuntimeError(
            f"No operational GloFAS rows extracted for {args.year}; months={months}"
        )

    out["issue_date"] = pd.to_datetime(out["issue_date"]).dt.strftime("%Y-%m-%d")
    out = out.sort_values(["issue_date", "location", "lead_time_hours"]).drop_duplicates(
        ["issue_date", "location", "lead_time_hours"], keep="last"
    )

    if out["location"].nunique() != len(LOCATIONS):
        raise RuntimeError("Operational GloFAS output does not contain all five pilot locations")

    expected_dates = selected_expected_dates(args.year, months)
    expected_rows = len(expected_dates) * len(LOCATIONS) * 3
    coverage = len(out) / expected_rows if expected_rows else 0.0
    if coverage < 0.90:
        raise RuntimeError(
            f"Operational GloFAS coverage below 90% for {args.year}, months={months}: "
            f"{len(out)}/{expected_rows} ({coverage:.1%})"
        )

    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(path, index=False)
    print(
        f"Wrote {len(out):,} operational GloFAS rows for {args.year}, months={months}; "
        f"coverage={coverage:.1%}; path={path}"
    )


if __name__ == "__main__":
    main()
