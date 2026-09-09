#!/usr/bin/env python3
"""First real Model V7 development candidate.

Scientific boundary
-------------------
- Uses 2024 only for leave-location-out model/threshold selection.
- Applies the selected family and threshold unchanged to 2025.
- Hard-refuses to query 2026 or later. The frozen 2026 holdout remains untouched.
- Trains separate 24h, 48h and 72h classifiers, then uses the maximum horizon
  probability as the alert score.
- This is DEVELOPMENT evidence, not the final competition score.
"""

from __future__ import annotations

import csv
import datetime as dt
import json
import math
import pathlib
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

ROOT = pathlib.Path(__file__).resolve().parent
PREVIOUS_API = "https://previous-runs-api.open-meteo.com/v1/forecast"
HISTORICAL_API = "https://historical-forecast-api.open-meteo.com/v1/forecast"
TIMEOUT = 40
MAX_ATTEMPTS = 4
MAX_BATCH = 5

FORECAST_VARS = [
    "precipitation_previous_day1",
    "precipitation_previous_day2",
    "precipitation_previous_day3",
    "temperature_2m_previous_day1",
    "relative_humidity_2m_previous_day1",
    "wind_gusts_10m_previous_day1",
    "surface_pressure_previous_day1",
]

HISTORY_VARS = [
    "precipitation",
    "relative_humidity_2m",
    "wind_gusts_10m",
    "surface_pressure",
    "soil_moisture_0_to_1cm",
    "soil_moisture_1_to_3cm",
    "soil_moisture_3_to_9cm",
    "cape",
    "et0_fao_evapotranspiration",
]

FEATURES = [
    "rain24",
    "rain48",
    "rain72",
    "rain_total72",
    "rain_max_day",
    "rain_front_loaded",
    "forecast_peak_hour24",
    "forecast_humidity24_mean",
    "forecast_gust24_max",
    "forecast_temp24_max",
    "forecast_pressure24_min",
    "ante_rain1",
    "ante_rain3",
    "ante_rain7",
    "ante_soil_surface1",
    "ante_soil_surface3",
    "ante_soil_root3",
    "ante_soil_root7",
    "ante_cape1_max",
    "ante_et0_3",
    "ante_humidity1_mean",
    "ante_gust1_max",
    "rain_to_soil",
    "wet_compound",
    "latitude",
    "longitude",
    "elevation",
    "month_sin",
    "month_cos",
]


@dataclass(frozen=True)
class Event:
    event_id: str
    start: dt.date
    end: dt.date
    lat: float
    lon: float
    location_key: str


@dataclass
class Row:
    date: dt.date
    location_key: str
    features: dict[str, float]
    y24: int
    y48: int
    y72: int

    @property
    def y_any(self) -> int:
        return max(self.y24, self.y48, self.y72)


