#!/usr/bin/env python3
"""Train/freeze NaijaClimaGuard Model v4 Full-History Forward candidate.

Development corpus: 2018-2024 fused NASA IMERG + GloFAS + ERA5-Land.
Target: documented flood anchor occurs in the next 1-3 days.

This script creates a SHADOW candidate only. It never authorizes replacement of
production derived-v2. Prospective evidence starts only after the artifact is
frozen and predictions are issued with issue-time source data.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Dict, Iterable, Tuple

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.preprocessing import StandardScaler

START = pd.Timestamp("2018-01-01")
END = pd.Timestamp("2024-12-31")
EXPECTED_EVENTS = 35
RANDOM_STATE = 42
EXCLUSION_DAYS = 14

# Selected during already-consumed 2018-2024 temporal development. Future
# prospective observations were not used to choose these values.
MODEL_C = 0.0010697552214920362
POSITIVE_CLASS_WEIGHT = 4.906903271087181

BASE_FEATURES = [
    "nasa_imerg_precip_mm_day",
    "nasa_rain_3d_sum", "nasa_rain_7d_sum", "nasa_rain_14d_sum", "nasa_rain_30d_sum",
    "river_discharge_m3s", "discharge_lag1", "discharge_lag3", "discharge_lag7",
    "discharge_3d_mean", "discharge_7d_mean", "discharge_3d_change", "discharge_7d_change",
    "soil_moisture_0_to_7cm", "soil_moisture_7_to_28cm", "soil_moisture_28_to_100cm",
    "soil_moisture_profile_mean", "soil_moisture_7d_mean",
    "temperature_2m_max", "temperature_2m_min", "precipitation_hours",
]
DERIVED_FEATURES = [
    "discharge_location_ratio", "discharge_location_robust_z",
    "rain_location_ratio", "rain_location_robust_z",
    "discharge_vs_7d_mean", "rain_3d_vs_30d", "rain_7d_vs_30d",
]
FEATURES = BASE_FEATURES + DERIVED_FEATURES


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_inputs(features_path: Path, events_path: Path) -> Tuple[pd.DataFrame, pd.DataFrame]:
    df = pd.read_csv(features_path, parse_dates=["date"])
    df = df[df["date"].between(START, END)].copy()
    required = {"date", "location", *BASE_FEATURES}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing required full-source columns: {sorted(missing)}")

    events = pd.read_csv(events_path, parse_dates=["observed_by_date"])
    enabled = events["include_in_benchmark"].astype(str).str.lower().eq("true")
    events = events[enabled & events["observed_by_date"].between(START, END)].copy()
    if events["event_id"].nunique() != EXPECTED_EVENTS:
        raise ValueError(
            f"Frozen Model v4 registry must contain {EXPECTED_EVENTS} unique enabled events; "
            f"got {events['event_id'].nunique()}"
        )
    return (
        df.sort_values(["location", "date"]).reset_index(drop=True),
        events.sort_values("observed_by_date").reset_index(drop=True),
    )


def attach_forward_labels(features: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:
    """Positive date t means a documented event anchor falls in t+1..t+3 days."""
    x = features.copy()
    x["label"] = 0
    x["event_id"] = ""
    positive_any = pd.Series(False, index=x.index)
    uncertainty_any = pd.Series(False, index=x.index)

    for _, event in events.iterrows():
        same = x["location"].eq(event["location"])
        anchor = event["observed_by_date"]
        positive = same & x["date"].between(
            anchor - pd.Timedelta(days=3),
            anchor - pd.Timedelta(days=1),
        )
        uncertain = same & x["date"].between(
            anchor - pd.Timedelta(days=EXCLUSION_DAYS),
            anchor + pd.Timedelta(days=EXCLUSION_DAYS),
        )
        positive_any |= positive
        uncertainty_any |= uncertain
        x.loc[positive, "label"] = 1
        x.loc[positive, "event_id"] = str(event["event_id"])

    x["excluded"] = uncertainty_any & ~positive_any
    return x[~x["excluded"]].copy().reset_index(drop=True)


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
    stats: Dict[str, Dict[str, float]] = {}
    gq = _robust_stats(train["river_discharge_m3s"])
    gr = _robust_stats(train["nasa_imerg_precip_mm_day"])
    stats["__GLOBAL__"] = {
        "q_median": gq[0], "q_iqr": gq[1], "q_denom": gq[2],
        "r_median": gr[0], "r_iqr": gr[1], "r_denom": gr[2],
    }
    for location, group in train.groupby("location"):
        q = _robust_stats(group["river_discharge_m3s"])
        r = _robust_stats(group["nasa_imerg_precip_mm_day"])
        stats[str(location)] = {
            "q_median": q[0], "q_iqr": q[1], "q_denom": q[2],
            "r_median": r[0], "r_iqr": r[1], "r_denom": r[2],
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
    r_denom = out["location"].map(lambda x: st(x)["r_denom"]).astype(float)

    out["discharge_location_ratio"] = out["river_discharge_m3s"] / q_denom
    out["discharge_location_robust_z"] = (out["river_discharge_m3s"] - q_median) / q_iqr
    out["rain_location_ratio"] = out["nasa_imerg_precip_mm_day"] / r_denom
    out["rain_location_robust_z"] = (out["nasa_imerg_precip_mm_day"] - r_median) / r_iqr
    out["discharge_vs_7d_mean"] = out["river_discharge_m3s"] / (out["discharge_7d_mean"].abs() + 1e-6)
    out["rain_3d_vs_30d"] = out["nasa_rain_3d_sum"] / (out["nasa_rain_30d_sum"].abs() + 1e-6)
    out["rain_7d_vs_30d"] = out["nasa_rain_7d_sum"] / (out["nasa_rain_30d_sum"].abs() + 1e-6)
    return out


def make_model() -> LogisticRegression:
    return LogisticRegression(
        C=MODEL_C,
        penalty="l2",
        solver="liblinear",
        class_weight={0: 1.0, 1: POSITIVE_CLASS_WEIGHT},
        max_iter=3000,
        random_state=RANDOM_STATE,
    )


def score_event_detection(scored: pd.DataFrame, events: pd.DataFrame, threshold: float) -> Dict[str, object]:
    rows = []
    years = set(scored["date"].dt.year.unique())
    for _, event in events.iterrows():
        anchor = event["observed_by_date"]
        if anchor.year not in years:
            continue
        window = scored[
            scored["location"].eq(event["location"])
            & scored["date"].between(anchor - pd.Timedelta(days=3), anchor - pd.Timedelta(days=1))
        ]
        if window.empty:
            continue
        detected = bool((window["probability"] >= threshold).any())
        rows.append({"event_id": str(event["event_id"]), "detected": detected})
    detected = sum(bool(x["detected"]) for x in rows)
    return {
        "detected_events": detected,
        "evaluated_events": len(rows),
        "event_detection_rate": float(detected / len(rows)) if rows else None,
    }


def threshold_metrics(scored: pd.DataFrame, events: pd.DataFrame, threshold: float) -> Dict[str, object]:
    y = scored["label"].to_numpy(dtype=int)
    p = scored["probability"].to_numpy(dtype=float)
    pred = p >= threshold
    tp = int(((pred) & (y == 1)).sum())
    fp = int(((pred) & (y == 0)).sum())
    fn = int(((~pred) & (y == 1)).sum())
    negatives = int((y == 0).sum())
    return {
        "threshold": float(threshold),
        "precision": float(tp / (tp + fp)) if (tp + fp) else 0.0,
        "recall": float(tp / (tp + fn)) if (tp + fn) else 0.0,
        "false_positive_location_days": fp,
        "false_positive_location_days_per_1000_negative": float(1000.0 * fp / negatives) if negatives else None,
        **score_event_detection(scored, events, threshold),
    }


def choose_shadow_threshold(scored: pd.DataFrame, events: pd.DataFrame) -> Tuple[float, Dict[str, object]]:
    """Highest calibrated threshold that still detects >=75% historical OOF events.

    This is a sensitivity-first SHADOW threshold, not a production-approval gate.
    Prospective evidence must independently satisfy the much stricter false-alert
    and precision criteria before replacement is considered.
    """
    unique = np.unique(np.round(scored["probability"].to_numpy(dtype=float), 6))
    candidates = []
    for threshold in unique:
        metrics = threshold_metrics(scored, events, float(threshold))
        rate = metrics.get("event_detection_rate")
        if rate is not None and float(rate) >= 0.75:
            candidates.append((float(threshold), metrics))
    if not candidates:
        raise ValueError("No historical OOF threshold reaches 75% event detection; do not freeze this generation")
    return max(candidates, key=lambda x: x[0])


def run(features_path: Path, events_path: Path) -> Tuple[Dict[str, object], Dict[str, object]]:
    features, events = load_inputs(features_path, events_path)
    labelled = attach_forward_labels(features, events)

    oof_parts = []
    folds = []
    for validation_year in range(2019, 2025):
        train = labelled[labelled["date"] < pd.Timestamp(f"{validation_year}-01-01")].copy()
        val = labelled[labelled["date"].dt.year.eq(validation_year)].copy()
        if train.empty or val.empty or train["label"].nunique() < 2 or val["label"].nunique() < 2:
            continue

        calibration = fit_location_calibration(train)
        train = apply_location_calibration(train, calibration)
        val = apply_location_calibration(val, calibration)

        X_train = train[FEATURES].replace([np.inf, -np.inf], np.nan)
        X_val = val[FEATURES].replace([np.inf, -np.inf], np.nan)
        y_train = train["label"].astype(int)
        y_val = val["label"].astype(int)

        imputer = SimpleImputer(strategy="median")
        scaler = StandardScaler()
        X_train_i = imputer.fit_transform(X_train)
        X_val_i = imputer.transform(X_val)
        X_train_s = scaler.fit_transform(X_train_i)
        X_val_s = scaler.transform(X_val_i)

        model = make_model()
        model.fit(X_train_s, y_train)
        probability = model.predict_proba(X_val_s)[:, 1]

        folds.append({
            "validation_year": validation_year,
            "train_rows": int(len(train)),
            "validation_rows": int(len(val)),
            "validation_positive_rows": int(y_val.sum()),
            "prevalence": float(y_val.mean()),
            "pr_auc": float(average_precision_score(y_val, probability)),
            "roc_auc": float(roc_auc_score(y_val, probability)),
            "brier_score": float(brier_score_loss(y_val, probability)),
        })
        part = val[["date", "location", "label", "event_id"]].copy()
        part["raw_probability"] = probability
        oof_parts.append(part)

    if len(folds) != 6:
        raise ValueError(f"Expected six expanding validation years 2019-2024; got {len(folds)}")

    oof = pd.concat(oof_parts, ignore_index=True).sort_values(["date", "location"]).reset_index(drop=True)
    isotonic = IsotonicRegression(out_of_bounds="clip")
    oof["probability"] = isotonic.fit_transform(oof["raw_probability"], oof["label"])
    eval_events = events[events["observed_by_date"].dt.year.isin(range(2019, 2025))].copy()
    shadow_threshold, shadow_metrics = choose_shadow_threshold(oof, eval_events)

    # Final fit on every permitted historical development row.
    full_calibration = fit_location_calibration(labelled)
    full = apply_location_calibration(labelled, full_calibration)
    X_full = full[FEATURES].replace([np.inf, -np.inf], np.nan)
    y_full = full["label"].astype(int)
    imputer = SimpleImputer(strategy="median")
    scaler = StandardScaler()
    X_full_i = imputer.fit_transform(X_full)
    X_full_s = scaler.fit_transform(X_full_i)
    model = make_model()
    model.fit(X_full_s, y_full)

    results = {
        "status": "full_history_forward_development_complete_shadow_candidate",
        "development_period": [str(START.date()), str(END.date())],
        "target": "documented flood anchor in next 1-3 days; anchor day and post-event days are not positive",
        "feature_rows": int(len(features)),
        "labelled_rows_after_uncertainty_exclusion": int(len(labelled)),
        "positive_rows": int(y_full.sum()),
        "events": int(events["event_id"].nunique()),
        "folds": folds,
        "mean_temporal_fold_pr_auc": float(np.mean([x["pr_auc"] for x in folds])),
        "all_folds_above_prevalence": bool(all(x["pr_auc"] > x["prevalence"] for x in folds)),
        "pooled_oof_calibrated": {
            "pr_auc": float(average_precision_score(oof["label"], oof["probability"])),
            "roc_auc": float(roc_auc_score(oof["label"], oof["probability"])),
            "brier_score": float(brier_score_loss(oof["label"], oof["probability"])),
        },
        "shadow_threshold": shadow_threshold,
        "historical_shadow_threshold_metrics": shadow_metrics,
        "warning": "Historical development evidence only. The candidate is not production validated.",
    }

    artifact = {
        "artifact_type": "naijaclimaguard_model_v4_full_history_forward",
        "status": "frozen_shadow_candidate_not_production_validated",
        "training_period": [str(START.date()), str(END.date())],
        "training_events": EXPECTED_EVENTS,
        "prediction_horizon": "next_1_to_3_days",
        "features": FEATURES,
        "hyperparameters": {
            "algorithm": "regularized_logistic_regression",
            "C": MODEL_C,
            "positive_class_weight": POSITIVE_CLASS_WEIGHT,
            "penalty": "l2",
            "solver": "liblinear",
            "random_state": RANDOM_STATE,
        },
        "location_calibration": full_calibration,
        "imputer_median": [float(x) for x in imputer.statistics_],
        "scaler_mean": [float(x) for x in scaler.mean_],
        "scaler_scale": [float(x) for x in scaler.scale_],
        "coefficient": [float(x) for x in model.coef_[0]],
        "intercept": float(model.intercept_[0]),
        "isotonic_x_thresholds": [float(x) for x in isotonic.X_thresholds_],
        "isotonic_y_thresholds": [float(x) for x in isotonic.y_thresholds_],
        "shadow_threshold": float(shadow_threshold),
        "source_hashes": {
            "features_sha256": sha256_file(features_path),
            "events_sha256": sha256_file(events_path),
        },
        "replacement_authorized": False,
        "prospective_evidence_required": True,
    }
    return results, artifact


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--features", type=Path, default=Path("validation/features_daily.csv"))
    ap.add_argument("--events", type=Path, default=Path("validation/model_v4_event_registry.csv"))
    ap.add_argument("--results", type=Path, default=Path("validation/model_v4_full_history_results.json"))
    ap.add_argument("--artifact", type=Path, default=Path("validation/model_v4_frozen_artifact.json"))
    args = ap.parse_args()

    results, artifact = run(args.features, args.events)
    args.results.parent.mkdir(parents=True, exist_ok=True)
    args.results.write_text(json.dumps(results, indent=2), encoding="utf-8")
    args.artifact.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    print(json.dumps(results, indent=2))
    print(f"Wrote frozen shadow artifact: {args.artifact}")


if __name__ == "__main__":
    main()
