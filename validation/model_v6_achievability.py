#!/usr/bin/env python3
"""Diagnostic upper bound for a location-conditioned successor to frozen Model v5.

This does NOT alter Model v5 and is NOT a production validation result.
It asks whether the exact out-of-fold V5 probability score could satisfy the
unchanged operational gates if each pilot location were allowed its own
threshold. Because thresholds are optimized on the complete OOF set, the
result is an optimistic achievability upper bound only.

If this oracle upper bound cannot pass, threshold localization alone is
insufficient and the successor must change the score formulation.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

MIN_EVENT_DETECTION = 0.75
MIN_PRECISION = 0.10
MAX_FP_PER_1000 = 10.0
LOCATIONS = ["Hadejia", "Lokoja", "Makurdi", "Onitsha", "Yenagoa"]


def event_count_for_location(scored: pd.DataFrame, events: pd.DataFrame, location: str, threshold: float) -> tuple[int, list[str]]:
    e = events[
        events["include_in_benchmark"].astype(str).str.lower().eq("true")
        & events["location"].astype(str).eq(location)
    ].copy()
    e["observed_by_date"] = pd.to_datetime(e["observed_by_date"])
    e = e[e["observed_by_date"].dt.year.between(2022, 2024)]
    detected: list[str] = []
    s = scored[scored["location"].eq(location)]
    for _, event in e.iterrows():
        anchor = event["observed_by_date"]
        window = s[(s["issue_date"] < anchor) & (anchor <= s["issue_date"] + pd.Timedelta(days=3))]
        if (window["probability"] >= threshold).any():
            detected.append(str(event["event_id"]))
    return len(detected), detected


def local_options(scored: pd.DataFrame, events: pd.DataFrame, location: str) -> list[dict]:
    g = scored[scored["location"].eq(location)].copy()
    y = g["label"].astype(int).to_numpy()
    p = g["probability"].astype(float).to_numpy()
    options = []
    # Include 1.0 as an explicit no-alert option.
    for t in [float(x) for x in np.round(np.arange(0.01, 1.00, 0.01), 2)] + [1.0]:
        pred = p >= t
        tp = int(((y == 1) & pred).sum())
        fp = int(((y == 0) & pred).sum())
        det, ids = event_count_for_location(scored, events, location, t)
        options.append({"location": location, "threshold": t, "tp": tp, "fp": fp, "detected_events": det, "event_ids": ids})
    # Pareto prune within a location: if another option has <=FP, >=TP and >=events, it dominates.
    kept = []
    for a in options:
        dominated = False
        for b in options:
            if b is a:
                continue
            if b["fp"] <= a["fp"] and b["tp"] >= a["tp"] and b["detected_events"] >= a["detected_events"]:
                if b["fp"] < a["fp"] or b["tp"] > a["tp"] or b["detected_events"] > a["detected_events"]:
                    dominated = True
                    break
        if not dominated:
            kept.append(a)
    return kept


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scored", required=True)
    ap.add_argument("--events", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    scored = pd.read_csv(args.scored, parse_dates=["issue_date"])
    scored = scored[scored["validation_year"].between(2022, 2024)].copy()
    events = pd.read_csv(args.events)
    negatives = int((scored["label"].astype(int) == 0).sum())
    evaluated = events[
        events["include_in_benchmark"].astype(str).str.lower().eq("true")
    ].copy()
    evaluated["observed_by_date"] = pd.to_datetime(evaluated["observed_by_date"])
    evaluated = evaluated[evaluated["observed_by_date"].dt.year.between(2022, 2024)]
    n_events = int(len(evaluated))
    required_events = int(np.ceil(MIN_EVENT_DETECTION * n_events))
    fp_budget = int(np.floor(MAX_FP_PER_1000 * negatives / 1000.0))

    option_map = {loc: local_options(scored, events, loc) for loc in LOCATIONS}

    # DP across locations. State key=(fp,tp,events); keep one threshold map for each exact state.
    states: dict[tuple[int, int, int], dict] = {(0, 0, 0): {}}
    for loc in LOCATIONS:
        nxt: dict[tuple[int, int, int], dict] = {}
        for (fp0, tp0, ev0), chosen in states.items():
            for opt in option_map[loc]:
                fp = fp0 + opt["fp"]
                if fp > fp_budget:
                    continue
                tp = tp0 + opt["tp"]
                ev = ev0 + opt["detected_events"]
                key = (fp, tp, ev)
                if key not in nxt:
                    m = dict(chosen)
                    m[loc] = opt
                    nxt[key] = m
        # Cross-state Pareto prune to prevent blow-up.
        keys = list(nxt)
        keep: dict[tuple[int, int, int], dict] = {}
        for k in keys:
            fp, tp, ev = k
            dominated = False
            for j in keys:
                if j == k:
                    continue
                fp2, tp2, ev2 = j
                if fp2 <= fp and tp2 >= tp and ev2 >= ev and (fp2 < fp or tp2 > tp or ev2 > ev):
                    dominated = True
                    break
            if not dominated:
                keep[k] = nxt[k]
        states = keep

    rows = []
    for (fp, tp, ev), chosen in states.items():
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        qualifies = ev >= required_events and precision >= MIN_PRECISION and fp <= fp_budget
        rows.append({
            "false_positive_issue_rows": fp,
            "true_positive_issue_rows": tp,
            "detected_events": ev,
            "event_detection_rate": ev / n_events if n_events else None,
            "precision": precision,
            "qualifies": qualifies,
            "thresholds": {loc: chosen[loc]["threshold"] for loc in LOCATIONS},
            "detected_event_ids_by_location": {loc: chosen[loc]["event_ids"] for loc in LOCATIONS},
        })
    rows.sort(key=lambda r: (r["qualifies"], r["detected_events"], r["precision"], -r["false_positive_issue_rows"]), reverse=True)
    best = rows[0] if rows else None
    qualifying = [r for r in rows if r["qualifies"]]

    result = {
        "status": "location_threshold_upper_bound_complete",
        "diagnostic_only": True,
        "warning": "Thresholds are optimized on the complete V5 OOF set. This is an optimistic upper bound, not a V6 validation result.",
        "source": "authoritative V5 out-of-fold probabilities under 2022-2024 operational-archive replay",
        "unchanged_gates": {
            "minimum_event_detection_rate": MIN_EVENT_DETECTION,
            "minimum_precision": MIN_PRECISION,
            "maximum_false_positive_issue_rows_per_1000_negative": MAX_FP_PER_1000,
        },
        "evaluated_events": n_events,
        "required_detected_events": required_events,
        "negative_issue_rows": negatives,
        "false_positive_issue_row_budget": fp_budget,
        "location_pareto_option_counts": {k: len(v) for k, v in option_map.items()},
        "oracle_location_threshold_pass_exists": bool(qualifying),
        "best_oracle_state": best,
        "qualifying_state_count": len(qualifying),
        "interpretation": (
            "Location-specific calibration is potentially sufficient to justify a preregistered V6 calibration architecture; nested temporal validation is still required."
            if qualifying else
            "Even optimistic location-specific thresholding of the V5 score cannot satisfy the frozen gates; V6 must change the risk score/event formulation rather than only calibrating thresholds."
        ),
    }
    Path(args.out).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
