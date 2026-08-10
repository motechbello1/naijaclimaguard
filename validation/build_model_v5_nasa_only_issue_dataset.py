#!/usr/bin/env python3
"""Build the NASA-only issue-time dataset for the foundation-model challenger.

This lane deliberately does not wait for the GloFAS archive. It reuses the
preserved NASA IMERG Early artifacts and the frozen 35-event registry, while
keeping the same issue-time target definition as Model v5.
"""
from __future__ import annotations

import argparse
import glob
import hashlib
import json
from pathlib import Path

import pandas as pd

from build_model_v5_dataset import build_rain_features, attach_future_target, read_many

PILOT_LOCATIONS = {"Lokoja", "Makurdi", "Onitsha", "Yenagoa", "Hadejia"}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def expand(patterns: list[str]) -> list[Path]:
    found = []
    for pattern in patterns:
        matches = [Path(p) for p in glob.glob(pattern)]
        if not matches and Path(pattern).exists():
            matches = [Path(pattern)]
        found.extend(matches)
    paths = sorted({p.resolve() for p in found})
    if not paths:
        raise FileNotFoundError(f"No NASA files matched {patterns}")
    return [Path(p) for p in paths]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nasa", nargs="+", required=True)
    ap.add_argument("--events", default="validation/model_v4_event_registry.csv")
    ap.add_argument("--start", default="2021-05-26")
    ap.add_argument("--end", default="2024-12-31")
    ap.add_argument("--out", default="validation/model_v5_nasa_only_issue_dataset.csv")
    ap.add_argument("--manifest", default="validation/model_v5_nasa_only_issue_dataset.manifest.json")
    args = ap.parse_args()

    nasa_paths = expand(args.nasa)
    event_path = Path(args.events)
    nasa = read_many(nasa_paths)
    rain = build_rain_features(nasa)
    rain = rain[rain["issue_date"].between(pd.Timestamp(args.start), pd.Timestamp(args.end))].copy()
    rows = attach_future_target(rain, pd.read_csv(event_path))
    rows = rows.sort_values(["issue_date", "location"]).reset_index(drop=True)

    if rows.empty:
        raise RuntimeError("NASA-only issue-time challenger dataset is empty")
    if set(rows["location"].unique()) != PILOT_LOCATIONS:
        raise RuntimeError("NASA-only dataset does not contain all five pilot locations")
    if rows["label"].nunique() != 2:
        raise RuntimeError("NASA-only dataset must contain both classes")
    if rows["issue_date"].min() < pd.Timestamp(args.start):
        raise RuntimeError("NASA-only dataset begins before frozen operational eligibility")

    rain_features = [
        "rain_1d", "rain_3d", "rain_7d", "rain_14d", "rain_30d",
        "rain_accel_3d", "rain_3_14_ratio", "rain_7_30_ratio",
        "wet_days_7d", "wet_days_30d",
    ]
    coverage = {c: float(rows[c].notna().mean()) for c in rain_features}
    if min(coverage.values()) < 0.90:
        raise RuntimeError(f"NASA-only feature coverage below 90%: {coverage}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    rows.to_csv(out, index=False)
    manifest = {
        "status": "nasa_only_foundation_challenger_dataset_built",
        "purpose": "pretrained tabular foundation-model challenger independent of GloFAS archive completion",
        "target": "documented flood strictly after issue and within next 72 hours",
        "rows": int(len(rows)),
        "positive_issue_rows": int(rows["label"].sum()),
        "issue_dates": int(rows["issue_date"].nunique()),
        "locations": sorted(rows["location"].unique().tolist()),
        "start": str(rows["issue_date"].min().date()),
        "end": str(rows["issue_date"].max().date()),
        "rain_feature_coverage": coverage,
        "nasa_files": [{"path": str(p), "sha256": sha256_file(p)} for p in nasa_paths],
        "events_path": str(event_path),
        "events_sha256": sha256_file(event_path),
        "output_sha256": sha256_file(out),
    }
    Path(args.manifest).write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
