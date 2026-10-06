#!/usr/bin/env python3
"""Fetch archived operational GloFAS q24/q48/q72 for Model v5 transfer replay.

Diagnostic only. These rows must never be used to retune Model v5 after its
reforecast-based development results are inspected.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import time

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


def bbox(lat: float, lon: float, margin: float = .15):
    return [lat + margin, lon - margin, lat - margin, lon + margin]


def is_capacity(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(x in text for x in ("queued requests", "temporarily limited", "too many requests", "capacity", "429"))


def retrieve(client: cdsapi.Client, location: str, issue: pd.Timestamp, raw_dir: Path) -> Path:
    lat, lon = LOCATIONS[location]
    target = raw_dir / f"glofas_operational_{location.lower()}_{issue:%Y%m%d}.nc"
    if target.exists() and target.stat().st_size > 0:
        return target
    request = {
        "system_version": "operational",
        "hydrological_model": "lisflood",
        "product_type": "control_forecast",
        "variable": "river_discharge_in_the_last_24_hours",
        "year": issue.strftime("%Y"),
        "month": issue.strftime("%m"),
        "day": issue.strftime("%d"),
        "leadtime_hour": ["24", "48", "72"],
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
            if attempt == 6 or not is_capacity(exc):
                raise
            time.sleep(min(90, 10 * (2 ** (attempt - 1))))
    raise RuntimeError(last)


def discharge_var(ds: xr.Dataset) -> str:
    for name in ("river_discharge_in_the_last_24_hours", "river_discharge", "dis24"):
        if name in ds.data_vars:
            return name
    for name, da in ds.data_vars.items():
        if "discharge" in name.lower() or "discharge" in str(da.attrs.get("long_name", "")).lower():
            return name
    raise KeyError("No discharge variable")


def extract(path: Path, location: str, issue: pd.Timestamp) -> list[dict]:
    lat, lon = LOCATIONS[location]
    ds = xr.open_dataset(path)
    var = discharge_var(ds)
    lat_name = next(x for x in ("latitude", "lat", "y") if x in ds.coords)
    lon_name = next(x for x in ("longitude", "lon", "x") if x in ds.coords)
    da = ds[var].sel({lat_name: lat, lon_name: lon}, method="nearest")
    lead_name = next(x for x in ("step", "leadtime_hour", "leadtime", "forecast_period") if x in da.coords)
    rows = []
    for raw in np.atleast_1d(da.coords[lead_name].values):
        lead = int(pd.Timedelta(raw).total_seconds() // 3600) if np.issubdtype(np.asarray(raw).dtype, np.timedelta64) else int(raw)
        selected = da.sel({lead_name: raw})
        if "number" in selected.dims:
            selected = selected.isel(number=0)
        rows.append({
            "issue_date": issue.strftime("%Y-%m-%d"),
            "location": location,
            "lead_time_hours": lead,
            "forecast_discharge_m3s": float(np.asarray(selected.values).squeeze()),
            "source": "Copernicus CEMS GloFAS archived operational forecast via EWDS",
            "system_version_request": "operational",
            "product_type": "control_forecast",
        })
    ds.close()
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--events", default="validation/model_v4_event_registry.csv")
    ap.add_argument("--raw-dir", default="validation/model_v5/replay_raw")
    ap.add_argument("--out", default="validation/model_v5_operational_replay_glofas.csv")
    ap.add_argument("--manifest", default="validation/model_v5_operational_replay_manifest.json")
    ap.add_argument("--min-issue-date", default="2019-11-05")
    args = ap.parse_args()

    key = os.getenv("EWDS_API_KEY")
    if not key:
        raise RuntimeError("EWDS_API_KEY is required")
    events = pd.read_csv(args.events)
    events = events[events["include_in_benchmark"].astype(str).str.lower().eq("true")].copy()
    events["observed_by_date"] = pd.to_datetime(events["observed_by_date"])
    if events["event_id"].nunique() != 35:
        raise ValueError("Operational replay requires frozen 35-event registry")

    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    client = cdsapi.Client(url=EWDS_URL, key=key)
    rows: list[dict] = []
    failures: list[dict] = []
    minimum = pd.Timestamp(args.min_issue_date)
    for _, event in events.sort_values("observed_by_date").iterrows():
        anchor = event["observed_by_date"]
        for days_before in (3, 2, 1):
            issue = anchor - pd.Timedelta(days=days_before)
            if issue < minimum:
                failures.append({"event_id": event["event_id"], "issue_date": str(issue.date()), "reason": "before configured operational archive floor"})
                continue
            try:
                path = retrieve(client, event["location"], issue, raw_dir)
                extracted = extract(path, event["location"], issue)
                for row in extracted:
                    row.update({
                        "event_id": event["event_id"],
                        "observed_by_date": str(anchor.date()),
                        "days_before_event": days_before,
                    })
                rows.extend(extracted)
            except Exception as exc:
                failures.append({"event_id": event["event_id"], "issue_date": str(issue.date()), "reason": str(exc)[:500]})

    out = pd.DataFrame(rows)
    if not out.empty:
        out = out[out["lead_time_hours"].isin([24, 48, 72])].sort_values(["event_id", "issue_date", "lead_time_hours"])
        Path(args.out).write_text(out.to_csv(index=False), encoding="utf-8")
    manifest = {
        "status": "operational_replay_retrieval_complete",
        "diagnostic_only": True,
        "retuning_forbidden": True,
        "rows": int(len(out)),
        "successful_issue_cycles": int(out[["event_id", "issue_date"]].drop_duplicates().shape[0]) if not out.empty else 0,
        "failures": failures,
    }
    Path(args.manifest).write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
