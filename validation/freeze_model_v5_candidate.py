#!/usr/bin/env python3
"""Serialize Model v5 only when every preregistered development gate passes."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import joblib
import pandas as pd

from model_v5_operational_native import (
    apply_location_stats, feature_group, fit_location_stats, make_pipeline,
)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="validation/model_v5_issue_dataset.csv")
    ap.add_argument("--dataset-manifest", default="validation/model_v5_dataset_manifest.json")
    ap.add_argument("--events", default="validation/model_v4_event_registry.csv")
    ap.add_argument("--results", default="validation/model_v5_results.json")
    ap.add_argument("--protocol", default="validation/MODEL_V5_PROTOCOL.md")
    ap.add_argument("--model-out", default="validation/model_v5_freeze_candidate.joblib")
    ap.add_argument("--manifest-out", default="validation/model_v5_freeze_manifest.json")
    args = ap.parse_args()

    paths = {k: Path(v) for k, v in {
        "dataset": args.dataset,
        "dataset_manifest": args.dataset_manifest,
        "events": args.events,
        "results": args.results,
        "protocol": args.protocol,
    }.items()}
    results = json.loads(paths["results"].read_text(encoding="utf-8"))
    manifest_path = Path(args.manifest_out)

    blockers: list[str] = []
    if results.get("status") != "eligible_freeze_candidate":
        blockers.append("Model v5 did not pass the preregistered development freeze gate.")
    if results.get("replacement_authorized") is not False:
        blockers.append("Development results unexpectedly authorize replacement.")
    threshold = results.get("threshold_policy", {}).get("chosen_threshold")
    if threshold is None:
        blockers.append("No eligible operating threshold exists.")
    if not results.get("sanity", {}).get("minimum_scientific_sanity_pass", False):
        blockers.append("Minimum scientific sanity gate did not pass.")

    if blockers:
        blocked = {
            "status": "freeze_blocked",
            "blockers": blockers,
            "replacement_authorized": False,
            "production_engine_remains": "derived-v2",
            "model_v4_prospective_generation_unchanged": True,
            "source_hashes": {name: sha256_file(path) for name, path in paths.items()},
        }
        manifest_path.write_text(json.dumps(blocked, indent=2), encoding="utf-8")
        print(json.dumps(blocked, indent=2))
        return

    df = pd.read_csv(paths["dataset"], parse_dates=["issue_date"])
    y = df["label"].astype(int)
    stats = fit_location_stats(df)
    enriched = apply_location_stats(df, stats)
    numeric = feature_group("core")
    positives = int(y.sum())
    negatives = int((y == 0).sum())
    candidate = str(results["selected_candidate"])
    pipeline = make_pipeline(candidate, numeric, negatives / max(1, positives))
    pipeline.fit(enriched[numeric + ["location"]], y)

    bundle = {
        "artifact_type": "naijaclimaguard_model_v5_operational_native",
        "status": "freeze_candidate_not_production_validated",
        "candidate": candidate,
        "threshold": float(threshold),
        "prediction_horizon": "strictly next 1 to 3 days",
        "feature_group": "core",
        "numeric_features": numeric,
        "location_stats": stats,
        "pipeline": pipeline,
        "replacement_authorized": False,
        "production_engine_remains": "derived-v2",
        "model_v4_prospective_generation_unchanged": True,
        "source_hashes": {name: sha256_file(path) for name, path in paths.items()},
    }
    model_path = Path(args.model_out)
    joblib.dump(bundle, model_path, compress=3)
    frozen = {
        "status": "freeze_candidate_serialized_not_production_validated",
        "artifact_path": str(model_path),
        "artifact_sha256": sha256_file(model_path),
        "candidate": candidate,
        "threshold": float(threshold),
        "prediction_horizon": "strictly next 1 to 3 days",
        "replacement_authorized": False,
        "public_alert_authorized": False,
        "production_engine_remains": "derived-v2",
        "model_v4_prospective_generation_unchanged": True,
        "source_hashes": bundle["source_hashes"],
        "warning": "Passing development permits a shadow freeze candidate only; it does not prove operational 24/48/72-hour warning skill.",
    }
    manifest_path.write_text(json.dumps(frozen, indent=2), encoding="utf-8")
    print(json.dumps(frozen, indent=2))


if __name__ == "__main__":
    main()
