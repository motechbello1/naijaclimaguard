#!/usr/bin/env python3
"""Model V7 no-approval source smoke test.

This test proves that the replacement competition pipeline can read:
1) historical forecast data,
2) a preserved individual ECMWF-era model run,
3) fixed-lead previous-run fields,
without a GloFAS credential or approval dependency.

It does not train or score a model.
"""

from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from typing import Any

TIMEOUT = 30


def fetch(base: str, params: dict[str, Any]) -> dict[str, Any]:
    query = urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(
        f"{base}?{query}",
        headers={"Accept": "application/json", "User-Agent": "NaijaClimaGuard-ModelV7-SourceSmoke/1.0"},
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError("unexpected non-object API response")
    if payload.get("error"):
        raise RuntimeError(str(payload))
    return payload


def require_hourly(payload: dict[str, Any], keys: list[str], name: str) -> None:
    hourly = payload.get("hourly")
    if not isinstance(hourly, dict):
        raise RuntimeError(f"{name}: missing hourly object")
    times = hourly.get("time") or []
    if not times:
        raise RuntimeError(f"{name}: empty time axis")
    for key in keys:
        values = hourly.get(key)
        if not isinstance(values, list) or not values:
            raise RuntimeError(f"{name}: missing/empty {key}")


def main() -> int:
    lat, lon = 7.8023, 6.7333  # Lokoja source-contract smoke coordinate only.
    results: dict[str, Any] = {}

    historical = fetch(
        "https://historical-forecast-api.open-meteo.com/v1/forecast",
        {
            "latitude": lat,
            "longitude": lon,
            "start_date": "2024-08-01",
            "end_date": "2024-08-03",
            "hourly": ["precipitation", "wind_gusts_10m"],
            "timezone": "Africa/Lagos",
        },
    )
    require_hourly(historical, ["precipitation", "wind_gusts_10m"], "historical_forecast")
    results["historical_forecast"] = {
        "ok": True,
        "rows": len(historical["hourly"]["time"]),
        "first": historical["hourly"]["time"][0],
        "last": historical["hourly"]["time"][-1],
    }

    single_run = fetch(
        "https://single-runs-api.open-meteo.com/v1/forecast",
        {
            "latitude": lat,
            "longitude": lon,
            "run": "2024-08-01T00:00",
            "forecast_hours": 72,
            "hourly": ["precipitation", "wind_gusts_10m"],
            "timezone": "Africa/Lagos",
        },
    )
    require_hourly(single_run, ["precipitation", "wind_gusts_10m"], "single_run")
    results["single_run"] = {
        "ok": True,
        "rows": len(single_run["hourly"]["time"]),
        "first": single_run["hourly"]["time"][0],
        "last": single_run["hourly"]["time"][-1],
    }

    previous = fetch(
        "https://previous-runs-api.open-meteo.com/v1/forecast",
        {
            "latitude": lat,
            "longitude": lon,
            "past_days": 2,
            "forecast_days": 1,
            "hourly": [
                "precipitation",
                "precipitation_previous_day1",
                "precipitation_previous_day2",
                "precipitation_previous_day3",
            ],
            "timezone": "Africa/Lagos",
        },
    )
    require_hourly(
        previous,
        [
            "precipitation",
            "precipitation_previous_day1",
            "precipitation_previous_day2",
            "precipitation_previous_day3",
        ],
        "previous_runs",
    )
    results["previous_runs"] = {
        "ok": True,
        "rows": len(previous["hourly"]["time"]),
        "fixed_leads_hours": [24, 48, 72],
    }

    output = {
        "status": "PASS",
        "approval_or_api_key_required": False,
        "glofas_required": False,
        "checks": results,
    }
    print(json.dumps(output, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"status": "FAIL", "error": str(exc)}, indent=2), file=sys.stderr)
        raise
