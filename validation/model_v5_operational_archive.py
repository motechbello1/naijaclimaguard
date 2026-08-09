#!/usr/bin/env python3
"""Model v5 wrapper for archived operational GloFAS forecasts (2020-2024).

Reuses the frozen Model v5 candidate implementations and threshold machinery,
changing only the archive-eligible temporal folds and event denominator.
"""
from __future__ import annotations

import pandas as pd
import model_v5_operational_native as base

VALIDATION_YEARS = range(2020, 2025)


def temporal_folds(df: pd.DataFrame):
    for year in VALIDATION_YEARS:
        train = df[df["issue_date"] < pd.Timestamp(f"{year}-01-01")].copy()
        val = df[df["issue_date"].dt.year.eq(year)].copy()
        if train.empty or val.empty or train["label"].nunique() < 2 or val["label"].nunique() < 2:
            yield year, train, val, False
        else:
            yield year, train, val, True


def event_detection(scored: pd.DataFrame, events: pd.DataFrame, threshold: float) -> dict:
    e = events[events["include_in_benchmark"].astype(str).str.lower().eq("true")].copy()
    e["observed_by_date"] = pd.to_datetime(e["observed_by_date"])
    e = e[e["observed_by_date"].dt.year.between(2020, 2024)]
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
        "event_window": "2020-2024 archived operational eligibility",
    }


base.temporal_folds = temporal_folds
base.event_detection = event_detection

if __name__ == "__main__":
    base.main()
