#!/usr/bin/env python3
"""Pretrained TabPFN-v2 challenger for the Model-v5 issue-time dataset.

This script is intentionally separate from the frozen Model-v5 candidate run.
It performs outer walk-forward scoring for 2022-2024 and chooses each outer
fold's operating threshold from strictly prior inner out-of-fold predictions.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics import accuracy_score

import model_v5_operational_native as base

ARCHIVE_START = pd.Timestamp("2021-05-26")
OUTER_YEARS = (2022, 2023, 2024)
REGISTRY_SIZE = 35
THRESHOLDS = np.round(np.arange(0.01, 1.00, 0.01), 2)


def _load_tabpfn_v2():
    """Pin TabPFN v2 rather than silently using the package's latest model."""
    try:
        from tabpfn import TabPFNClassifier
        from tabpfn.constants import ModelVersion
    except Exception as exc:  # pragma: no cover - dependency/runtime gate
        raise RuntimeError(
            "TabPFN is not installed. Install the pinned challenger runtime before execution."
        ) from exc
    return TabPFNClassifier.create_default_for_version(ModelVersion.V2)


def _feature_names(group: str) -> list[str]:
    if group == "combined":
        return base.feature_group("core")
    if group == "nasa_only":
        return base.feature_group("rain_only")
    if group == "glofas_only":
        return base.feature_group("river_only")
    raise ValueError(group)


def _prepare(train0: pd.DataFrame, val0: pd.DataFrame, group: str):
    """Fit every learned preprocessing statistic on train only."""
    stats = base.fit_location_stats(train0)
    train = base.apply_location_stats(train0, stats)
    val = base.apply_location_stats(val0, stats)
    numeric = _feature_names(group)
    cols = numeric + ["location"]
    pre = ColumnTransformer(
        [
            ("num", SimpleImputer(strategy="median"), numeric),
            ("location", OneHotEncoder(handle_unknown="ignore", sparse_output=False), ["location"]),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )
    x_train = pre.fit_transform(train[cols])
    x_val = pre.transform(val[cols])
    return train, val, np.asarray(x_train, dtype=np.float32), np.asarray(x_val, dtype=np.float32)


def _fit_predict(train0: pd.DataFrame, val0: pd.DataFrame, group: str) -> np.ndarray:
    train, _val, x_train, x_val = _prepare(train0, val0, group)
    y_train = train["label"].astype(int).to_numpy()
    if np.unique(y_train).size != 2:
        raise RuntimeError("TabPFN fold training data must contain both classes")
    model = _load_tabpfn_v2()
    model.fit(x_train, y_train)
    return np.asarray(model.predict_proba(x_val)[:, 1], dtype=float)


def _event_rows(scored: pd.DataFrame, events: pd.DataFrame, max_event_year: int, threshold: float) -> dict:
    e = events[events["include_in_benchmark"].astype(str).str.lower().eq("true")].copy()
    e["observed_by_date"] = pd.to_datetime(e["observed_by_date"])
    e = e[(e["observed_by_date"].dt.year >= 2022) & (e["observed_by_date"].dt.year <= max_event_year)]
    rows = []
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
            "detected": bool(not crossed.empty),
            "first_crossing_issue_date": None if pd.isna(first) else str(first.date()),
            "lead_hours": None if pd.isna(first) else int((anchor - first).total_seconds() / 3600),
        })
    detected = sum(r["detected"] for r in rows)
    return {
        "detected_events": int(detected),
        "evaluated_events": int(len(rows)),
        "event_detection_rate": None if not rows else float(detected / len(rows)),
        "events": rows,
    }


def _inner_oof(prior: pd.DataFrame, outer_year: int, group: str) -> pd.DataFrame:
    """Generate only earlier-year predictions for outer-threshold selection."""
    parts = []
    for inner_year in range(2022, outer_year):
        train = prior[prior["issue_date"] < pd.Timestamp(f"{inner_year}-01-01")].copy()
        val = prior[prior["issue_date"].dt.year.eq(inner_year)].copy()
        if train.empty or val.empty or train["label"].nunique() < 2 or val["label"].nunique() < 2:
            continue
        probability = _fit_predict(train, val, group)
        p = val[["issue_date", "location", "label", "future_event_ids"]].copy()
        p["probability"] = probability
        p["validation_year"] = inner_year
        parts.append(p)
    if not parts:
        return pd.DataFrame(columns=["issue_date", "location", "label", "future_event_ids", "probability", "validation_year"])
    return pd.concat(parts, ignore_index=True).sort_values(["issue_date", "location"])


