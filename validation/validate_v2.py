#!/usr/bin/env python3
"""
NaijaClimaGuard Validation v2

Conservative benchmark for independently documented flood events.

Principles
----------
1. Ground truth comes from external documented flood events, not thresholds
   computed from the same predictors used by the model.
2. Features at date t use information available at or before t only.
3. Train/test splits are chronological, never random across adjacent days.
4. Event detection/lead time is reported separately from classification metrics.
5. Headline metrics are suppressed when the independent event registry is too small.

This is validation code, not production forecasting code.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.ensemble import HistGradientBoostingClassifier

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
    """Load a pre-built daily feature table.

    Required columns:
      date, location, precipitation_sum, precipitation_hours,
      et0_fao_evapotranspiration

    Recommended hydrological columns when available:
      river_discharge, river_discharge_lag1, river_discharge_lag3,
      soil_moisture, forecast_precip_24h, forecast_precip_48h,
      forecast_discharge_24h, forecast_discharge_48h

    Important: forecast columns must be archived forecasts issued on that date,
    not reanalysis/future observations copied backwards.
    """
    df = pd.read_csv(path, parse_dates=["date"])
    required = {
        "date", "location", "precipitation_sum", "precipitation_hours",
        "et0_fao_evapotranspiration"
    }
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing required feature columns: {sorted(missing)}")
    return df.sort_values(["location", "date"]).reset_index(drop=True)


def engineer_past_only_features(df: pd.DataFrame) -> pd.DataFrame:
    out = []
    for location, g in df.groupby("location", sort=False):
        g = g.sort_values("date").copy()
        p = g["precipitation_sum"].fillna(0.0)
        et0 = g["et0_fao_evapotranspiration"].fillna(0.0)

        # All rolling windows end at t. No centered windows, no negative shifts.
        g["rain_3d"] = p.rolling(3, min_periods=1).sum()
        g["rain_7d"] = p.rolling(7, min_periods=1).sum()
        g["rain_14d"] = p.rolling(14, min_periods=1).sum()
        g["rain_30d"] = p.rolling(30, min_periods=1).sum()
        g["moisture_balance"] = p - et0
        g["moisture_balance_7d"] = g["moisture_balance"].rolling(7, min_periods=1).sum()
        g["rain_intensity"] = np.where(
            g["precipitation_hours"].fillna(0) > 0,
            p / g["precipitation_hours"].replace(0, np.nan),
            0.0,
        )
        g["month"] = g["date"].dt.month
        g["day_of_year"] = g["date"].dt.dayofyear
        g["is_monsoon"] = g["month"].isin([6, 7, 8, 9, 10]).astype(int)

        # Prefer measured/modelled hydrology if supplied. Lags are recomputed
        # from the source series so future discharge cannot leak backwards.
        if "river_discharge" in g:
            g["discharge_lag1"] = g["river_discharge"].shift(1)
            g["discharge_lag3"] = g["river_discharge"].shift(3)
            g["discharge_7d_mean"] = g["river_discharge"].rolling(7, min_periods=1).mean()
        out.append(g)
    return pd.concat(out, ignore_index=True)


def attach_independent_labels(
    features: pd.DataFrame,
    events: pd.DataFrame,
    positive_days_before: int = 3,
    positive_days_after: int = 1,
    exclusion_days: int = 14,
) -> pd.DataFrame:
    """Create labels from the independent event registry.

    Positive: decision dates from T-3 through T+1 around a documented flood.
    Excluded: near-event dates outside the positive window, to avoid calling the
    uncertain onset/recovery boundary a clean negative.
    Negative: dates away from all documented event windows.
    """
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
    base = [
        "precipitation_sum", "precipitation_hours", "et0_fao_evapotranspiration",
        "rain_3d", "rain_7d", "rain_14d", "rain_30d", "moisture_balance_7d",
        "rain_intensity", "month", "day_of_year", "is_monsoon",
    ]
    optional = [
        "river_discharge", "discharge_lag1", "discharge_lag3", "discharge_7d_mean",
        "soil_moisture", "forecast_precip_24h", "forecast_precip_48h",
        "forecast_discharge_24h", "forecast_discharge_48h",
    ]
    return [c for c in base + optional if c in df.columns]


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
        # Only assess events whose observed date lies inside the test period.
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
            "lead_time_hours": lead_hours,
            "detected_before_or_on_event": lead_hours is not None and lead_hours >= 0,
        })
    return rows


def evaluate(df: pd.DataFrame, events: pd.DataFrame, cutoff: str, threshold: float) -> Dict:
    cols = feature_columns(df)
    train, test = chronological_split(df, cutoff)

    X_train = train[cols].replace([np.inf, -np.inf], np.nan).fillna(0)
    X_test = test[cols].replace([np.inf, -np.inf], np.nan).fillna(0)
    y_train = train["label"].astype(int)
    y_test = test["label"].astype(int)

    if y_train.nunique() < 2:
        raise ValueError("Training period does not contain both classes")

    model = HistGradientBoostingClassifier(
        max_depth=4,
        learning_rate=0.05,
        max_iter=250,
        l2_regularization=1.0,
        random_state=42,
    )
    model.fit(X_train, y_train)
    p = model.predict_proba(X_test)[:, 1]
    pred = (p >= threshold).astype(int)

    scored = test[["date", "location", "label", "event_id"]].copy()
    scored["probability"] = p
    scored["prediction"] = pred

    test_event_count = events[events["observed_by_date"] >= pd.Timestamp(cutoff)]["event_id"].nunique()
    publishable = test_event_count >= MIN_EVENTS_FOR_HEADLINE_METRICS

    metrics: Dict[str, object] = {
        "status": "publishable" if publishable else "exploratory_only",
        "reason": None if publishable else (
            f"Only {test_event_count} independent test events; minimum for headline metrics is "
            f"{MIN_EVENTS_FOR_HEADLINE_METRICS}. Do not put these metrics in a pitch deck."
        ),
        "cutoff": cutoff,
        "threshold": threshold,
        "features": cols,
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "train_positive_rows": int(y_train.sum()),
        "test_positive_rows": int(y_test.sum()),
        "independent_test_events": int(test_event_count),
        "precision": float(precision_score(y_test, pred, zero_division=0)),
        "recall": float(recall_score(y_test, pred, zero_division=0)),
    }

    if y_test.nunique() == 2:
        metrics["roc_auc"] = float(roc_auc_score(y_test, p))
        metrics["pr_auc"] = float(average_precision_score(y_test, p))
    else:
        metrics["roc_auc"] = None
        metrics["pr_auc"] = None

    metrics["events"] = event_lead_time_table(scored, events, threshold)
    return metrics


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--features", type=Path, required=True,
                    help="Daily feature CSV assembled from archived observations/forecasts")
    ap.add_argument("--events", type=Path, default=DEFAULT_EVENTS)
    ap.add_argument("--cutoff", default="2022-01-01",
                    help="Strict chronological train/test boundary")
    ap.add_argument("--threshold", type=float, default=0.50)
    ap.add_argument("--output", type=Path, default=HERE / "validation_results.json")
    args = ap.parse_args()

    events = load_events(args.events)
    raw = load_feature_file(args.features)
    features = engineer_past_only_features(raw)
    labelled = attach_independent_labels(features, events)
    result = evaluate(labelled, events, args.cutoff, args.threshold)

    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
