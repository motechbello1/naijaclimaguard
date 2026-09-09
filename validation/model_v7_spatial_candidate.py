#!/usr/bin/env python3
"""Model V7-C spatial-footprint development experiment.

V7-C keeps the frozen V7 issue-time/event contract and adds a fixed spatial
neighbourhood around each benchmark anchor. The purpose is to distinguish an
isolated wet forecast from a broader wet footprint that is more consistent
with operational flood disruption.

Scientific boundary
-------------------
- 2024 leave-location-out predictions select family, horizon aggregation and
  alert policy.
- 2025 is secondary development evidence because its V7-A/V7-B outcomes have
  already been inspected.
- 2026 is hard-blocked and remains the untouched final holdout.
- The event registry is unchanged from V7-B in this experiment so any change
  can be attributed to the spatial representation and alert selection.
- Warning burden is reported explicitly so long alert episodes cannot hide
  behind a small episode count.
"""

from __future__ import annotations

import datetime as dt
import json
import pathlib
import statistics
from collections import defaultdict
from typing import Any

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

import model_v7_development_candidate as base
import model_v7_decision_policy_experiment as decision

ROOT = pathlib.Path(__file__).resolve().parent

# Frozen before the first V7-C score. 0.10 degrees is roughly an 11 km
# north/south offset in Nigeria. The cross gives one centre plus four nearby
# points without pretending to reconstruct a hydrological catchment.
SPATIAL_OFFSET_DEGREES = 0.10
SPATIAL_DIRECTIONS = {
    "north": (SPATIAL_OFFSET_DEGREES, 0.0),
    "south": (-SPATIAL_OFFSET_DEGREES, 0.0),
    "east": (0.0, SPATIAL_OFFSET_DEGREES),
    "west": (0.0, -SPATIAL_OFFSET_DEGREES),
}

SPATIAL_FORECAST_VARS = [
    "precipitation_previous_day1",
    "precipitation_previous_day2",
    "precipitation_previous_day3",
]
SPATIAL_HISTORY_VARS = [
    "precipitation",
    "soil_moisture_3_to_9cm",
]
SPATIAL_FEATURES = [
    "spatial_rain72_mean",
    "spatial_rain72_max",
    "spatial_rain72_spread",
    "spatial_rain72_center_minus_mean",
    "spatial_rain10_fraction",
    "spatial_rain20_fraction",
    "spatial_peak_day_mean",
    "spatial_peak_day_max",
    "spatial_ante_rain7_mean",
    "spatial_ante_rain7_max",
    "spatial_soil_root3_mean",
    "spatial_soil_root3_max",
    "spatial_wet_compound_mean",
    "spatial_wet_compound_max",
    "spatial_relief_to_lowest_m",
]
FEATURES = list(base.FEATURES) + SPATIAL_FEATURES

# Product sanity target, not a frozen competition gate. It prevents a policy
# from appearing operationally good only because many warning days are merged
# into a few very long episodes. 15% still permits ~55 warning days/year and is
# intentionally lenient for this development experiment.
INTERNAL_MAX_WARNING_FRACTION = 0.15


def spatial_points(coords: dict[str, tuple[float, float]]) -> tuple[list[tuple[str, float, float]], dict[str, list[str]]]:
    points: list[tuple[str, float, float]] = []
    membership: dict[str, list[str]] = defaultdict(list)
    for centre_key, (lat, lon) in sorted(coords.items()):
        for direction, (dlat, dlon) in SPATIAL_DIRECTIONS.items():
            key = f"{centre_key}::{direction}"
            points.append((key, lat + dlat, lon + dlon))
            membership[centre_key].append(key)
    return points, membership


def empty_point_store() -> dict[str, Any]:
    return {
        "forecast": {var: defaultdict(list) for var in SPATIAL_FORECAST_VARS},
        "history": {var: defaultdict(list) for var in SPATIAL_HISTORY_VARS},
        "elevation": 0.0,
    }


