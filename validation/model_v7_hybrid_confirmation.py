#!/usr/bin/env python3
"""Model V7-D: V7-B detector plus spatial confirmation for borderline alerts.

V7-C showed that spatial context can sharply reduce warning-day burden, but
feeding spatial variables directly into the classifier destroyed sensitivity.
V7-D therefore freezes the V7-B detector and moves spatial information into a
post-model decision layer.

Scientific boundary
-------------------
- Detector family is frozen to V7-B's soft-vote model.
- Horizon aggregation is frozen to V7-B's max-horizon score.
- Spatial context cannot create an alert. It may only confirm/reject a
  borderline V7-B score. A high-confidence V7-B score can alert immediately.
- 2024 leave-location-out predictions select the decision policy.
- 2025 is secondary development because it has already been inspected.
- 2026 is hard-blocked and remains the untouched final holdout.
- Event membership is unchanged from V7-B/V7-C.
"""

from __future__ import annotations

import json
import pathlib
import statistics
from collections import defaultdict
from typing import Any

import numpy as np

import model_v7_development_candidate as base
import model_v7_decision_policy_experiment as decision
import model_v7_spatial_candidate as spatial

ROOT = pathlib.Path(__file__).resolve().parent
FAMILY = "soft_vote"
AGGREGATOR = "max"
INTERNAL_MAX_WARNING_FRACTION = 0.15

LOW_THRESHOLDS = (0.01, 0.015, 0.02, 0.03, 0.04, 0.05, 0.075, 0.10, 0.15, 0.20)
HIGH_MULTIPLIERS = (2.0, 3.0, 4.0, 6.0)
PERSISTENCE_COUNTS = (1, 2, 3)
COOLDOWN_DAYS = (0, 1)

# Curated, interpretable spatial confirmation rules. They are intentionally
# simple because there are only nine 2024 development events. The gate is used
# only for borderline scores; urgent V7-B scores bypass it.
SUPPORT_POLICIES: tuple[dict[str, Any], ...] = (
    {"name": "broad10_40", "mode": "fraction10", "fraction": 0.40},
    {"name": "broad10_60", "mode": "fraction10", "fraction": 0.60},
    {"name": "broad10_80", "mode": "fraction10", "fraction": 0.80},
    {"name": "broad20_40", "mode": "fraction20", "fraction": 0.40},
    {"name": "broad20_60", "mode": "fraction20", "fraction": 0.60},
    {"name": "mean72_10", "mode": "mean72", "rain": 10.0},
    {"name": "mean72_15", "mode": "mean72", "rain": 15.0},
    {"name": "mean72_20", "mode": "mean72", "rain": 20.0},
    {"name": "mean72_30", "mode": "mean72", "rain": 30.0},
    {"name": "broad_or_mean_10", "mode": "or", "fraction": 0.40, "rain": 10.0},
    {"name": "broad_or_mean_15", "mode": "or", "fraction": 0.60, "rain": 15.0},
    {"name": "wet_context_10", "mode": "wet", "rain": 10.0, "ante": 10.0},
    {"name": "wet_context_15", "mode": "wet", "rain": 15.0, "ante": 15.0},
    {"name": "not_isolated_5", "mode": "not_isolated", "rain": 5.0, "delta": 15.0},
    {"name": "not_isolated_10", "mode": "not_isolated", "rain": 10.0, "delta": 20.0},
)


def support(row: base.Row, rule: dict[str, Any]) -> bool:
    f = row.features
    mode = str(rule["mode"])
    if mode == "fraction10":
        return float(f["spatial_rain10_fraction"]) >= float(rule["fraction"])
    if mode == "fraction20":
        return float(f["spatial_rain20_fraction"]) >= float(rule["fraction"])
    if mode == "mean72":
        return float(f["spatial_rain72_mean"]) >= float(rule["rain"])
    if mode == "or":
        return (
            float(f["spatial_rain10_fraction"]) >= float(rule["fraction"])
            or float(f["spatial_rain72_mean"]) >= float(rule["rain"])
        )
    if mode == "wet":
        return (
            float(f["spatial_rain72_mean"]) >= float(rule["rain"])
            and float(f["spatial_ante_rain7_mean"]) >= float(rule["ante"])
        )
    if mode == "not_isolated":
        return (
            float(f["spatial_rain72_mean"]) >= float(rule["rain"])
            and float(f["spatial_rain72_center_minus_mean"]) <= float(rule["delta"])
        )
    raise ValueError(mode)


