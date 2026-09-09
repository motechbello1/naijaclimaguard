#!/usr/bin/env python3
"""Leakage-resistant scoring-only confirmation for Model v5.

This module MUST consume the already-frozen Model v5 issue-time dataset. It never
retrieves or mutates source data. For each outer scoring year (2022-2024), model
family and operating threshold are selected strictly from data available before
that year using temporal inner holdouts. The outer year is then scored once.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, brier_score_loss, confusion_matrix, precision_score, roc_auc_score

from model_v5_operational_native import (
    PILOT_LOCATIONS,
    apply_location_stats,
    event_detection,
    feature_group,
    fit_location_stats,
    make_pipeline,
    metric_bundle,
)

OUTER_YEARS = (2022, 2023, 2024)
CANDIDATES = (
    "logistic_operational_native",
    "random_forest_operational_native",
    "xgboost_operational_native",
)
GROUPS = ("core", "rain_only", "river_only")
PREDECLARED_FALLBACK_CANDIDATE = "logistic_operational_native"
PREDECLARED_FALLBACK_THRESHOLD = 0.50
THRESHOLD_GRID = tuple(float(x) for x in np.round(np.arange(0.01, 1.00, 0.01), 2))
MIN_EVENT_DETECTION = 0.75
MIN_PRECISION = 0.10
MAX_FP_PER_1000 = 10.0


def safe_auc(y: pd.Series, p: np.ndarray) -> dict:
    yv = np.asarray(y, dtype=int)
    pv = np.asarray(p, dtype=float)
    result = {"pr_auc": None, "roc_auc": None, "brier_score": float(brier_score_loss(yv, pv))}
    if np.unique(yv).size == 2:
        result["pr_auc"] = float(average_precision_score(yv, pv))
        result["roc_auc"] = float(roc_auc_score(yv, pv))
    return result


def monthly_inner_folds(prior: pd.DataFrame) -> Iterable[Tuple[str, pd.DataFrame, pd.DataFrame]]:
    """Expanding monthly holdouts entirely inside the prior-data window."""
    periods = sorted(prior["issue_date"].dt.to_period("M").unique())
    for period in periods:
        start = period.to_timestamp()
        end = (period + 1).to_timestamp()
        train = prior[prior["issue_date"] < start].copy()
        val = prior[(prior["issue_date"] >= start) & (prior["issue_date"] < end)].copy()
        if train.empty or val.empty:
            continue
        if train["label"].nunique() < 2 or val["label"].nunique() < 2:
            continue
        yield str(period), train, val


def fit_predict(candidate: str, group: str, train0: pd.DataFrame, val0: pd.DataFrame) -> np.ndarray:
    stats = fit_location_stats(train0)
    train = apply_location_stats(train0, stats)
    val = apply_location_stats(val0, stats)
    numeric = feature_group(group)
    y_train = train["label"].astype(int)
    positives = int(y_train.sum())
    negatives = int((y_train == 0).sum())
    pipe = make_pipeline(candidate, numeric, negatives / max(1, positives))
    cols = numeric + ["location"]
    pipe.fit(train[cols], y_train)
    return pipe.predict_proba(val[cols])[:, 1]


def inner_oof_for_candidate(prior: pd.DataFrame, candidate: str, group: str) -> pd.DataFrame:
    parts: List[pd.DataFrame] = []
    for fold_id, train, val in monthly_inner_folds(prior):
        probability = fit_predict(candidate, group, train, val)
        part = val[["issue_date", "location", "label", "future_event_ids"]].copy()
        part["probability"] = probability
        part["inner_fold"] = fold_id
        parts.append(part)
    if not parts:
        return pd.DataFrame(columns=["issue_date", "location", "label", "future_event_ids", "probability", "inner_fold"])
    return pd.concat(parts, ignore_index=True).sort_values(["issue_date", "location"])


def detection_from_decisions(scored: pd.DataFrame, events: pd.DataFrame) -> dict:
    e = events[events["include_in_benchmark"].astype(str).str.lower().eq("true")].copy()
    e["observed_by_date"] = pd.to_datetime(e["observed_by_date"])
    e = e[e["observed_by_date"].dt.year.isin(OUTER_YEARS)]
    rows: List[dict] = []
    for _, event in e.sort_values("observed_by_date").iterrows():
        anchor = event["observed_by_date"]
        window = scored[
            scored["location"].eq(event["location"])
            & (scored["issue_date"] < anchor)
            & (anchor <= scored["issue_date"] + pd.Timedelta(days=3))
        ].sort_values("issue_date")
        crossed = window[window["decision"].astype(bool)]
        first = crossed.iloc[0]["issue_date"] if not crossed.empty else pd.NaT
        rows.append({
            "event_id": str(event["event_id"]),
            "location": str(event["location"]),
            "observed_by_date": str(anchor.date()),
            "eligible_issue_rows": int(len(window)),
            "detected": not crossed.empty,
            "first_crossing_issue_date": None if pd.isna(first) else str(first.date()),
            "lead_hours": None if pd.isna(first) else int((anchor - first).total_seconds() / 3600),
            "max_probability": None if window.empty else float(window["probability"].max()),
        })
    detected = sum(bool(row["detected"]) for row in rows)
    leads = [row["lead_hours"] for row in rows if row["lead_hours"] is not None]
    return {
        "detected_events": int(detected),
        "evaluated_events": int(len(rows)),
        "event_detection_rate": float(detected / len(rows)) if rows else None,
        "median_lead_hours_detected": float(np.median(leads)) if leads else None,
        "events": rows,
    }


def threshold_summary(scored: pd.DataFrame, events: pd.DataFrame, threshold: float) -> dict:
    work = scored.copy()
    work["decision"] = work["probability"] >= threshold
    y = work["label"].astype(int).to_numpy()
    pred = work["decision"].astype(int).to_numpy()
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    negatives = int((y == 0).sum())
    event_result = detection_from_decisions(work, events)
    return {
        "threshold": float(threshold),
        "precision": float(precision_score(y, pred, zero_division=0)),
        "false_positive_issue_rows": int(fp),
        "false_positive_issue_rows_per_1000_negative": float(1000 * fp / negatives) if negatives else None,
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "event_detection": event_result,
    }


def select_candidate_and_threshold(prior: pd.DataFrame, events: pd.DataFrame, group: str) -> dict:
    candidate_rows: List[dict] = []
    candidate_oof: Dict[str, pd.DataFrame] = {}
    for candidate in CANDIDATES:
        oof = inner_oof_for_candidate(prior, candidate, group)
        candidate_oof[candidate] = oof
        if oof.empty or oof["label"].nunique() < 2:
            candidate_rows.append({"candidate": candidate, "usable": False, "reason": "no usable temporal inner OOF folds"})
            continue
        m = safe_auc(oof["label"], oof["probability"].to_numpy())
        candidate_rows.append({
            "candidate": candidate,
            "usable": True,
            "inner_rows": int(len(oof)),
            "inner_positive_rows": int(oof["label"].sum()),
            **m,
        })

    usable = [row for row in candidate_rows if row.get("usable") and row.get("pr_auc") is not None]
    if not usable:
        return {
            "candidate": PREDECLARED_FALLBACK_CANDIDATE,
            "threshold": PREDECLARED_FALLBACK_THRESHOLD,
            "selection_basis": "predeclared_fallback_no_usable_prior_inner_fold",
            "candidate_comparison": candidate_rows,
            "threshold_frontier": [],
        }

    usable.sort(key=lambda row: (float(row["pr_auc"]), -float(row["brier_score"]), float(row["roc_auc"] or -1)), reverse=True)
    selected = usable[0]["candidate"]
    oof = candidate_oof[selected]
    frontier: List[dict] = []
    for threshold in THRESHOLD_GRID:
        summary = threshold_summary(oof, events, threshold)
        fp1000 = summary["false_positive_issue_rows_per_1000_negative"]
        detection = summary["event_detection"]["event_detection_rate"]
        qualifies = bool(
            detection is not None and detection >= MIN_EVENT_DETECTION
            and summary["precision"] >= MIN_PRECISION
            and fp1000 is not None and fp1000 <= MAX_FP_PER_1000
        )
        frontier.append({
            "threshold": threshold,
            "precision": summary["precision"],
            "false_positive_issue_rows_per_1000_negative": fp1000,
            "event_detection_rate": detection,
            "qualifies": qualifies,
        })
    qualifying = [row for row in frontier if row["qualifies"]]
    threshold = max(qualifying, key=lambda row: row["threshold"])["threshold"] if qualifying else PREDECLARED_FALLBACK_THRESHOLD
    basis = "highest_prior_only_qualifying_threshold" if qualifying else "predeclared_0.50_no_prior_threshold_met_gate"
    return {
        "candidate": selected,
        "threshold": float(threshold),
        "selection_basis": basis,
        "candidate_comparison": candidate_rows,
        "threshold_frontier": frontier,
    }


def outer_confirmatory(df: pd.DataFrame, events: pd.DataFrame, group: str) -> dict:
    fold_rows: List[dict] = []
    scored_parts: List[pd.DataFrame] = []
    for year in OUTER_YEARS:
        prior = df[df["issue_date"] < pd.Timestamp(f"{year}-01-01")].copy()
        test = df[df["issue_date"].dt.year.eq(year)].copy()
        if prior.empty or test.empty or prior["label"].nunique() < 2 or test["label"].nunique() < 2:
            fold_rows.append({
                "year": year,
                "usable": False,
                "prior_rows": int(len(prior)),
                "test_rows": int(len(test)),
                "reason": "outer fold lacks both classes or rows",
            })
            continue
        selection = select_candidate_and_threshold(prior, events[events["observed_by_date"].astype(str) < f"{year}-01-01"], group)
        candidate = selection["candidate"]
        threshold = float(selection["threshold"])
        probability = fit_predict(candidate, group, prior, test)
        part = test[["issue_date", "location", "label", "future_event_ids"]].copy()
        part["probability"] = probability
        part["outer_year"] = year
        part["candidate"] = candidate
        part["threshold"] = threshold
        part["decision"] = probability >= threshold
        scored_parts.append(part)
        fold_rows.append({
            "year": year,
            "usable": True,
            "prior_rows": int(len(prior)),
            "test_rows": int(len(test)),
            "test_positive_rows": int(test["label"].sum()),
            "selected_candidate": candidate,
            "selected_threshold": threshold,
            "selection_basis": selection["selection_basis"],
            "prior_only_selection": selection,
            "outer_probability_metrics": safe_auc(test["label"], probability),
        })

    if not scored_parts:
        raise RuntimeError(f"No usable confirmatory outer folds for {group}")
    scored = pd.concat(scored_parts, ignore_index=True).sort_values(["issue_date", "location"])
    probability_metrics = safe_auc(scored["label"], scored["probability"].to_numpy())
    decisions = scored["decision"].astype(int).to_numpy()
    y = scored["label"].astype(int).to_numpy()
    tn, fp, fn, tp = confusion_matrix(y, decisions, labels=[0, 1]).ravel()
    negatives = int((y == 0).sum())
    event_result = detection_from_decisions(scored, events)
    per_location = {}
    for location, local in scored.groupby("location"):
        lm = safe_auc(local["label"], local["probability"].to_numpy())
        lp = local["decision"].astype(int).to_numpy()
        ly = local["label"].astype(int).to_numpy()
        ltn, lfp, lfn, ltp = confusion_matrix(ly, lp, labels=[0, 1]).ravel()
        per_location[str(location)] = {
            "rows": int(len(local)),
            "positive_rows": int(local["label"].sum()),
            **lm,
            "precision": float(precision_score(ly, lp, zero_division=0)),
            "false_positive_issue_rows": int(lfp),
            "confusion_matrix": {"tn": int(ltn), "fp": int(lfp), "fn": int(lfn), "tp": int(ltp)},
        }
    candidates = [row["selected_candidate"] for row in fold_rows if row.get("usable")]
    return {
        "feature_group": group,
        "outer_folds": fold_rows,
        "selected_candidate_mode": Counter(candidates).most_common(1)[0][0] if candidates else None,
        "pooled_outer_probability_metrics": probability_metrics,
        "pooled_outer_decision_metrics": {
            "precision": float(precision_score(y, decisions, zero_division=0)),
            "false_positive_issue_rows": int(fp),
            "false_positive_issue_rows_per_1000_negative": float(1000 * fp / negatives) if negatives else None,
            "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        },
        "eligible_event_detection": event_result,
        "per_location": per_location,
        "scored": scored,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="validation/model_v5_issue_dataset.csv")
    parser.add_argument("--events", default="validation/model_v4_event_registry.csv")
    parser.add_argument("--output", default="validation/model_v5_confirmatory_results.json")
    parser.add_argument("--scored-prefix", default="validation/model_v5_confirmatory_scored")
    args = parser.parse_args()

    df = pd.read_csv(args.dataset, parse_dates=["issue_date"])
    events = pd.read_csv(args.events)
    events["observed_by_date"] = pd.to_datetime(events["observed_by_date"])
    if set(df["location"].astype(str).unique()) != PILOT_LOCATIONS:
        raise ValueError("Confirmatory scoring requires the frozen five-location Model v5 dataset")

    group_results = {group: outer_confirmatory(df, events, group) for group in GROUPS}
    core = group_results["core"]
    rain = group_results["rain_only"]
    river = group_results["river_only"]
    core_pr = core["pooled_outer_probability_metrics"]["pr_auc"]
    rain_pr = rain["pooled_outer_probability_metrics"]["pr_auc"]
    river_pr = river["pooled_outer_probability_metrics"]["pr_auc"]
    core_brier = core["pooled_outer_probability_metrics"]["brier_score"]
    core_event = core["eligible_event_detection"]["event_detection_rate"]
    core_precision = core["pooled_outer_decision_metrics"]["precision"]
    core_fp1000 = core["pooled_outer_decision_metrics"]["false_positive_issue_rows_per_1000_negative"]

    ablation_pass = bool(core_pr is not None and rain_pr is not None and river_pr is not None and core_pr > rain_pr and core_pr > river_pr)
    decision_gate = bool(
        ablation_pass
        and core_event is not None and core_event >= MIN_EVENT_DETECTION
        and core_precision >= MIN_PRECISION
        and core_fp1000 is not None and core_fp1000 <= MAX_FP_PER_1000
    )

    registry_count = int(events[events["include_in_benchmark"].astype(str).str.lower().eq("true")]["event_id"].nunique())
    evaluated_count = int(core["eligible_event_detection"]["evaluated_events"])

    for group, result in group_results.items():
        result["scored"].to_csv(f"{args.scored_prefix}_{group}.csv", index=False)
        result.pop("scored", None)

    result = {
        "status": "freeze_candidate_serialized_not_production_validated" if decision_gate else "freeze_blocked",
        "evidence_class": "scoring_only_nested_temporal_confirmation_on_frozen_archived_operational_inputs",
        "production_engine_remains": "derived-v2",
        "outer_scoring_years": list(OUTER_YEARS),
        "selection_rule": "candidate and threshold selected using only information strictly before each outer scoring year",
        "fallback_rule": {
            "candidate": PREDECLARED_FALLBACK_CANDIDATE,
            "threshold": PREDECLARED_FALLBACK_THRESHOLD,
            "when": "no usable temporal inner OOF fold or no threshold satisfies prior-only gates",
        },
        "event_denominator": {
            "eligible_evaluated_events": evaluated_count,
            "documented_registry_events": registry_count,
        },
        "groups": group_results,
        "confirmatory_gates": {
            "combined_pr_auc_beats_nasa_only_and_glofas_only": ablation_pass,
            "minimum_event_detection_rate": MIN_EVENT_DETECTION,
            "minimum_precision": MIN_PRECISION,
            "maximum_false_positive_rows_per_1000_negative": MAX_FP_PER_1000,
            "all_pass": decision_gate,
        },
        "replacement_authorized": False,
        "warning": "Archived operational replay plus nested temporal confirmation is historical evidence, not prospective production validation.",
    }
    Path(args.output).write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
