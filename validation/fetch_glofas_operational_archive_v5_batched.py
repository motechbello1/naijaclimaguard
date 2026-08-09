#!/usr/bin/env python3
"""Acquire Model v5 archived operational GloFAS with fewer EWDS submissions.

Scientific contract is identical to fetch_glofas_operational_archive_v5.py.
The only change is transport/orchestration: request one eligible month at a time,
then fall back to the existing verified daily retriever if a monthly request is
rejected or cannot be parsed. This reduces pressure on the EWDS queue without
changing any issue dates, variables, leads, locations, labels or scoring gates.
"""
from __future__ import annotations

import argparse
import calendar
import json
import os
from pathlib import Path
import random
import time

import cdsapi
import pandas as pd

from fetch_glofas_operational_archive_v5 import (
    ARCHIVE_START,
    AREA,
    DATASET,
    EWDS_URL,
    LOCATIONS,
    MIN_COVERAGE,
    archive_usable,
    extract_archive,
    queue_limited,
    retrieve_day,
    retryable,
)


def eligible_dates(year: int, month: int) -> pd.DatetimeIndex:
    start = max(pd.Timestamp(year=year, month=month, day=1), ARCHIVE_START)
    end = pd.Timestamp(year=year, month=month, day=calendar.monthrange(year, month)[1])
    if end < start:
        return pd.DatetimeIndex([])
    return pd.date_range(start, end, freq="D")


