#!/usr/bin/env python3
"""Build a diagnostic Model v5 dataset against the repaired flood-onset benchmark.

This script does not retrieve any source data and does not modify the frozen
Model v5 dataset or historical event registry. It consumes an existing frozen
issue-time feature dataset, replaces only the target label/future_event_ids using
eligible repaired onset events, and writes a separate diagnostic dataset plus a
strict-scorer-compatible event registry.

For onset_bounded events the conservative scoring anchor is onset_lower, exactly
as frozen in FLOOD_ONSET_BENCHMARK_REPAIR_PROTOCOL.md.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import pandas as pd


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def truthy(series: pd.Series) -> pd.Series:
    return series.astype(str).str.strip().str.lower().isin({"true", "1", "yes"})


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--dataset", required=True, help="Frozen Model v5 issue-time feature dataset CSV")
    p.add_argument("--benchmark", default="validation/flood_onset_benchmark_2021_2024.csv")
    p.add_argument("--out-dataset", default="validation/model_v5_repaired_onset_diagnostic_dataset.csv")
    p.add_argument("--out-events", default="validation/flood_onset_strict_event_registry.csv")
    p.add_argument("--out-manifest", default="validation/model_v5_repaired_onset_diagnostic_manifest.json")
    args = p.parse_args()

    dataset_path = Path(args.dataset)
    benchmark_path = Path(args.benchmark)
    out_dataset = Path(args.out_dataset)
    out_events = Path(args.out_events)
    out_manifest = Path(args.out_manifest)

    df = pd.read_csv(dataset_path)
    bench = pd.read_csv(benchmark_path)

    required_df = {"issue_date", "location"}
    required_bench = {
        "event_id", "location", "onset_class", "strict_72h_eligible",
        "conservative_scoring_date", "frozen_observed_by_date", "source", "source_url",
    }
    missing_df = sorted(required_df - set(df.columns))
    missing_bench = sorted(required_bench - set(bench.columns))
    if missing_df or missing_bench:
        raise SystemExit(f"Missing columns: dataset={missing_df}, benchmark={missing_bench}")

    eligible = bench[truthy(bench["strict_72h_eligible"])].copy()
    if eligible.empty:
        raise SystemExit("Repaired benchmark has no strict-72h eligible events")
    if eligible["conservative_scoring_date"].isna().any():
        bad = eligible.loc[eligible["conservative_scoring_date"].isna(), "event_id"].tolist()
        raise SystemExit(f"Eligible events missing conservative scoring date: {bad}")
    if (~eligible["onset_class"].isin(["onset_exact", "onset_bounded"])).any():
        raise SystemExit("Only onset_exact/onset_bounded events may be strict-72h eligible")

    df["issue_date"] = pd.to_datetime(df["issue_date"])
    eligible["anchor"] = pd.to_datetime(eligible["conservative_scoring_date"])

    if "label" in df.columns:
        df["original_frozen_label"] = df["label"]
    if "future_event_ids" in df.columns:
        df["original_frozen_future_event_ids"] = df["future_event_ids"]

    by_location = {
        str(loc): group.sort_values("anchor")
        for loc, group in eligible.groupby("location", sort=False)
    }

    labels = []
    future_ids = []
    for row in df.itertuples(index=False):
        issue = pd.Timestamp(getattr(row, "issue_date"))
        loc = str(getattr(row, "location"))
        events = by_location.get(loc)
        matched = []
        if events is not None:
            mask = (issue < events["anchor"]) & (events["anchor"] <= issue + pd.Timedelta(hours=72))
            matched = events.loc[mask, "event_id"].astype(str).tolist()
        labels.append(int(bool(matched)))
        future_ids.append("|".join(matched))

    df["label"] = labels
    df["future_event_ids"] = future_ids
    df = df.sort_values(["issue_date", "location"]).reset_index(drop=True)

    strict_events = eligible.copy()
    strict_events["observed_by_date"] = strict_events["anchor"].dt.strftime("%Y-%m-%d")
    strict_events["include_in_benchmark"] = True
    strict_events = strict_events[[
        "event_id", "location", "observed_by_date", "include_in_benchmark",
        "onset_class", "onset_lower", "onset_upper", "frozen_observed_by_date",
        "source", "source_url",
    ]].sort_values(["observed_by_date", "location"])

    out_dataset.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_dataset, index=False, date_format="%Y-%m-%d")
    strict_events.to_csv(out_events, index=False)

    manifest = {
        "status": "diagnostic_repaired_onset_dataset_built",
        "interpretation": "post_hoc_diagnostic_only_not_preregistered_model_v5_pass",
        "source_feature_dataset": str(dataset_path),
        "source_feature_dataset_sha256": sha256(dataset_path),
        "repaired_benchmark": str(benchmark_path),
        "repaired_benchmark_sha256": sha256(benchmark_path),
        "rows": int(len(df)),
        "issue_dates": int(df["issue_date"].nunique()),
        "locations": sorted(df["location"].astype(str).unique().tolist()),
        "positive_issue_rows": int(df["label"].sum()),
        "strict_eligible_events": int(len(strict_events)),
        "strict_event_ids": strict_events["event_id"].astype(str).tolist(),
        "conservative_bounded_event_rule": "use onset_lower as the scoring anchor",
        "output_dataset": str(out_dataset),
        "output_dataset_sha256": sha256(out_dataset),
        "output_events": str(out_events),
        "output_events_sha256": sha256(out_events),
    }
    out_manifest.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
