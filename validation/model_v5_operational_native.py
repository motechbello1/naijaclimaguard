#!/usr/bin/env python3
"""Model v5 operational-native temporal development harness."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score, brier_score_loss, confusion_matrix,
    precision_score, recall_score, f1_score, roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

RANDOM_STATE = 42
EXPECTED_EVENTS = 35
PILOT_LOCATIONS = {"Lokoja", "Makurdi", "Onitsha", "Yenagoa", "Hadejia"}

RAIN_FEATURES = [
    "rain_1d", "rain_3d", "rain_7d", "rain_14d", "rain_30d",
    "rain_accel_3d", "rain_3_14_ratio", "rain_7_30_ratio",
    "wet_days_7d", "wet_days_30d",
]
RIVER_FEATURES = [
    "q24", "q48", "q72", "qmax_72",
    "q48_minus_q24", "q72_minus_q24", "q72_pct_rise",
    "q_slope_per_day", "q_monotonic_rise",
]
NORMALIZED_FEATURES = [
    "q24_loc_ratio", "q48_loc_ratio", "q72_loc_ratio", "qmax_loc_ratio",
    "q24_loc_z", "q48_loc_z", "q72_loc_z", "rain30_loc_z",
]


def robust_stats(s: pd.Series) -> tuple[float, float, float]:
    x = pd.to_numeric(s, errors="coerce").dropna()
    if x.empty:
        return 0.0, 1.0, 1.0
    med = float(x.median())
    q1, q3 = float(x.quantile(.25)), float(x.quantile(.75))
    iqr = q3 - q1
    if not np.isfinite(iqr) or abs(iqr) < 1e-9:
        iqr = max(abs(med), 1.0)
    denom = med if abs(med) >= 1e-9 else 1.0
    return med, iqr, denom


def fit_location_stats(train: pd.DataFrame) -> Dict[str, Dict[str, Dict[str, float]]]:
    cols = ["q24", "q48", "q72", "qmax_72", "rain_30d"]
    stats: Dict[str, Dict[str, Dict[str, float]]] = {}
    for location in ["__GLOBAL__"] + sorted(train["location"].astype(str).unique().tolist()):
        group = train if location == "__GLOBAL__" else train[train["location"].eq(location)]
        stats[location] = {}
        for c in cols:
            med, iqr, denom = robust_stats(group[c])
            stats[location][c] = {"median": med, "iqr": iqr, "denom": denom}
    return stats


def apply_location_stats(df: pd.DataFrame, stats: Dict[str, Dict[str, Dict[str, float]]]) -> pd.DataFrame:
    out = df.copy()
    global_stats = stats["__GLOBAL__"]
    def st(loc: str, col: str) -> Dict[str, float]:
        return stats.get(str(loc), {}).get(col, global_stats[col])
    for col, prefix in (("q24", "q24"), ("q48", "q48"), ("q72", "q72")):
        med = out["location"].map(lambda loc: st(loc, col)["median"]).astype(float)
        iqr = out["location"].map(lambda loc: st(loc, col)["iqr"]).astype(float)
        denom = out["location"].map(lambda loc: st(loc, col)["denom"]).astype(float)
        out[f"{prefix}_loc_ratio"] = out[col] / denom
        out[f"{prefix}_loc_z"] = (out[col] - med) / iqr
    qmax_denom = out["location"].map(lambda loc: st(loc, "qmax_72")["denom"]).astype(float)
    rain_med = out["location"].map(lambda loc: st(loc, "rain_30d")["median"]).astype(float)
    rain_iqr = out["location"].map(lambda loc: st(loc, "rain_30d")["iqr"]).astype(float)
    out["qmax_loc_ratio"] = out["qmax_72"] / qmax_denom
    out["rain30_loc_z"] = (out["rain_30d"] - rain_med) / rain_iqr
    return out


def metric_bundle(y_true, probability, threshold: float = .5) -> dict:
    y = np.asarray(y_true, dtype=int)
    p = np.asarray(probability, dtype=float)
    pred = (p >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    result = {
        "precision": float(precision_score(y, pred, zero_division=0)),
        "recall": float(recall_score(y, pred, zero_division=0)),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "brier_score": float(brier_score_loss(y, p)),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "prevalence": float(y.mean()) if len(y) else None,
    }
    if np.unique(y).size == 2:
        result["pr_auc"] = float(average_precision_score(y, p))
        result["roc_auc"] = float(roc_auc_score(y, p))
    else:
        result["pr_auc"] = None
        result["roc_auc"] = None
    return result


def feature_group(name: str) -> list[str]:
    if name == "core":
        return RAIN_FEATURES + RIVER_FEATURES + NORMALIZED_FEATURES
    if name == "rain_only":
        return RAIN_FEATURES
    if name == "river_only":
        return RIVER_FEATURES + [x for x in NORMALIZED_FEATURES if not x.startswith("rain")]
    raise ValueError(name)


def make_pipeline(candidate: str, numeric: list[str], pos_weight: float) -> Pipeline:
    pre = ColumnTransformer([
        ("num", Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]), numeric),
        ("location", OneHotEncoder(handle_unknown="ignore", sparse_output=False), ["location"]),
    ], remainder="drop")
    if candidate == "logistic_operational_native":
        model = LogisticRegression(
            C=0.05, penalty="l2", class_weight="balanced", max_iter=4000,
            random_state=RANDOM_STATE,
        )
    elif candidate == "random_forest_operational_native":
        model = RandomForestClassifier(
            n_estimators=600, min_samples_leaf=4, max_features="sqrt",
            class_weight="balanced_subsample", random_state=RANDOM_STATE, n_jobs=-1,
        )
    elif candidate == "xgboost_operational_native":
        model = xgb.XGBClassifier(
            n_estimators=400, max_depth=3, learning_rate=0.025, min_child_weight=4,
            subsample=0.85, colsample_bytree=0.85, reg_lambda=5.0, reg_alpha=0.25,
            scale_pos_weight=max(1.0, pos_weight), random_state=RANDOM_STATE,
            eval_metric="aucpr", tree_method="hist",
        )
    else:
        raise ValueError(candidate)
    return Pipeline([("pre", pre), ("model", model)])


def temporal_folds(df: pd.DataFrame):
    for year in range(2019, 2025):
        train = df[df["issue_date"] < pd.Timestamp(f"{year}-01-01")].copy()
        val = df[df["issue_date"].dt.year.eq(year)].copy()
        if train.empty or val.empty or train["label"].nunique() < 2 or val["label"].nunique() < 2:
            yield year, train, val, False
        else:
            yield year, train, val, True


def evaluate(candidate: str, df: pd.DataFrame, group: str = "core") -> dict:
    numeric = feature_group(group)
    fold_rows: list[dict] = []
    scored_parts: list[pd.DataFrame] = []
    for year, train0, val0, usable in temporal_folds(df):
        if not usable:
            fold_rows.append({
                "validation_year": year, "usable": False,
                "train_rows": int(len(train0)), "validation_rows": int(len(val0)),
                "reason": "fold lacks both classes in train or validation",
            })
            continue
        stats = fit_location_stats(train0)
        train = apply_location_stats(train0, stats)
        val = apply_location_stats(val0, stats)
        y_train = train["label"].astype(int)
        y_val = val["label"].astype(int)
        positives = int(y_train.sum())
        negatives = int((y_train == 0).sum())
        pipe = make_pipeline(candidate, numeric, negatives / max(1, positives))
        cols = numeric + ["location"]
        pipe.fit(train[cols], y_train)
        probability = pipe.predict_proba(val[cols])[:, 1]
        metrics = metric_bundle(y_val, probability, .5)
        fold_rows.append({
            "validation_year": year,
            "usable": True,
            "train_rows": int(len(train)),
            "validation_rows": int(len(val)),
            "validation_positive_rows": int(y_val.sum()),
            "validation_prevalence": float(y_val.mean()),
            "metrics": metrics,
        })
        part = val[["issue_date", "location", "label", "future_event_ids"]].copy()
        part["probability"] = probability
        part["validation_year"] = year
        scored_parts.append(part)
    if not scored_parts:
        raise RuntimeError(f"No usable temporal folds for {candidate}/{group}")
    scored = pd.concat(scored_parts, ignore_index=True).sort_values(["issue_date", "location"])
    usable_folds = [r for r in fold_rows if r.get("usable")]
    mean_pr = float(np.mean([r["metrics"]["pr_auc"] for r in usable_folds]))
    pooled = metric_bundle(scored["label"], scored["probability"], .5)
    return {
        "candidate": candidate,
        "feature_group": group,
        "features": numeric,
        "folds": fold_rows,
        "mean_fold_pr_auc": mean_pr,
        "pooled_oof_metrics": pooled,
        "scored": scored,
    }


def event_detection(scored: pd.DataFrame, events: pd.DataFrame, threshold: float) -> dict:
    e = events[events["include_in_benchmark"].astype(str).str.lower().eq("true")].copy()
    e["observed_by_date"] = pd.to_datetime(e["observed_by_date"])
    e = e[e["observed_by_date"].dt.year.between(2019, 2024)]
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
            "development_reforecast_lead_hours": None if pd.isna(first) else int((anchor - first).total_seconds() / 3600),
            "max_probability": None if window.empty else float(window["probability"].max()),
        })
    detected = sum(bool(r["detected"]) for r in rows)
    return {
        "detected_events": int(detected),
        "evaluated_events": int(len(rows)),
        "event_detection_rate": float(detected / len(rows)) if rows else None,
        "events": rows,
    }


def threshold_frontier(scored: pd.DataFrame, events: pd.DataFrame, sanity_pass: bool) -> list[dict]:
    y = scored["label"].to_numpy(dtype=int)
    p = scored["probability"].to_numpy(dtype=float)
    negatives = int((y == 0).sum())
    result: list[dict] = []
    for threshold in np.round(np.arange(.01, 1.00, .01), 2):
        m = metric_bundle(y, p, float(threshold))
        cm = m["confusion_matrix"]
        ev = event_detection(scored, events, float(threshold))
        fp_per_1000 = float(1000 * cm["fp"] / negatives) if negatives else None
        qualifies = bool(
            sanity_pass
            and ev["event_detection_rate"] is not None and ev["event_detection_rate"] >= .75
            and m["precision"] >= .10
            and fp_per_1000 is not None and fp_per_1000 <= 10.0
        )
        result.append({
            "threshold": float(threshold),
            "precision": m["precision"], "recall_issue_rows": m["recall"], "f1": m["f1"],
            "false_positive_issue_rows": int(cm["fp"]),
            "false_positive_issue_rows_per_1000_negative": fp_per_1000,
            "detected_events": ev["detected_events"], "evaluated_events": ev["evaluated_events"],
            "event_detection_rate": ev["event_detection_rate"],
            "qualifies": qualifies,
        })
    return result


def location_diagnostics(scored: pd.DataFrame) -> dict:
    out = {}
    for location, g in scored.groupby("location"):
        m = metric_bundle(g["label"], g["probability"], .5)
        prevalence = float(g["label"].mean())
        out[str(location)] = {
            "rows": int(len(g)), "positive_rows": int(g["label"].sum()),
            "prevalence": prevalence, "pr_auc": m["pr_auc"], "roc_auc": m["roc_auc"],
            "pr_lift_vs_prevalence": None if not prevalence or m["pr_auc"] is None else float(m["pr_auc"] / prevalence),
        }
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="validation/model_v5_issue_dataset.csv")
    ap.add_argument("--events", default="validation/model_v4_event_registry.csv")
    ap.add_argument("--output", default="validation/model_v5_results.json")
    ap.add_argument("--scored-output", default="validation/model_v5_oof_scored.csv")
    args = ap.parse_args()

    df = pd.read_csv(args.dataset, parse_dates=["issue_date"])
    events = pd.read_csv(args.events)
    if events[events["include_in_benchmark"].astype(str).str.lower().eq("true")]["event_id"].nunique() != EXPECTED_EVENTS:
        raise ValueError("Model v5 requires the frozen 35-event registry")
    if set(df["location"].astype(str).unique()) != PILOT_LOCATIONS:
        raise ValueError("Model v5 dataset location set changed")
    candidates = [
        "logistic_operational_native", "random_forest_operational_native", "xgboost_operational_native"
    ]
    core_results = [evaluate(name, df, "core") for name in candidates]
    ranked = sorted(
        core_results,
        key=lambda r: (
            r["mean_fold_pr_auc"],
            -float(r["pooled_oof_metrics"]["brier_score"]),
            -1.0 if r["pooled_oof_metrics"]["roc_auc"] is None else float(r["pooled_oof_metrics"]["roc_auc"]),
        ),
        reverse=True,
    )
    winner = ranked[0]
    winner_name = winner["candidate"]
    rain_ablation = evaluate(winner_name, df, "rain_only")
    river_ablation = evaluate(winner_name, df, "river_only")

    usable_folds = [f for f in winner["folds"] if f.get("usable")]
    fold_pass = all(
        f["metrics"]["pr_auc"] is not None and f["metrics"]["pr_auc"] > f["validation_prevalence"]
        for f in usable_folds
    )
    pooled = winner["pooled_oof_metrics"]
    pooled_prev = float(pooled["prevalence"])
    pooled_pr = float(pooled["pr_auc"])
    pooled_lift_pass = bool(pooled_prev > 0 and pooled_pr >= 2.0 * pooled_prev)
    ablation_pass = bool(
        pooled_pr > float(rain_ablation["pooled_oof_metrics"]["pr_auc"])
        and pooled_pr > float(river_ablation["pooled_oof_metrics"]["pr_auc"])
    )
    sanity_pass = fold_pass and pooled_lift_pass and ablation_pass
    frontier = threshold_frontier(winner["scored"], events, sanity_pass)
    eligible = [x for x in frontier if x["qualifies"]]
    chosen = max(eligible, key=lambda x: x["threshold"]) if eligible else None

    scored_path = Path(args.scored_output)
    winner["scored"].to_csv(scored_path, index=False)
    def serializable(r: dict) -> dict:
        return {k: v for k, v in r.items() if k != "scored"}
    result = {
        "status": "eligible_freeze_candidate" if chosen else "model_v5_development_failed_freeze_gate",
        "protocol": "operational-native NASA IMERG Early V07 + GloFAS reforecast; strict next-1-to-3-day target",
        "production_engine_remains": "derived-v2",
        "model_v4_prospective_generation_unchanged": True,
        "candidate_results": [serializable(r) for r in core_results],
        "selected_candidate": winner_name,
        "selected_candidate_metrics": serializable(winner),
        "ablations": {
            "rain_only": serializable(rain_ablation),
            "glofas_only": serializable(river_ablation),
        },
        "sanity": {
            "every_usable_fold_beats_prevalence": fold_pass,
            "pooled_pr_auc_at_least_2x_prevalence": pooled_lift_pass,
            "core_beats_both_single_source_ablations": ablation_pass,
            "minimum_scientific_sanity_pass": sanity_pass,
        },
        "per_location": location_diagnostics(winner["scored"]),
        "threshold_policy": {
            "minimum_event_detection_rate": .75,
            "minimum_precision": .10,
            "maximum_false_positive_issue_rows_per_1000_negative": 10.0,
            "selection_rule": "highest qualifying threshold",
            "chosen_threshold": None if chosen is None else chosen["threshold"],
            "chosen_threshold_metrics": chosen,
        },
        "threshold_frontier": frontier,
        "replacement_authorized": False,
        "warning": "Historical GloFAS reforecast lead times are development evidence, not proof of historical operational warnings.",
    }
    out_path = Path(args.output)
    out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
