#!/usr/bin/env python3
"""Scientific sanity review for Model v3 development results.

This review never evaluates 2022-2024 and never upgrades Model v3 to production.
It checks whether the selected development candidate is doing more than exploiting
class prevalence or seasonality before any later freeze decision is considered.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List

MIN_SEASON_PR_AUC_MARGIN = 0.01
EXPECTED_DEVELOPMENT_EVENTS = 16
EXPECTED_OOF_EVENTS = 12
EXPECTED_LOCATIONS = {"Lokoja", "Makurdi", "Onitsha", "Yenagoa", "Hadejia"}


def pr_lift(pr_auc: float | None, prevalence: float) -> float | None:
    if pr_auc is None or prevalence <= 0:
        return None
    return float(pr_auc / prevalence)


def review(results: Dict[str, object]) -> Dict[str, object]:
    if results.get("status") != "development_only_not_production_validated":
        raise ValueError("Expected a Model v3 development-only result")
    if results.get("hard_development_cutoff") != "2022-01-01":
        raise ValueError("Unexpected Model v3 development cutoff")

    data = results["data"]
    if int(data["development_events"]) != EXPECTED_DEVELOPMENT_EVENTS:
        raise ValueError("Development event registry is not the frozen 16-event generation")
    if int(data["oof_event_anchors"]) != EXPECTED_OOF_EVENTS:
        raise ValueError("OOF event registry is not the frozen 12-event generation")

    selected = results["selected_candidate"]
    selected_name = selected["candidate"]
    candidate = next((c for c in results["candidates"] if c["candidate"] == selected_name), None)
    if candidate is None:
        raise ValueError(f"Selected candidate {selected_name!r} not found in candidate results")

    fold_checks: List[Dict[str, object]] = []
    for fold_result in candidate["folds"]:
        rows = int(fold_result["validation_rows"])
        positives = int(fold_result["validation_positive_rows"])
        prevalence = float(positives / rows) if rows else 0.0
        pr_auc = fold_result["metrics_at_0_50_for_diagnostic_only"].get("pr_auc")
        lift = pr_lift(pr_auc, prevalence)
        fold_checks.append({
            "validation_year": int(fold_result["fold"]["validation_year"]),
            "validation_rows": rows,
            "positive_rows": positives,
            "prevalence_random_pr_baseline": prevalence,
            "pr_auc": pr_auc,
            "pr_auc_lift_vs_prevalence": lift,
            "above_prevalence_baseline": bool(pr_auc is not None and pr_auc > prevalence),
        })

    location_checks: Dict[str, object] = {}
    location_diagnostics = selected["per_location_at_provisional_threshold"]
    if set(location_diagnostics) != EXPECTED_LOCATIONS:
        raise ValueError(f"Expected five location diagnostics, got {sorted(location_diagnostics)}")
    for location, diagnostic in location_diagnostics.items():
        rows = int(diagnostic["rows"])
        positives = int(diagnostic["positive_rows"])
        prevalence = float(positives / rows) if rows else 0.0
        pr_auc = diagnostic["metrics"].get("pr_auc")
        location_checks[location] = {
            "rows": rows,
            "positive_rows": positives,
            "prevalence_random_pr_baseline": prevalence,
            "pr_auc": pr_auc,
            "pr_auc_lift_vs_prevalence": pr_lift(pr_auc, prevalence),
            "above_prevalence_baseline": bool(pr_auc is not None and pr_auc > prevalence),
            "development_event_metrics": diagnostic["event_metrics"],
        }

    winner_pr = selected["pooled_oof_metrics"].get("pr_auc")
    season_pr = results["season_only_diagnostic"]["pooled_oof_metrics"].get("pr_auc")
    season_margin = None
    if winner_pr is not None and season_pr is not None:
        season_margin = float(winner_pr - season_pr)
    beats_season = bool(season_margin is not None and season_margin > MIN_SEASON_PR_AUC_MARGIN)

    fold_baseline_pass = all(bool(x["above_prevalence_baseline"]) for x in fold_checks)
    location_baseline_pass = all(bool(x["above_prevalence_baseline"]) for x in location_checks.values())
    threshold_is_provisional = selected.get("threshold_status") == "provisional_oof_f1_diagnostic_not_operational_policy"

    blockers: List[str] = []
    if not fold_baseline_pass:
        blockers.append("At least one temporal validation fold does not beat its own PR prevalence baseline.")
    if not location_baseline_pass:
        blockers.append("At least one location does not beat its own PR prevalence baseline.")
    if not beats_season:
        blockers.append(
            f"Selected hydrological candidate does not beat the season-only PR-AUC by more than {MIN_SEASON_PR_AUC_MARGIN:.2f}."
        )
    if threshold_is_provisional:
        blockers.append(
            "Operating threshold is still an F1-based development diagnostic; a predeclared false-alert/missed-event policy is required."
        )
    if results["freeze_gate"].get("ready_to_freeze_for_new_holdout") is not False:
        blockers.append("Development result unexpectedly claims freeze readiness.")

    scientific_sanity_pass = fold_baseline_pass and location_baseline_pass and beats_season

    return {
        "status": "model_v3_development_scientific_review",
        "selected_candidate": selected_name,
        "review_scope": "2018-2021 development OOF evidence only; no 2022-2024 evaluation",
        "fold_checks": fold_checks,
        "location_checks": location_checks,
        "seasonality_check": {
            "winner_pooled_pr_auc": winner_pr,
            "season_only_pooled_pr_auc": season_pr,
            "required_absolute_margin": MIN_SEASON_PR_AUC_MARGIN,
            "observed_margin": season_margin,
            "beats_season_only_by_required_margin": beats_season,
        },
        "minimum_scientific_sanity_pass": scientific_sanity_pass,
        "threshold_policy_declared": not threshold_is_provisional,
        "ready_to_freeze_for_new_holdout": False,
        "freeze_blockers": blockers,
        "interpretation": (
            "Passing the minimum sanity checks would mean the candidate beats simple prevalence and season-only diagnostics "
            "inside development data. It would not establish production validity, national accuracy, or issue-time 24/48/72-hour skill."
        ),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", type=Path, default=Path("validation/model_v3_development_results.json"))
    ap.add_argument("--output", type=Path, default=Path("validation/model_v3_scientific_review.json"))
    args = ap.parse_args()
    results = json.loads(args.results.read_text(encoding="utf-8"))
    reviewed = review(results)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(reviewed, indent=2), encoding="utf-8")
    print(json.dumps(reviewed, indent=2))


if __name__ == "__main__":
    main()
