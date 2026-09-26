#!/usr/bin/env python3
"""Audit the highest-scoring V7-E alert episodes not matched by the current registry.

This is a LABEL-AUDIT diagnostic, not a new model and not a final score.
It reconstructs V7-E's frozen combined-development XGBoost/second-highest signal
and lists the strongest alert episodes that are currently counted as false.
Those episodes can then be checked against independent flood reports before we
assume they are genuine false alarms.

2026 is hard-blocked by the imported development builder and is never queried.
"""

from __future__ import annotations

import json
import pathlib
from typing import Any

import numpy as np

import model_v7_development_candidate as base
import model_v7_decision_policy_experiment as decision
import model_v7_e_expanded_development as v7e

ROOT = pathlib.Path(__file__).resolve().parent

# Exact selected V7-E development signal/policy from the first frozen run.
FAMILY = "xgboost"
AGGREGATOR = "second_highest"
POLICY = {
    "low_threshold": 0.10,
    "high_threshold": 0.20,
    "persistence_count": 2,
    "cooldown_days": 1,
}
TOP_N = 30


def episode_matches_event(episode: list[int], rows: list[base.Row], events: list[base.Event]) -> bool:
    for index in episode:
        row = rows[index]
        for event in events:
            if event.location_key == row.location_key and base.event_match(row.date, event):
                return True
    return False


def main() -> None:
    rows_2024, events_2024, rows_2025, events_2025 = v7e.build_development()
    rows = rows_2024 + rows_2025
    events = events_2024 + events_2025
    if len(events) != 19:
        raise RuntimeError(f"V7-E audit expected 19 development events, got {len(events)}")

    horizons = decision.horizon_oof(rows, FAMILY)
    scores = decision.aggregate_horizons(horizons, AGGREGATOR)
    indices = decision.alert_indices(
        rows,
        scores,
        POLICY["low_threshold"],
        POLICY["high_threshold"],
        POLICY["persistence_count"],
    )
    episodes = decision.alert_episodes(indices, rows, POLICY["cooldown_days"])

    false_candidates: list[dict[str, Any]] = []
    for episode in episodes:
        if not episode or episode_matches_event(episode, rows, events):
            continue
        episode_scores = [float(scores[i]) for i in episode]
        peak_index = episode[int(np.argmax(episode_scores))]
        peak = rows[peak_index]
        first = rows[episode[0]]
        last = rows[episode[-1]]
        false_candidates.append({
            "location_key": peak.location_key,
            "start": first.date.isoformat(),
            "end": last.date.isoformat(),
            "peak_date": peak.date.isoformat(),
            "peak_score": max(episode_scores),
            "episode_issue_days": len(episode),
            "rain24": peak.features.get("rain24"),
            "rain48": peak.features.get("rain48"),
            "rain72": peak.features.get("rain72"),
            "rain_total72": peak.features.get("rain_total72"),
            "ante_rain7": peak.features.get("ante_rain7"),
            "ante_soil_root3": peak.features.get("ante_soil_root3"),
            "elevation": peak.features.get("elevation"),
        })

    false_candidates.sort(key=lambda item: (-float(item["peak_score"]), item["location_key"], item["start"]))
    top = false_candidates[:TOP_N]

    report = {
        "status": "v7_e_false_alert_audit_ready",
        "purpose": "check whether strongest registry-unmatched V7-E alerts are truly false before redesigning the model",
        "claim_boundary": "2024+2025 label audit only; 2026 untouched",
        "holdout_2026_queried": False,
        "event_count": len(events),
        "policy": POLICY,
        "family": FAMILY,
        "aggregator": AGGREGATOR,
        "registry_unmatched_episode_count": len(false_candidates),
        "top_n": len(top),
        "episodes": top,
    }
    output = ROOT / "model_v7_e_false_alert_audit.json"
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
