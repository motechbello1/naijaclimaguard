#!/usr/bin/env python3
"""Guard Riverine Watch v1 prospective issuance so source gaps become durable status evidence."""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

import riverine_watch_v1_prospective as prospective


def _arg_value(name: str, default: str) -> str:
    try:
        idx = sys.argv.index(name)
        return sys.argv[idx + 1]
    except (ValueError, IndexError):
        return default


def _selected_glofas_issue(work_dir: Path) -> str | None:
    required = {(loc, lead) for loc in prospective.SUPPORTED for lead in (24, 48, 72)}
    for csv_path in sorted(work_dir.glob("glofas_*/glofas.csv"), reverse=True):
        try:
            frame = pd.read_csv(csv_path)
            got = {(str(r.location), int(r.lead_time_hours)) for r in frame.itertuples(index=False)}
            issue_dates = set(frame["issue_date"].astype(str))
            if required.issubset(got) and len(issue_dates) == 1:
                return next(iter(issue_dates))
        except Exception:
            continue
    return None


def main() -> None:
    root = Path(_arg_value("--root", "validation/prospective/riverine_watch_v1"))
    before = set((root / "work").glob("*")) if (root / "work").exists() else set()
    try:
        prospective.main()
        return
    except RuntimeError as exc:
        message = str(exc)
        if not message.startswith("NASA IMERG Early"):
            raise

        after = set((root / "work").glob("*")) if (root / "work").exists() else set()
        created = sorted(after - before, key=lambda p: p.stat().st_mtime, reverse=True)
        work_dir = created[0] if created else None
        run_stamp = work_dir.name if work_dir else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%M%SZ")
        status_path = root / "status" / f"{run_stamp}.json"
        status_path.parent.mkdir(parents=True, exist_ok=True)
        if status_path.exists():
            raise

        operational_date = _arg_value("--operational-date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        selected_issue = _selected_glofas_issue(work_dir) if work_dir else None
        source_age = None
        if selected_issue:
            source_age = int((pd.Timestamp(operational_date) - pd.Timestamp(selected_issue)).days)

        missing_match = re.search(r"missing=(\[[^\]]*\])", message)
        missing_dates = []
        if missing_match:
            try:
                missing_dates = json.loads(missing_match.group(1).replace("'", '"'))
            except json.JSONDecodeError:
                missing_dates = []

        payload = {
            "model_id": "riverine-watch-v1",
            "operational_run_date": operational_date,
            "recorded_at_utc": datetime.now(timezone.utc).isoformat(),
            "status": "nasa_source_incomplete_no_model_issue",
            "reason": message,
            "selected_glofas_issue_date": selected_issue,
            "selected_glofas_source_age_days": source_age,
            "missing_rainfall_dates": missing_dates,
            "eligible_for_live_shadow_metrics": False,
            "watch_episode_emitted": False,
            "public_action_authorized": False,
        }
        status_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps({"status": payload["status"], "status_path": str(status_path)}, indent=2))


if __name__ == "__main__":
    main()
