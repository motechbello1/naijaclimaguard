#!/usr/bin/env python3
"""Classical NASA-only baselines for the foundation-model challenger comparison."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

import model_v5_operational_native as base
import model_v5_operational_archive as archive

CANDIDATES = (
    "logistic_operational_native",
    "random_forest_operational_native",
    "xgboost_operational_native",
)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="validation/model_v5_nasa_only_issue_dataset.csv")
    ap.add_argument("--output", default="validation/model_v5_nasa_only_baselines.json")
    args = ap.parse_args()

    df = pd.read_csv(args.dataset, parse_dates=["issue_date"])
    base.temporal_folds = archive.temporal_folds
    results = {}
    for candidate in CANDIDATES:
        r = base.evaluate(candidate, df, group="rain_only")
        scored = r.pop("scored")
        results[candidate] = {
            **r,
            "pooled_rows": int(len(scored)),
        }
    payload = {
        "purpose": "NASA-only classical baselines for TabPFN-v2 challenger",
        "outer_years": [2022, 2023, 2024],
        "results": results,
    }
    Path(args.output).write_text(json.dumps(payload, indent=2, sort_keys=True))
    print(json.dumps({k: {
        "mean_fold_pr_auc": v["mean_fold_pr_auc"],
        "pooled_pr_auc": v["pooled_oof_metrics"]["pr_auc"],
        "pooled_roc_auc": v["pooled_oof_metrics"]["roc_auc"],
        "brier": v["pooled_oof_metrics"]["brier_score"],
    } for k, v in results.items()}, indent=2))


if __name__ == "__main__":
    main()