def load_spatial_year(coords: dict[str, tuple[float, float]], year: int) -> tuple[dict[str, dict[str, Any]], dict[str, list[str]]]:
    if year > 2025:
        raise RuntimeError("HOLDOUT GUARD: V7-C may not query 2026 or later")
    ordered, membership = spatial_points(coords)
    result = {key: empty_point_store() for key, _, _ in ordered}
    for start, end in base.quarter_ranges(year):
        for batch in base.chunks(ordered, base.MAX_BATCH):
            forecast_payloads = base.fetch_batch(base.PREVIOUS_API, batch, start, end, SPATIAL_FORECAST_VARS)
            history_payloads = base.fetch_batch(base.HISTORICAL_API, batch, start, end, SPATIAL_HISTORY_VARS)
            for (key, _, _), fp, hp in zip(batch, forecast_payloads, history_payloads):
                forecast_daily, _ = base.aggregate_hourly(fp, SPATIAL_FORECAST_VARS)
                history_daily, elevation = base.aggregate_hourly(hp, SPATIAL_HISTORY_VARS)
                base.merge_daily(result[key]["forecast"], forecast_daily)
                base.merge_daily(result[key]["history"], history_daily)
                result[key]["elevation"] = elevation
    return result, membership


def flatten_days(store: dict[str, dict[dt.date, list[float]]], variable: str, days: list[dt.date]) -> list[float]:
    return [value for day in days for value in base.values(store, variable, day)]


def point_features(point: dict[str, Any], issue: dt.date) -> dict[str, float]:
    d1 = issue + dt.timedelta(days=1)
    d2 = issue + dt.timedelta(days=2)
    d3 = issue + dt.timedelta(days=3)
    forecast = point["forecast"]
    history = point["history"]
    r24 = base.s(base.values(forecast, "precipitation_previous_day1", d1))
    r48 = base.s(base.values(forecast, "precipitation_previous_day2", d2))
    r72 = base.s(base.values(forecast, "precipitation_previous_day3", d3))
    ante7 = base.s(flatten_days(history, "precipitation", base.days_back(issue, 7)))
    soil3 = base.mean(flatten_days(history, "soil_moisture_3_to_9cm", base.days_back(issue, 3)))
    return {
        "rain24": r24,
        "rain48": r48,
        "rain72": r72,
        "total72": r24 + r48 + r72,
        "peak_day": max(r24, r48, r72),
        "ante_rain7": ante7,
        "soil_root3": soil3,
        "elevation": float(point["elevation"]),
    }


def augment_rows(rows: list[base.Row], coords: dict[str, tuple[float, float]], year: int) -> None:
    spatial, membership = load_spatial_year(coords, year)
    for row in rows:
        centre = {
            "total72": row.features["rain_total72"],
            "peak_day": row.features["rain_max_day"],
            "ante_rain7": row.features["ante_rain7"],
            "soil_root3": row.features["ante_soil_root3"],
            "elevation": row.features["elevation"],
        }
        nearby = [point_features(spatial[key], row.date) for key in membership[row.location_key]]
        all_points = [centre] + nearby

        totals = [float(point["total72"]) for point in all_points]
        peaks = [float(point["peak_day"]) for point in all_points]
        ante = [float(point["ante_rain7"]) for point in all_points]
        soils = [float(point["soil_root3"]) for point in all_points]
        elevations = [float(point["elevation"]) for point in all_points]
        wet = [rain * max(0.0, soil) for rain, soil in zip(totals, soils)]

        mean_total = float(statistics.mean(totals))
        row.features.update({
            "spatial_rain72_mean": mean_total,
            "spatial_rain72_max": max(totals),
            "spatial_rain72_spread": float(statistics.pstdev(totals)) if len(totals) > 1 else 0.0,
            "spatial_rain72_center_minus_mean": float(centre["total72"]) - mean_total,
            "spatial_rain10_fraction": sum(value >= 10.0 for value in totals) / len(totals),
            "spatial_rain20_fraction": sum(value >= 20.0 for value in totals) / len(totals),
            "spatial_peak_day_mean": float(statistics.mean(peaks)),
            "spatial_peak_day_max": max(peaks),
            "spatial_ante_rain7_mean": float(statistics.mean(ante)),
            "spatial_ante_rain7_max": max(ante),
            "spatial_soil_root3_mean": float(statistics.mean(soils)),
            "spatial_soil_root3_max": max(soils),
            "spatial_wet_compound_mean": float(statistics.mean(wet)),
            "spatial_wet_compound_max": max(wet),
            "spatial_relief_to_lowest_m": float(centre["elevation"]) - min(elevations),
        })


