#!/usr/bin/env python3
"""Model V7-B decision-policy experiment.

This experiment deliberately reuses Model V7-A's frozen event registry, source
contract, feature builder and model fitting code. It changes only how the three
24/48/72h horizon probabilities become a user-facing alert.

Scientific boundary
-------------------
- Candidate family, horizon aggregation, persistence and cooldown are selected
  on 2024 leave-location-out predictions only.
- 2025 is now SECONDARY DEVELOPMENT evidence because V7-A's 2025 result has
  already been inspected. It is not described as an untouched test after that.
- 2026 is never queried here and remains the final frozen holdout.
- No event membership, forecast source or feature is changed in this experiment.
"""

from __future__ import annotations

import json
import pathlib
import statistics
from collections import defaultdict
from typing import Any

import numpy as np

import model_v7_development_candidate as base

ROOT = pathlib.Path(__file__).resolve().parent
HORIZONS = (24, 48, 72)
FAMILIES = ("logistic", "xgboost", "soft_vote")
AGGREGATORS = ("max", "top2_mean", "second_highest", "mean")
LOW_THRESHOLDS = (0.005, 0.01, 0.015, 0.02, 0.03, 0.04, 0.05, 0.075, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50)
HIGH_MULTIPLIERS = (1.5, 2.0, 3.0)
PERSISTENCE_COUNTS = (1, 2)
COOLDOWN_DAYS = (0, 1, 2)


def horizon_oof(rows: list[base.Row], family: str) -> dict[int, np.ndarray]:
    if family == "soft_vote":
        left = horizon_oof(rows, "logistic")
        right = horizon_oof(rows, "xgboost")
        return {h: (left[h] + right[h]) / 2.0 for h in HORIZONS}

    groups = sorted({row.location_key for row in rows})
    output = {h: np.zeros(len(rows), dtype=float) for h in HORIZONS}
    for group in groups:
        train_idx = [i for i, row in enumerate(rows) if row.location_key != group]
        val_idx = [i for i, row in enumerate(rows) if row.location_key == group]
        train = [rows[i] for i in train_idx]
        val = [rows[i] for i in val_idx]
        for horizon in HORIZONS:
            prediction = base.fit_predict(train, val, family, horizon)
            for local_index, global_index in enumerate(val_idx):
                output[horizon][global_index] = prediction[local_index]
    return output


def horizon_test(train_rows: list[base.Row], test_rows: list[base.Row], family: str) -> dict[int, np.ndarray]:
    if family == "soft_vote":
        left = horizon_test(train_rows, test_rows, "logistic")
        right = horizon_test(train_rows, test_rows, "xgboost")
        return {h: (left[h] + right[h]) / 2.0 for h in HORIZONS}
    return {h: base.fit_predict(train_rows, test_rows, family, h) for h in HORIZONS}


def aggregate_horizons(probabilities: dict[int, np.ndarray], strategy: str) -> np.ndarray:
    matrix = np.vstack([probabilities[h] for h in HORIZONS]).T
    ordered = np.sort(matrix, axis=1)
    if strategy == "max":
        return ordered[:, 2]
    if strategy == "top2_mean":
        return (ordered[:, 1] + ordered[:, 2]) / 2.0
    if strategy == "second_highest":
        return ordered[:, 1]
    if strategy == "mean":
        return matrix.mean(axis=1)
    raise ValueError(strategy)


def alert_indices(
    rows: list[base.Row],
    scores: np.ndarray,
    low_threshold: float,
    high_threshold: float,
    persistence_count: int,
) -> list[int]:
    """Apply a causal persistence rule.

    A strong score may alert immediately. A normal score must persist across the
    configured number of consecutive issue days. Only present/past scores are
    used, so the rule is valid at issue time.
    """
    by_location: dict[str, list[int]] = defaultdict(list)
    for index, row in enumerate(rows):
        by_location[row.location_key].append(index)

    active: list[int] = []
    for indices in by_location.values():
        indices.sort(key=lambda i: rows[i].date)
        streak = 0
        previous_date = None
        for index in indices:
            row = rows[index]
            score = float(scores[index])
            consecutive = previous_date is not None and (row.date - previous_date).days == 1
            if score >= low_threshold:
                streak = streak + 1 if consecutive else 1
            else:
                streak = 0

            urgent = score >= high_threshold
            persistent = score >= low_threshold and streak >= persistence_count
            if urgent or persistent:
                active.append(index)
            previous_date = row.date
    return active