def _select_prior_threshold(inner: pd.DataFrame, events: pd.DataFrame, outer_year: int) -> tuple[float, dict]:
    if inner.empty:
        return 0.50, {"rule": "predeclared_0.50_fallback_no_prior_inner_oof", "candidate_count": 0}
    y = inner["label"].to_numpy(dtype=int)
    p = inner["probability"].to_numpy(dtype=float)
    negatives = int((y == 0).sum())
    rows = []
    for threshold in THRESHOLDS:
        metrics = base.metric_bundle(y, p, float(threshold))
        cm = metrics["confusion_matrix"]
        fp1000 = None if not negatives else float(1000.0 * cm["fp"] / negatives)
        ev = _event_rows(inner, events, outer_year - 1, float(threshold))
        qualifies = bool(
            ev["event_detection_rate"] is not None
            and ev["event_detection_rate"] >= 0.75
            and metrics["precision"] >= 0.10
            and fp1000 is not None
            and fp1000 <= 10.0
        )
        rows.append({
            "threshold": float(threshold),
            "f1": metrics["f1"],
            "precision": metrics["precision"],
            "fp_per_1000": fp1000,
            "event_detection_rate": ev["event_detection_rate"],
            "qualifies_original_gate": qualifies,
        })
    qualifying = [r for r in rows if r["qualifies_original_gate"]]
    if qualifying:
        chosen = sorted(
            qualifying,
            key=lambda r: (-r["event_detection_rate"], -r["precision"], r["fp_per_1000"], r["threshold"]),
        )[0]
        rule = "prior_inner_oof_original_gate_then_detection_precision_fp"
    else:
        chosen = sorted(
            rows,
            key=lambda r: (-r["f1"], -r["precision"], float("inf") if r["fp_per_1000"] is None else r["fp_per_1000"], r["threshold"]),
        )[0]
        rule = "prior_inner_oof_f1_fallback_no_gate_qualifier"
    return float(chosen["threshold"]), {"rule": rule, "candidate_count": len(rows), "chosen_prior_metrics": chosen}


def _variable_threshold_event_detection(scored: pd.DataFrame, events: pd.DataFrame, thresholds_by_year: dict[int, float]) -> dict:
    e = events[events["include_in_benchmark"].astype(str).str.lower().eq("true")].copy()
    e["observed_by_date"] = pd.to_datetime(e["observed_by_date"])
    e = e[e["observed_by_date"].dt.year.between(2022, 2024)]
    rows = []
    for _, event in e.sort_values("observed_by_date").iterrows():
        anchor = event["observed_by_date"]
        year = int(anchor.year)
        threshold = float(thresholds_by_year[year])
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
            "threshold": threshold,
            "detected": bool(not crossed.empty),
            "first_crossing_issue_date": None if pd.isna(first) else str(first.date()),
            "lead_hours": None if pd.isna(first) else int((anchor - first).total_seconds() / 3600),
        })
    detected_rows = [r for r in rows if r["detected"]]
    leads = [r["lead_hours"] for r in detected_rows if r["lead_hours"] is not None]
    return {
        "detected_events": int(len(detected_rows)),
        "evaluated_events": int(len(rows)),
        "documented_registry_events": REGISTRY_SIZE,
        "event_detection_rate": None if not rows else float(len(detected_rows) / len(rows)),
        "median_lead_hours": None if not leads else float(np.median(leads)),
        "events": rows,
    }


def _threshold_metrics(scored: pd.DataFrame, thresholds_by_year: dict[int, float]) -> dict:
    y = scored["label"].to_numpy(dtype=int)
    p = scored["probability"].to_numpy(dtype=float)
    t = scored["validation_year"].map(thresholds_by_year).to_numpy(dtype=float)
    pred = (p >= t).astype(int)
    negatives = int((y == 0).sum())
    fp = int(((pred == 1) & (y == 0)).sum())
    tp = int(((pred == 1) & (y == 1)).sum())
    precision = float(tp / max(1, tp + fp))
    return {
        "precision": precision,
        "false_positive_issue_rows": fp,
        "false_positive_issue_rows_per_1000_negative": None if not negatives else float(1000.0 * fp / negatives),
        "accuracy_supporting_only_not_headline": float(accuracy_score(y, pred)),
    }


def _location_metrics(scored: pd.DataFrame) -> dict:
    out = {}
    for location, g in scored.groupby("location"):
        m = base.metric_bundle(g["label"], g["probability"], 0.5)
        out[str(location)] = {
            "rows": int(len(g)),
            "positive_rows": int(g["label"].sum()),
            "prevalence": float(g["label"].mean()),
            "pr_auc": m["pr_auc"],
            "roc_auc": m["roc_auc"],
            "brier_score": m["brier_score"],
        }
    return out