def matrix(rows: list[base.Row]) -> np.ndarray:
    return np.asarray([[row.features[name] for name in FEATURES] for row in rows], dtype=float)


def make_model(family: str, positive_count: int, negative_count: int):
    if family == "logistic":
        return Pipeline([
            ("scale", StandardScaler()),
            ("model", LogisticRegression(C=0.35, class_weight="balanced", max_iter=2500, solver="liblinear", random_state=42)),
        ])
    ratio = max(1.0, negative_count / max(1, positive_count))
    return XGBClassifier(
        n_estimators=280,
        max_depth=2,
        learning_rate=0.025,
        min_child_weight=5,
        subsample=0.85,
        colsample_bytree=0.80,
        reg_lambda=12.0,
        reg_alpha=0.8,
        objective="binary:logistic",
        eval_metric="logloss",
        tree_method="hist",
        scale_pos_weight=ratio,
        random_state=42,
        n_jobs=2,
    )


def fit_predict(train_rows: list[base.Row], predict_rows: list[base.Row], family: str, horizon: int) -> np.ndarray:
    y = base.labels(train_rows, horizon)
    if len(np.unique(y)) < 2:
        return np.full(len(predict_rows), float(y[0]) if len(y) else 0.0)
    model = make_model(family, int(y.sum()), int(len(y) - y.sum()))
    model.fit(matrix(train_rows), y)
    return model.predict_proba(matrix(predict_rows))[:, 1]


def horizon_oof(rows: list[base.Row], family: str) -> dict[int, np.ndarray]:
    groups = sorted({row.location_key for row in rows})
    output = {h: np.zeros(len(rows), dtype=float) for h in decision.HORIZONS}
    for group in groups:
        train_idx = [i for i, row in enumerate(rows) if row.location_key != group]
        val_idx = [i for i, row in enumerate(rows) if row.location_key == group]
        train = [rows[i] for i in train_idx]
        val = [rows[i] for i in val_idx]
        for horizon in decision.HORIZONS:
            prediction = fit_predict(train, val, family, horizon)
            for local_index, global_index in enumerate(val_idx):
                output[horizon][global_index] = prediction[local_index]
    return output


def horizon_test(train_rows: list[base.Row], test_rows: list[base.Row], family: str) -> dict[int, np.ndarray]:
    return {h: fit_predict(train_rows, test_rows, family, h) for h in decision.HORIZONS}


def soft_vote(left: dict[int, np.ndarray], right: dict[int, np.ndarray]) -> dict[int, np.ndarray]:
    return {h: (left[h] + right[h]) / 2.0 for h in decision.HORIZONS}


def burden_metrics(rows: list[base.Row], scores: np.ndarray, policy: dict[str, Any]) -> dict[str, Any]:
    indices = decision.alert_indices(
        rows,
        scores,
        float(policy["low_threshold"]),
        float(policy["high_threshold"]),
        int(policy["persistence_count"]),
    )
    eps = decision.alert_episodes(indices, rows, int(policy["cooldown_days"]))
    spans = [
        (rows[episode[-1]].date - rows[episode[0]].date).days + 1
        for episode in eps
        if episode
    ]
    locations = max(1, len({row.location_key for row in rows}))
    return {
        "active_issue_rows": len(indices),
        "warning_fraction": len(indices) / len(rows) if rows else 0.0,
        "active_issue_days_per_location_year": len(indices) / locations,
        "mean_active_rows_per_episode": len(indices) / len(eps) if eps else 0.0,
        "median_episode_span_days": statistics.median(spans) if spans else 0.0,
        "max_episode_span_days": max(spans) if spans else 0,
        "internal_warning_fraction_target": INTERNAL_MAX_WARNING_FRACTION,
        "internal_warning_fraction_pass": (len(indices) / len(rows) if rows else 0.0) <= INTERNAL_MAX_WARNING_FRACTION,
    }


def evaluate(rows: list[base.Row], scores: np.ndarray, events: list[base.Event], policy: dict[str, Any]) -> dict[str, Any]:
    operational = decision.operational_metrics(rows, scores, events, policy)
    operational.update(burden_metrics(rows, scores, policy))
    return operational


