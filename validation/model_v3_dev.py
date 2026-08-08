#!/usr/bin/env python3
"""NaijaClimaGuard Model v3 development harness.

Development only: all modelling rows/events are restricted to 2018-2021.
2022-2024 is never evaluated or used for feature/model/threshold selection.
The live production engine remains derived-v2.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

HERE = Path(__file__).resolve().parent
DEFAULT_FEATURES = HERE / "features_daily.csv"
DEFAULT_EVENTS = HERE / "event_registry.csv"
DEVELOPMENT_CUTOFF = pd.Timestamp("2022-01-01")
DEVELOPMENT_START = pd.Timestamp("2018-01-01")
PRIMARY_POSITIVE_DAYS_BEFORE = 3
PRIMARY_POSITIVE_DAYS_AFTER = 0
EXCLUSION_DAYS = 14
MIN_FEATURE_NONNULL_FRACTION = 0.90
RANDOM_STATE = 42

BASE_HYDRO_FEATURES = [
    "nasa_imerg_precip_mm_day",
    "nasa_rain_3d_sum", "nasa_rain_7d_sum", "nasa_rain_14d_sum", "nasa_rain_30d_sum",
    "river_discharge_m3s", "discharge_lag1", "discharge_lag3", "discharge_lag7",
    "discharge_3d_mean", "discharge_7d_mean", "discharge_3d_change", "discharge_7d_change",
    "soil_moisture_0_to_7cm", "soil_moisture_7_to_28cm", "soil_moisture_28_to_100cm",
    "soil_moisture_profile_mean", "soil_moisture_7d_mean",
    "nasa_rain_minus_et0", "water_balance_7d",
    "temperature_2m_max", "temperature_2m_min", "precipitation_hours",
]
CALIBRATED_FEATURES = [
    "discharge_location_ratio", "discharge_location_robust_z", "rain_location_robust_z"
]
SEASON_FEATURES = ["season_sin", "season_cos"]


@dataclass(frozen=True)
class Fold:
    validation_year: int
    train_start: str
    train_end: str
    validation_start: str
    validation_end: str


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_events(path: Path) -> pd.DataFrame:
    events = pd.read_csv(path, parse_dates=["observed_by_date", "event_end_date"])
    enabled = events["include_in_benchmark"].astype(str).str.lower().eq("true")
    events = events[enabled].copy()
    events = events[
        events["observed_by_date"].between(DEVELOPMENT_START, DEVELOPMENT_CUTOFF - pd.Timedelta(days=1))
    ].copy()
    if events.empty:
        raise ValueError("No enabled 2018-2021 development events found")
    return events.sort_values("observed_by_date").reset_index(drop=True)


def load_features(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["date"])
    required = {"date", "location", "nasa_imerg_precip_mm_day", "river_discharge_m3s"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing fused core-source columns: {sorted(missing)}")
    df = df[df["date"].between(DEVELOPMENT_START, DEVELOPMENT_CUTOFF - pd.Timedelta(days=1))].copy()
    if df.empty:
        raise ValueError("No 2018-2021 development rows found")
    if (df["date"] >= DEVELOPMENT_CUTOFF).any():
        raise AssertionError("Development data leaked past the frozen 2022-01-01 cutoff")
    return df.sort_values(["location", "date"]).reset_index(drop=True)


def attach_development_labels(
    features: pd.DataFrame,
    events: pd.DataFrame,
    positive_days_before: int = PRIMARY_POSITIVE_DAYS_BEFORE,
    positive_days_after: int = PRIMARY_POSITIVE_DAYS_AFTER,
    exclusion_days: int = EXCLUSION_DAYS,
) -> pd.DataFrame:
    """Attach independent event-window labels with no post-event positives."""
    x = features.copy()
    x["label"] = 0
    x["event_id"] = ""
    positive_any = pd.Series(False, index=x.index)
    uncertain_any = pd.Series(False, index=x.index)

    for _, event in events.iterrows():
        same = x["location"].eq(event["location"])
        anchor = event["observed_by_date"]
        positive = same & x["date"].between(
            anchor - pd.Timedelta(days=positive_days_before),
            anchor + pd.Timedelta(days=positive_days_after),
        )
        uncertain = same & x["date"].between(
            anchor - pd.Timedelta(days=exclusion_days),
            anchor + pd.Timedelta(days=exclusion_days),
        )
        positive_any |= positive
        uncertain_any |= uncertain
        x.loc[positive, "label"] = 1
        existing = x.loc[positive, "event_id"].astype(str)
        x.loc[positive, "event_id"] = np.where(
            existing.eq(""), str(event["event_id"]), existing + ";" + str(event["event_id"])
        )

    x["excluded"] = uncertain_any & ~positive_any
    return x[~x["excluded"]].copy().reset_index(drop=True)


def add_cyclic_season(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    doy = out["date"].dt.dayofyear.astype(float)
    angle = 2.0 * np.pi * doy / 365.25
    out["season_sin"] = np.sin(angle)
    out["season_cos"] = np.cos(angle)
    return out


def _robust_stats(values: pd.Series) -> Tuple[float, float, float]:
    clean = pd.to_numeric(values, errors="coerce").dropna()
    if clean.empty:
        return 0.0, 1.0, 1.0
    median = float(clean.median())
    q1 = float(clean.quantile(0.25))
    q3 = float(clean.quantile(0.75))
    iqr = q3 - q1
    if not np.isfinite(iqr) or abs(iqr) < 1e-9:
        iqr = max(abs(median), 1.0)
    denom = median if abs(median) >= 1e-9 else 1.0
    return median, iqr, denom


def fit_location_calibration(train: pd.DataFrame) -> Dict[str, Dict[str, float]]:
    """Fit empirical location/reach normalization on training rows only."""
    stats: Dict[str, Dict[str, float]] = {}
    global_q = _robust_stats(train["river_discharge_m3s"])
    global_r = _robust_stats(train["nasa_imerg_precip_mm_day"])
    stats["__GLOBAL__"] = {
        "q_median": global_q[0], "q_iqr": global_q[1], "q_denom": global_q[2],
        "r_median": global_r[0], "r_iqr": global_r[1],
    }
    for location, group in train.groupby("location"):
        q = _robust_stats(group["river_discharge_m3s"])
        r = _robust_stats(group["nasa_imerg_precip_mm_day"])
        stats[str(location)] = {
            "q_median": q[0], "q_iqr": q[1], "q_denom": q[2],
            "r_median": r[0], "r_iqr": r[1],
        }
    return stats


def apply_location_calibration(df: pd.DataFrame, stats: Dict[str, Dict[str, float]]) -> pd.DataFrame:
    out = df.copy()
    fallback = stats["__GLOBAL__"]

    def st(location: str) -> Dict[str, float]:
        return stats.get(str(location), fallback)

    q_median = out["location"].map(lambda x: st(x)["q_median"]).astype(float)
    q_iqr = out["location"].map(lambda x: st(x)["q_iqr"]).astype(float)
    q_denom = out["location"].map(lambda x: st(x)["q_denom"]).astype(float)
    r_median = out["location"].map(lambda x: st(x)["r_median"]).astype(float)
    r_iqr = out["location"].map(lambda x: st(x)["r_iqr"]).astype(float)

    out["discharge_location_ratio"] = out["river_discharge_m3s"] / q_denom
    out["discharge_location_robust_z"] = (out["river_discharge_m3s"] - q_median) / q_iqr
    out["rain_location_robust_z"] = (out["nasa_imerg_precip_mm_day"] - r_median) / r_iqr
    return out


def eligible_feature_columns(df: pd.DataFrame, include_season: bool) -> Tuple[List[str], Dict[str, float]]:
    candidates = BASE_HYDRO_FEATURES + CALIBRATED_FEATURES + (SEASON_FEATURES if include_season else [])
    available = [c for c in candidates if c in df.columns]
    coverage = {c: float(df[c].notna().mean()) for c in available}
    cols = [c for c in available if coverage[c] >= MIN_FEATURE_NONNULL_FRACTION]
    if "nasa_imerg_precip_mm_day" not in cols or "river_discharge_m3s" not in cols:
        raise ValueError("Core rainfall/discharge features failed coverage gate")
    if not any(c.startswith("soil_moisture") for c in cols):
        raise ValueError("No soil-moisture feature passed coverage gate")
    return cols, coverage


def build_expanding_folds(df: pd.DataFrame) -> List[Tuple[Fold, pd.Index, pd.Index]]:
    rows: List[Tuple[Fold, pd.Index, pd.Index]] = []
    for validation_year in (2019, 2020, 2021):
        train_mask = df["date"] < pd.Timestamp(f"{validation_year}-01-01")
        val_mask = df["date"].between(
            pd.Timestamp(f"{validation_year}-01-01"), pd.Timestamp(f"{validation_year}-12-31")
        )
        train_idx = df.index[train_mask]
        val_idx = df.index[val_mask]
        if len(train_idx) == 0 or len(val_idx) == 0:
            continue
        if df.loc[train_idx, "label"].nunique() < 2 or df.loc[val_idx, "label"].nunique() < 2:
            continue
        fold = Fold(
            validation_year=validation_year,
            train_start=str(df.loc[train_idx, "date"].min().date()),
            train_end=str(df.loc[train_idx, "date"].max().date()),
            validation_start=f"{validation_year}-01-01",
            validation_end=f"{validation_year}-12-31",
        )
        rows.append((fold, train_idx, val_idx))
    if len(rows) < 2:
        raise ValueError("Need at least two usable expanding-year temporal folds")
    return rows


def make_candidates(scale_pos_weight: float) -> Dict[str, object]:
    return {
        "logistic_balanced": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(class_weight="balanced", max_iter=3000, random_state=RANDOM_STATE)),
        ]),
        "random_forest_balanced": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("model", RandomForestClassifier(
                n_estimators=500, min_samples_leaf=4, max_features="sqrt",
                class_weight="balanced_subsample", random_state=RANDOM_STATE, n_jobs=-1,
            )),
        ]),
        "xgboost_regularized": xgb.XGBClassifier(
            n_estimators=300, max_depth=3, learning_rate=0.03, min_child_weight=5,
            subsample=0.85, colsample_bytree=0.80, reg_lambda=4.0, reg_alpha=0.25,
            scale_pos_weight=max(1.0, scale_pos_weight), random_state=RANDOM_STATE,
            eval_metric="aucpr", tree_method="hist",
        ),
    }


def metric_bundle(y_true: Iterable[int], probability: Iterable[float], threshold: float) -> Dict[str, object]:
    y = np.asarray(list(y_true), dtype=int)
    p = np.asarray(list(probability), dtype=float)
    pred = (p >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    result: Dict[str, object] = {
        "precision": float(precision_score(y, pred, zero_division=0)),
        "recall": float(recall_score(y, pred, zero_division=0)),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "brier_score": float(brier_score_loss(y, p)),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "false_alarm_ratio": float(fp / (tp + fp)) if (tp + fp) else None,
        "miss_rate": float(fn / (tp + fn)) if (tp + fn) else None,
    }
    if np.unique(y).size == 2:
        result["roc_auc"] = float(roc_auc_score(y, p))
        result["pr_auc"] = float(average_precision_score(y, p))
    else:
        result["roc_auc"] = None
        result["pr_auc"] = None
    return result


def event_detection(scored: pd.DataFrame, events: pd.DataFrame, threshold: float) -> Dict[str, object]:
    event_rows: List[Dict[str, object]] = []
    scored_years = set(scored["date"].dt.year.unique())
    for _, event in events.iterrows():
        anchor = event["observed_by_date"]
        if anchor.year not in scored_years:
            continue
        window = scored[
            scored["location"].eq(event["location"])
            & scored["date"].between(anchor - pd.Timedelta(days=PRIMARY_POSITIVE_DAYS_BEFORE), anchor)
        ].copy()
        if window.empty:
            continue
        detected = bool((window["probability"] >= threshold).any())
        event_rows.append({
            "event_id": str(event["event_id"]), "location": str(event["location"]),
            "observed_by_date": str(anchor.date()),
            "detected_in_development_event_window": detected,
            "max_probability": float(window["probability"].max()),
        })
    detected_count = sum(bool(r["detected_in_development_event_window"]) for r in event_rows)
    return {
        "detected_events": detected_count,
        "evaluated_events": len(event_rows),
        "event_detection_rate": float(detected_count / len(event_rows)) if event_rows else None,
        "events": event_rows,
    }


def select_threshold(y_true: np.ndarray, probability: np.ndarray) -> Tuple[float, Dict[str, object]]:
    """Select a development-only threshold from pooled out-of-fold predictions."""
    best = None
    for threshold in np.round(np.arange(0.05, 0.951, 0.01), 2):
        metrics = metric_bundle(y_true, probability, float(threshold))
        key = (float(metrics["f1"]), float(metrics["recall"]), float(threshold))
        candidate = (*key, metrics)
        if best is None or candidate[:3] > best[:3]:
            best = candidate
    assert best is not None
    return float(best[2]), best[3]


def evaluate_candidate(
    name: str,
    model_template: object,
    labelled: pd.DataFrame,
    events: pd.DataFrame,
    include_season: bool,
) -> Dict[str, object]:
    fold_results: List[Dict[str, object]] = []
    oof_parts: List[pd.DataFrame] = []

    for fold, train_idx, val_idx in build_expanding_folds(labelled):
        train = labelled.loc[train_idx].copy()
        val = labelled.loc[val_idx].copy()
        calibration = fit_location_calibration(train)
        train = add_cyclic_season(apply_location_calibration(train, calibration))
        val = add_cyclic_season(apply_location_calibration(val, calibration))
        cols, coverage = eligible_feature_columns(train, include_season=include_season)

        X_train = train[cols].replace([np.inf, -np.inf], np.nan)
        X_val = val[cols].replace([np.inf, -np.inf], np.nan)
        y_train = train["label"].astype(int)
        y_val = val["label"].astype(int)
        negatives = int((y_train == 0).sum())
        positives = int(y_train.sum())
        model = clone(model_template)
        if name.startswith("xgboost_regularized"):
            model.set_params(scale_pos_weight=max(1.0, negatives / max(1, positives)))
        model.fit(X_train, y_train)
        probability = model.predict_proba(X_val)[:, 1]

        fold_scored = val[["date", "location", "label", "event_id"]].copy()
        fold_scored["probability"] = probability
        oof_parts.append(fold_scored)
        fold_results.append({
            "fold": fold.__dict__, "train_rows": int(len(train)), "validation_rows": int(len(val)),
            "train_positive_rows": positives, "validation_positive_rows": int(y_val.sum()),
            "features": cols,
            "feature_coverage": {k: round(v, 4) for k, v in coverage.items()},
            "metrics_at_0_50_for_diagnostic_only": metric_bundle(y_val, probability, 0.50),
        })

    oof = pd.concat(oof_parts, ignore_index=True).sort_values(["date", "location"]).reset_index(drop=True)
    threshold, _ = select_threshold(oof["label"].to_numpy(dtype=int), oof["probability"].to_numpy(dtype=float))
    events_oof = events[events["observed_by_date"].dt.year.isin(oof["date"].dt.year.unique())].copy()
    pr_values = [
        f["metrics_at_0_50_for_diagnostic_only"]["pr_auc"] for f in fold_results
        if f["metrics_at_0_50_for_diagnostic_only"]["pr_auc"] is not None
    ]
    roc_values = [
        f["metrics_at_0_50_for_diagnostic_only"]["roc_auc"] for f in fold_results
        if f["metrics_at_0_50_for_diagnostic_only"]["roc_auc"] is not None
    ]
    return {
        "candidate": name,
        "include_cyclic_season_features": include_season,
        "folds": fold_results,
        "mean_fold_pr_auc": float(np.mean(pr_values)) if pr_values else None,
        "mean_fold_roc_auc": float(np.mean(roc_values)) if roc_values else None,
        "oof_rows": int(len(oof)), "oof_positive_rows": int(oof["label"].sum()),
        "selected_development_threshold": threshold,
        "pooled_oof_metrics_at_selected_threshold": metric_bundle(oof["label"], oof["probability"], threshold),
        "pooled_oof_metrics_at_0_50": metric_bundle(oof["label"], oof["probability"], 0.50),
        "development_event_metrics": event_detection(oof, events_oof, threshold),
    }


def season_only_diagnostic(labelled: pd.DataFrame) -> Dict[str, object]:
    fold_results: List[Dict[str, object]] = []
    oof_parts: List[pd.DataFrame] = []
    for fold, train_idx, val_idx in build_expanding_folds(labelled):
        train = add_cyclic_season(labelled.loc[train_idx].copy())
        val = add_cyclic_season(labelled.loc[val_idx].copy())
        model = Pipeline([
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(class_weight="balanced", max_iter=2000, random_state=RANDOM_STATE)),
        ])
        model.fit(train[SEASON_FEATURES], train["label"].astype(int))
        probability = model.predict_proba(val[SEASON_FEATURES])[:, 1]
        fold_results.append({"fold": fold.__dict__, "metrics_at_0_50": metric_bundle(val["label"], probability, 0.50)})
        part = val[["date", "location", "label", "event_id"]].copy()
        part["probability"] = probability
        oof_parts.append(part)
    oof = pd.concat(oof_parts, ignore_index=True)
    threshold, _ = select_threshold(oof["label"].to_numpy(), oof["probability"].to_numpy())
    return {
        "purpose": "diagnostic_only_not_eligible_for_selection",
        "features": SEASON_FEATURES,
        "selected_development_threshold": threshold,
        "pooled_oof_metrics": metric_bundle(oof["label"], oof["probability"], threshold),
        "folds": fold_results,
    }


def choose_candidate(results: List[Dict[str, object]]) -> Dict[str, object]:
    eligible = [r for r in results if bool(r.get("eligible_for_selection", False))]
    eligible = sorted(
        eligible,
        key=lambda r: (
            -1.0 if r["mean_fold_pr_auc"] is None else float(r["mean_fold_pr_auc"]),
            -float(r["pooled_oof_metrics_at_selected_threshold"]["brier_score"]),
        ),
        reverse=True,
    )
    if not eligible:
        raise ValueError("No eligible Model v3 candidates completed")
    return eligible[0]


def run(features_path: Path, events_path: Path) -> Dict[str, object]:
    features = load_features(features_path)
    events = load_events(events_path)
    labelled = attach_development_labels(features, events)
    y = labelled["label"].astype(int)
    negatives = int((y == 0).sum())
    positives = int(y.sum())
    templates = make_candidates(max(1.0, negatives / max(1, positives)))

    candidate_specs = [
        ("logistic_balanced", False, True),
        ("random_forest_balanced", False, True),
        ("xgboost_regularized", False, True),
        ("xgboost_regularized_cyclic_season", True, False),
    ]
    results: List[Dict[str, object]] = []
    for name, include_season, eligible_for_selection in candidate_specs:
        template_name = "xgboost_regularized" if name.startswith("xgboost_regularized") else name
        result = evaluate_candidate(name, templates[template_name], labelled, events, include_season)
        result["eligible_for_selection"] = bool(eligible_for_selection)
        results.append(result)

    season = season_only_diagnostic(labelled)
    winner = choose_candidate(results)
    season_pr = season["pooled_oof_metrics"].get("pr_auc")
    winner_pr = winner["pooled_oof_metrics_at_selected_threshold"].get("pr_auc")
    season_flag = None
    if season_pr is not None and winner_pr is not None:
        season_flag = bool(float(winner_pr) <= float(season_pr) + 0.01)

    return {
        "status": "development_only_not_production_validated",
        "protocol": "Model v3: 2018-2021 development only; expanding-year temporal CV; no 2022-2024 evaluation",
        "hard_development_cutoff": str(DEVELOPMENT_CUTOFF.date()),
        "development_start": str(DEVELOPMENT_START.date()),
        "target_definition": {
            "anchor": "independent documented flood observed_by_date",
            "positive_window": f"anchor-{PRIMARY_POSITIVE_DAYS_BEFORE}d through anchor; no post-event positive days",
            "uncertainty_exclusion_window_days": EXCLUSION_DAYS,
            "warning": "Historical event-window target only. It does not establish issue-time 48/72h forecasting skill.",
        },
        "data": {
            "feature_rows_used": int(len(features)),
            "labelled_rows_after_uncertainty_exclusion": int(len(labelled)),
            "positive_rows": positives, "negative_rows": negatives,
            "development_events": int(events["event_id"].nunique()),
            "locations": sorted(labelled["location"].astype(str).unique().tolist()),
            "features_sha256": sha256_file(features_path), "events_sha256": sha256_file(events_path),
        },
        "leakage_guards": [
            "All development rows are strictly before 2022-01-01.",
            "All development events are strictly before 2022-01-01.",
            "Temporal folds train only on years earlier than each validation year.",
            "Location/reach normalization statistics are fitted inside each fold using training years only.",
            "Raw month and day_of_year are excluded from all eligible candidates.",
            "Calendar-feature variants are diagnostic only and cannot win model selection.",
            "2022-2024 results are not used for feature, model, hyperparameter or threshold selection.",
        ],
        "season_only_diagnostic": season,
        "candidates": results,
        "model_selection_warning": "Only seven independent event anchors fall in the 2019-2021 out-of-fold validation years. Treat model ranking as provisional until the development event registry is strengthened.",
        "selected_candidate": {
            "candidate": winner["candidate"],
            "selection_rule": "highest mean temporal-fold PR-AUC; Brier score tie-breaker",
            "development_threshold": winner["selected_development_threshold"],
            "mean_fold_pr_auc": winner["mean_fold_pr_auc"],
            "pooled_oof_metrics": winner["pooled_oof_metrics_at_selected_threshold"],
            "development_event_metrics": winner["development_event_metrics"],
            "seasonal_signal_warning": season_flag,
            "calendar_features_allowed_in_winner": False,
        },
        "freeze_gate": {
            "ready_to_freeze_for_new_holdout": False,
            "reason": "Development candidate only. CI reproduction, calibration review, event-definition review and a genuinely new untouched/prospective holdout are still required.",
        },
        "production": {"engine_remains": "derived-v2", "model_v3_deployed": False},
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--features", type=Path, default=DEFAULT_FEATURES)
    ap.add_argument("--events", type=Path, default=DEFAULT_EVENTS)
    ap.add_argument("--output", type=Path, default=HERE / "model_v3_development_results.json")
    args = ap.parse_args()
    result = run(args.features, args.events)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
