#!/usr/bin/env python3
"""Fetch archived operational GloFAS control forecasts for Model v5.

The source is the actual archived `cems-glofas-forecast` product. Requests are
made one issue date at a time because EWDS rejects multi-day combinations and
large multi-day requests exceed cost limits.

Current EWDS behaviour verified before Model v5 scoring:
- `operational` is the working selector for archived operational control forecasts.
- Pre-2021-05-26 forecasts use the legacy `htessel_lisflood` hydrological selector.
- Later forecasts use `lisflood`.
- The historical GloFAS release family is recorded separately from the EWDS
  request selector so provenance is explicit without pretending the current API
  exposes every old minor release as a selectable value.
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
AREA = [13.0, 5.0, 4.0, 11.0]
ARCHIVE_START = pd.Timestamp("2019-11-05")
V3_START = pd.Timestamp("2021-05-26")
V4_START = pd.Timestamp("2023-07-26")

LOCATIONS = {
    "Lokoja": (7.8023, 6.7333),
    "Makurdi": (7.7322, 8.5391),
    "Onitsha": (6.1407, 6.7869),
    "Yenagoa": (4.9247, 6.2642),
    "Hadejia": (12.4494, 10.0447),
}


def source_contract(date: pd.Timestamp) -> tuple[str, str, str]:
    """Return EWDS selector, hydrological selector, and historical release family."""
    date = pd.Timestamp(date).normalize()
    if date < ARCHIVE_START:
        raise ValueError(f"Archived operational GloFAS unavailable before {ARCHIVE_START.date()}")
    if date < V3_START:
        return "operational", "htessel_lisflood", "GloFAS v2.1/v2.2 operational era"
    if date < V4_START:
        return "operational", "lisflood", "GloFAS v3.x operational era"
    return "operational", "lisflood", "GloFAS v4.x operational era"


def retryable(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(
        token in text
        for token in (
            "429", "capacity", "queued requests", "too many requests",
            "temporarily limited", "cost limits exceeded", "502", "503", "504",
        )
    )


def issue_dates(year: int, months: list[int], explicit_dates: list[str] | None) -> pd.DatetimeIndex:
    if explicit_dates:
        dates = pd.DatetimeIndex(pd.to_datetime(explicit_dates)).sort_values().unique()
        if any(d.year != year for d in dates):
            raise ValueError("Every --dates value must belong to --year")
        return pd.DatetimeIndex([d for d in dates if d >= ARCHIVE_START])

    chunks: list[pd.DatetimeIndex] = []
    for month in months:
        start = pd.Timestamp(year=year, month=month, day=1)
        end = pd.Timestamp(year=year, month=month, day=calendar.monthrange(year, month)[1])
        start = max(start, ARCHIVE_START)
        if end >= start:
            chunks.append(pd.date_range(start, end, freq="D"))
    if not chunks:
        return pd.DatetimeIndex([])
    return pd.DatetimeIndex(np.concatenate([chunk.values for chunk in chunks]))


def retrieve_day(client: cdsapi.Client, date: pd.Timestamp, leads: list[int], raw_dir: Path) -> Path:
    system_version, hydrological_model, _ = source_contract(date)
    target = raw_dir / f"glofas_{system_version}_{hydrological_model}_{date:%Y%m%d}.zip"
    if target.exists() and target.stat().st_size > 0:
        return target

    request = {
        "system_version": system_version,
        "hydrological_model": hydrological_model,
        "product_type": "control_forecast",
        "variable": "river_discharge_in_the_last_24_hours",
        "year": date.strftime("%Y"),
        "month": date.strftime("%m"),
        "day": date.strftime("%d"),
        "leadtime_hour": [str(x) for x in leads],
        "area": AREA,
        "data_format": "grib2",
        "download_format": "zip",
    }

    last: Exception | None = None
    for attempt in range(1, 8):
        try:
            print(
                f"EWDS {system_version}/{hydrological_model} {date.date()}: attempt {attempt}/7",
                flush=True,
            )
            client.retrieve(DATASET, request).download(str(target))
            return target
        except Exception as exc:
            last = exc
            if attempt == 7 or not retryable(exc):
                raise
            delay = min(120, 10 * (2 ** (attempt - 1)))
            print(f"EWDS temporary/cost limit; sleeping {delay}s", flush=True)
            time.sleep(delay)
    raise RuntimeError(f"GloFAS operational retrieval failed for {date.date()}: {last}")


def discharge_variable(ds: xr.Dataset) -> str:
    for name in ("dis24", "river_discharge_in_the_last_24_hours", "river_discharge"):
        if name in ds.data_vars:
            return name
    for name, da in ds.data_vars.items():
        if "discharge" in name.lower() or "discharge" in str(da.attrs.get("long_name", "")).lower():
            return name
    raise KeyError(f"No river-discharge variable found: {list(ds.data_vars)}")


def coord_name(da: xr.DataArray, choices: tuple[str, ...]) -> str:
    name = next((candidate for candidate in choices if candidate in da.coords), None)
    if not name:
        raise KeyError(f"Missing coordinate from {choices}; coords={list(da.coords)}")
    return name


def lead_hours(value) -> int:
    arr = np.asarray(value)
    if np.issubdtype(arr.dtype, np.timedelta64):
        return int(pd.Timedelta(value).total_seconds() // 3600)
    return int(value)


def select_if_dimension(da: xr.DataArray, coord: str, value) -> xr.DataArray:
    if coord in da.dims:
        return da.sel({coord: value})
    return da


def extract_grib(path: Path) -> list[dict]:
    rows: list[dict] = []
    for ds in cfgrib.open_datasets(str(path), backend_kwargs={"indexpath": ""}):
        try:
            var = discharge_variable(ds)
            da = ds[var]
            lat_name = coord_name(da, ("latitude", "lat", "y"))
            lon_name = coord_name(da, ("longitude", "lon", "x"))
            time_name = coord_name(da, ("time", "forecast_reference_time"))
            lead_name = coord_name(da, ("step", "leadtime_hour", "leadtime", "forecast_period"))
        except KeyError:
            ds.close()
            continue

        times = np.atleast_1d(da.coords[time_name].values)
        leads = np.atleast_1d(da.coords[lead_name].values)
        for issue_raw in times:
            issue = pd.Timestamp(issue_raw).tz_localize(None)
            system_version, hydrological_model, historical_release_family = source_contract(issue)
            for lead_raw in leads:
                lh = lead_hours(lead_raw)
                if lh not in (24, 48, 72):
                    continue
                selected = select_if_dimension(da, time_name, issue_raw)
                selected = select_if_dimension(selected, lead_name, lead_raw)
                if "number" in selected.dims:
                    selected = selected.isel(number=0)
                for location, (qlat, qlon) in LOCATIONS.items():
                    point = selected.sel({lat_name: qlat, lon_name: qlon}, method="nearest")
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
                        "system_version_request": system_version,
                        "hydrological_model": hydrological_model,
                        "historical_release_family": historical_release_family,
                        "source": "Copernicus CEMS GloFAS archived operational forecast via EWDS",
                        "source_file": path.name,
                    })
        ds.close()
    return rows


def extract_archive(archive: Path) -> list[dict]:
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
            rows.extend(extract_grib(path))
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--months", nargs="+", type=int, default=list(range(1, 13)))
    ap.add_argument("--dates", nargs="*", help="Optional explicit YYYY-MM-DD issue dates")
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

    dates = issue_dates(args.year, months, args.dates)
    if len(dates) == 0:
        raise RuntimeError("No eligible archived operational issue dates selected")

    key = os.getenv("EWDS_API_KEY")
    if not key:
        raise RuntimeError("EWDS_API_KEY is required")
    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    client = cdsapi.Client(url=EWDS_URL, key=key)

    rows: list[dict] = []
    for date in dates:
        archive = retrieve_day(client, pd.Timestamp(date), args.lead_hours, raw_dir)
        rows.extend(extract_archive(archive))

    out = pd.DataFrame(rows)
    if out.empty:
        raise RuntimeError(f"No operational GloFAS rows extracted for selected dates in {args.year}")
    out["issue_date"] = pd.to_datetime(out["issue_date"]).dt.strftime("%Y-%m-%d")
    out = out[out["lead_time_hours"].isin([24, 48, 72])].copy()
    out = out.sort_values(["issue_date", "location", "lead_time_hours"]).drop_duplicates(
        ["issue_date", "location", "lead_time_hours"], keep="last"
    )

    expected_rows = len(dates) * len(LOCATIONS) * 3
    coverage = len(out) / expected_rows
    if coverage < 0.90:
        expected_set = {pd.Timestamp(d).strftime("%Y-%m-%d") for d in dates}
        actual_set = set(out["issue_date"].unique())
        missing = sorted(expected_set - actual_set)
        raise RuntimeError(
            f"Operational GloFAS coverage below 90% for {args.year}: "
            f"{len(out)}/{expected_rows} ({coverage:.1%}); missing dates sample={missing[:10]}"
        )
    if out["location"].nunique() != len(LOCATIONS):
        raise RuntimeError("Operational GloFAS output does not contain all five pilot locations")

    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(path, index=False)
    print(
        f"Wrote {len(out):,} operational GloFAS rows for {len(dates)} issue dates in {args.year}; "
        f"coverage={coverage:.1%}; path={path}; "
        f"systems={sorted(out['system_version_request'].unique().tolist())}; "
        f"hydrological_models={sorted(out['hydrological_model'].unique().tolist())}"
    )


if __name__ == "__main__":
    main()