def candidate_policies() -> list[dict[str, Any]]:
    # Compared with V7-B, V7-C allows a third persistence day and keeps the
    # cooldown bounded to 0-1 days. This makes the score earn quiet days rather
    # than manufacturing them by merging long periods through a 2-day cooldown.
    lows = (0.005, 0.01, 0.015, 0.02, 0.03, 0.04, 0.05, 0.075, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50, 0.65)
    multipliers = (1.5, 2.0, 3.0, 4.0)
    policies: list[dict[str, Any]] = []
    for low in lows:
        for multiplier in multipliers:
            high = min(0.95, max(low, low * multiplier))
            for persistence in (1, 2, 3):
                for cooldown in (0, 1):
                    policies.append({
                        "low_threshold": low,
                        "high_threshold": high,
                        "persistence_count": persistence,
                        "cooldown_days": cooldown,
                    })
    return policies


def selection_key(item: dict[str, Any]) -> tuple[float, ...]:
    detection = float(item["event_detection_rate"])
    lead = float(item["median_lead_hours"] or 0.0)
    precision = float(item["alert_episode_precision"])
    false_rate = float(item["false_alert_episodes_per_location_year"])
    warning_fraction = float(item["warning_fraction"])
    return (
        1.0 if detection >= 0.80 else 0.0,
        1.0 if lead >= 48.0 else 0.0,
        1.0 if warning_fraction <= INTERNAL_MAX_WARNING_FRACTION else 0.0,
        (1.0 if false_rate <= 2.0 else 0.0) + (1.0 if precision >= 0.30 else 0.0),
        -warning_fraction,
        -false_rate,
        precision,
        detection,
        lead,
    )


