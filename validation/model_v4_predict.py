#!/usr/bin/env python3
"""Score issue-time full-source features with the frozen Model v4 artifact.

Input is one JSON object or a JSON array. Every row must contain `location`, all
base source features expected by the artifact, and `source_metadata` describing
what was actually available at issue time. The scorer derives only deterministic
location-normalized ratios, never backfills future/reanalysis values, and emits
an immutable evidence record suitable for the prospective ledger.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np

DERIVED = {
    "discharge_location_ratio",
    "discharge_location_robust_z",
    "rain_location_ratio",
    "rain_location_robust_z",
    "discharge_vs_7d_mean",
    "rain_3d_vs_30d",
    "rain_7d_vs_30d",
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def calibrate(raw: float, xs: List[float], ys: List[float]) -> float:
    if not xs:
        return raw
    if raw <= xs[0]:
        return ys[0]
    if raw >= xs[-1]:
        return ys[-1]
    idx = int(np.searchsorted(np.asarray(xs), raw, side="right"))
    x0, x1 = xs[idx - 1], xs[idx]
    y0, y1 = ys[idx - 1], ys[idx]
    if abs(x1 - x0) < 1e-12:
        return float(y1)
    frac = (raw - x0) / (x1 - x0)
    return float(y0 + frac * (y1 - y0))


def enrich(row: Dict[str, Any], artifact: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(row)
    location = str(out.get("location", ""))
    stats = artifact["location_calibration"].get(location) or artifact["location_calibration"]["__GLOBAL__"]

    q = float(out["river_discharge_m3s"])
    rain = float(out["nasa_imerg_precip_mm_day"])
    q7 = float(out["discharge_7d_mean"])
    r3 = float(out["nasa_rain_3d_sum"])
    r7 = float(out["nasa_rain_7d_sum"])
    r30 = float(out["nasa_rain_30d_sum"])

    out["discharge_location_ratio"] = q / float(stats["q_denom"])
    out["discharge_location_robust_z"] = (q - float(stats["q_median"])) / float(stats["q_iqr"])
    out["rain_location_ratio"] = rain / float(stats["r_denom"])
    out["rain_location_robust_z"] = (rain - float(stats["r_median"])) / float(stats["r_iqr"])
    out["discharge_vs_7d_mean"] = q / (abs(q7) + 1e-6)
    out["rain_3d_vs_30d"] = r3 / (abs(r30) + 1e-6)
    out["rain_7d_vs_30d"] = r7 / (abs(r30) + 1e-6)
    return out


def score(row: Dict[str, Any], artifact: Dict[str, Any], artifact_sha: str) -> Dict[str, Any]:
    if artifact.get("status") != "frozen_shadow_candidate_not_production_validated":
        raise ValueError("Artifact is not the frozen Model v4 shadow candidate")
    if artifact.get("replacement_authorized") is not False:
        raise ValueError("Frozen artifact must not claim production authorization")

    source_metadata = row.get("source_metadata")
    if not isinstance(source_metadata, dict):
        raise ValueError("source_metadata is required for prospective evidence")
    required_sources = {"nasa_imerg", "glofas", "surface_state"}
    missing_sources = sorted(required_sources - set(source_metadata))
    if missing_sources:
        raise ValueError(f"Full-source prediction missing source metadata: {missing_sources}")

    enriched = enrich(row, artifact)
    values = []
    for i, feature in enumerate(artifact["features"]):
        value = enriched.get(feature)
        if value is None or not math.isfinite(float(value)):
            value = artifact["imputer_median"][i]
        values.append(float(value))

    scaled = [
        (value - float(mean)) / (float(scale) if abs(float(scale)) > 1e-12 else 1.0)
        for value, mean, scale in zip(values, artifact["scaler_mean"], artifact["scaler_scale"])
    ]
    logit = float(artifact["intercept"]) + sum(
        float(coef) * x for coef, x in zip(artifact["coefficient"], scaled)
    )
    raw_probability = float(1.0 / (1.0 + math.exp(-max(-60.0, min(60.0, logit)))))
    probability = calibrate(
        raw_probability,
        [float(x) for x in artifact["isotonic_x_thresholds"]],
        [float(y) for y in artifact["isotonic_y_thresholds"]],
    )
    threshold = float(artifact["shadow_threshold"])

    issue_time = row.get("issue_time_utc") or datetime.now(timezone.utc).isoformat()
    input_for_hash = {
        "issue_time_utc": issue_time,
        "location": row.get("location"),
        "latitude": row.get("latitude"),
        "longitude": row.get("longitude"),
        "source_metadata": source_metadata,
        "features": {name: enriched.get(name) for name in artifact["features"]},
    }
    input_hash = sha256_bytes(canonical_json(input_for_hash))

    return {
        "schema": "naijaclimaguard.prospective_prediction.v1",
        "issue_time_utc": issue_time,
        "location": row.get("location"),
        "latitude": row.get("latitude"),
        "longitude": row.get("longitude"),
        "horizon": "next_1_to_3_days",
        "mode": "full_source_shadow",
        "artifact_sha256": artifact_sha,
        "input_sha256": input_hash,
        "source_metadata": source_metadata,
        "raw_probability": raw_probability,
        "calibrated_probability": probability,
        "shadow_threshold": threshold,
        "threshold_crossed": bool(probability >= threshold),
        "public_alert_authorized": False,
        "replacement_authorized": False,
        "interpretation": "Experimental prospective shadow forecast; not an official flood warning.",
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifact", type=Path, default=Path("validation/model_v4_frozen_artifact.json"))
    ap.add_argument("--input", type=Path, required=True)
    ap.add_argument("--output", type=Path, required=True)
    args = ap.parse_args()

    artifact_bytes = args.artifact.read_bytes()
    artifact = json.loads(artifact_bytes)
    artifact_sha = sha256_bytes(artifact_bytes)
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    rows = payload if isinstance(payload, list) else [payload]
    scored = [score(dict(row), artifact, artifact_sha) for row in rows]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(scored, indent=2), encoding="utf-8")
    print(json.dumps(scored, indent=2))


if __name__ == "__main__":
    main()
