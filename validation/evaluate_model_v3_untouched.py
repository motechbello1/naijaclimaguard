#!/usr/bin/env python3
"""One-shot evaluator for a frozen Model v3 candidate on a new untouched/prospective holdout.

Never use this script to tune the model. Once an eligible holdout is opened, that
period is consumed whether the result passes or fails.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd

import model_v3_dev as m

MIN_EVENTS = 20
MIN_EVENT_DETECTION_RATE = 0.75
MIN_EVENT_DETECTION_WILSON_LOWER_95 = 0.50
MAX_FP_PER_1000_NEGATIVE = 10.0
MIN_PRECISION = 0.10
MIN_PR_AUC_LIFT_OVER_PREVALENCE = 2.0
MIN_LOCATION_EVENT_DETECTION_WITH_3_EVENTS = 0.50
PILOT_LOCATIONS = {"Lokoja", "Makurdi", "Onitsha", "Yenagoa", "Hadejia"}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def wilson_lower(successes: int, total: int, z: float = 1.959963984540054) -> float | None:
    if total <= 0:
        return None
    phat = successes / total
    z2 = z * z
    denom = 1.0 + z2 / total
    centre = phat + z2 / (2.0 * total)
    spread = z * math.sqrt((phat * (1.0 - phat) / total) + z2 / (4.0 * total * total))
    return float((centre - spread) / denom)


def load_holdout_events(path: Path, freeze_date: pd.Timestamp) -> pd.DataFrame:
    events = pd.read_csv(path, parse_dates=["observed_by_date", "event_end_date"])
    if "include_in_benchmark" in events.columns:
        events = events[events["include_in_benchmark"].astype(str).str.lower().eq("true")].copy()
    if events.empty:
        raise ValueError("No enabled untouched/prospective holdout events found")
    if not events["event_id"].is_unique:
        raise ValueError("Holdout event IDs must be unique")
    if (events["observed_by_date"] <= freeze_date).any():
        raise ValueError("Holdout contains an event on/before the frozen-candidate date")
    if not set(events["location"].astype(str)).issubset(PILOT_LOCATIONS):
        raise ValueError("This acceptance evaluator is limited to the five frozen pilot locations")
    if "source" in events.columns and events["source"].fillna("").str.strip().eq("").any():
        raise ValueError("Every holdout event must preserve an independent documentary source")
    if "source_url" in events.columns and events["source_url"].fillna("").str.strip().eq("").any():
        raise ValueError("Every holdout event must preserve source provenance")
    return events.sort_values("observed_by_date").reset_index(drop=True)


def attach_holdout_labels(features: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:
    x = features.copy()
    x["label"] = 0
    x["event_id"] = ""
    positive_any = pd.Series(False, index=x.index)
    uncertain_any = pd.Series(False, index=x.index)
    for _, event in events.iterrows():
        same = x["location"].eq(event["location"])
        anchor = event["observed_by_date"]
        positive = same & x["date"].between(anchor - pd.Timedelta(days=3), anchor)
        uncertain = same & x["date"].between(anchor - pd.Timedelta(days=14), anchor + pd.Timedelta(days=14))
        positive_any |= positive
        uncertain_any |= uncertain
        x.loc[positive, "label"] = 1
        existing = x.loc[positive, "event_id"].astype(str)
        x.loc[positive, "event_id"] = np.where(
            existing.eq(""), str(event["event_id"]), existing + ";" + str(event["event_id"])
        )
    x["excluded"] = uncertain_any & ~positive_any
    return x[~x["excluded"]].copy().reset_index(drop=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifact", type=Path, required=True)
    ap.add_argument("--manifest", type=Path, required=True)
    ap.add_argument("--features", type=Path, required=True)
    ap.add_argument("--events", type=Path, required=True)
    ap.add_argument("--output", type=Path, default=Path("validation/model_v3_untouched_result.json"))
    args = ap.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    if manifest.get("status") != "freeze_candidate_serialized" or not manifest.get("ready_for_new_untouched_holdout"):
        raise ValueError("No eligible frozen Model v3 candidate is available for untouched evaluation")
    if sha256_file(args.artifact) != manifest.get("artifact_sha256"):
        raise ValueError("Frozen artifact hash does not match the freeze manifest")

    freeze_date = pd.Timestamp(manifest["created_at_utc"]).tz_convert(None).floor("D")
    features = pd.read_csv(args.features, parse_dates=["date"])
    if features.empty:
        raise ValueError("Untouched feature table is empty")
    if (features["date"] <= freeze_date).any():
        raise ValueError("Untouched feature table contains dates on/before the freeze date")
    if not set(features["location"].astype(str)).issubset(PILOT_LOCATIONS):
        raise ValueError("Untouched acceptance evaluation is limited to the frozen five pilot locations")

    events = load_holdout_events(args.events, freeze_date)
    labelled = attach_holdout_labels(features, events)
    frozen = joblib.load(args.artifact)
    calibration = frozen["location_calibration"]
    transformed = m.add_cyclic_season(m.apply_location_calibration(labelled, calibration))
    feature_columns: List[str] = list(frozen["feature_columns"])
    missing = [c for c in feature_columns if c not in transformed.columns]
    if missing:
        raise ValueError(f"Untouched features are missing frozen columns: {missing}")

    X = transformed[feature_columns].replace([np.inf, -np.inf], np.nan)
    y = transformed["label"].astype(int)
    probability = frozen["model"].predict_proba(X)[:, 1]
    threshold = float(frozen["threshold"])
    scored = transformed[["date", "location", "label", "event_id"]].copy()
    scored["probability"] = probability

    metrics = m.metric_bundle(y, probability, threshold)
    event_metrics = m.event_detection(scored, events, threshold)
    per_location = m.per_location_diagnostics(scored, events, threshold)

    prevalence = float(y.mean())
    pr_auc = metrics.get("pr_auc")
    pr_lift = None if pr_auc is None or prevalence <= 0 else float(pr_auc / prevalence)
    prevalence_brier = float(np.mean((y.to_numpy(dtype=float) - prevalence) ** 2))
    fp = int(metrics["confusion_matrix"]["fp"])
    negatives = int((y == 0).sum())
    fp_per_1000 = float(1000.0 * fp / negatives) if negatives else None
    detected = int(event_metrics["detected_events"])
    total_events = int(event_metrics["evaluated_events"])
    detection_rate = event_metrics["event_detection_rate"]
    wilson = wilson_lower(detected, total_events)

    location_gate_rows: Dict[str, object] = {}
    location_gate_pass = True
    for location, diagnostic in per_location.items():
        em = diagnostic["event_metrics"]
        n_events = int(em["evaluated_events"])
        rate = em["event_detection_rate"]
        applies = n_events >= 3
        passed = (not applies) or (rate is not None and float(rate) >= MIN_LOCATION_EVENT_DETECTION_WITH_3_EVENTS)
        location_gate_pass = location_gate_pass and passed
        location_gate_rows[location] = {
            "evaluated_events": n_events,
            "event_detection_rate": rate,
            "gate_applies": applies,
            "passes_location_gate": passed,
        }

    evidence_sufficient = total_events >= MIN_EVENTS
    gates = {
        "minimum_20_independent_events": evidence_sufficient,
        "event_detection_rate_at_least_0_75": bool(detection_rate is not None and float(detection_rate) >= MIN_EVENT_DETECTION_RATE),
        "wilson_lower_95_at_least_0_50": bool(wilson is not None and wilson >= MIN_EVENT_DETECTION_WILSON_LOWER_95),
        "false_positive_burden_at_most_10_per_1000_negative": bool(fp_per_1000 is not None and fp_per_1000 <= MAX_FP_PER_1000_NEGATIVE),
        "precision_at_least_0_10": bool(float(metrics["precision"]) >= MIN_PRECISION),
        "pr_auc_at_least_2x_prevalence": bool(pr_lift is not None and pr_lift >= MIN_PR_AUC_LIFT_OVER_PREVALENCE),
        "brier_better_than_prevalence_baseline": bool(float(metrics["brier_score"]) < prevalence_brier),
        "per_location_event_detection_gate": bool(location_gate_pass),
    }
    passed = all(gates.values())

    result = {
        "status": "untouched_acceptance_pass" if passed else ("insufficient_untouched_events" if not evidence_sufficient else "untouched_acceptance_fail"),
        "holdout_consumed": True,
        "holdout_warning": "Do not tune or retest this frozen candidate on the same holdout after reading this result.",
        "freeze_date": str(freeze_date.date()),
        "holdout_date_start": str(features["date"].min().date()),
        "holdout_date_end": str(features["date"].max().date()),
        "frozen_candidate": frozen["candidate"],
        "frozen_threshold": threshold,
        "feature_columns": feature_columns,
        "independent_events": total_events,
        "row_prevalence": prevalence,
        "metrics": metrics,
        "pr_auc_lift_over_prevalence": pr_lift,
        "constant_prevalence_brier_baseline": prevalence_brier,
        "false_positive_location_days_per_1000_negative": fp_per_1000,
        "event_metrics": event_metrics,
        "event_detection_wilson_lower_95": wilson,
        "per_location": per_location,
        "per_location_acceptance_checks": location_gate_rows,
        "predeclared_acceptance_gates": gates,
        "minimum_acceptance_pass": passed,
        "issue_time_24_48_72_hour_claim_validated": False,
        "production_auto_deploy": False,
        "production_engine_change_authorized": False,
        "interpretation": (
            "A statistical pass would support further operational readiness review for this frozen observational/current-state risk model. "
            "It would not by itself establish a fixed issue-time lead claim or automatically replace official warning systems."
        ),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
