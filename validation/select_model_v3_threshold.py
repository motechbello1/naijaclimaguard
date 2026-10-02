#!/usr/bin/env python3
"""Apply the predeclared Model v3 development-only threshold policy."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

MIN_EVENT_DETECTION_RATE = 0.75
MAX_FALSE_POSITIVE_LOCATION_DAYS_PER_1000_NEGATIVE = 10.0
MIN_PRECISION = 0.10
EXPECTED_OOF_EVENTS = 12


def choose_threshold(results: Dict[str, object], review: Dict[str, object]) -> Dict[str, object]:
    selected = results["selected_candidate"]
    frontier: List[Dict[str, object]] = list(selected["threshold_frontier"])

    if int(results["data"]["oof_event_anchors"]) != EXPECTED_OOF_EVENTS:
        raise ValueError("Threshold policy requires the frozen 12-event OOF development registry")

    sanity_pass = bool(review.get("minimum_scientific_sanity_pass", False))
    qualifying = []
    for row in frontier:
        event_rate = row.get("event_detection_rate")
        fp_burden = row.get("false_positive_location_days_per_1000_negative_rows")
        precision = row.get("precision")
        qualifies = bool(
            sanity_pass
            and event_rate is not None
            and float(event_rate) >= MIN_EVENT_DETECTION_RATE
            and fp_burden is not None
            and float(fp_burden) <= MAX_FALSE_POSITIVE_LOCATION_DAYS_PER_1000_NEGATIVE
            and precision is not None
            and float(precision) >= MIN_PRECISION
        )
        qualifying.append({**row, "qualifies_predeclared_policy": qualifies})

    eligible_rows = [r for r in qualifying if r["qualifies_predeclared_policy"]]
    chosen = max(eligible_rows, key=lambda r: float(r["threshold"])) if eligible_rows else None

    return {
        "status": "eligible_threshold_found" if chosen else "no_eligible_threshold",
        "policy_predeclared_before_model_v3_scores": True,
        "policy": {
            "minimum_event_detection_rate": MIN_EVENT_DETECTION_RATE,
            "minimum_detected_events_out_of_12": 9,
            "maximum_false_positive_location_days_per_1000_negative": MAX_FALSE_POSITIVE_LOCATION_DAYS_PER_1000_NEGATIVE,
            "minimum_precision": MIN_PRECISION,
            "selection_rule": "highest threshold satisfying every gate",
            "scientific_sanity_review_required": True,
        },
        "selected_candidate": selected["candidate"],
        "scientific_sanity_pass": sanity_pass,
        "chosen_threshold": None if chosen is None else float(chosen["threshold"]),
        "chosen_threshold_metrics": chosen,
        "eligible_for_freeze_candidate": bool(chosen is not None),
        "evaluated_frontier": qualifying,
        "warning": (
            "Development-only threshold decision. Passing permits serialization of a freeze candidate only; "
            "it does not establish production readiness or issue-time lead skill."
        ),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", type=Path, default=Path("validation/model_v3_development_results.json"))
    ap.add_argument("--review", type=Path, default=Path("validation/model_v3_scientific_review.json"))
    ap.add_argument("--output", type=Path, default=Path("validation/model_v3_threshold_decision.json"))
    args = ap.parse_args()

    results = json.loads(args.results.read_text(encoding="utf-8"))
    review = json.loads(args.review.read_text(encoding="utf-8"))
    decision = choose_threshold(results, review)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(decision, indent=2), encoding="utf-8")
    print(json.dumps(decision, indent=2))


if __name__ == "__main__":
    main()
