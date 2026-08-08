#!/usr/bin/env python3
"""NaijaClimaGuard Validation v2.

Independent-event, chronological XGBoost benchmark using:
- NASA GPM IMERG Final V07 precipitation
- Copernicus/ECMWF GloFAS v4 river discharge
- ERA5-Land surface-state variables

Ground truth is never generated from predictor thresholds. Positive event days
always override uncertainty buffers, including when two genuine events at the
same location are close enough for their buffers to overlap.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

HERE = Path(__file__).resolve().parent
DEFAULT_EVENTS = HERE / "event_registry.csv"
MIN_TRAIN_EVENTS_FOR_HEADLINE_METRICS = 10
MIN_TEST_EVENTS_FOR_HEADLINE_METRICS = 20
MIN_FEATURE_NONNULL_FRACTION = 0.90


def load_events(path: Path) -> pd.DataFrame:
    events = pd.read_csv(path, parse_dates=["observed_by_date", "event_end_date"])
    events = events[events["include_in_benchmark"].astype(str).str.lower().eq("true")].copy()
    if events.empty:
        raise ValueError("No benchmark events enabled")
    return events.sort_values("observed_by_date").reset_index(drop=True)


def load_feature_file(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["date"])
    required = {"date", "location", "nasa_imerg_precip_mm_day", "river_discharge_m3s"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing fused core-source columns: {sorted(missing)}")
    soil = [c for c in (
        "soil_moisture_0_to_7cm",
        "soil_moisture_7_to_28cm",
        "soil_moisture_28_to_100cm",
        "soil_moisture_profile_mean",
    ) if c in df.columns]
    if not soil:
        raise ValueError("No ERA5-Land soil-moisture state column found")
    return df.sort_values(["location", "date"]).reset_index(drop=True)


def feature_covered_events(events: pd.DataFrame, features: pd.DataFrame) -> pd.DataFrame:
    """Keep only events whose observed date is represented by that location's feature period.

    This prevents registry events outside available feature history (for example
    Makurdi 2017 when features begin in 2018) from satisfying the independent-event
    publishability gate.
    """
    coverage = (
        features.groupby("location")["date"]
        .agg(feature_start="min", feature_end="max")
        .reset_index()
    )
    covered = events.merge(coverage, on="location", how="left")
    in_range = (
        covered["feature_start"].notna()
        & covered["observed_by_date"].between(covered["feature_start"], covered["feature_end"])
    )
    return covered[in_range].copy()


def attach_independent_labels(
    features: pd.DataFrame,
    events: pd.DataFrame,
    positive_days_before: int = 3,
    positive_days_after: int = 1,
    exclusion_days: int = 14,
) -> pd.DataFrame:
    x = features.copy()
    x["label"] = 0
    x["event_id"] = ""
    positive_any = pd.Series(False, index=x.index)
    uncertain_any = pd.Series(False, index=x.index)

    for _, e in events.iterrows():
        same = x["location"].eq(e["location"])
        t0 = e["observed_by_date"]
        positive = same & x["date"].between(
            t0 - pd.Timedelta(days=positive_days_before),
            t0 + pd.Timedelta(days=positive_days_after),
        )
        uncertain = same & x["date"].between(
            t0 - pd.Timedelta(days=exclusion_days),
            t0 + pd.Timedelta(days=exclusion_days),
        )
        positive_any |= positive
        uncertain_any |= uncertain
        x.loc[positive, "label"] = 1
        existing = x.loc[positive, "event_id"].astype(str)
        x.loc[positive, "event_id"] = np.where(
            existing.eq(""), e["event_id"], existing + ";" + str(e["event_id"])
        )

    x["excluded"] = uncertain_any & ~positive_any
    return x[~x["excluded"]].copy()


def feature_columns(df: pd.DataFrame) -> Tuple[List[str], Dict[str, float]]:
    candidates = [
        "nasa_imerg_precip_mm_day",
        "nasa_rain_3d_sum", "nasa_rain_7d_sum", "nasa_rain_14d_sum", "nasa_rain_30d_sum",
        "river_discharge_m3s", "discharge_lag1", "discharge_lag3", "discharge_lag7",
        "discharge_3d_mean", "discharge_7d_mean", "discharge_3d_change", "discharge_7d_change",
        "soil_moisture_0_to_7cm", "soil_moisture_7_to_28cm", "soil_moisture_28_to_100cm",
        "soil_moisture_profile_mean", "soil_moisture_7d_mean",
        "et0_fao_evapotranspiration", "nasa_rain_minus_et0", "water_balance_7d",
        "temperature_2m_max", "temperature_2m_min", "precipitation_hours",
        "month", "day_of_year",
        "forecast_precip_24h", "forecast_precip_48h", "forecast_precip_72h",
        "forecast_discharge_24h", "forecast_discharge_48h", "forecast_discharge_72h",
    ]
    available = [c for c in candidates if c in df.columns]
    coverage = {c: float(df[c].notna().mean()) for c in available}
    cols = [c for c in available if coverage[c] >= MIN_FEATURE_NONNULL_FRACTION]
    dropped = {c: round(coverage[c], 4) for c in available if c not in cols}
    required_core = {"nasa_imerg_precip_mm_day", "river_discharge_m3s"}
    if not required_core.issubset(cols):
        raise ValueError(f"Core source feature coverage below {MIN_FEATURE_NONNULL_FRACTION:.0%}: {dropped}")
    if not any(c.startswith("soil_moisture") for c in cols):
        raise ValueError(f"ERA5-Land soil feature coverage below {MIN_FEATURE_NONNULL_FRACTION:.0%}: {dropped}")
    if not cols:
        raise ValueError("No modelling features passed coverage gate")
    return cols, dropped


def chronological_split(df: pd.DataFrame, cutoff: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    cut = pd.Timestamp(cutoff)
    train = df[df["date"] < cut].copy()
    test = df[df["date"] >= cut].copy()
    if train.empty or test.empty:
        raise ValueError("Chronological cutoff produced an empty train or test set")
    return train, test


def event_lead_time_table(test: pd.DataFrame, events: pd.DataFrame, threshold: float) -> List[Dict]:
    rows: List[Dict] = []
    for _, e in events.iterrows():
        t0 = e["observed_by_date"]
        if t0 < test["date"].min() or t0 > test["date"].max():
            continue
        w = test[
            test["location"].eq(e["location"])
            & test["date"].between(t0 - pd.Timedelta(days=7), t0)
        ].sort_values("date")
        crossed = w[w["probability"] >= threshold]
        first = crossed.iloc[0]["date"] if not crossed.empty else pd.NaT
        lead_hours = None if pd.isna(first) else int((t0 - first).total_seconds() / 3600)
        max_probability = None if w.empty else float(w["probability"].max())
        max_probability_date = None if w.empty else str(w.loc[w["probability"].idxmax(), "date"].date())
        rows.append({
            "event_id": e["event_id"],
            "location": e["location"],
            "observed_by_date": str(t0.date()),
            "first_threshold_crossing": None if pd.isna(first) else str(first.date()),
            "hindcast_detection_lead_hours": lead_hours,
            "detected_before_or_on_event": lead_hours is not None and lead_hours >= 0,
            "max_probability_in_7d_window": max_probability,
            "max_probability_date": max_probability_date,
            "warning": "Observational hindcast timing only unless archived forecast-time features were used.",
        })
    return rows


def binary_metrics(y_true, probability, prediction) -> Dict[str, object]:
    y_true = np.asarray(y_true, dtype=int)
    probability = np.asarray(probability, dtype=float)
    prediction = np.asarray(prediction, dtype=int)
    tn, fp, fn, tp = confusion_matrix(y_true, prediction, labels=[0, 1]).ravel()
    out: Dict[str, object] = {
        "precision": float(precision_score(y_true, prediction, zero_division=0)),
        "recall": float(recall_score(y_true, prediction, zero_division=0)),
        "f1": float(f1_score(y_true, prediction, zero_division=0)),
        "brier_score": float(brier_score_loss(y_true, probability)),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "false_alarm_ratio": float(fp / (tp + fp)) if (tp + fp) else None,
        "miss_rate": float(fn / (tp + fn)) if (tp + fn) else None,
    }
    if np.unique(y_true).size == 2:
        out["roc_auc"] = float(roc_auc_score(y_true, probability))
        out["pr_auc"] = float(average_precision_score(y_true, probability))
    else:
        out["roc_auc"] = None
        out["pr_auc"] = None
    return out


def per_location_metrics(scored: pd.DataFrame) -> Dict[str, object]:
    out: Dict[str, object] = {}
    for location, g in scored.groupby("location"):
        out[location] = {
            "rows": int(len(g)),
            "positive_rows": int(g["label"].sum()),
            **binary_metrics(g["label"], g["probability"], g["prediction"]),
        }
    return out


def evaluate(df: pd.DataFrame, events: pd.DataFrame, cutoff: str, threshold: float) -> Dict:
    cols, dropped_low_coverage = feature_columns(df)
    train, test = chronological_split(df, cutoff)
    X_train = train[cols].replace([np.inf, -np.inf], np.nan)
    X_test = test[cols].replace([np.inf, -np.inf], np.nan)
    y_train = train["label"].astype(int)
    y_test = test["label"].astype(int)
    if y_train.nunique() < 2:
        raise ValueError("Training period does not contain both classes")

    positives = int(y_train.sum())
    negatives = int((y_train == 0).sum())
    scale_pos_weight = max(1.0, negatives / max(1, positives))
    model = xgb.XGBClassifier(
        n_estimators=350,
        max_depth=4,
        learning_rate=0.04,
        min_child_weight=3,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_lambda=2.0,
        reg_alpha=0.1,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        eval_metric="aucpr",
        tree_method="hist",
    )
    model.fit(X_train, y_train)
    p = model.predict_proba(X_test)[:, 1]
    pred = (p >= threshold).astype(int)

    scored = test[["date", "location", "label", "event_id"]].copy()
    scored["probability"] = p
    scored["prediction"] = pred

    cut = pd.Timestamp(cutoff)
    coverage_start = df["date"].min()
    coverage_end = df["date"].max()
    covered_events = events[events["observed_by_date"].between(coverage_start, coverage_end)].copy()
    train_events = covered_events[covered_events["observed_by_date"] < cut].copy()
    test_events = covered_events[covered_events["observed_by_date"] >= cut].copy()
    train_event_count = int(train_events["event_id"].nunique())
    test_event_count = int(test_events["event_id"].nunique())
    train_gate = train_event_count >= MIN_TRAIN_EVENTS_FOR_HEADLINE_METRICS
    test_gate = test_event_count >= MIN_TEST_EVENTS_FOR_HEADLINE_METRICS
    publishable = train_gate and test_gate
    reasons: List[str] = []
    if not train_gate:
        reasons.append(f"Only {train_event_count} feature-covered independent training events; minimum is {MIN_TRAIN_EVENTS_FOR_HEADLINE_METRICS}.")
    if not test_gate:
        reasons.append(f"Only {test_event_count} feature-covered independent test events; minimum is {MIN_TEST_EVENTS_FOR_HEADLINE_METRICS}.")
    if not publishable:
        reasons.append("Do not use these metrics as pitch headline claims.")

    event_rows = event_lead_time_table(scored, test_events, threshold)
    detected_events = sum(bool(r["detected_before_or_on_event"]) for r in event_rows)

    result: Dict[str, object] = {
        "status": "publishable_historical_hindcast" if publishable else "exploratory_only",
        "reason": None if publishable else " ".join(reasons),
        "model": "XGBoost",
        "validation_type": "historical independent-event hindcast; not yet a true issue-time 48/72h forecast benchmark",
        "source_stack": [
            "NASA GPM IMERG Final V07 precipitation",
            "Copernicus/ECMWF GloFAS v4 river discharge",
            "ERA5-Land surface-state variables",
        ],
        "feature_data_start": str(coverage_start.date()),
        "feature_data_end": str(coverage_end.date()),
        "cutoff": cutoff,
        "threshold": threshold,
        "threshold_origin": "Predeclared fixed threshold; not optimized on the chronological test set.",
        "minimum_feature_nonnull_fraction": MIN_FEATURE_NONNULL_FRACTION,
        "features": cols,
        "dropped_low_coverage_features": dropped_low_coverage,
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "train_positive_rows": positives,
        "test_positive_rows": int(y_test.sum()),
        "independent_train_events": train_event_count,
        "independent_test_events": test_event_count,
        "minimum_train_events_for_headline_metrics": MIN_TRAIN_EVENTS_FOR_HEADLINE_METRICS,
        "minimum_test_events_for_headline_metrics": MIN_TEST_EVENTS_FOR_HEADLINE_METRICS,
        **binary_metrics(y_test, p, pred),
        "event_detection_rate": float(detected_events / len(event_rows)) if event_rows else None,
        "detected_test_events": int(detected_events),
        "evaluated_test_events": int(len(event_rows)),
        "per_location": per_location_metrics(scored),
        "events": event_rows,
    }
    return result


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--features", type=Path, default=HERE / "features_daily.csv")
    ap.add_argument("--events", type=Path, default=DEFAULT_EVENTS)
    ap.add_argument("--cutoff", default="2022-01-01")
    ap.add_argument("--threshold", type=float, default=0.50)
    ap.add_argument("--output", type=Path, default=HERE / "validation_results.json")
    args = ap.parse_args()

    events = load_events(args.events)
    features = load_feature_file(args.features)
    events = feature_covered_events(events, features)
    labelled = attach_independent_labels(features, events)
    result = evaluate(labelled, events, args.cutoff, args.threshold)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