def read_csv(name: str) -> list[dict[str, str]]:
    with (ROOT / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def parse_date(value: str) -> dt.date:
    return dt.date.fromisoformat(value)


def candidate_events(year: int) -> list[Event]:
    if year > 2025:
        raise RuntimeError("HOLDOUT GUARD: development code may not read events after 2025")
    rows = {row["event_id"]: row for row in read_csv("model_v7_event_registry_candidates.csv")}
    anchors = {row["event_id"]: row for row in read_csv("model_v7_event_location_adjudication.csv")}
    output: list[Event] = []
    for event_id, row in rows.items():
        if not row.get("onset_lower", "").startswith(f"{year}-"):
            continue
        anchor = anchors.get(event_id)
        if not anchor or anchor["location_forecast_suitable"].strip().lower() != "true":
            continue
        lat = float(anchor["latitude"])
        lon = float(anchor["longitude"])
        output.append(
            Event(
                event_id=event_id,
                start=parse_date(row["onset_lower"]),
                end=parse_date(row["onset_upper"]),
                lat=lat,
                lon=lon,
                location_key=f"{anchor['anchor_name'].strip().lower()}@{lat:.5f},{lon:.5f}",
            )
        )
    return output


def development_events_2024() -> list[Event]:
    registry = {row["event_id"]: row for row in read_csv("model_v4_event_registry.csv")}
    output: list[Event] = []
    seen: set[str] = set()
    for row in read_csv("model_event_time_adjudication_2022_2024.csv"):
        if row["forecast_onset_suitable"].strip().lower() != "true" or not row["onset_lower"].startswith("2024-"):
            continue
        source = registry[row["event_id"]]
        event = Event(
            event_id=row["event_id"],
            start=parse_date(row["onset_lower"]),
            end=parse_date(row["onset_upper"]),
            lat=float(source["latitude"]),
            lon=float(source["longitude"]),
            location_key=source["location"].strip().lower(),
        )
        output.append(event)
        seen.add(event.event_id)
    for event in candidate_events(2024):
        if event.event_id not in seen:
            output.append(event)
    return sorted(output, key=lambda event: (event.start, event.event_id))


def evaluation_events_2025() -> list[Event]:
    return sorted(candidate_events(2025), key=lambda event: (event.start, event.event_id))


def quarter_ranges(year: int) -> list[tuple[dt.date, dt.date]]:
    if year > 2025:
        raise RuntimeError("HOLDOUT GUARD: no forecast request after 2025")
    return [
        (dt.date(year, 1, 1), dt.date(year, 3, 31)),
        (dt.date(year, 4, 1), dt.date(year, 6, 30)),
        (dt.date(year, 7, 1), dt.date(year, 9, 30)),
        (dt.date(year, 10, 1), dt.date(year, 12, 31)),
    ]


def chunks(values: list[Any], size: int) -> list[list[Any]]:
    return [values[index:index + size] for index in range(0, len(values), size)]


def fetch_batch(base: str, locations: list[tuple[str, float, float]], start: dt.date, end: dt.date, variables: list[str]) -> list[dict[str, Any]]:
    if start.year > 2025 or end.year > 2025:
        raise RuntimeError("HOLDOUT GUARD: attempted query after 2025")
    params = {
        "latitude": ",".join(str(lat) for _, lat, _ in locations),
        "longitude": ",".join(str(lon) for _, _, lon in locations),
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "hourly": ",".join(variables),
        "timezone": "Africa/Lagos",
    }
    url = f"{base}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "NaijaClimaGuard-V7-Development/1.0"})
    last_error: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
                payload = json.loads(response.read().decode("utf-8"))
            payloads = payload if isinstance(payload, list) else [payload]
            if len(payloads) != len(locations):
                raise RuntimeError(f"batch response mismatch: {len(payloads)} != {len(locations)}")
            for item in payloads:
                if not isinstance(item, dict) or item.get("error"):
                    raise RuntimeError(str(item))
            return payloads
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:1200]
            if 400 <= exc.code < 500 and exc.code != 429:
                raise RuntimeError(f"HTTP {exc.code}: {body}") from exc
            last_error = exc
        except (urllib.error.URLError, TimeoutError, RuntimeError) as exc:
            last_error = exc
        if attempt < MAX_ATTEMPTS:
            time.sleep(attempt * 2)
    raise RuntimeError(f"source failed after {MAX_ATTEMPTS} attempts: {last_error!r}")


def aggregate_hourly(payload: dict[str, Any], variables: list[str]) -> tuple[dict[str, dict[dt.date, list[float]]], float]:
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    store: dict[str, dict[dt.date, list[float]]] = {key: defaultdict(list) for key in variables}
    for index, raw_time in enumerate(times):
        day = dt.datetime.fromisoformat(raw_time).date()
        for key in variables:
            values = hourly.get(key) or []
            if index < len(values) and values[index] is not None:
                store[key][day].append(float(values[index]))
    return store, float(payload.get("elevation") or 0.0)


def merge_daily(target: dict[str, dict[dt.date, list[float]]], source: dict[str, dict[dt.date, list[float]]]) -> None:
    for variable, days in source.items():
        for day, values in days.items():
            target[variable][day].extend(values)