def evaluate_group(df: pd.DataFrame, events: pd.DataFrame, group: str) -> dict:
    eligible = df[df["issue_date"] >= ARCHIVE_START].copy()
    fold_rows = []
    scored_parts = []
    thresholds: dict[int, float] = {}
    for year in OUTER_YEARS:
        train = eligible[eligible["issue_date"] < pd.Timestamp(f"{year}-01-01")].copy()
        val = eligible[eligible["issue_date"].dt.year.eq(year)].copy()
        if train.empty or val.empty or train["label"].nunique() < 2 or val["label"].nunique() < 2:
            raise RuntimeError(f"Outer year {year} is not usable; confirmatory challenger refuses to drop an outer fold")
        inner = _inner_oof(train, year, group)
        threshold, threshold_meta = _select_prior_threshold(inner, events, year)
        thresholds[year] = threshold
        probability = _fit_predict(train, val, group)
        m = base.metric_bundle(val["label"], probability, threshold)
        fold_rows.append({
            "validation_year": year,
            "train_rows": int(len(train)),
            "validation_rows": int(len(val)),
            "validation_positive_rows": int(val["label"].sum()),
            "threshold": threshold,
            "threshold_selection": threshold_meta,
            "metrics": m,
        })
        p = val[["issue_date", "location", "label", "future_event_ids"]].copy()
        p["probability"] = probability
        p["validation_year"] = year
        scored_parts.append(p)
    scored = pd.concat(scored_parts, ignore_index=True).sort_values(["issue_date", "location"])
    pooled = base.metric_bundle(scored["label"], scored["probability"], 0.5)
    event = _variable_threshold_event_detection(scored, events, thresholds)
    threshold_metrics = _threshold_metrics(scored, thresholds)
    freeze_gate_like = bool(
        event["event_detection_rate"] is not None
        and event["event_detection_rate"] >= 0.75
        and threshold_metrics["precision"] >= 0.10
        and threshold_metrics["false_positive_issue_rows_per_1000_negative"] is not None
        and threshold_metrics["false_positive_issue_rows_per_1000_negative"] <= 10.0
    )
    return {
        "model": "TabPFN-v2-pretrained-tabular-foundation-challenger",
        "feature_group": group,
        "features": _feature_names(group),
        "outer_years": list(OUTER_YEARS),
        "folds": fold_rows,
        "thresholds_by_outer_year": {str(k): v for k, v in thresholds.items()},
        "mean_temporal_fold_pr_auc": float(np.mean([r["metrics"]["pr_auc"] for r in fold_rows])),
        "pooled_outer_metrics": {
            "pr_auc": pooled["pr_auc"],
            "roc_auc": pooled["roc_auc"],
            "brier_score": pooled["brier_score"],
            "prevalence": pooled["prevalence"],
        },
        "threshold_dependent_outer_metrics": threshold_metrics,
        "eligible_event_detection": event,
        "per_location": _location_metrics(scored),
        "meets_original_v5_operational_gate_on_challenger_outer_predictions": freeze_gate_like,
        "production_status": "research_challenger_not_authorized_for_public_alerts",
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="validation/model_v5_issue_dataset.csv")
    ap.add_argument("--events", default="validation/model_v4_event_registry.csv")
    ap.add_argument("--output", default="validation/model_v5_tabpfn_challenger_results.json")
    ap.add_argument("--groups", nargs="+", default=["nasa_only", "glofas_only", "combined"])
    args = ap.parse_args()

    os.environ.setdefault("TABPFN_ALLOW_CPU_LARGE_DATASET", "true")
    df = pd.read_csv(args.dataset, parse_dates=["issue_date"])
    events = pd.read_csv(args.events)
    if events[events["include_in_benchmark"].astype(str).str.lower().eq("true")]["event_id"].nunique() != REGISTRY_SIZE:
        raise RuntimeError("Frozen 35-event registry mismatch")
    required = {"issue_date", "location", "label", "future_event_ids"}
    missing = required - set(df.columns)
    if missing:
        raise RuntimeError(f"Dataset missing required columns: {sorted(missing)}")

    results = {group: evaluate_group(df, events, group) for group in args.groups}
    payload = {
        "protocol": "MODEL_V5_FOUNDATION_CHALLENGER_PROTOCOL.md",
        "foundation_model": "TabPFN v2",
        "evaluation_only": True,
        "headline_accuracy_forbidden": True,
        "results": results,
    }
    Path(args.output).write_text(json.dumps(payload, indent=2, sort_keys=True))
    print(json.dumps({
        g: {
            "mean_fold_pr_auc": r["mean_temporal_fold_pr_auc"],
            "pooled_pr_auc": r["pooled_outer_metrics"]["pr_auc"],
            "pooled_roc_auc": r["pooled_outer_metrics"]["roc_auc"],
            "brier": r["pooled_outer_metrics"]["brier_score"],
            "event_detection": r["eligible_event_detection"]["event_detection_rate"],
            "gate_like_pass": r["meets_original_v5_operational_gate_on_challenger_outer_predictions"],
        } for g, r in results.items()
    }, indent=2))


if __name__ == "__main__":
    main()
