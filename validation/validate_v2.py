#!/usr/bin/env python3
"""NaijaClimaGuard Validation v2.

Independent-event, chronological XGBoost benchmark using:
- NASA GPM IMERG Final V07 precipitation
- Copernicus/ECMWF GloFAS v4 river discharge
- ERA5-Land surface-state variables

Ground truth is never generated from predictor thresholds.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score

HERE = Path(__file__).resolve().parent
DEFAULT_EVENTS = HERE / "event_registry.csv"
MIN_EVENTS_FOR_HEADLINE_METRICS = 20


def load_events(path: Path) -> pd.DataFrame:
    events = pd.read_csv(path, parse_dates=["observed_by_date", "event_end_date"])
    events = events[events["include_in_benchmark"].astype(str).str.lower().eq("true")].copy()
    if events.empty:
        raise ValueError("No benchmark events enabled")
    return events.sort_values("observed_by_date").reset_index(drop=True)


def load_feature_file(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["date"])
    required = {
        "date", "location", "nasa_imerg_precip_mm_day", "river_discharge_m3s",
        "et0_fao_evapotranspiration",
    }
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing fused source columns: {sorted(missing)}")
    return df.sort_values(["location", "date"]).reset_index(drop=True)


def attach_independent_labels(
    features: pd.DataFrame,
    events: pd.DataFrame,
    positive_days_before: int = 3,
    positive_days_after: int = 1,
    exclusion_days: int = 14,
) -> pd.DataFrame:
    x = features.copy()
    x["label"] = 0
    x["excluded"] = False
    x["event_id"] = ""

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
        ) & ~positive
        x.loc[positive, "label"] = 1
        x.loc[positive, "event_id"] = e["event_id"]
        x.loc[uncertain, "excluded"] = True

    return x[~x["excluded"]].copy()


def feature_columns(df: pd.DataFrame) -> List[str]:
    candidates = [
        # NASA IMERG observed rainfall
        "nasa_imerg_precip_mm_day",
        "nasa_rain_3d_sum", "nasa_rain_7d_sum", "nasa_rain_14d_sum", "nasa_rain_30d_sum",
        # GloFAS hydrology
        "river_discharge_m3s", "discharge_lag1", "discharge_lag3", "discharge_lag7",
        "discharge_3d_mean", "discharge_7d_mean", "discharge_3d_change", "discharge_7d_change",
        # ERA5-Land antecedent surface state
        "soil_moisture_0_to_7cm", "soil_moisture_7_to_28cm", "soil_moisture_28_to_100cm",
        "soil_moisture_profile_mean", "soil_moisture_7d_mean",
        "et0_fao_evapotranspiration", "nasa_rain_minus_et0", "water_balance_7d",
        "temperature_2m_max", "temperature_2m_min", "precipitation_hours",
        "month", "day_of_year",
        # Reserved for true archived forecast/reforecast evaluation
        "forecast_precip_24h", "forecast_precip_48h", "forecast_precip_72h",
        "forecast_discharge_24h", "forecast_discharge_48h", "forecast_discharge_72h",
    ]
    cols = [c for c in candidates if c in df.columns]
    if not cols:
        raise ValueError("No modelling features found")
    return cols


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
        rows.append({
            "event_id": e["event_id"],
            "location": e["location"],
            "observed_by_date": str(t0.date()),
            "first_threshold_crossing": None if pd.isna(first) else str(first.date()),
            "hindcast_detection_lead_hours": lead_hours,
            "detected_before_or_on_event": lead_hours is not None and lead_hours >= 0,
            "warning": "This is observational hindcast timing unless archived forecast columns were used.",
        })
    return rows


def evaluate(df: pd.DataFrame, events: pd.DataFrame, cutoff: str, threshold: float) -> Dict:
    cols = feature_columns(df)
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

    test_event_count = events[events["observed_by_date"] >= pd.Timestamp(cutoff)]["event_id"].nunique()
    publishable = test_event_count >= MIN_EVENTS_FOR_HEADLINE_METRICS

    result: Dict[str, object] = {
        "status": "publishable" if publishable else "exploratory_only",
        "reason": None if publishable else (
            f"Only {test_event_count} independent test events; minimum for headline metrics is "
            f"{MIN_EVENTS_FOR_HEADLINE_METRICS}. Do not use these metrics as pitch headline claims."
        ),
        "model": "XGBoost",
        "source_stack": [
            "NASA GPM IMERG Final V07 precipitation",
            "Copernicus/ECMWF GloFAS v4 river discharge",
            "ERA5-Land surface-state variables",
        ],
        "cutoff": cutoff,
        "threshold": threshold,
        "features": cols,
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "train_positive_rows": positives,
        "test_positive_rows": int(y_test.sum()),
        "independent_test_events": int(test_event_count),
        "precision": float(precision_score(y_test, pred, zero_division=0)),
        "recall": float(recall_score(y_test, pred, zero_division=0)),
    }

    if y_test.nunique() == 2:
        result["roc_auc"] = float(roc_auc_score(y_test, p))
        result["pr_auc"] = float(average_precision_score(y_test, p))
    else:
        result["roc_auc"] = None
        result["pr_auc"] = None

    result["events"] = event_lead_time_table(scored, events, threshold)
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
    labelled = attach_independent_labels(features, events)
    result = evaluate(labelled, events, args.cutoff, args.threshold)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
