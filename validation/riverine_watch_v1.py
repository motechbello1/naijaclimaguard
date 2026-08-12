#!/usr/bin/env python3
"""Lightweight inference for Riverine Watch v1.

Supported scope: Makurdi and Lokoja.
Output is a 14-day WATCH probability, not an evacuation order.
The model is a frozen logistic-regression export and requires no sklearn at inference.
"""
from __future__ import annotations
import argparse
import json
import math
from datetime import date, datetime
from pathlib import Path

DEFAULT_MODEL = Path(__file__).with_name("riverine_watch_v1_model.json")

def load_model(path: str | Path = DEFAULT_MODEL) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))

def _finite_or_median(value, median: float) -> float:
    try:
        x = float(value)
        return x if math.isfinite(x) else median
    except (TypeError, ValueError):
        return median

def predict_probability(row: dict, model: dict) -> float:
    location = str(row.get("location", "")).strip()
    if location not in model["supported_locations"]:
        raise ValueError(
            f"Unsupported location {location!r}. "
            f"Riverine Watch v1 supports only {model['supported_locations']}."
        )
    values = []
    for feature in model["features"]:
        median = float(model["numeric_imputer_medians"][feature])
        mean = float(model["numeric_scaler_mean"][feature])
        scale = float(model["numeric_scaler_scale"][feature])
        x = _finite_or_median(row.get(feature), median)
        values.append((x - mean) / scale)
    for category in model["location_categories"]:
        values.append(1.0 if location == category else 0.0)
    z = float(model["intercept"]) + sum(
        float(c) * float(v) for c, v in zip(model["coefficients"], values)
    )
    if z >= 0:
        ez = math.exp(-z)
        return 1.0 / (1.0 + ez)
    ez = math.exp(z)
    return ez / (1.0 + ez)

def classify(probability: float, model: dict) -> str:
    threshold = float(model["watch_threshold"])
    if probability >= threshold:
        return "WATCH"
    if probability >= threshold * 0.6:
        return "MONITOR"
    return "NORMAL"

def score(row: dict, model: dict) -> dict:
    p = predict_probability(row, model)
    return {
        "model_id": model["model_id"],
        "location": row["location"],
        "forecast_horizon_days": model["forecast_horizon_days"],
        "probability": p,
        "state": classify(p, model),
        "watch_threshold": model["watch_threshold"],
        "scope_notice": (
            "Shadow/pilot riverine watch. Human review is required before public action."
        ),
    }

def should_emit_watch(
    state: str,
    issue_date: str | date | datetime,
    last_watch_date: str | date | datetime | None,
    cooldown_days: int = 7,
) -> bool:
    if state != "WATCH":
        return False
    def to_date(v):
        if isinstance(v, datetime):
            return v.date()
        if isinstance(v, date):
            return v
        return date.fromisoformat(str(v)[:10])
    current = to_date(issue_date)
    if last_watch_date is None:
        return True
    return (current - to_date(last_watch_date)).days > cooldown_days

def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True, help="JSON file containing one feature row")
    p.add_argument("--model", default=str(DEFAULT_MODEL))
    args = p.parse_args()
    model = load_model(args.model)
    row = json.loads(Path(args.input).read_text(encoding="utf-8"))
    print(json.dumps(score(row, model), indent=2))

if __name__ == "__main__":
    main()