def hybrid_alert_indices(rows: list[base.Row], scores: np.ndarray, policy: dict[str, Any]) -> list[int]:
    by_location: dict[str, list[int]] = defaultdict(list)
    for index, row in enumerate(rows):
        by_location[row.location_key].append(index)

    low = float(policy["low_threshold"])
    high = float(policy["high_threshold"])
    persistence = int(policy["persistence_count"])
    rule = dict(policy["support_rule"])

    active: list[int] = []
    for indices in by_location.values():
        indices.sort(key=lambda i: rows[i].date)
        streak = 0
        previous_date = None
        for index in indices:
            row = rows[index]
            score = float(scores[index])
            consecutive = previous_date is not None and (row.date - previous_date).days == 1
            urgent = score >= high
            borderline_supported = score >= low and support(row, rule)

            if borderline_supported:
                streak = streak + 1 if consecutive else 1
            else:
                streak = 0

            persistent = borderline_supported and streak >= persistence
            if urgent or persistent:
                active.append(index)
            previous_date = row.date
    return active


def operational_metrics(rows: list[base.Row], scores: np.ndarray, events: list[base.Event], policy: dict[str, Any]) -> dict[str, Any]:
    indices = hybrid_alert_indices(rows, scores, policy)
    episodes = decision.alert_episodes(indices, rows, int(policy["cooldown_days"]))
    detected: set[str] = set()
    leads: list[int] = []
    true_eps = 0
    false_eps = 0

    for episode in episodes:
        matched: dict[str, base.Event] = {}
        for index in episode:
            row = rows[index]
            for event in events:
                if event.location_key == row.location_key and base.event_match(row.date, event):
                    matched[event.event_id] = event
        if matched:
            true_eps += 1
            for event_id, event in matched.items():
                if event_id in detected:
                    continue
                candidate_dates = [
                    rows[index].date
                    for index in episode
                    if rows[index].location_key == event.location_key and base.event_match(rows[index].date, event)
                ]
                if candidate_dates:
                    first = min(candidate_dates)
                    detected.add(event_id)
                    leads.append((event.start - first).days * 24)
        else:
            false_eps += 1

    spans = [
        (rows[episode[-1]].date - rows[episode[0]].date).days + 1
        for episode in episodes if episode
    ]
    locations = max(1, len({row.location_key for row in rows}))
    total = true_eps + false_eps
    warning_fraction = len(indices) / len(rows) if rows else 0.0
    return {
        "low_threshold": float(policy["low_threshold"]),
        "high_threshold": float(policy["high_threshold"]),
        "persistence_count": int(policy["persistence_count"]),
        "cooldown_days": int(policy["cooldown_days"]),
        "support_rule": dict(policy["support_rule"]),
        "event_detection_rate": len(detected) / len(events) if events else 0.0,
        "detected_events": len(detected),
        "event_count": len(events),
        "detected_event_ids": sorted(detected),
        "alert_episode_precision": true_eps / total if total else 0.0,
        "true_alert_episodes": true_eps,
        "false_alert_episodes": false_eps,
        "false_alert_episodes_per_location_year": false_eps / locations,
        "alert_episode_count": total,
        "median_lead_hours": statistics.median(leads) if leads else None,
        "lead_hours": leads,
        "active_issue_rows": len(indices),
        "warning_fraction": warning_fraction,
        "active_issue_days_per_location_year": len(indices) / locations,
        "median_episode_span_days": statistics.median(spans) if spans else 0.0,
        "max_episode_span_days": max(spans) if spans else 0,
        "internal_warning_fraction_pass": warning_fraction <= INTERNAL_MAX_WARNING_FRACTION,
    }


def candidate_policies() -> list[dict[str, Any]]:
    policies: list[dict[str, Any]] = []
    for low in LOW_THRESHOLDS:
        for multiplier in HIGH_MULTIPLIERS:
            high = min(0.95, max(low, low * multiplier))
            for persistence in PERSISTENCE_COUNTS:
                for cooldown in COOLDOWN_DAYS:
                    for rule in SUPPORT_POLICIES:
                        policies.append({
                            "low_threshold": low,
                            "high_threshold": high,
                            "persistence_count": persistence,
                            "cooldown_days": cooldown,
                            "support_rule": rule,
                        })
    return policies