def main() -> None:
    dev_events = base.development_events_2024()
    secondary_events = base.evaluation_events_2025()
    if len(dev_events) != 9 or len(secondary_events) != 8:
        raise RuntimeError(f"frozen event membership mismatch: dev={len(dev_events)} secondary={len(secondary_events)}")

    dev_coords = {event.location_key: (event.lat, event.lon) for event in dev_events}
    secondary_coords = {event.location_key: (event.lat, event.lon) for event in secondary_events}

    dev_rows = base.build_rows(dev_coords, 2024, dev_events)
    secondary_rows = base.build_rows(secondary_coords, 2025, secondary_events)
    augment_rows(dev_rows, dev_coords, 2024)
    augment_rows(secondary_rows, secondary_coords, 2025)

    dev_horizons: dict[str, dict[int, np.ndarray]] = {
        "logistic": horizon_oof(dev_rows, "logistic"),
        "xgboost": horizon_oof(dev_rows, "xgboost"),
    }
    dev_horizons["soft_vote"] = soft_vote(dev_horizons["logistic"], dev_horizons["xgboost"])

    best: dict[str, Any] | None = None
    best_key: tuple[float, ...] | None = None
    summaries: dict[str, Any] = {}

    for family, horizon_predictions in dev_horizons.items():
        summaries[family] = {}
        for aggregator in decision.AGGREGATORS:
            scores = decision.aggregate_horizons(horizon_predictions, aggregator)
            disc = base.discrimination(dev_rows, scores)
            candidates = []
            for policy in candidate_policies():
                metrics = evaluate(dev_rows, scores, dev_events, policy)
                if metrics["event_detection_rate"] < 0.80 or (metrics["median_lead_hours"] or 0) < 48:
                    continue
                candidates.append(metrics)
                key = selection_key(metrics)
                if best_key is None or key > best_key:
                    best_key = key
                    best = {
                        "family": family,
                        "aggregator": aggregator,
                        "development_discrimination": disc,
                        "development_operational": metrics,
                    }
            summaries[family][aggregator] = {
                "discrimination": disc,
                "eligible_policy_count": len(candidates),
                "best_operational": max(candidates, key=selection_key) if candidates else None,
            }

    if best is None:
        raise RuntimeError("No V7-C policy preserved >=80% detection and >=48h development lead")

    family = str(best["family"])
    aggregator = str(best["aggregator"])
    frozen_policy = {
        key: best["development_operational"][key]
        for key in ("low_threshold", "high_threshold", "persistence_count", "cooldown_days")
    }

    secondary_basic = {
        "logistic": horizon_test(dev_rows, secondary_rows, "logistic"),
        "xgboost": horizon_test(dev_rows, secondary_rows, "xgboost"),
    }
    secondary_basic["soft_vote"] = soft_vote(secondary_basic["logistic"], secondary_basic["xgboost"])
    secondary_scores = decision.aggregate_horizons(secondary_basic[family], aggregator)
    secondary_operational = evaluate(secondary_rows, secondary_scores, secondary_events, frozen_policy)
    secondary_disc = base.discrimination(secondary_rows, secondary_scores)

    report = {
        "status": "v7_c_spatial_candidate_complete",
        "claim_boundary": "2024 leave-location-out spatial/policy selection; 2025 secondary development; 2026 untouched final holdout",
        "holdout_2026_queried": False,
        "spatial_contract": {
            "shape": "centre plus north/south/east/west cross",
            "offset_degrees": SPATIAL_OFFSET_DEGREES,
            "neighbour_points_per_anchor": 4,
            "hydrological_catchment_claimed": False,
            "feature_count_total": len(FEATURES),
            "spatial_features": SPATIAL_FEATURES,
        },
        "warning_burden_rule": {
            "competition_gate": False,
            "purpose": "anti-gaming product sanity metric",
            "internal_max_warning_fraction": INTERNAL_MAX_WARNING_FRACTION,
        },
        "development": {
            "year": 2024,
            "events": len(dev_events),
            "rows": len(dev_rows),
            "locations": len(dev_coords),
            "search": summaries,
            "selected": best,
        },
        "secondary_development": {
            "year": 2025,
            "previously_inspected": True,
            "events": len(secondary_events),
            "rows": len(secondary_rows),
            "locations": len(secondary_coords),
            "selected_family": family,
            "selected_aggregator": aggregator,
            "frozen_from_2024_policy": frozen_policy,
            "discrimination": secondary_disc,
            "operational": secondary_operational,
        },
        "comparison_2025": {
            "rainfall_only": {
                "event_detection_rate": 1.0,
                "alert_episode_precision": 0.05673758865248227,
                "false_alert_episodes_per_location_year": 19.0,
                "median_lead_hours": 72.0,
            },
            "v7_a": {
                "event_detection_rate": 0.875,
                "alert_episode_precision": 0.09523809523809523,
                "false_alert_episodes_per_location_year": 8.142857142857142,
                "median_lead_hours": 72.0,
            },
            "v7_b": {
                "event_detection_rate": 0.875,
                "alert_episode_precision": 0.25,
                "false_alert_episodes_per_location_year": 2.5714285714285716,
                "median_lead_hours": 72.0,
                "warning_fraction": 1069 / 2485,
            },
            "v7_c": {
                "event_detection_rate": secondary_operational["event_detection_rate"],
                "alert_episode_precision": secondary_operational["alert_episode_precision"],
                "false_alert_episodes_per_location_year": secondary_operational["false_alert_episodes_per_location_year"],
                "median_lead_hours": secondary_operational["median_lead_hours"],
                "warning_fraction": secondary_operational["warning_fraction"],
                "active_issue_days_per_location_year": secondary_operational["active_issue_days_per_location_year"],
                "max_episode_span_days": secondary_operational["max_episode_span_days"],
            },
        },
        "competition_gates_not_final": {
            "event_detection_ge_80": secondary_operational["event_detection_rate"] >= 0.80,
            "precision_ge_30": secondary_operational["alert_episode_precision"] >= 0.30,
            "false_alerts_le_2_per_location_year": secondary_operational["false_alert_episodes_per_location_year"] <= 2.0,
            "median_lead_ge_48h": (secondary_operational["median_lead_hours"] or 0) >= 48,
            "pr_lift_ge_3x": (secondary_disc.get("pr_lift_vs_prevalence") or 0) >= 3.0,
            "internal_warning_fraction_le_15pct": secondary_operational["warning_fraction"] <= INTERNAL_MAX_WARNING_FRACTION,
        },
        "guardrails": {
            "max_query_year": 2025,
            "2026_holdout_queried": False,
            "event_membership_unchanged_from_v7_b": True,
            "selection_uses_2024_only": True,
            "2025_is_secondary_development": True,
        },
    }

    output = ROOT / "model_v7_spatial_candidate_result.json"
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