def load_year(coords: dict[str, tuple[float, float]], year: int) -> dict[str, dict[str, Any]]:
    if year > 2025:
        raise RuntimeError("HOLDOUT GUARD: development dataset may not include 2026")
    ordered = [(key, lat, lon) for key, (lat, lon) in sorted(coords.items())]
    result: dict[str, dict[str, Any]] = {
        key: {
            "forecast": {var: defaultdict(list) for var in FORECAST_VARS},
            "history": {var: defaultdict(list) for var in HISTORY_VARS},
            "elevation": 0.0,
        }
        for key in coords
    }
    for start, end in quarter_ranges(year):
        for batch in chunks(ordered, MAX_BATCH):
            forecast_payloads = fetch_batch(PREVIOUS_API, batch, start, end, FORECAST_VARS)
            history_payloads = fetch_batch(HISTORICAL_API, batch, start, end, HISTORY_VARS)
            for (key, _, _), fp, hp in zip(batch, forecast_payloads, history_payloads):
                f_daily, _ = aggregate_hourly(fp, FORECAST_VARS)
                h_daily, elevation = aggregate_hourly(hp, HISTORY_VARS)
                merge_daily(result[key]["forecast"], f_daily)
                merge_daily(result[key]["history"], h_daily)
                result[key]["elevation"] = elevation
    return result


def values(source: dict[str, dict[dt.date, list[float]]], key: str, day: dt.date) -> list[float]:
    return source.get(key, {}).get(day, [])


def s(values_: list[float]) -> float:
    return float(sum(values_)) if values_ else 0.0


def mean(values_: list[float]) -> float:
    return float(sum(values_) / len(values_)) if values_ else 0.0


def mx(values_: list[float]) -> float:
    return float(max(values_)) if values_ else 0.0


def mn(values_: list[float]) -> float:
    return float(min(values_)) if values_ else 0.0


def days_back(day: dt.date, count: int) -> list[dt.date]:
    return [day - dt.timedelta(days=offset) for offset in range(count)]


def event_hits(events: list[Event], location_key: str, target: dt.date) -> int:
    return int(any(event.location_key == location_key and event.start <= target <= event.end for event in events))


def build_rows(coords: dict[str, tuple[float, float]], year: int, events: list[Event]) -> list[Row]:
    raw = load_year(coords, year)
    rows: list[Row] = []
    for location_key, (lat, lon) in coords.items():
        forecast = raw[location_key]["forecast"]
        history = raw[location_key]["history"]
        issue = dt.date(year, 1, 8)
        last = dt.date(year, 12, 28)
        while issue <= last:
            d1, d2, d3 = issue + dt.timedelta(days=1), issue + dt.timedelta(days=2), issue + dt.timedelta(days=3)
            p24_values = values(forecast, "precipitation_previous_day1", d1)
            p48_values = values(forecast, "precipitation_previous_day2", d2)
            p72_values = values(forecast, "precipitation_previous_day3", d3)
            if min(len(p24_values), len(p48_values), len(p72_values)) < 20:
                issue += dt.timedelta(days=1)
                continue

            rain24, rain48, rain72 = s(p24_values), s(p48_values), s(p72_values)
            ant1 = days_back(issue, 1)
            ant3 = days_back(issue, 3)
            ant7 = days_back(issue, 7)
            hist_rain1 = s([v for day in ant1 for v in values(history, "precipitation", day)])
            hist_rain3 = s([v for day in ant3 for v in values(history, "precipitation", day)])
            hist_rain7 = s([v for day in ant7 for v in values(history, "precipitation", day)])
            soil_surface1 = mean([v for day in ant1 for v in values(history, "soil_moisture_0_to_1cm", day)])
            soil_surface3 = mean([v for day in ant3 for v in values(history, "soil_moisture_0_to_1cm", day)])
            soil_root3 = mean([v for day in ant3 for v in values(history, "soil_moisture_3_to_9cm", day)])
            soil_root7 = mean([v for day in ant7 for v in values(history, "soil_moisture_3_to_9cm", day)])
            cape1 = mx([v for day in ant1 for v in values(history, "cape", day)])
            et03 = s([v for day in ant3 for v in values(history, "et0_fao_evapotranspiration", day)])
            hist_humidity1 = mean([v for day in ant1 for v in values(history, "relative_humidity_2m", day)])
            hist_gust1 = mx([v for day in ant1 for v in values(history, "wind_gusts_10m", day)])

            humidity24 = mean(values(forecast, "relative_humidity_2m_previous_day1", d1))
            gust24 = mx(values(forecast, "wind_gusts_10m_previous_day1", d1))
            temp24 = mx(values(forecast, "temperature_2m_previous_day1", d1))
            pressure24 = mn(values(forecast, "surface_pressure_previous_day1", d1))
            peak_hour24 = mx(p24_values)
            month_angle = 2 * math.pi * issue.month / 12.0
            rain_total = rain24 + rain48 + rain72
            wet_compound = rain_total * max(0.0, soil_root3)

            feats = {
                "rain24": rain24,
                "rain48": rain48,
                "rain72": rain72,
                "rain_total72": rain_total,
                "rain_max_day": max(rain24, rain48, rain72),
                "rain_front_loaded": rain24 + 0.6 * rain48 + 0.3 * rain72,
                "forecast_peak_hour24": peak_hour24,
                "forecast_humidity24_mean": humidity24,
                "forecast_gust24_max": gust24,
                "forecast_temp24_max": temp24,
                "forecast_pressure24_min": pressure24,
                "ante_rain1": hist_rain1,
                "ante_rain3": hist_rain3,
                "ante_rain7": hist_rain7,
                "ante_soil_surface1": soil_surface1,
                "ante_soil_surface3": soil_surface3,
                "ante_soil_root3": soil_root3,
                "ante_soil_root7": soil_root7,
                "ante_cape1_max": cape1,
                "ante_et0_3": et03,
                "ante_humidity1_mean": hist_humidity1,
                "ante_gust1_max": hist_gust1,
                "rain_to_soil": rain_total * max(0.0, soil_surface1),
                "wet_compound": wet_compound,
                "latitude": lat,
                "longitude": lon,
                "elevation": float(raw[location_key]["elevation"]),
                "month_sin": math.sin(month_angle),
                "month_cos": math.cos(month_angle),
            }
            rows.append(
                Row(
                    date=issue,
                    location_key=location_key,
                    features=feats,
                    y24=event_hits(events, location_key, d1),
                    y48=event_hits(events, location_key, d2),
                    y72=event_hits(events, location_key, d3),
                )
            )
            issue += dt.timedelta(days=1)
    return rows