def monthly_request(year: int, month: int, dates: pd.DatetimeIndex, leads: list[int], raw_dir: Path, key: str) -> Path:
    target = raw_dir / f"glofas_operational_lisflood_{year}{month:02d}.zip"
    if archive_usable(target):
        print(f"Reusing validated monthly GloFAS archive {year}-{month:02d}", flush=True)
        return target
    target.unlink(missing_ok=True)

    request = {
        "system_version": "operational",
        "hydrological_model": "lisflood",
        "product_type": "control_forecast",
        "variable": "river_discharge_in_the_last_24_hours",
        "year": f"{year:04d}",
        "month": f"{month:02d}",
        "day": [d.strftime("%d") for d in dates],
        "leadtime_hour": [str(x) for x in leads],
        "area": AREA,
        "data_format": "grib2",
        "download_format": "zip",
    }
    client = cdsapi.Client(url=EWDS_URL, key=key)
    schedule = [90, 180, 300]
    last: Exception | None = None
    for attempt in range(1, 4):
        try:
            print(f"EWDS monthly batch {year}-{month:02d}: attempt {attempt}/3 · {len(dates)} issue dates", flush=True)
            client.retrieve(DATASET, request).download(str(target))
            if not archive_usable(target):
                target.unlink(missing_ok=True)
                raise RuntimeError("Incomplete GloFAS archive returned by monthly EWDS request")
            rows = extract_archive(target)
            expected = {d.strftime('%Y-%m-%d') for d in dates}
            actual = {str(r.get('issue_date')) for r in rows}
            if len(actual & expected) / len(expected) < MIN_COVERAGE:
                target.unlink(missing_ok=True)
                raise RuntimeError(
                    f"Monthly GloFAS archive parsed below {MIN_COVERAGE:.0%} issue-date coverage: "
                    f"{len(actual & expected)}/{len(expected)}"
                )
            return target
        except Exception as exc:
            last = exc
            target.unlink(missing_ok=True)
            if attempt == 3 or not retryable(exc):
                raise
            base = schedule[attempt - 1]
            if not queue_limited(exc):
                base = max(30, base // 3)
            delay = base + random.randint(0, 20)
            print(f"Monthly batch temporary failure; sleeping {delay}s before retry: {exc}", flush=True)
            time.sleep(delay)
    raise RuntimeError(f"Monthly request failed: {last}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--months", nargs="+", type=int, required=True)
    ap.add_argument("--lead-hours", nargs="+", type=int, default=[24, 48, 72])
    ap.add_argument("--raw-dir", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    months = sorted(set(args.months))
    if args.year < 2021:
        raise ValueError("Model v5 consistent archived control-forecast contract begins 2021-05-26")
    if not months or any(m < 1 or m > 12 for m in months):
        raise ValueError("--months must contain values from 1 through 12")
    if sorted(set(args.lead_hours)) != [24, 48, 72]:
        raise ValueError("Model v5 contract requires exactly 24, 48, 72 hour leads")
    key = os.getenv("EWDS_API_KEY")
    if not key:
        raise RuntimeError("EWDS_API_KEY is required")

    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    expected_dates: list[pd.Timestamp] = []
    rows: list[dict] = []
    monthly_failures: dict[str, str] = {}
    daily_failures: dict[str, str] = {}
    request_modes: dict[str, str] = {}

    for month in months:
        dates = eligible_dates(args.year, month)
        if dates.empty:
            continue
        expected_dates.extend(pd.Timestamp(d) for d in dates)
        month_key = f"{args.year}-{month:02d}"
        try:
            archive = monthly_request(args.year, month, dates, args.lead_hours, raw_dir, key)
            month_rows = extract_archive(archive)
            expected = {d.strftime('%Y-%m-%d') for d in dates}
            month_rows = [r for r in month_rows if str(r.get('issue_date')) in expected]
            rows.extend(month_rows)
            request_modes[month_key] = "monthly_batch"
            print(f"Monthly batch accepted for {month_key}: rows={len(month_rows)}", flush=True)
            continue
        except Exception as exc:
            monthly_failures[month_key] = str(exc)[:2000]
            request_modes[month_key] = "daily_fallback"
            print(f"Monthly batch failed for {month_key}; falling back to validated daily retrieval: {exc}", flush=True)

        client = cdsapi.Client(url=EWDS_URL, key=key)
        for d in dates:
            ts = pd.Timestamp(d)
            try:
                archive = retrieve_day(client, ts, args.lead_hours, raw_dir)
                rows.extend(extract_archive(archive))
            except Exception as exc:
                daily_failures[ts.strftime('%Y-%m-%d')] = str(exc)[:2000]
                print(f"Daily fallback unavailable after retries: {ts.date()}: {exc}", flush=True)

    if not expected_dates:
        raise RuntimeError("No eligible archived operational issue dates selected")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out = pd.DataFrame(rows)
    if not out.empty:
        expected_set = {d.strftime('%Y-%m-%d') for d in expected_dates}
        out["issue_date"] = pd.to_datetime(out["issue_date"]).dt.strftime("%Y-%m-%d")
        out = out[out["issue_date"].isin(expected_set) & out["lead_time_hours"].isin([24, 48, 72])].copy()
        out = out.sort_values(["issue_date", "location", "lead_time_hours"]).drop_duplicates(
            ["issue_date", "location", "lead_time_hours"], keep="last"
        )
        out.to_csv(out_path, index=False)
    expected_rows = len(expected_dates) * len(LOCATIONS) * 3
    coverage = len(out) / expected_rows if expected_rows else 0.0
    actual_dates = set(out["issue_date"].unique()) if not out.empty else set()
    expected_set = {d.strftime('%Y-%m-%d') for d in expected_dates}
    missing_dates = sorted(expected_set - actual_dates)

    manifest = {
        "schema": "naijaclimaguard.model_v5_glofas_source_qa.v1",
        "year": args.year,
        "months": months,
        "requested_issue_dates": len(expected_dates),
        "extracted_issue_dates": len(actual_dates),
        "expected_rows": expected_rows,
        "output_rows": int(len(out)),
        "coverage": coverage,
        "minimum_coverage": MIN_COVERAGE,
        "missing_issue_dates": missing_dates,
        "monthly_failures": monthly_failures,
        "retrieval_failures": daily_failures,
        "parse_failures": {},
        "request_strategy": "monthly_batch_with_verified_daily_fallback",
        "request_modes": request_modes,
        "source_contract": {
            "dataset": DATASET,
            "system_version": "operational",
            "hydrological_model": "lisflood",
            "product_type": "control_forecast",
            "lead_hours": [24, 48, 72],
            "archive_start": str(ARCHIVE_START.date()),
        },
    }
    manifest_path = out_path.with_suffix(".source_manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")

    if out.empty:
        raise RuntimeError("No operational GloFAS rows extracted")
    if coverage < MIN_COVERAGE:
        raise RuntimeError(
            f"Operational GloFAS coverage below {MIN_COVERAGE:.0%}: {len(out)}/{expected_rows} "
            f"({coverage:.1%}); missing dates sample={missing_dates[:10]}"
        )
    if out["location"].nunique() != len(LOCATIONS):
        raise RuntimeError("Operational GloFAS output does not contain all five pilot locations")
    if set(out["lead_time_hours"].unique()) != {24, 48, 72}:
        raise RuntimeError("Operational GloFAS output does not contain all required lead times")

    print(
        f"Wrote {len(out):,} rows for {len(actual_dates)}/{len(expected_dates)} issue dates; "
        f"coverage={coverage:.1%}; strategy=monthly_batch_with_verified_daily_fallback; manifest={manifest_path}"
    )


if __name__ == "__main__":
    main()
