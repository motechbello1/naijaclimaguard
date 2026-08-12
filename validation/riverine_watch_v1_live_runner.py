#!/usr/bin/env python3
"""Run Riverine Watch v1 from live source-compatible NASA + GloFAS inputs.

This orchestration intentionally reuses the repository's existing source fetchers:
- fetch_nasa_imerg_early_current.py (NASA GPM IMERG Early V07 daily)
- fetch_glofas_current.py (CEMS GloFAS operational LISFLOOD control forecast)

It does not substitute Open-Meteo data. It posts the raw source payload to the
application's /api/v1/riverine-watch/live endpoint, which rebuilds the exact 19
training-time features and applies the frozen Riverine Watch v1 model.

Required credentials for actual acquisition:
  EARTHDATA_TOKEN
  EWDS_API_KEY

The runner writes one immutable JSON output per issue date and appends one line
per supported location to a prospective JSONL ledger. Existing ledger rows are
never rewritten.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

SUPPORTED = ("Lokoja", "Makurdi")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--issue-date", help="UTC issue date YYYY-MM-DD; default today UTC")
    ap.add_argument(
        "--api-url",
        default=os.getenv("RIVERINE_WATCH_API_URL", "http://localhost:3000/api/v1/riverine-watch/live"),
        help="Deployed or local Riverine Watch live endpoint",
    )
    ap.add_argument("--work-dir", default="validation/prospective/riverine_watch_v1_work")
    ap.add_argument("--out-dir", default="validation/prospective/riverine_watch_v1")
    ap.add_argument("--ledger", default="validation/prospective/riverine_watch_v1_ledger.jsonl")
    ap.add_argument("--last-watch-ledger", default="validation/prospective/riverine_watch_v1_ledger.jsonl")
    args = ap.parse_args()

    if not os.getenv("EARTHDATA_TOKEN"):
        raise RuntimeError("EARTHDATA_TOKEN is required for live NASA IMERG Early acquisition")
    if not os.getenv("EWDS_API_KEY"):
        raise RuntimeError("EWDS_API_KEY is required for live GloFAS acquisition")

    issue = pd.Timestamp(args.issue_date) if args.issue_date else pd.Timestamp.now(tz="UTC").normalize().tz_localize(None)
    issue_str = issue.strftime("%Y-%m-%d")
    nasa_end = (issue - pd.Timedelta(days=1)).strftime("%Y-%m-%d")

    work = Path(args.work_dir) / issue_str
    work.mkdir(parents=True, exist_ok=True)
    nasa_csv = work / "nasa_imerg_early_30d.csv"
    glofas_csv = work / "glofas_current.csv"

    root = Path(__file__).resolve().parent
    run([
        sys.executable,
        str(root / "fetch_nasa_imerg_early_current.py"),
        "--days", "30",
        "--end", nasa_end,
        "--out", str(nasa_csv),
    ])
    run([
        sys.executable,
        str(root / "fetch_glofas_current.py"),
        "--issue-date", issue_str,
        "--lead-hours", "24", "48", "72",
        "--out", str(glofas_csv),
        "--raw-dir", str(work / "glofas_raw"),
    ])

    nasa = pd.read_csv(nasa_csv)
    glofas = pd.read_csv(glofas_csv)
    nasa["date"] = pd.to_datetime(nasa["date"])

    ledger_path = Path(args.ledger)
    prior_ledger = Path(args.last_watch_ledger)
    last_watch: dict[str, str] = {}
    if prior_ledger.exists():
        for line in prior_ledger.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get("state") == "WATCH" and row.get("emit_watch_episode") is True and row.get("location") in SUPPORTED:
                d = str(row.get("issue_date", ""))
                if d and d > last_watch.get(row["location"], ""):
                    last_watch[row["location"]] = d

    results: list[dict] = []
    for location in SUPPORTED:
        nr = nasa[nasa["location"].eq(location)].sort_values("date")
        if len(nr) < 30:
            raise RuntimeError(f"NASA recent input has only {len(nr)} rows for {location}; 30 are required")
        nr = nr.tail(30)
        rainfall = [
            {
                "date": pd.Timestamp(r.date).strftime("%Y-%m-%d"),
                "mm": float(r.nasa_imerg_precip_mm_day),
            }
            for r in nr.itertuples(index=False)
        ]

        gr = glofas[glofas["location"].eq(location)].copy()
        q = {}
        for lead in (24, 48, 72):
            hit = gr[gr["lead_time_hours"].eq(lead)]
            if hit.empty:
                raise RuntimeError(f"GloFAS current input missing +{lead}h for {location}")
            q[f"q{lead}"] = float(hit.iloc[-1]["forecast_discharge_m3s"])

        payload = {
            "location": location,
            "issue_date": issue_str,
            "nasa_imerg_early": rainfall,
            "glofas_control_forecast": q,
            "last_watch_date": last_watch.get(location),
        }
        response = requests.post(args.api_url, json=payload, timeout=30)
        response.raise_for_status()
        scored = response.json()
        scored["source_evidence"] = {
            "nasa_csv_sha256": sha256(nasa_csv),
            "glofas_csv_sha256": sha256(glofas_csv),
            "nasa_source": "NASA GPM IMERG Early V07 daily",
            "glofas_source": "CEMS GloFAS operational LISFLOOD control forecast",
        }
        scored["runner_recorded_at_utc"] = datetime.now(timezone.utc).isoformat()
        results.append(scored)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"riverine_watch_v1_{issue_str}.json"
    if out_path.exists():
        raise RuntimeError(f"Refusing to overwrite existing prospective issue artifact: {out_path}")
    out_path.write_text(json.dumps(results, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    ledger_path.parent.mkdir(parents=True, exist_ok=True)
    with ledger_path.open("a", encoding="utf-8") as f:
        for row in results:
            compact = {
                "model_id": row.get("model_id"),
                "issue_date": row.get("issue_date"),
                "location": row.get("location"),
                "probability": row.get("probability"),
                "state": row.get("state"),
                "emit_watch_episode": row.get("emit_watch_episode"),
                "horizon_days": row.get("horizon_days"),
                "source_evidence": row.get("source_evidence"),
                "runner_recorded_at_utc": row.get("runner_recorded_at_utc"),
            }
            f.write(json.dumps(compact, sort_keys=True) + "\n")

    print(json.dumps({
        "status": "riverine_watch_v1_live_issue_written",
        "issue_date": issue_str,
        "supported_locations": list(SUPPORTED),
        "output": str(out_path),
        "output_sha256": sha256(out_path),
        "ledger": str(ledger_path),
        "results": [
            {
                "location": r.get("location"),
                "probability": r.get("probability"),
                "state": r.get("state"),
                "emit_watch_episode": r.get("emit_watch_episode"),
            }
            for r in results
        ],
    }, indent=2))


if __name__ == "__main__":
    main()