def matrix(rows: list[Row]) -> np.ndarray:
    return np.asarray([[row.features[name] for name in FEATURES] for row in rows], dtype=float)


def labels(rows: list[Row], horizon: int) -> np.ndarray:
    if horizon == 24:
        return np.asarray([row.y24 for row in rows], dtype=int)
    if horizon == 48:
        return np.asarray([row.y48 for row in rows], dtype=int)
    return np.asarray([row.y72 for row in rows], dtype=int)


def make_model(family: str, positive_count: int, negative_count: int):
    if family == "logistic":
        return Pipeline([
            ("scale", StandardScaler()),
            ("model", LogisticRegression(C=0.5, class_weight="balanced", max_iter=2000, solver="liblinear", random_state=42)),
        ])
    ratio = max(1.0, negative_count / max(1, positive_count))
    return XGBClassifier(
        n_estimators=240,
        max_depth=2,
        learning_rate=0.03,
        min_child_weight=4,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_lambda=10.0,
        reg_alpha=0.5,
        objective="binary:logistic",
        eval_metric="logloss",
        tree_method="hist",
        scale_pos_weight=ratio,
        random_state=42,
        n_jobs=2,
    )


def fit_predict(train_rows: list[Row], predict_rows: list[Row], family: str, horizon: int) -> np.ndarray:
    y = labels(train_rows, horizon)
    if len(np.unique(y)) < 2:
        return np.full(len(predict_rows), float(y[0]) if len(y) else 0.0)
    model = make_model(family, int(y.sum()), int(len(y) - y.sum()))
    model.fit(matrix(train_rows), y)
    return model.predict_proba(matrix(predict_rows))[:, 1]


def episodes(indices: list[int], rows: list[Row]) -> list[list[int]]:
    if not indices:
        return []
    ordered = sorted(indices, key=lambda i: (rows[i].location_key, rows[i].date))
    output: list[list[int]] = []
    for index in ordered:
        if not output:
            output.append([index])
            continue
        prev = output[-1][-1]
        if rows[prev].location_key == rows[index].location_key and (rows[index].date - rows[prev].date).days <= 1:
            output[-1].append(index)
        else:
            output.append([index])
    return output


