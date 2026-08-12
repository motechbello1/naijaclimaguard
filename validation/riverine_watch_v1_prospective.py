#!/usr/bin/env python3
"""Issue Riverine Watch v1 shadow forecasts with an explicit source-freshness contract.

Operational rules
-----------------
1. Try GloFAS operational issue dates in order: run date, run date -1d, run date -2d.
2. Every GloFAS attempt has a hard wall-clock timeout so an accepted EWDS job cannot
   stall the entire evidence process indefinitely.
3. NASA IMERG Early rainfall is fetched *after* a GloFAS issue is selected and is
   aligned to the 30 complete days strictly before that exact GloFAS issue date.
4. Source age 0-1 days may emit a shadow WATCH episode. Source age 2 days is scored
   only as a delayed backfill and can never emit a new operational WATCH episode.
5. If no valid GloFAS issue is available within 2 days, no model forecast is issued.
   A durable source-delay status record is written instead.
6. Model issue artifacts are append-only by GloFAS issue date. Reusing the same
   source issue on a later run does not create a second forecast.

This is shadow/prospective evidence collection. It does not authorize autonomous
public warnings and it does not replace the existing production risk engine.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from riverine_watch_v1 import load_model, score, should_emit_watch

SUPPORTED = ("Lokoja", "Makurdi")
MAX_SOURCE_AGE_DAYS = 2
MAX_LIVE_EMIT_AGE_DAYS = 1
DEFAULT_GLOFAS_TIMEOUT_SECONDS = 420
DEFAULT_NASA_TIMEOUT_SECONDS = 600


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def safe_tail(text: str | None, limit: int = 1500) -> str:
    if not text:
        return ""
    text = text.replace(os.getenv("EWDS_API_KEY", "__NO_SECRET__"), "***")
    text = text.replace(os.getenv("EARTHDATA_TOKEN", "__NO_SECRET__"), "***")
    return text[-limit:]


def run_bounded(cmd: list[str], timeout_seconds: int) -> dict:
    started = utc_now()
    try:
        cp = subprocess.run(
            cmd,
            check=False,
            text=True,
            capture_output=True,
            timeout=timeout_seconds,
        )
        return {
            "ok": cp.returncode == 0,
            "returncode": cp.returncode,
            "timed_out": False,
            "elapsed_seconds": round((utc_now() - started).total_seconds(), 3),
            "stdout_tail": safe_tail(cp.stdout),
            "stderr_tail": safe_tail(cp.stderr),
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "ok": False,
            "returncode": None,
            "timed_out": True,
            "elapsed_seconds": round((utc_now() - started).total_seconds(), 3),
            "stdout_tail": safe_tail(exc.stdout.decode() if isinstance(exc.stdout, bytes) else exc.stdout),
            "stderr_tail": safe_tail(exc.stderr.decode() if isinstance(exc.stderr, bytes) else exc.stderr),
        }


def write_json(path: Path, payload: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        raise RuntimeError(f"Refusing to overwrite append-only artifact: {path}")
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def build_feature_row(location: str, nasa: pd.DataFrame, glofas: pd.DataFrame, issue: pd.Timestamp) -> dict:
    nr = nasa[nasa["location"].eq(location)].copy()
    nr["date"] = pd.to_datetime(nr["date"])
    nr = nr[nr["date"].lt(issue)].sort_values("date").tail(30)
    expected = pd.date_range(issue - pd.Timedelta(days=30), issue - pd.Timedelta(days=1), freq="D")
    actual = pd.DatetimeIndex(nr["date"])
    if len(nr) != 30 or not actual.equals(expected):
        missing = [d.strftime("%Y-%m-%d") for d in expected.difference(actual)]
        raise RuntimeError(
            f"NASA IMERG Early does not contain 30 consecutive prior days for {location}; missing={missing}"
        )

    rain = nr["nasa_imerg_precip_mm_day"].astype(float).clip(lower=0).tolist()
    if not all(math.isfinite(v) for v in rain):
        raise RuntimeError(f"NASA IMERG Early contains non-finite rainfall for {location}")

    rain1 = rain[-1]
    rain3 = float(sum(rain[-3:]))
    rain7 = float(sum(rain[-7:]))
    rain14 = float(sum(rain[-14:]))
    rain30 = float(sum(rain))
    previous3 = float(sum(rain[-6:-3]))

    gr = glofas[glofas["location"].eq(location)].copy()
    q: dict[int, float] = {}
    for lead in (24, 48, 72):
        hit = gr[gr["lead_time_hours"].astype(int).eq(lead)]
        if hit.empty:
            raise RuntimeError(f"GloFAS selected issue missing +{lead}h for {location}")
        q[lead] = float(hit.iloc[-1]["forecast_discharge_m3s"])
        if not math.isfinite(q[lead]):
            raise RuntimeError(f"GloFAS selected issue has non-finite +{lead}h discharge for {location}")

    q24, q48, q72 = q[24], q[48], q[72]
    q48_minus_q24 = q48 - q24
    q72_minus_q24 = q72 - q24

    return {
        "location": location,
        "rain_1d": rain1,
        "rain_3d": rain3,
        "rain_7d": rain7,
        "rain_14d": rain14,
        "rain_30d": rain30,
        "rain_accel_3d": rain3 - previous3,
        "rain_3_14_ratio": rain3 / (abs(rain14) + 1e-6),
        "rain_7_30_ratio": rain7 / (abs(rain30) + 1e-6),
        "wet_days_7d": int(sum(v >= 1 for v in rain[-7:])),
        "wet_days_30d": int(sum(v >= 1 for v in rain)),
        "q24": q24,
        "q48": q48,
        "q72": q72,
        "qmax_72": max(q24, q48, q72),
        "q48_minus_q24": q48_minus_q24,
        "q72_minus_q24": q72_minus_q24,
        "q72_pct_rise": q72_minus_q24 / (abs(q24) + 1e-6),
        "q_slope_per_day": q72_minus_q24 / 2,
        "q_monotonic_rise": 1 if q24 <= q48 <= q72 else 0,
    }


def ledger_rows(path: Path) -> list[dict]:
    rows: list[dict] = []
    if not path.exists():
        return rows
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def last_emitted_watch(rows: list[dict], location: str) -> str | None:
    dates = [
        str(r.get("model_issue_date"))
        for r in rows
        if r.get("location") == location
        and r.get("state") == "WATCH"
        and r.get("emit_watch_episode") is True
        and r.get("eligible_for_live_shadow_metrics") is True
        and r.get("model_issue_date")
    ]
    return max(dates) if dates else None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--operational-date", help="UTC run date YYYY-MM-DD; default today UTC")
    ap.add_argument("--root", default="validation/prospective/riverine_watch_v1")
    ap.add_argument("--ledger", default="validation/prospective/riverine_watch_v1_ledger.jsonl")
    ap.add_argument("--glofas-timeout-seconds", type=int, default=DEFAULT_GLOFAS_TIMEOUT_SECONDS)
    ap.add_argument("--nasa-timeout-seconds", type=int, default=DEFAULT_NASA_TIMEOUT_SECONDS)
    args = ap.parse_args()

    if not os.getenv("EARTHDATA_TOKEN"):
        raise RuntimeError("EARTHDATA_TOKEN is required")
    if not os.getenv("EWDS_API_KEY"):
        raise RuntimeError("EWDS_API_KEY is required")

    now = utc_now()
    operational = (
        pd.Timestamp(args.operational_date)
        if args.operational_date
        else pd.Timestamp(now.date())
    )
    operational_str = operational.strftime("%Y-%m-%d")
    run_stamp = now.strftime("%Y-%m-%dT%H%M%SZ")

    root = Path(args.root)
    work = root / "work" / run_stamp
    work.mkdir(parents=True, exist_ok=True)
    status_path = root / "status" / f"{run_stamp}.json"
    ledger_path = Path(args.ledger)
    previous = ledger_rows(ledger_path)

    script_root = Path(__file__).resolve().parent
    attempts: list[dict] = []
    selected_issue: pd.Timestamp | None = None
    selected_csv: Path | None = None

    for age in range(0, MAX_SOURCE_AGE_DAYS + 1):
        candidate = operational - pd.Timedelta(days=age)
        candidate_str = candidate.strftime("%Y-%m-%d")
        candidate_dir = work / f"glofas_{candidate_str}"
        out_csv = candidate_dir / "glofas.csv"
        cmd = [
            sys.executable,
            str(script_root / "fetch_glofas_riverine_watch.py"),
            "--issue-date", candidate_str,
            "--out", str(out_csv),
            "--raw-dir", str(candidate_dir / "raw"),
        ]
        outcome = run_bounded(cmd, args.glofas_timeout_seconds)
        attempt = {"issue_date": candidate_str, "source_age_days": age, **outcome}
        attempts.append(attempt)
        if outcome["ok"] and out_csv.exists():
            try:
                check = pd.read_csv(out_csv)
                required = {(loc, lead) for loc in SUPPORTED for lead in (24, 48, 72)}
                got = {
                    (str(r.location), int(r.lead_time_hours))
                    for r in check.itertuples(index=False)
                }
                if required.issubset(got) and set(check["issue_date"].astype(str)) == {candidate_str}:
                    selected_issue = candidate
                    selected_csv = out_csv
                    break
                attempt["validation_error"] = "required location/lead rows or issue-date contract missing"
            except Exception as exc:
                attempt["validation_error"] = str(exc)

    base_status = {
        "model_id": "riverine-watch-v1",
        "operational_run_date": operational_str,
        "recorded_at_utc": now.isoformat(),
        "supported_locations": list(SUPPORTED),
        "glofas_attempts": attempts,
        "max_source_age_days": MAX_SOURCE_AGE_DAYS,
        "max_live_emit_age_days": MAX_LIVE_EMIT_AGE_DAYS,
        "public_action_authorized": False,
    }

    if selected_issue is None or selected_csv is None:
        write_json(status_path, {
            **base_status,
            "status": "source_delayed_no_model_issue",
            "reason": "No complete GloFAS operational issue was available within the 0-2 day freshness window.",
        })
        print(json.dumps({"status": "source_delayed_no_model_issue", "status_path": str(status_path)}, indent=2))
        return

    selected_issue_str = selected_issue.strftime("%Y-%m-%d")
    source_age_days = int((operational - selected_issue).days)
    nasa_end = (selected_issue - pd.Timedelta(days=1)).strftime("%Y-%m-%d")
    nasa_csv = work / f"nasa_30d_before_{selected_issue_str}.csv"
    nasa_outcome = run_bounded([
        sys.executable,
        str(script_root / "fetch_nasa_imerg_early_current.py"),
        "--days", "30",
        "--end", nasa_end,
        "--out", str(nasa_csv),
    ], args.nasa_timeout_seconds)

    if not nasa_outcome["ok"] or not nasa_csv.exists():
        write_json(status_path, {
            **base_status,
            "status": "nasa_source_failure_no_model_issue",
            "selected_glofas_issue_date": selected_issue_str,
            "selected_glofas_source_age_days": source_age_days,
            "nasa_attempt": nasa_outcome,
        })
        print(json.dumps({"status": "nasa_source_failure_no_model_issue", "status_path": str(status_path)}, indent=2))
        return

    issue_path = root / "issues" / f"riverine_watch_v1_{selected_issue_str}.json"
    if issue_path.exists() or any(r.get("model_issue_date") == selected_issue_str for r in previous):
        write_json(status_path, {
            **base_status,
            "status": "duplicate_source_issue_no_new_forecast",
            "selected_glofas_issue_date": selected_issue_str,
            "selected_glofas_source_age_days": source_age_days,
            "nasa_csv_sha256": sha256(nasa_csv),
            "glofas_csv_sha256": sha256(selected_csv),
        })
        print(json.dumps({"status": "duplicate_source_issue_no_new_forecast", "status_path": str(status_path)}, indent=2))
        return

    nasa = pd.read_csv(nasa_csv)
    glofas = pd.read_csv(selected_csv)
    model = load_model()
    issuance_class = (
        "fresh_live_shadow" if source_age_days == 0
        else "delayed_1d_live_shadow" if source_age_days == 1
        else "delayed_2d_backfill_only"
    )
    eligible_for_live = source_age_days <= MAX_LIVE_EMIT_AGE_DAYS

    outputs: list[dict] = []
    for location in SUPPORTED:
        features = build_feature_row(location, nasa, glofas, selected_issue)
        scored = score(features, model)
        last_watch = last_emitted_watch(previous, location)
        emit = eligible_for_live and should_emit_watch(
            scored["state"],
            selected_issue_str,
            last_watch,
            cooldown_days=7,
        )
        outputs.append({
            **scored,
            "model_issue_date": selected_issue_str,
            "operational_run_date": operational_str,
            "source_age_days": source_age_days,
            "issuance_class": issuance_class,
            "eligible_for_live_shadow_metrics": eligible_for_live,
            "emit_watch_episode": bool(emit),
            "cooldown_days": 7,
            "last_emitted_watch_date": last_watch,
            "features": features,
            "source_evidence": {
                "rainfall": "NASA GPM IMERG Early V07 daily",
                "rainfall_window_end": nasa_end,
                "rainfall_csv_sha256": sha256(nasa_csv),
                "river": "CEMS GloFAS operational LISFLOOD control forecast +24/+48/+72h",
                "glofas_issue_date": selected_issue_str,
                "glofas_csv_sha256": sha256(selected_csv),
                "substitutions_allowed": False,
            },
            "public_action_authorized": False,
        })

    issue_payload = {
        "model_id": "riverine-watch-v1",
        "evidence_class": "prospective_shadow_or_source_delayed_backfill",
        "model_issue_date": selected_issue_str,
        "operational_run_date": operational_str,
        "source_age_days": source_age_days,
        "issuance_class": issuance_class,
        "eligible_for_live_shadow_metrics": eligible_for_live,
        "results": outputs,
    }
    write_json(issue_path, issue_payload)

    ledger_path.parent.mkdir(parents=True, exist_ok=True)
    with ledger_path.open("a", encoding="utf-8") as f:
        for row in outputs:
            compact = {
                "model_id": row["model_id"],
                "model_issue_date": row["model_issue_date"],
                "operational_run_date": row["operational_run_date"],
                "location": row["location"],
                "probability": row["probability"],
                "state": row["state"],
                "emit_watch_episode": row["emit_watch_episode"],
                "source_age_days": row["source_age_days"],
                "issuance_class": row["issuance_class"],
                "eligible_for_live_shadow_metrics": row["eligible_for_live_shadow_metrics"],
                "public_action_authorized": False,
                "source_evidence": row["source_evidence"],
            }
            f.write(json.dumps(compact, sort_keys=True) + "\n")

    write_json(status_path, {
        **base_status,
        "status": "riverine_watch_v1_issue_written",
        "selected_glofas_issue_date": selected_issue_str,
        "selected_glofas_source_age_days": source_age_days,
        "issuance_class": issuance_class,
        "eligible_for_live_shadow_metrics": eligible_for_live,
        "issue_path": str(issue_path),
        "issue_sha256": sha256(issue_path),
        "nasa_attempt": nasa_outcome,
        "results": [
            {
                "location": r["location"],
                "probability": r["probability"],
                "state": r["state"],
                "emit_watch_episode": r["emit_watch_episode"],
            }
            for r in outputs
        ],
    })

    print(json.dumps({
        "status": "riverine_watch_v1_issue_written",
        "model_issue_date": selected_issue_str,
        "operational_run_date": operational_str,
        "source_age_days": source_age_days,
        "issuance_class": issuance_class,
        "issue_path": str(issue_path),
        "status_path": str(status_path),
        "results": [
            {
                "location": r["location"],
                "probability": r["probability"],
                "state": r["state"],
                "emit_watch_episode": r["emit_watch_episode"],
            }
            for r in outputs
        ],
    }, indent=2))


if __name__ == "__main__":
    main()
