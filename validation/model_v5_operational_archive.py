#!/usr/bin/env python3
"""Model v5 wrapper for the consistent archived operational GloFAS control era.

The active source contract begins 2021-05-26 and uses actual archived
`control_forecast` trajectories. Validation is walk-forward over 2022-2024.
The candidate implementations, ranking, ablations and threshold gates remain
those frozen before any Model v5 score existed.
"""
from __future__ import annotations

import pandas as pd
import model_v5_operational_native as base

ARCHIVE_START = pd.Timestamp("2021-05-26")
VALIDATION_YEARS = range(2022, 2025)


def temporal_folds(df: pd.DataFrame):
    eligible = df[df["issue_date"] >= ARCHIVE_START].copy()
    for year in VALIDATION_YEARS:
        train = eligible[eligible["issue_date"] < pd.Timestamp(f"{year}-01-01")].copy()
        val = eligible[eligible["issue_date"].dt.year.eq(year)].copy()
        if train.empty or val.empty or train["label"].nunique() < 2 or val["label"].nunique() < 2:
            yield year, train, val, False
        else:
            yield year, train, val, True


def event_detection(scored: pd.DataFrame, events: pd.DataFrame, threshold: float) -> dict:
    e = events[events["include_in_benchmark"].astype(str).str.lower().eq("true")].copy()
    e["observed_by_date"] = pd.to_datetime(e["observed_by_date"])
    e = e[e["observed_by_date"].dt.year.between(2022, 2024)]
    rows: list[dict] = []
    for _, event in e.sort_values("observed_by_date").iterrows():
        anchor = event["observed_by_date"]
        window = scored[
            scored["location"].eq(event["location"])
            & (scored["issue_date"] < anchor)
            & (anchor <= scored["issue_date"] + pd.Timedelta(days=3))
        ].sort_values("issue_date")
        crossed = window[window["probability"] >= threshold]
        first = crossed.iloc[0]["issue_date"] if not crossed.empty else pd.NaT
        rows.append({
            "event_id": str(event["event_id"]),
            "location": str(event["location"]),
            "observed_by_date": str(anchor.date()),
            "eligible_issue_rows": int(len(window)),
            "detected": not crossed.empty,
            "first_crossing_issue_date": None if pd.isna(first) else str(first.date()),
            "archived_operational_lead_hours": None if pd.isna(first) else int((anchor - first).total_seconds() / 3600),
            "max_probability": None if window.empty else float(window["probability"].max()),
        })
    detected = sum(bool(r["detected"]) for r in rows)
    return {
        "detected_events": int(detected),
        "evaluated_events": int(len(rows)),
        "event_detection_rate": float(detected / len(rows)) if rows else None,
        "events": rows,
        "event_window": "2022-2024 OOF under consistent archived operational control-forecast contract",
    }


base.temporal_folds = temporal_folds
base.event_detection = event_detection

if __name__ == "__main__":
    base.main()
