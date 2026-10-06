#!/usr/bin/env python3
"""Model V7-E expanded-development experiment.

Frozen boundary:
- 2024 and 2025 are development only.
- 2026 is never queried and remains the final holdout.
- Primary selection is leave-location-out across the combined 2024+2025 pool.
- The experiment tests whether more independently documented events improve the
  same core issue-time modelling approach before any final-holdout access.
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

ROOT = pathlib.Path(__file__).resolve().parent
EXPECTED_2024_EVENTS = 10
EXPECTED_2025_EVENTS = 9
EXPECTED_TOTAL_EVENTS = 19
INTERNAL_MAX_WARNING_FRACTION = 0.15
FAMILIES = ("logistic", "xgboost", "soft_vote")
AGGREGATORS = ("max", "top2_mean", "second_highest", "mean")


def build_development() -> tuple[list[base.Row], list[base.Event], list[base.Row], list[base.Event]]:
    events_2024 = base.development_events_2024()
    events_2025 = base.evaluation_events_2025()
    if len(events_2024) != EXPECTED_2024_EVENTS or len(events_2025) != EXPECTED_2025_EVENTS:
        raise RuntimeError(
            f"V7-E frozen membership mismatch: 2024={len(events_2024)} "
            f"2025={len(events_2025)} expected={EXPECTED_2024_EVENTS}/{EXPECTED_2025_EVENTS}"
        )

    coords_2024 = {event.location_key: (event.lat, event.lon) for event in events_2024}
    coords_2025 = {event.location_key: (event.lat, event.lon) for event in events_2025}
    rows_2024 = base.build_rows(coords_2024, 2024, events_2024)
    rows_2025 = base.build_rows(coords_2025, 2025, events_2025)
    return rows_2024, events_2024, rows_2025, events_2025


def horizon_oof(rows: list[base.Row], family: str) -> dict[int, np.ndarray]:
    # Reuse V7-B's causal leave-location-out implementation. Because rows from
    # both years are combined before this call, a repeated location is held out
    # across every year in which it appears.
    return decision.horizon_oof(rows, family)


def aggregate(probabilities: dict[int, np.ndarray], strategy: str) -> np.ndarray:
    return decision.aggregate_horizons(probabilities, strategy)


def location_year_count(rows: list[base.Row]) -> int:
    return max(1, len({(row.location_key, row.date.year) for row in rows}))


def alert_indices(rows: list[base.Row], scores: np.ndarray, policy: dict[str, Any]) -> list[int]:
    return decision.alert_indices(
        rows,
        scores,
        float(policy["low_threshold"]),
        float(policy["high_threshold"]),
        int(policy["persistence_count"]),
    )


def alert_episodes(indices: list[int], rows: list[base.Row], cooldown_days: int) -> list[list[int]]:
    return decision.alert_episodes(indices, rows, cooldown_days)


def evaluate(rows: list[base.Row], scores: np.ndarray, events: list[base.Event], policy: dict[str, Any]) -> dict[str, Any]:
    indices = alert_indices(rows, scores, policy)
    episodes = alert_episodes(indices, rows, int(policy["cooldown_days"]))
    detected: set[str] = set()
    leads: list[int] = []
    true_eps = 0
    false_eps = 0
    spans: list[int] = []

    for episode in episodes:
        if episode:
            spans.append((rows[episode[-1]].date - rows[episode[0]].date).days + 1)
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

    loc_years = location_year_count(rows)
    total = true_eps + false_eps
    warning_fraction = len(indices) / len(rows) if rows else 0.0
    return {
        **policy,
        "event_detection_rate": len(detected) / len(events) if events else 0.0,
        "detected_events": len(detected),
        "event_count": len(events),
        "detected_event_ids": sorted(detected),
        "alert_episode_precision": true_eps / total if total else 0.0,
        "true_alert_episodes": true_eps,
        "false_alert_episodes": false_eps,
        "false_alert_episodes_per_location_year": false_eps / loc_years,
        "location_years": loc_years,
        "median_lead_hours": statistics.median(leads) if leads else None,
        "lead_hours": leads,
        "alert_episode_count": total,
        "active_issue_rows": len(indices),
        "warning_fraction": warning_fraction,
        "active_issue_days_per_location_year": len(indices) / loc_years,
        "median_episode_span_days": statistics.median(spans) if spans else 0.0,
        "max_episode_span_days": max(spans) if spans else 0,
        "internal_warning_fraction_pass": warning_fraction <= INTERNAL_MAX_WARNING_FRACTION,
    }


def candidate_policies() -> list[dict[str, Any]]:
    lows = (0.005, 0.01, 0.015, 0.02, 0.03, 0.04, 0.05, 0.075, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50, 0.65)
    multipliers = (1.5, 2.0, 3.0, 4.0)
    output: list[dict[str, Any]] = []
    for low in lows:
        for multiplier in multipliers:
            high = min(0.95, max(low, low * multiplier))
            for persistence in (1, 2, 3):
                for cooldown in (0, 1):
                    output.append({
                        "low_threshold": low,
                        "high_threshold": high,
                        "persistence_count": persistence,
                        "cooldown_days": cooldown,
                    })
    return output


def selection_key(metrics: dict[str, Any]) -> tuple[float, ...]:
    detection = float(metrics["event_detection_rate"])
    lead = float(metrics["median_lead_hours"] or 0.0)
    precision = float(metrics["alert_episode_precision"])
    false_rate = float(metrics["false_alert_episodes_per_location_year"])
    warning_fraction = float(metrics["warning_fraction"])
    return (
        1.0 if detection >= 0.80 else 0.0,
        1.0 if lead >= 48.0 else 0.0,
        1.0 if warning_fraction <= INTERNAL_MAX_WARNING_FRACTION else 0.0,
        1.0 if false_rate <= 2.0 else 0.0,
        1.0 if precision >= 0.30 else 0.0,
        -false_rate,
        precision,
        detection,
        lead,
        -warning_fraction,
    )


def eligible(metrics: dict[str, Any]) -> bool:
    return (
        metrics["event_detection_rate"] >= 0.80
        and (metrics["median_lead_hours"] or 0) >= 48
        and metrics["warning_fraction"] <= INTERNAL_MAX_WARNING_FRACTION
    )


def soft_vote(left: dict[int, np.ndarray], right: dict[int, np.ndarray]) -> dict[int, np.ndarray]:
    return {h: (left[h] + right[h]) / 2.0 for h in (24, 48, 72)}


def forward_horizons(train_rows: list[base.Row], test_rows: list[base.Row], family: str) -> dict[int, np.ndarray]:
    if family == "soft_vote":
        return soft_vote(
            forward_horizons(train_rows, test_rows, "logistic"),
            forward_horizons(train_rows, test_rows, "xgboost"),
        )
    return {h: base.fit_predict(train_rows, test_rows, family, h) for h in (24, 48, 72)}


def select_policy_on_rows(rows: list[base.Row], events: list[base.Event], scores: np.ndarray) -> dict[str, Any]:
    candidates = [evaluate(rows, scores, events, policy) for policy in candidate_policies()]
    allowed = [item for item in candidates if eligible(item)]
    if not allowed:
        return max(candidates, key=selection_key)
    return max(allowed, key=selection_key)


def main() -> None:
    rows_2024, events_2024, rows_2025, events_2025 = build_development()
    all_rows = rows_2024 + rows_2025
    all_events = events_2024 + events_2025
    if len(all_events) != EXPECTED_TOTAL_EVENTS:
        raise RuntimeError(f"V7-E expected {EXPECTED_TOTAL_EVENTS} events, got {len(all_events)}")

    horizon_predictions: dict[str, dict[int, np.ndarray]] = {
        "logistic": horizon_oof(all_rows, "logistic"),
        "xgboost": horizon_oof(all_rows, "xgboost"),
    }
    horizon_predictions["soft_vote"] = soft_vote(horizon_predictions["logistic"], horizon_predictions["xgboost"])

    best: dict[str, Any] | None = None
    best_key: tuple[float, ...] | None = None
    search: dict[str, Any] = {}

    for family in FAMILIES:
        search[family] = {}
        for aggregator in AGGREGATORS:
            scores = aggregate(horizon_predictions[family], aggregator)
            disc = base.discrimination(all_rows, scores)
            policy_results = [evaluate(all_rows, scores, all_events, policy) for policy in candidate_policies()]
            eligible_results = [item for item in policy_results if eligible(item)]
            local_best = max(eligible_results or policy_results, key=selection_key)
            search[family][aggregator] = {
                "discrimination": disc,
                "eligible_policy_count": len(eligible_results),
                "best_operational": local_best,
            }
            key = selection_key(local_best)
            if best_key is None or key > best_key:
                best_key = key
                best = {
                    "family": family,
                    "aggregator": aggregator,
                    "discrimination": disc,
                    "operational": local_best,
                }

    if best is None:
        raise RuntimeError("V7-E produced no candidate")

    # Supporting forward-time diagnostic. Model family/aggregator are the V7-E
    # development winner, but the alert policy itself is selected only on 2024
    # OOF predictions, never from 2025 forward outcomes.
    family = str(best["family"])
    aggregator = str(best["aggregator"])
    oof_2024 = decision.horizon_oof(rows_2024, family)
    scores_2024 = aggregate(oof_2024, aggregator)
    policy_2024 = select_policy_on_rows(rows_2024, events_2024, scores_2024)
    forward = forward_horizons(rows_2024, rows_2025, family)
    forward_scores = aggregate(forward, aggregator)
    forward_operational = evaluate(rows_2025, forward_scores, events_2025, {
        key: policy_2024[key]
        for key in ("low_threshold", "high_threshold", "persistence_count", "cooldown_days")
    })
    forward_disc = base.discrimination(rows_2025, forward_scores)

    op = best["operational"]
    disc = best["discrimination"]
    gates = {
        "event_detection_ge_80": op["event_detection_rate"] >= 0.80,
        "precision_ge_30": op["alert_episode_precision"] >= 0.30,
        "false_alerts_le_2_per_location_year": op["false_alert_episodes_per_location_year"] <= 2.0,
        "median_lead_ge_48h": (op["median_lead_hours"] or 0) >= 48,
        "warning_fraction_le_15pct": op["warning_fraction"] <= INTERNAL_MAX_WARNING_FRACTION,
        "pr_lift_ge_3x": (disc.get("pr_lift_vs_prevalence") or 0) >= 3.0,
    }
    gates["all_pre_holdout_gates_pass"] = all(gates.values())

    report = {
        "status": "v7_e_expanded_development_complete",
        "claim_boundary": "2024+2025 combined development; 2026 untouched final holdout",
        "holdout_2026_queried": False,
        "guardrails": {
            "max_query_year": 2025,
            "2026_holdout_queried": False,
            "combined_development_years": [2024, 2025],
            "primary_validation": "leave-location-out across both years",
            "same_location_held_out_across_years": True,
        },
        "event_pool": {
            "events_2024": len(events_2024),
            "events_2025": len(events_2025),
            "events_total": len(all_events),
            "rows_2024": len(rows_2024),
            "rows_2025": len(rows_2025),
            "rows_total": len(all_rows),
            "location_years": location_year_count(all_rows),
        },
        "search": search,
        "selected": best,
        "pre_holdout_gates": gates,
        "forward_time_diagnostic_2024_to_2025": {
            "family_selected_on_combined_development": family,
            "aggregator_selected_on_combined_development": aggregator,
            "alert_policy_selected_from_2024_only": {
                key: policy_2024[key]
                for key in ("low_threshold", "high_threshold", "persistence_count", "cooldown_days")
            },
            "discrimination": forward_disc,
            "operational": forward_operational,
        },
        "comparison_reference_2025": {
            "rainfall_only": {"event_detection_rate": 1.0, "alert_episode_precision": 0.05673758865248227, "false_alert_episodes_per_location_year": 19.0, "median_lead_hours": 72.0},
            "v7_a": {"event_detection_rate": 0.875, "alert_episode_precision": 0.09523809523809523, "false_alert_episodes_per_location_year": 8.142857142857142, "median_lead_hours": 72.0},
            "v7_b": {"event_detection_rate": 0.875, "alert_episode_precision": 0.25, "false_alert_episodes_per_location_year": 2.5714285714285716, "median_lead_hours": 72.0, "warning_fraction": 0.4301810865191147},
            "v7_c": {"event_detection_rate": 0.375, "alert_episode_precision": 0.05263157894736842, "false_alert_episodes_per_location_year": 7.714285714285714, "median_lead_hours": 72.0, "warning_fraction": 0.05070422535211268},
            "v7_d": {"event_detection_rate": 0.25, "alert_episode_precision": 0.0625, "false_alert_episodes_per_location_year": 4.285714285714286, "median_lead_hours": 72.0, "warning_fraction": 0.026559356136820925},
        },
    }

    output = ROOT / "model_v7_e_expanded_development_result.json"
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