def event_match(issue: dt.date, event: Event) -> bool:
    return max(issue + dt.timedelta(days=1), event.start) <= min(issue + dt.timedelta(days=3), event.end)


def operational_metrics(rows: list[Row], scores: np.ndarray, events: list[Event], threshold: float) -> dict[str, Any]:
    alert_indices = [i for i, score in enumerate(scores) if score >= threshold]
    alert_episodes = episodes(alert_indices, rows)
    detected: set[str] = set()
    leads: list[int] = []
    true_eps = 0
    false_eps = 0
    for episode in alert_episodes:
        matched: dict[str, Event] = {}
        for index in episode:
            row = rows[index]
            for event in events:
                if event.location_key == row.location_key and event_match(row.date, event):
                    matched[event.event_id] = event
        if matched:
            true_eps += 1
            for event_id, event in matched.items():
                if event_id in detected:
                    continue
                candidates = [rows[index].date for index in episode if rows[index].location_key == event.location_key and event_match(rows[index].date, event)]
                if candidates:
                    first = min(candidates)
                    detected.add(event_id)
                    leads.append((event.start - first).days * 24)
        else:
            false_eps += 1
    location_years = max(1, len(set(row.location_key for row in rows)))
    total_eps = true_eps + false_eps
    return {
        "threshold": threshold,
        "event_detection_rate": len(detected) / len(events) if events else 0.0,
        "detected_events": len(detected),
        "event_count": len(events),
        "detected_event_ids": sorted(detected),
        "alert_episode_precision": true_eps / total_eps if total_eps else 0.0,
        "true_alert_episodes": true_eps,
        "false_alert_episodes": false_eps,
        "false_alert_episodes_per_location_year": false_eps / location_years,
        "median_lead_hours": statistics.median(leads) if leads else None,
        "lead_hours": leads,
        "alert_episode_count": total_eps,
    }


def discrimination(rows: list[Row], scores: np.ndarray) -> dict[str, Any]:
    y = np.asarray([row.y_any for row in rows], dtype=int)
    prevalence = float(y.mean()) if len(y) else 0.0
    result: dict[str, Any] = {"rows": len(rows), "positive_rows": int(y.sum()), "prevalence": prevalence}
    if len(np.unique(y)) >= 2:
        result.update({
            "roc_auc": float(roc_auc_score(y, scores)),
            "pr_auc": float(average_precision_score(y, scores)),
            "pr_lift_vs_prevalence": float(average_precision_score(y, scores) / prevalence) if prevalence else None,
            "brier": float(brier_score_loss(y, scores)),
        })
    return result


def choose_threshold(rows: list[Row], scores: np.ndarray, events: list[Event]) -> dict[str, Any]:
    candidates = [operational_metrics(rows, scores, events, t / 100.0) for t in range(1, 100)]
    eligible = [item for item in candidates if item["event_detection_rate"] >= 0.80]
    pool = eligible if eligible else candidates
    winner = min(
        pool,
        key=lambda item: (
            item["false_alert_episodes_per_location_year"],
            -item["alert_episode_precision"],
            -(item["median_lead_hours"] or 0),
            -item["event_detection_rate"],
            -item["threshold"],
        ),
    )
    winner["met_80pct_detection_constraint"] = bool(eligible)
    return winner


def oof_scores(rows: list[Row], family: str) -> np.ndarray:
    groups = sorted(set(row.location_key for row in rows))
    horizon_scores = {24: np.zeros(len(rows)), 48: np.zeros(len(rows)), 72: np.zeros(len(rows))}
    for group in groups:
        train_idx = [i for i, row in enumerate(rows) if row.location_key != group]
        val_idx = [i for i, row in enumerate(rows) if row.location_key == group]
        train = [rows[i] for i in train_idx]
        val = [rows[i] for i in val_idx]
        for horizon in (24, 48, 72):
            pred = fit_predict(train, val, family, horizon)
            for local, global_index in enumerate(val_idx):
                horizon_scores[horizon][global_index] = pred[local]
    return np.maximum.reduce([horizon_scores[24], horizon_scores[48], horizon_scores[72]])


def final_test_scores(train_rows: list[Row], test_rows: list[Row], family: str) -> np.ndarray:
    predictions = []
    for horizon in (24, 48, 72):
        predictions.append(fit_predict(train_rows, test_rows, family, horizon))
    return np.maximum.reduce(predictions)


