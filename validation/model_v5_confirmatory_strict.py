#!/usr/bin/env python3
"""Strict scoring-only confirmation for Model v5.

Consumes the frozen issue-time Model v5 dataset only. It never downloads source
material. For each outer year 2022-2024, candidate model and threshold are
selected strictly from information before that year, then the outer year is
scored once. A freeze candidate requires all three outer years to be present.
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
    EXPECTED_EVENTS,
    PILOT_LOCATIONS,
    apply_location_stats,
    feature_group,
    fit_location_stats,
    make_pipeline,
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


def probability_metrics(y_true: pd.Series, probability: np.ndarray) -> dict:
    y = np.asarray(y_true, dtype=int)
    p = np.asarray(probability, dtype=float)
    result = {"pr_auc": None, "roc_auc": None, "brier_score": float(brier_score_loss(y, p))}
    if np.unique(y).size == 2:
        result["pr_auc"] = float(average_precision_score(y, p))
        result["roc_auc"] = float(roc_auc_score(y, p))
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


def inner_oof(prior: pd.DataFrame, candidate: str, group: str) -> pd.DataFrame:
    parts: List[pd.DataFrame] = []
    for fold_id, train, val in monthly_inner_folds(prior):
        p = fit_predict(candidate, group, train, val)
        part = val[["issue_date", "location", "label", "future_event_ids"]].copy()
        part["probability"] = p
        part["inner_fold"] = fold_id
        parts.append(part)
    if not parts:
        return pd.DataFrame(columns=["issue_date", "location", "label", "future_event_ids", "probability", "inner_fold"])
    return pd.concat(parts, ignore_index=True).sort_values(["issue_date", "location"])


def event_detection(scored: pd.DataFrame, events: pd.DataFrame) -> dict:
    """Evaluate exactly the event rows supplied by the caller.

    Inner selection passes only events strictly before the outer year. Final
    confirmation passes only 2022-2024 eligible events. No hidden year filter is
    applied here.
    """
    e = events[events["include_in_benchmark"].astype(str).str.lower().eq("true")].copy()
    e["observed_by_date"] = pd.to_datetime(e["observed_by_date"])
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
            "detected": bool(not crossed.empty),
            "first_crossing_issue_date": None if pd.isna(first) else str(first.date()),
            "lead_hours": None if pd.isna(first) else int((anchor - first).total_seconds() / 3600),
            "max_probability": None if window.empty else float(window["probability"].max()),
        })
    eligible_rows = [r for r in rows if r["eligible_issue_rows"] > 0]
    detected = sum(bool(r["detected"]) for r in eligible_rows)
    leads = [r["lead_hours"] for r in eligible_rows if r["lead_hours"] is not None]
    return {
        "detected_events": int(detected),
        "evaluated_events": int(len(eligible_rows)),
        "documented_events_supplied": int(len(rows)),
        "events_without_eligible_issue_rows": int(len(rows) - len(eligible_rows)),
        "event_detection_rate": float(detected / len(eligible_rows)) if eligible_rows else None,
        "median_lead_hours_detected": float(np.median(leads)) if leads else None,
        "events": rows,
    }


def decision_summary(scored: pd.DataFrame, events: pd.DataFrame, threshold: float) -> dict:
    work = scored.copy()
    work["decision"] = work["probability"] >= threshold
    y = work["label"].astype(int).to_numpy()
    pred = work["decision"].astype(int).to_numpy()
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    negatives = int((y == 0).sum())
    return {
        "threshold": float(threshold),
        "precision": float(precision_score(y, pred, zero_division=0)),
        "false_positive_issue_rows": int(fp),
        "false_positive_issue_rows_per_1000_negative": float(1000 * fp / negatives) if negatives else None,
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "event_detection": event_detection(work, events),
    }


def select_prior_only(prior: pd.DataFrame, prior_events: pd.DataFrame, group: str) -> dict:
    comparisons: List[dict] = []
    oof_by_candidate: Dict[str, pd.DataFrame] = {}
    for candidate in CANDIDATES:
        oof = inner_oof(prior, candidate, group)
        oof_by_candidate[candidate] = oof
        if oof.empty or oof["label"].nunique() < 2:
            comparisons.append({"candidate": candidate, "usable": False, "reason": "no usable temporal inner OOF folds"})
            continue
        m = probability_metrics(oof["label"], oof["probability"].to_numpy())
        comparisons.append({
            "candidate": candidate,
            "usable": True,
            "inner_rows": int(len(oof)),
            "inner_positive_rows": int(oof["label"].sum()),
            **m,
        })

    usable = [r for r in comparisons if r.get("usable") and r.get("pr_auc") is not None]
    if not usable:
        return {
            "candidate": PREDECLARED_FALLBACK_CANDIDATE,
            "threshold": PREDECLARED_FALLBACK_THRESHOLD,
            "selection_basis": "predeclared_fallback_no_usable_prior_inner_fold",
            "candidate_comparison": comparisons,
            "threshold_frontier": [],
        }

    usable.sort(
        key=lambda r: (float(r["pr_auc"]), -float(r["brier_score"]), float(r["roc_auc"] if r["roc_auc"] is not None else -1.0)),
        reverse=True,
    )
    selected = str(usable[0]["candidate"])
    oof = oof_by_candidate[selected]
    frontier: List[dict] = []
    for threshold in THRESHOLD_GRID:
        d = decision_summary(oof, prior_events, threshold)
        detection = d["event_detection"]["event_detection_rate"]
        fp1000 = d["false_positive_issue_rows_per_1000_negative"]
        qualifies = bool(
            detection is not None and detection >= MIN_EVENT_DETECTION
            and d["precision"] >= MIN_PRECISION
            and fp1000 is not None and fp1000 <= MAX_FP_PER_1000
        )
        frontier.append({
            "threshold": float(threshold),
            "precision": d["precision"],
            "false_positive_issue_rows_per_1000_negative": fp1000,
            "event_detection_rate": detection,
            "eligible_prior_events": d["event_detection"]["evaluated_events"],
            "qualifies": qualifies,
        })
    qualifying = [r for r in frontier if r["qualifies"]]
    if qualifying:
        chosen_threshold = float(max(qualifying, key=lambda r: r["threshold"])["threshold"])
        basis = "highest_prior_only_qualifying_threshold"
    else:
        chosen_threshold = PREDECLARED_FALLBACK_THRESHOLD
        basis = "predeclared_0.50_no_prior_threshold_met_gate"
    return {
        "candidate": selected,
        "threshold": chosen_threshold,
        "selection_basis": basis,
        "candidate_comparison": comparisons,
        "threshold_frontier": frontier,
    }


def run_group(df: pd.DataFrame, events: pd.DataFrame, group: str) -> dict:
    folds: List[dict] = []
    scored_parts: List[pd.DataFrame] = []
    for year in OUTER_YEARS:
        prior = df[df["issue_date"] < pd.Timestamp(f"{year}-01-01")].copy()
        test = df[df["issue_date"].dt.year.eq(year)].copy()
        prior_events = events[
            events["include_in_benchmark"].astype(str).str.lower().eq("true")
            & (events["observed_by_date"] < pd.Timestamp(f"{year}-01-01"))
        ].copy()

        # The outer year is never silently omitted merely because its test set
        # contains one class. Probability AUC may be undefined, but decision
        # evidence and Brier remain reportable. Only an unfit prior window or an
        # empty test window makes the fold non-runnable.
        if prior.empty or test.empty or prior["label"].nunique() < 2:
            folds.append({
                "year": year,
                "usable": False,
                "prior_rows": int(len(prior)),
                "test_rows": int(len(test)),
                "reason": "outer fold has empty data or prior training lacks both classes",
            })
            continue

        selection = select_prior_only(prior, prior_events, group)
        candidate = str(selection["candidate"])
        threshold = float(selection["threshold"])
        probability = fit_predict(candidate, group, prior, test)
        part = test[["issue_date", "location", "label", "future_event_ids"]].copy()
        part["probability"] = probability
        part["outer_year"] = year
        part["candidate"] = candidate
        part["threshold"] = threshold
        part["decision"] = probability >= threshold
        scored_parts.append(part)
        folds.append({
            "year": year,
            "usable": True,
            "prior_rows": int(len(prior)),
            "test_rows": int(len(test)),
            "test_positive_rows": int(test["label"].sum()),
            "selected_candidate": candidate,
            "selected_threshold": threshold,
            "selection_basis": selection["selection_basis"],
            "prior_event_count": int(prior_events["event_id"].nunique()),
            "prior_only_selection": selection,
            "outer_probability_metrics": probability_metrics(test["label"], probability),
        })

    usable_years = [int(f["year"]) for f in folds if f.get("usable")]
    all_outer_years_present = tuple(usable_years) == OUTER_YEARS
    if not scored_parts:
        raise RuntimeError(f"No runnable confirmatory outer folds for {group}")

    scored = pd.concat(scored_parts, ignore_index=True).sort_values(["issue_date", "location"])
    y = scored["label"].astype(int).to_numpy()
    decisions = scored["decision"].astype(int).to_numpy()
    tn, fp, fn, tp = confusion_matrix(y, decisions, labels=[0, 1]).ravel()
    negatives = int((y == 0).sum())
    outer_events = events[
        events["include_in_benchmark"].astype(str).str.lower().eq("true")
        & events["observed_by_date"].dt.year.isin(OUTER_YEARS)
    ].copy()
    outer_event_result = event_detection(scored, outer_events)

    per_location = {}
    for location, local in scored.groupby("location"):
        ly = local["label"].astype(int).to_numpy()
        lp = local["decision"].astype(int).to_numpy()
        ltn, lfp, lfn, ltp = confusion_matrix(ly, lp, labels=[0, 1]).ravel()
        per_location[str(location)] = {
            "rows": int(len(local)),
            "positive_rows": int(local["label"].sum()),
            **probability_metrics(local["label"], local["probability"].to_numpy()),
            "precision": float(precision_score(ly, lp, zero_division=0)),
            "false_positive_issue_rows": int(lfp),
            "confusion_matrix": {"tn": int(ltn), "fp": int(lfp), "fn": int(lfn), "tp": int(ltp)},
        }

    return {
        "feature_group": group,
        "outer_folds": folds,
        "all_outer_years_present": bool(all_outer_years_present),
        "selected_candidate_mode": Counter([f["selected_candidate"] for f in folds if f.get("usable")]).most_common(1)[0][0] if usable_years else None,
        "pooled_outer_probability_metrics": probability_metrics(scored["label"], scored["probability"].to_numpy()),
        "pooled_outer_decision_metrics": {
            "precision": float(precision_score(y, decisions, zero_division=0)),
            "false_positive_issue_rows": int(fp),
            "false_positive_issue_rows_per_1000_negative": float(1000 * fp / negatives) if negatives else None,
            "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        },
        "eligible_event_detection": outer_event_result,
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
    registry = events[events["include_in_benchmark"].astype(str).str.lower().eq("true")]
    if registry["event_id"].nunique() != EXPECTED_EVENTS:
        raise ValueError(f"Confirmatory scoring requires the frozen {EXPECTED_EVENTS}-event registry")

    group_results = {group: run_group(df, events, group) for group in GROUPS}
    core = group_results["core"]
    rain = group_results["rain_only"]
    river = group_results["river_only"]

    core_pr = core["pooled_outer_probability_metrics"]["pr_auc"]
    rain_pr = rain["pooled_outer_probability_metrics"]["pr_auc"]
    river_pr = river["pooled_outer_probability_metrics"]["pr_auc"]
    event_rate = core["eligible_event_detection"]["event_detection_rate"]
    precision = core["pooled_outer_decision_metrics"]["precision"]
    fp1000 = core["pooled_outer_decision_metrics"]["false_positive_issue_rows_per_1000_negative"]

    complete_outer_pass = all(bool(group_results[g]["all_outer_years_present"]) for g in GROUPS)
    ablation_pass = bool(core_pr is not None and rain_pr is not None and river_pr is not None and core_pr > rain_pr and core_pr > river_pr)
    decision_gate = bool(
        complete_outer_pass
        and ablation_pass
        and event_rate is not None and event_rate >= MIN_EVENT_DETECTION
        and precision >= MIN_PRECISION
        and fp1000 is not None and fp1000 <= MAX_FP_PER_1000
    )

    for group, result in group_results.items():
        result["scored"].to_csv(f"{args.scored_prefix}_{group}.csv", index=False)
        result.pop("scored", None)

    result = {
        "status": "freeze_candidate_serialized_not_production_validated" if decision_gate else "freeze_blocked",
        "evidence_class": "strict_scoring_only_nested_temporal_confirmation_on_frozen_archived_operational_inputs",
        "production_engine_remains": "derived-v2",
        "outer_scoring_years": list(OUTER_YEARS),
        "selection_rule": "candidate and threshold selected using only rows and eligible events strictly before each outer scoring year",
        "fallback_rule": {
            "candidate": PREDECLARED_FALLBACK_CANDIDATE,
            "threshold": PREDECLARED_FALLBACK_THRESHOLD,
            "when": "no usable prior temporal inner OOF candidate or no prior-only threshold satisfies the frozen threshold gates",
        },
        "event_denominator": {
            "eligible_evaluated_events": int(core["eligible_event_detection"]["evaluated_events"]),
            "documented_outer_year_events": int(core["eligible_event_detection"]["documented_events_supplied"]),
            "documented_registry_events": int(registry["event_id"].nunique()),
        },
        "groups": group_results,
        "confirmatory_gates": {
            "all_2022_2023_2024_outer_years_present_for_all_groups": complete_outer_pass,
            "combined_pr_auc_beats_nasa_only_and_glofas_only": ablation_pass,
            "minimum_event_detection_rate": MIN_EVENT_DETECTION,
            "minimum_precision": MIN_PRECISION,
            "maximum_false_positive_rows_per_1000_negative": MAX_FP_PER_1000,
            "all_pass": decision_gate,
        },
        "replacement_authorized": False,
        "warning": "Archived operational replay plus strict nested temporal confirmation is historical evidence, not prospective production validation.",
    }
    Path(args.output).write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