def selection_key(metrics: dict[str, Any]) -> tuple[float, ...]:
    detection = float(metrics["event_detection_rate"])
    precision = float(metrics["alert_episode_precision"])
    false_rate = float(metrics["false_alert_episodes_per_location_year"])
    lead = float(metrics["median_lead_hours"] or 0.0)
    warning_fraction = float(metrics["warning_fraction"])
    return (
        1.0 if detection >= 0.80 else 0.0,
        1.0 if lead >= 48.0 else 0.0,
        1.0 if warning_fraction <= INTERNAL_MAX_WARNING_FRACTION else 0.0,
        (1.0 if false_rate <= 2.0 else 0.0) + (1.0 if precision >= 0.30 else 0.0),
        -false_rate,
        precision,
        detection,
        -warning_fraction,
        lead,
        -float(metrics["persistence_count"]),
        -float(metrics["cooldown_days"]),
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
    spatial.augment_rows(dev_rows, dev_coords, 2024)
    spatial.augment_rows(secondary_rows, secondary_coords, 2025)

    # Critical boundary: decision.horizon_oof/test use base.fit_predict and
    # therefore only base.FEATURES. The added spatial fields are not fed into
    # the detector; they are available only to the post-model confirmation gate.
    dev_horizons = decision.horizon_oof(dev_rows, FAMILY)
    dev_scores = decision.aggregate_horizons(dev_horizons, AGGREGATOR)
    dev_disc = base.discrimination(dev_rows, dev_scores)

    eligible: list[dict[str, Any]] = []
    best: dict[str, Any] | None = None
    best_key: tuple[float, ...] | None = None
    for policy in candidate_policies():
        metrics = operational_metrics(dev_rows, dev_scores, dev_events, policy)
        if metrics["event_detection_rate"] < 0.80:
            continue
        if (metrics["median_lead_hours"] or 0) < 48:
            continue
        if metrics["warning_fraction"] > INTERNAL_MAX_WARNING_FRACTION:
            continue
        eligible.append(metrics)
        key = selection_key(metrics)
        if best_key is None or key > best_key:
            best_key = key
            best = metrics

    if best is None:
        raise RuntimeError("No V7-D policy preserved detection/lead while passing the warning-burden constraint")

    frozen_policy = {
        key: best[key]
        for key in ("low_threshold", "high_threshold", "persistence_count", "cooldown_days", "support_rule")
    }

    secondary_horizons = decision.horizon_test(dev_rows, secondary_rows, FAMILY)
    secondary_scores = decision.aggregate_horizons(secondary_horizons, AGGREGATOR)
    secondary_disc = base.discrimination(secondary_rows, secondary_scores)
    secondary_operational = operational_metrics(secondary_rows, secondary_scores, secondary_events, frozen_policy)

    report = {
        "status": "v7_d_hybrid_confirmation_complete",
        "claim_boundary": "V7-B detector frozen; 2024 selects hybrid confirmation policy; 2025 secondary development; 2026 untouched final holdout",
        "holdout_2026_queried": False,
        "detector_contract": {
            "family": FAMILY,
            "aggregator": AGGREGATOR,
            "detector_features": list(base.FEATURES),
            "spatial_features_in_detector": False,
            "spatial_role": "borderline alert confirmation only; cannot create alerts",
        },
        "development": {
            "year": 2024,
            "events": len(dev_events),
            "rows": len(dev_rows),
            "locations": len(dev_coords),
            "candidate_policy_count": len(candidate_policies()),
            "eligible_policy_count": len(eligible),
            "discrimination": dev_disc,
            "selected_operational": best,
        },
        "secondary_development": {
            "year": 2025,
            "previously_inspected": True,
            "events": len(secondary_events),
            "rows": len(secondary_rows),
            "locations": len(secondary_coords),
            "frozen_from_2024_policy": frozen_policy,
            "discrimination": secondary_disc,
            "operational": secondary_operational,
        },
        "comparison_2025": {
            "v7_b": {
                "event_detection_rate": 0.875,
                "alert_episode_precision": 0.25,
                "false_alert_episodes_per_location_year": 2.5714285714285716,
                "median_lead_hours": 72.0,
                "warning_fraction": 1069 / 2485,
            },
            "v7_c": {
                "event_detection_rate": 0.375,
                "alert_episode_precision": 0.05263157894736842,
                "false_alert_episodes_per_location_year": 7.714285714285714,
                "median_lead_hours": 72.0,
                "warning_fraction": 0.05070422535211268,
            },
            "v7_d": {
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
            "event_membership_unchanged": True,
            "detector_frozen_from_v7_b": True,
            "selection_uses_2024_only": True,
            "2025_is_secondary_development": True,
        },
    }

    output = ROOT / "model_v7_hybrid_confirmation_result.json"
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
