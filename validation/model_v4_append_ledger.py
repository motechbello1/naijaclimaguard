#!/usr/bin/env python3
"""Write one immutable prospective shadow prediction issue to the Git ledger."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import pandas as pd

EXPECTED_LOCATIONS = {"Lokoja", "Makurdi", "Onitsha", "Yenagoa", "Hadejia"}


def canonical(value) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scored", type=Path, required=True)
    ap.add_argument("--root", type=Path, default=Path("validation/prospective/predictions"))
    args = ap.parse_args()

    records = json.loads(args.scored.read_text(encoding="utf-8"))
    if not isinstance(records, list) or not records:
        raise ValueError("Scored prospective prediction must be a non-empty JSON array")
    locations = {str(r.get("location")) for r in records}
    if locations != EXPECTED_LOCATIONS:
        raise ValueError(f"Expected exactly five pilot locations; got {sorted(locations)}")
    issue_times = {str(r.get("issue_time_utc")) for r in records}
    if len(issue_times) != 1:
        raise ValueError("All records in an issue must share the same issue_time_utc")
    artifacts = {str(r.get("artifact_sha256")) for r in records}
    if len(artifacts) != 1:
        raise ValueError("All records must use the same frozen artifact")
    if any(bool(r.get("public_alert_authorized")) or bool(r.get("replacement_authorized")) for r in records):
        raise ValueError("Prospective shadow ledger cannot contain an authorized public alert/replacement")

    issue = pd.Timestamp(next(iter(issue_times)))
    if issue.tzinfo is None:
        issue = issue.tz_localize("UTC")
    else:
        issue = issue.tz_convert("UTC")
    filename = issue.strftime("%Y%m%dT%H%M%SZ") + ".json"
    path = args.root / issue.strftime("%Y") / issue.strftime("%m") / issue.strftime("%d") / filename
    if path.exists():
        raise FileExistsError(f"Prospective issue already exists and will not be overwritten: {path}")

    records_hash = hashlib.sha256(canonical(records)).hexdigest()
    payload = {
        "schema": "naijaclimaguard.prospective_issue.v1",
        "issue_time_utc": issue.isoformat(),
        "artifact_sha256": next(iter(artifacts)),
        "records_sha256": records_hash,
        "source_branch": os.getenv("GITHUB_REF_NAME"),
        "source_workflow_sha": os.getenv("GITHUB_SHA"),
        "github_run_id": os.getenv("GITHUB_RUN_ID"),
        "record_count": len(records),
        "locations": sorted(locations),
        "records": records,
        "immutability_rule": "This file is append-only. Existing prediction issues must never be edited after outcomes are known.",
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(path)


if __name__ == "__main__":
    main()
