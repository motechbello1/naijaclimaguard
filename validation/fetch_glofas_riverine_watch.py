#!/usr/bin/env python3
"""Fetch GloFAS operational control forecasts for Riverine Watch v1 only.

This deliberately reuses the existing validated GloFAS retrieval/extraction code
but limits acquisition to the two locations supported by Riverine Watch v1.
A parent orchestration process is expected to enforce a wall-clock timeout because
EWDS accepted jobs can remain queued for a long time.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import cdsapi
import pandas as pd

import fetch_glofas_current as base

SUPPORTED = ("Lokoja", "Makurdi")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--issue-date", required=True, help="UTC issue date YYYY-MM-DD")
    ap.add_argument("--lead-hours", nargs="+", type=int, default=[24, 48, 72])
    ap.add_argument("--raw-dir", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    key = os.getenv("EWDS_API_KEY")
    if not key:
        raise RuntimeError("EWDS_API_KEY is required")

    issue_date = pd.Timestamp(args.issue_date)
    client = cdsapi.Client(url=base.EWDS_URL, key=key)
    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)

    rows: list[dict] = []
    for location in SUPPORTED:
        path = base.retrieve(client, location, issue_date, args.lead_hours, raw_dir)
        rows.extend(base.extract(path, location, issue_date))

    out = pd.DataFrame(rows).sort_values(["location", "lead_time_hours"])
    expected_leads = set(args.lead_hours)
    for location in SUPPORTED:
        hit = out[out["location"].eq(location)]
        if set(hit["lead_time_hours"].astype(int)) != expected_leads:
            raise RuntimeError(
                f"GloFAS issue {args.issue_date} missing required leads for {location}: "
                f"{sorted(set(hit['lead_time_hours'].astype(int)))}"
            )

    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(path, index=False)
    print(f"Wrote {len(out)} Riverine Watch GloFAS rows for issue {args.issue_date} to {path}")


if __name__ == "__main__":
    main()
