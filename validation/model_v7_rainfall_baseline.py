#!/usr/bin/env python3
"""Model V7 rainfall-only baseline.

Purpose
-------
Build the simplest honest opponent that a competition ML model must beat.
Threshold and score family are selected using 2024 development events only.
The selected rule is then evaluated unchanged on independently sourced 2025
candidate events whose dates and location anchors are suitable.

This is a diagnostic baseline, not a Model V7 score and not a production alert.
"""

from __future__ import annotations

import csv
import datetime as dt
import json
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parent
API = "https://previous-runs-api.open-meteo.com/v1/forecast"
TIMEOUT = 30
MAX_ATTEMPTS = 4
VARIABLES = [
    "precipitation_previous_day1",
    "precipitation_previous_day2",
    "precipitation_previous_day3",
]


@dataclass(frozen=True)
class Event:
    event_id: str
    start: dt.date
    end: dt.date
    lat: float
    lon: float
    location_key: str


def parse_date(value: str) -> dt.date:
    return dt.date.fromisoformat(value)


def read_csv(name: str) -> list[dict[str, str]]:
    with (ROOT / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def development_events_2024() -> list[Event]:
    registry = {row["event_id"]: row for row in read_csv("model_v4_event_registry.csv")}
    events: list[Event] = []
    for row in read_csv("model_event_time_adjudication_2022_2024.csv"):
        if row["forecast_onset_suitable"].strip().lower() != "true":
            continue
        if not row["onset_lower"].startswith("2024-"):
            continue
        source = registry[row["event_id"]]
        events.append(
            Event(
                event_id=row["event_id"],
                start=parse_date(row["onset_lower"]),
                end=parse_date(row["onset_upper"]),
                lat=float(source["latitude"]),
                lon=float(source["longitude"]),
                location_key=source["location"].strip().lower(),
            )
        )
    return events


def evaluation_events_2025() -> list[Event]:
    candidates = {row["event_id"]: row for row in read_csv("model_v7_event_registry_candidates.csv")}
    anchors = {row["event_id"]: row for row in read_csv("model_v7_event_location_adjudication.csv")}
    events: list[Event] = []
    for event_id, row in candidates.items():
        anchor = anchors.get(event_id)
        if not anchor or anchor["location_forecast_suitable"].strip().lower() != "true":
            continue
        if row["event_date_precision"] != "exact" or not row["event_date"].startswith("2025-"):
            continue
        date = parse_date(row["event_date"])
        lat = float(anchor["latitude"])
        lon = float(anchor["longitude"])
        location_key = f"{anchor['anchor_name'].strip().lower()}@{lat:.4f},{lon:.4f}"
        events.append(Event(event_id, date, date, lat, lon, location_key))
    return events


def quarter_ranges(year: int) -> list[tuple[dt.date, dt.date]]:
    return [
        (dt.date(year, 1, 2), dt.date(year, 3, 31)),
        (dt.date(year, 4, 1), dt.date(year, 6, 30)),
        (dt.date(year, 7, 1), dt.date(year, 9, 30)),
        (dt.date(year, 10, 1), dt.date(year + 1, 1, 3)),
    ]


def fetch_period(lat: float, lon: float, start: dt.date, end: dt.date) -> dict[str, Any]:
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "hourly": VARIABLES,
        "timezone": "Africa/Lagos",
    }
    url = f"{API}?{urllib.parse.urlencode(params, doseq=True)}"
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "NaijaClimaGuard-V7-RainBaseline/1.1"},
    )
    last_error: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if payload.get("error"):
                raise RuntimeError(str(payload))
            return payload
        except urllib.error.HTTPError as exc:
            if 400 <= exc.code < 500 and exc.code != 429:
                body = exc.read().decode("utf-8", errors="replace")[:1000]
                raise RuntimeError(f"archive request rejected with HTTP {exc.code}: {body}") from exc
            last_error = exc
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
        if attempt < MAX_ATTEMPTS:
            time.sleep(attempt * 2)
    raise RuntimeError(
        f"archive request failed after {MAX_ATTEMPTS} attempts for {start}..{end} at {lat},{lon}: {last_error!r}"
    )