def main() -> None:
    dev_events = development_events_2024()
    test_events = evaluation_events_2025()
    if len(dev_events) != 9 or len(test_events) != 8:
        raise RuntimeError(f"frozen event membership mismatch: dev={len(dev_events)} test={len(test_events)}")

    dev_coords = {event.location_key: (event.lat, event.lon) for event in dev_events}
    test_coords = {event.location_key: (event.lat, event.lon) for event in test_events}
    dev_rows = build_rows(dev_coords, 2024, dev_events)
    test_rows = build_rows(test_coords, 2025, test_events)

    family_reports: dict[str, Any] = {}
    selected_family: str | None = None
    selected_threshold: dict[str, Any] | None = None
    selected_key: tuple[float, float, float, float] | None = None

    for family in ("logistic", "xgboost"):
        scores = oof_scores(dev_rows, family)
        threshold = choose_threshold(dev_rows, scores, dev_events)
        report = {
            "oof_discrimination": discrimination(dev_rows, scores),
            "selected_threshold": threshold,
        }
        family_reports[family] = report
        key = (
            threshold["event_detection_rate"],
            -threshold["false_alert_episodes_per_location_year"],
            threshold["alert_episode_precision"],
            threshold["median_lead_hours"] or 0,
        )
        if selected_key is None or key > selected_key:
            selected_key = key
            selected_family = family
            selected_threshold = threshold

    assert selected_family is not None and selected_threshold is not None
    test_scores = final_test_scores(dev_rows, test_rows, selected_family)
    test_operational = operational_metrics(test_rows, test_scores, test_events, float(selected_threshold["threshold"]))
    test_disc = discrimination(test_rows, test_scores)

    baseline = json.loads((ROOT / "model_v7_rainfall_baseline_result.json").read_text(encoding="utf-8"))
    baseline_eval = baseline["evaluation"]["result"]

    report = {
        "status": "development_candidate_complete",
        "claim_boundary": "2024 leave-location-out development selection plus untouched 2025 development test; NOT final 2026 competition holdout",
        "holdout_2026_queried": False,
        "feature_count": len(FEATURES),
        "features": FEATURES,
        "development": {
            "year": 2024,
            "event_count": len(dev_events),
            "row_count": len(dev_rows),
            "location_count": len(dev_coords),
            "families": family_reports,
            "selected_family": selected_family,
            "selected_threshold": selected_threshold,
        },
        "evaluation": {
            "year": 2025,
            "event_count": len(test_events),
            "row_count": len(test_rows),
            "location_count": len(test_coords),
            "discrimination": test_disc,
            "operational": test_operational,
        },
        "comparison_to_rainfall_only_2025": {
            "rainfall_event_detection": baseline_eval["event_detection_rate"],
            "v7_event_detection": test_operational["event_detection_rate"],
            "rainfall_precision": baseline_eval["alert_episode_precision"],
            "v7_precision": test_operational["alert_episode_precision"],
            "rainfall_false_alerts_per_location_year": baseline_eval["false_alert_episodes_per_location_year"],
            "v7_false_alerts_per_location_year": test_operational["false_alert_episodes_per_location_year"],
            "rainfall_median_lead_hours": baseline_eval["median_lead_hours"],
            "v7_median_lead_hours": test_operational["median_lead_hours"],
        },
        "competition_gates_not_final": {
            "event_detection_ge_80": test_operational["event_detection_rate"] >= 0.80,
            "precision_ge_30": test_operational["alert_episode_precision"] >= 0.30,
            "false_alerts_le_2_per_location_year": test_operational["false_alert_episodes_per_location_year"] <= 2.0,
            "median_lead_ge_48h": (test_operational["median_lead_hours"] or 0) >= 48,
            "pr_lift_ge_3x": (test_disc.get("pr_lift_vs_prevalence") or 0) >= 3.0,
        },
        "guardrails": {
            "max_query_year": 2025,
            "2026_holdout_file_exists_but_not_read_for_features": True,
            "threshold_selected_on_2024_only": True,
            "2025_used_for_model_or_threshold_selection": False,
        },
    }
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