def alert_episodes(indices: list[int], rows: list[base.Row], cooldown_days: int) -> list[list[int]]:
    """Group active issue times into operational alert episodes.

    cooldown_days=0 reproduces consecutive-day episode grouping. A positive
    cooldown absorbs brief forecast flicker before a brand-new user warning is
    counted. The maximum tested cooldown is two days for a 72h forecast system.
    """
    if not indices:
        return []
    ordered = sorted(indices, key=lambda i: (rows[i].location_key, rows[i].date))
    episodes: list[list[int]] = []
    max_gap = 1 + cooldown_days
    for index in ordered:
        if not episodes:
            episodes.append([index])
            continue
        previous = episodes[-1][-1]
        same_location = rows[previous].location_key == rows[index].location_key
        gap = (rows[index].date - rows[previous].date).days
        if same_location and gap <= max_gap:
            episodes[-1].append(index)
        else:
            episodes.append([index])
    return episodes


def operational_metrics(
    rows: list[base.Row],
    scores: np.ndarray,
    events: list[base.Event],
    policy: dict[str, Any],
) -> dict[str, Any]:
    indices = alert_indices(
        rows,
        scores,
        float(policy["low_threshold"]),
        float(policy["high_threshold"]),
        int(policy["persistence_count"]),
    )
    episodes = alert_episodes(indices, rows, int(policy["cooldown_days"]))
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

    location_years = max(1, len({row.location_key for row in rows}))
    total = true_eps + false_eps
    return {
        **policy,
        "event_detection_rate": len(detected) / len(events) if events else 0.0,
        "detected_events": len(detected),
        "event_count": len(events),
        "detected_event_ids": sorted(detected),
        "alert_episode_precision": true_eps / total if total else 0.0,
        "true_alert_episodes": true_eps,
        "false_alert_episodes": false_eps,
        "false_alert_episodes_per_location_year": false_eps / location_years,
        "median_lead_hours": statistics.median(leads) if leads else None,
        "lead_hours": leads,
        "alert_episode_count": total,
        "active_issue_rows": len(indices),
    }


def candidate_policies() -> list[dict[str, Any]]:
    policies: list[dict[str, Any]] = []
    for low in LOW_THRESHOLDS:
        for multiplier in HIGH_MULTIPLIERS:
            high = min(0.95, max(low, low * multiplier))
            for persistence in PERSISTENCE_COUNTS:
                for cooldown in COOLDOWN_DAYS:
                    policies.append({
                        "low_threshold": low,
                        "high_threshold": high,
                        "persistence_count": persistence,
                        "cooldown_days": cooldown,
                    })
    return policies


def selection_key(metrics: dict[str, Any]) -> tuple[float, ...]:
    detection = float(metrics["event_detection_rate"])
    precision = float(metrics["alert_episode_precision"])
    false_rate = float(metrics["false_alert_episodes_per_location_year"])
    lead = float(metrics["median_lead_hours"] or 0.0)
    mandatory_detection = 1.0 if detection >= 0.80 else 0.0
    mandatory_lead = 1.0 if lead >= 48.0 else 0.0
    false_gate = 1.0 if false_rate <= 2.0 else 0.0
    precision_gate = 1.0 if precision >= 0.30 else 0.0
    return (
        mandatory_detection,
        mandatory_lead,
        false_gate + precision_gate,
        -false_rate,
        precision,
        detection,
        lead,
        -float(metrics["persistence_count"]),
        -float(metrics["cooldown_days"]),
    )


def discrimination(rows: list[base.Row], scores: np.ndarray) -> dict[str, Any]:
    return base.discrimination(rows, scores)