def build_issue_rows(lat: float, lon: float, year: int) -> dict[dt.date, dict[str, float]]:
    daily_sum: dict[str, dict[dt.date, float]] = {key: defaultdict(float) for key in VARIABLES}
    daily_max: dict[str, dict[dt.date, float]] = {key: defaultdict(float) for key in VARIABLES}
    daily_count: dict[str, dict[dt.date, int]] = {key: defaultdict(int) for key in VARIABLES}

    for start, end in quarter_ranges(year):
        payload = fetch_period(lat, lon, start, end)
        hourly = payload.get("hourly") or {}
        raw_times = hourly.get("time") or []
        for idx, raw_time in enumerate(raw_times):
            valid_date = dt.datetime.fromisoformat(raw_time).date()
            for key in VARIABLES:
                values = hourly.get(key) or []
                if idx >= len(values):
                    continue
                value = values[idx]
                if value is None:
                    continue
                number = float(value)
                daily_sum[key][valid_date] += number
                daily_max[key][valid_date] = max(daily_max[key][valid_date], number)
                daily_count[key][valid_date] += 1

    rows: dict[dt.date, dict[str, float]] = {}
    issue = dt.date(year, 1, 1)
    last_issue = dt.date(year, 12, 31)
    while issue <= last_issue:
        d1, d2, d3 = issue + dt.timedelta(days=1), issue + dt.timedelta(days=2), issue + dt.timedelta(days=3)
        required = [(VARIABLES[0], d1), (VARIABLES[1], d2), (VARIABLES[2], d3)]
        if all(daily_count[key][day] >= 20 for key, day in required):
            totals = [daily_sum[key][day] for key, day in required]
            peaks = [daily_max[key][day] for key, day in required]
            rows[issue] = {
                "rain_24": totals[0],
                "rain_48": totals[1],
                "rain_72": totals[2],
                "total_72": sum(totals),
                "max_day": max(totals),
                "max_hour": max(peaks),
                "front_loaded": totals[0] + 0.6 * totals[1] + 0.3 * totals[2],
            }
        issue += dt.timedelta(days=1)
    return rows


def event_for_issue(issue: dt.date, events: list[Event], location_key: str) -> Event | None:
    target_start = issue + dt.timedelta(days=1)
    target_end = issue + dt.timedelta(days=3)
    for event in events:
        if event.location_key != location_key:
            continue
        if max(target_start, event.start) <= min(target_end, event.end):
            return event
    return None


def episodes(alert_dates: list[dt.date]) -> list[list[dt.date]]:
    if not alert_dates:
        return []
    dates = sorted(set(alert_dates))
    output: list[list[dt.date]] = [[dates[0]]]
    for value in dates[1:]:
        if (value - output[-1][-1]).days <= 1:
            output[-1].append(value)
        else:
            output.append([value])
    return output


