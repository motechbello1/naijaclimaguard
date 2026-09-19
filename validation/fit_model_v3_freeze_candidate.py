#!/usr/bin/env python3
"""Fit and serialize the exact Model v3 freeze candidate only when all gates pass.

This script never deploys the model. If any gate fails it writes a blocked manifest
and exits successfully so the negative evidence is preserved.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np

import model_v3_dev as m


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_manifest(path: Path, manifest: Dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--features", type=Path, default=Path("validation/features_daily.csv"))
    ap.add_argument("--events", type=Path, default=Path("validation/model_v3_event_registry.csv"))
    ap.add_argument("--results", type=Path, default=Path("validation/model_v3_development_results.json"))
    ap.add_argument("--review", type=Path, default=Path("validation/model_v3_scientific_review.json"))
    ap.add_argument("--threshold-decision", type=Path, default=Path("validation/model_v3_threshold_decision.json"))
    ap.add_argument("--artifact", type=Path, default=Path("validation/model_v3_freeze_candidate.joblib"))
    ap.add_argument("--manifest", type=Path, default=Path("validation/model_v3_freeze_manifest.json"))
    args = ap.parse_args()

    results = json.loads(args.results.read_text(encoding="utf-8"))
    review = json.loads(args.review.read_text(encoding="utf-8"))
    threshold_decision = json.loads(args.threshold_decision.read_text(encoding="utf-8"))

    blockers: List[str] = []
    if results.get("status") != "development_only_not_production_validated":
        blockers.append("Unexpected Model v3 result status.")
    if results.get("hard_development_cutoff") != "2022-01-01":
        blockers.append("Unexpected development cutoff.")
    if int(results.get("data", {}).get("development_events", -1)) != m.EXPECTED_DEVELOPMENT_EVENTS:
        blockers.append("Frozen 16-event development registry is not present.")
    if int(results.get("data", {}).get("oof_event_anchors", -1)) != m.EXPECTED_OOF_EVENTS:
        blockers.append("Frozen 12-event OOF registry is not present.")
    if not bool(review.get("minimum_scientific_sanity_pass", False)):
        blockers.append("Minimum scientific sanity review did not pass.")
    if not bool(threshold_decision.get("eligible_for_freeze_candidate", False)):
        blockers.append("No threshold satisfies the predeclared development-only threshold policy.")

    selected_name = str(results["selected_candidate"]["candidate"])
    selected_result = next((c for c in results["candidates"] if c["candidate"] == selected_name), None)
    if selected_result is None:
        blockers.append("Selected candidate result is missing.")
        fold_feature_sets: List[List[str]] = []
    else:
        fold_feature_sets = [list(f["features"]) for f in selected_result["folds"]]
        if not fold_feature_sets:
            blockers.append("Selected candidate has no temporal-fold feature record.")
        elif any(cols != fold_feature_sets[0] for cols in fold_feature_sets[1:]):
            blockers.append(
                "Selected candidate used different feature sets across temporal folds; exact pipeline cannot be frozen without a new development generation."
            )

    if bool(results["selected_candidate"].get("calendar_features_allowed_in_winner", True)):
        blockers.append("Selected candidate unexpectedly allows calendar features.")

    base_manifest: Dict[str, object] = {
        "status": "freeze_blocked" if blockers else "freeze_candidate_serialized",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "development_period": ["2018-01-01", "2021-12-31"],
        "hard_cutoff": "2022-01-01",
        "selected_candidate": selected_name,
        "threshold": threshold_decision.get("chosen_threshold"),
        "threshold_policy_status": threshold_decision.get("status"),
        "development_events": results["data"]["development_events"],
        "oof_event_anchors": results["data"]["oof_event_anchors"],
        "features_input_sha256": file_sha256(args.features),
        "events_input_sha256": file_sha256(args.events),
        "development_results_sha256": file_sha256(args.results),
        "scientific_review_sha256": file_sha256(args.review),
        "threshold_decision_sha256": file_sha256(args.threshold_decision),
        "production_deployed": False,
        "production_engine_remains": "derived-v2",
        "ready_for_new_untouched_holdout": False,
        "blockers": blockers,
    }

    if blockers:
        if args.artifact.exists():
            args.artifact.unlink()
        write_manifest(args.manifest, base_manifest)
        return

    fixed_features = fold_feature_sets[0]
    features = m.load_features(args.features)
    events = m.load_events(args.events)
    labelled = m.attach_development_labels(features, events)
    calibration = m.fit_location_calibration(labelled)
    transformed = m.add_cyclic_season(m.apply_location_calibration(labelled, calibration))
    missing_features = [c for c in fixed_features if c not in transformed.columns]
    if missing_features:
        base_manifest["status"] = "freeze_blocked"
        base_manifest["blockers"] = [f"Missing frozen model features: {missing_features}"]
        write_manifest(args.manifest, base_manifest)
        return

    X = transformed[fixed_features].replace([np.inf, -np.inf], np.nan)
    y = transformed["label"].astype(int)
    positives = int(y.sum())
    negatives = int((y == 0).sum())
    templates = m.make_candidates(max(1.0, negatives / max(1, positives)))
    if selected_name not in templates:
        base_manifest["status"] = "freeze_blocked"
        base_manifest["blockers"] = [f"Unsupported freeze candidate family: {selected_name}"]
        write_manifest(args.manifest, base_manifest)
        return

    model = templates[selected_name]
    if selected_name == "xgboost_regularized":
        model.set_params(scale_pos_weight=max(1.0, negatives / max(1, positives)))
    model.fit(X, y)

    frozen = {
        "artifact_type": "NaijaClimaGuard Model v3 frozen development candidate",
        "candidate": selected_name,
        "threshold": float(threshold_decision["chosen_threshold"]),
        "feature_columns": fixed_features,
        "location_calibration": calibration,
        "model": model,
        "development_cutoff": "2022-01-01",
        "development_events_sha256": file_sha256(args.events),
        "development_features_sha256": file_sha256(args.features),
        "warning": "Not production validated. Evaluate once on a genuinely new untouched/prospective holdout before any deployment decision.",
    }
    args.artifact.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(frozen, args.artifact, compress=3)

    base_manifest.update({
        "status": "freeze_candidate_serialized",
        "frozen_feature_columns": fixed_features,
        "training_rows": int(len(transformed)),
        "training_positive_rows": positives,
        "artifact_path": str(args.artifact),
        "artifact_sha256": file_sha256(args.artifact),
        "ready_for_new_untouched_holdout": True,
        "blockers": [],
        "warning": "Freeze candidate only; production remains derived-v2 until a new untouched/prospective evaluation passes a separately frozen acceptance gate.",
    })
    write_manifest(args.manifest, base_manifest)


if __name__ == "__main__":
    main()