def main() -> None:
    dev_events = base.development_events_2024()
    secondary_events = base.evaluation_events_2025()
    if len(dev_events) != 9 or len(secondary_events) != 8:
        raise RuntimeError(f"frozen event membership mismatch: dev={len(dev_events)} secondary={len(secondary_events)}")

    dev_coords = {event.location_key: (event.lat, event.lon) for event in dev_events}
    secondary_coords = {event.location_key: (event.lat, event.lon) for event in secondary_events}
    dev_rows = base.build_rows(dev_coords, 2024, dev_events)
    secondary_rows = base.build_rows(secondary_coords, 2025, secondary_events)

    family_probabilities = {family: horizon_oof(dev_rows, family) for family in FAMILIES}
    search_reports: dict[str, Any] = {}
    best: dict[str, Any] | None = None
    best_key: tuple[float, ...] | None = None

    for family in FAMILIES:
        search_reports[family] = {}
        for aggregator in AGGREGATORS:
            scores = aggregate_horizons(family_probabilities[family], aggregator)
            disc = discrimination(dev_rows, scores)
            policy_results = []
            for policy in candidate_policies():
                metrics = operational_metrics(dev_rows, scores, dev_events, policy)
                if metrics["event_detection_rate"] < 0.80 or (metrics["median_lead_hours"] or 0) < 48:
                    continue
                policy_results.append(metrics)
                key = selection_key(metrics)
                if best_key is None or key > best_key:
                    best_key = key
                    best = {
                        "family": family,
                        "aggregator": aggregator,
                        "development_discrimination": disc,
                        "development_operational": metrics,
                    }
            search_reports[family][aggregator] = {
                "discrimination": disc,
                "eligible_policy_count": len(policy_results),
                "best_operational": max(policy_results, key=selection_key) if policy_results else None,
            }

    if best is None:
        raise RuntimeError("No V7-B policy preserved the frozen >=80% detection and >=48h development constraints")

    chosen_family = str(best["family"])
    chosen_aggregator = str(best["aggregator"])
    chosen_policy = {
        key: best["development_operational"][key]
        for key in ("low_threshold", "high_threshold", "persistence_count", "cooldown_days")
    }

    secondary_probabilities = horizon_test(dev_rows, secondary_rows, chosen_family)
    secondary_scores = aggregate_horizons(secondary_probabilities, chosen_aggregator)
    secondary_operational = operational_metrics(secondary_rows, secondary_scores, secondary_events, chosen_policy)
    secondary_disc = discrimination(secondary_rows, secondary_scores)

    v7a = {
        "event_detection_rate": 0.875,
        "alert_episode_precision": 0.09523809523809523,
        "false_alert_episodes_per_location_year": 8.142857142857142,
        "median_lead_hours": 72.0,
    }
    rainfall = json.loads((ROOT / "model_v7_rainfall_baseline_result.json").read_text(encoding="utf-8"))["evaluation"]["result"]

    report = {
        "status": "v7_b_decision_policy_complete",
        "claim_boundary": "2024 leave-location-out policy selection; 2025 is secondary development after V7-A was inspected; 2026 final holdout remains untouched",
        "holdout_2026_queried": False,
        "data_contract": "identical event membership, sources, features and row builder to V7-A",
        "development": {
            "year": 2024,
            "events": len(dev_events),
            "rows": len(dev_rows),
            "locations": len(dev_coords),
            "search": search_reports,
            "selected": best,
        },
        "secondary_development": {
            "year": 2025,
            "previously_inspected": True,
            "events": len(secondary_events),
            "rows": len(secondary_rows),
            "locations": len(secondary_coords),
            "selected_family": chosen_family,
            "selected_aggregator": chosen_aggregator,
            "frozen_from_2024_policy": chosen_policy,
            "discrimination": secondary_disc,
            "operational": secondary_operational,
        },
        "comparison_2025": {
            "rainfall_only": {
                "event_detection_rate": rainfall["event_detection_rate"],
                "alert_episode_precision": rainfall["alert_episode_precision"],
                "false_alert_episodes_per_location_year": rainfall["false_alert_episodes_per_location_year"],
                "median_lead_hours": rainfall["median_lead_hours"],
            },
            "v7_a": v7a,
            "v7_b": {
                "event_detection_rate": secondary_operational["event_detection_rate"],
                "alert_episode_precision": secondary_operational["alert_episode_precision"],
                "false_alert_episodes_per_location_year": secondary_operational["false_alert_episodes_per_location_year"],
                "median_lead_hours": secondary_operational["median_lead_hours"],
            },
        },
        "competition_gates_not_final": {
            "event_detection_ge_80": secondary_operational["event_detection_rate"] >= 0.80,
            "precision_ge_30": secondary_operational["alert_episode_precision"] >= 0.30,
            "false_alerts_le_2_per_location_year": secondary_operational["false_alert_episodes_per_location_year"] <= 2.0,
            "median_lead_ge_48h": (secondary_operational["median_lead_hours"] or 0) >= 48,
            "pr_lift_ge_3x": (secondary_disc.get("pr_lift_vs_prevalence") or 0) >= 3.0,
        },
        "guardrails": {
            "max_query_year": 2025,
            "2026_holdout_queried": False,
            "policy_selected_on_2024_only": True,
            "2025_not_described_as_untouched_after_first_look": True,
        },
    }

    output = ROOT / "model_v7_decision_policy_result.json"
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