def evaluate(
    score_name: str,
    threshold: float,
    rows_by_location: dict[str, dict[dt.date, dict[str, float]]],
    events: list[Event],
) -> dict[str, Any]:
    detected: set[str] = set()
    leads: list[int] = []
    true_episodes = 0
    false_episodes = 0
    alerts_total = 0

    for location_key, rows in rows_by_location.items():
        alert_dates = [date for date, features in rows.items() if features[score_name] >= threshold]
        alerts_total += len(alert_dates)
        for episode in episodes(alert_dates):
            matched: dict[str, Event] = {}
            for issue in episode:
                event = event_for_issue(issue, events, location_key)
                if event:
                    matched[event.event_id] = event
            if matched:
                true_episodes += 1
                for event_id, event in matched.items():
                    if event_id not in detected:
                        qualifying_issues = [
                            issue for issue in episode if issue < event.start and 1 <= (event.start - issue).days <= 3
                        ]
                        if qualifying_issues:
                            first = min(qualifying_issues)
                            detected.add(event_id)
                            leads.append((event.start - first).days * 24)
            else:
                false_episodes += 1

    total_events = len(events)
    total_episodes = true_episodes + false_episodes
    location_years = max(1, len(rows_by_location))
    return {
        "score": score_name,
        "threshold": threshold,
        "events": total_events,
        "detected_events": len(detected),
        "event_detection_rate": (len(detected) / total_events) if total_events else 0.0,
        "alert_episodes": total_episodes,
        "true_alert_episodes": true_episodes,
        "false_alert_episodes": false_episodes,
        "alert_episode_precision": (true_episodes / total_episodes) if total_episodes else 0.0,
        "false_alert_episodes_per_location_year": false_episodes / location_years,
        "median_lead_hours": sorted(leads)[len(leads) // 2] if leads else None,
        "lead_hours": leads,
        "alert_issue_rows": alerts_total,
        "detected_event_ids": sorted(detected),
    }


def selection_key(result: dict[str, Any]) -> tuple[float, float, float, float]:
    return (
        result["event_detection_rate"],
        -result["false_alert_episodes_per_location_year"],
        result["alert_episode_precision"],
        result["threshold"],
    )


def main() -> None:
    dev_events = development_events_2024()
    test_events = evaluation_events_2025()
    if not dev_events:
        raise RuntimeError("no 2024 development events")
    if not test_events:
        raise RuntimeError("no 2025 evaluation events")

    dev_coords = {event.location_key: (event.lat, event.lon) for event in dev_events}
    test_coords = {event.location_key: (event.lat, event.lon) for event in test_events}

    dev_rows = {key: build_issue_rows(lat, lon, 2024) for key, (lat, lon) in dev_coords.items()}
    test_rows = {key: build_issue_rows(lat, lon, 2025) for key, (lat, lon) in test_coords.items()}

    score_names = ["total_72", "max_day", "max_hour", "front_loaded"]
    thresholds = [float(value) for value in range(1, 201)]
    candidates = [
        evaluate(score_name, threshold, dev_rows, dev_events)
        for score_name in score_names
        for threshold in thresholds
    ]

    winner = max(candidates, key=selection_key)
    test = evaluate(winner["score"], winner["threshold"], test_rows, test_events)

    report = {
        "status": "diagnostic_baseline_complete",
        "claim_boundary": "rainfall-only development baseline; not Model V7 and not a competition result",
        "source": API,
        "threshold_selection_used_2025": False,
        "archive_fetch": {"chunking": "quarterly", "max_attempts": MAX_ATTEMPTS, "timeout_seconds": TIMEOUT},
        "development": {
            "year": 2024,
            "eligible_event_count": len(dev_events),
            "event_ids": [event.event_id for event in dev_events],
            "location_count": len(dev_rows),
            "selected_rule": winner,
        },
        "evaluation": {
            "year": 2025,
            "eligible_candidate_event_count": len(test_events),
            "event_ids": [event.event_id for event in test_events],
            "location_anchor_count": len(test_rows),
            "result": test,
        },
        "v7_must_beat": {
            "event_detection_rate": test["event_detection_rate"],
            "alert_episode_precision": test["alert_episode_precision"],
            "false_alert_episodes_per_location_year": test["false_alert_episodes_per_location_year"],
            "median_lead_hours": test["median_lead_hours"],
        },
        "limitations": [
            "2024 onset-suitable development events are few, so this is an intentionally weak/simple baseline rather than a stable national estimate.",
            "2025 event locations include town/metropolitan anchors for multi-community floods; location precision is explicitly recorded in the adjudication file.",
            "The unresolved Gurara Tofa/Lolitapi event is excluded until its spatial anchor is defensibly resolved.",
        ],
    }
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
