#!/usr/bin/env python3
"""Probe richer Model V7 inputs using DEVELOPMENT-ERA data only.

This script MUST NOT query any 2026 final-holdout event date or coordinate.
It checks which no-approval variables are actually available before the V7
feature set is frozen. It does not train or score a model.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

TIMEOUT = 30
MAX_ATTEMPTS = 4

# Mainok is a 2024 development event, not part of the 2026 final holdout.
LAT = 11.83064
LON = 12.63447


def fetch(base: str, params: dict[str, Any]) -> tuple[bool, dict[str, Any] | str]:
    url = f"{base}?{urllib.parse.urlencode(params, doseq=True)}"
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "NaijaClimaGuard-V7-FeatureProbe/1.0"},
    )
    last_error = "unknown"
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if isinstance(payload, dict) and not payload.get("error"):
                return True, payload
            return False, payload if isinstance(payload, dict) else str(payload)
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:1500]
            if 400 <= exc.code < 500 and exc.code != 429:
                return False, f"HTTP {exc.code}: {body}"
            last_error = f"HTTP {exc.code}: {body}"
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = repr(exc)
        if attempt < MAX_ATTEMPTS:
            time.sleep(attempt * 2)
    return False, f"transient failure after {MAX_ATTEMPTS} attempts: {last_error}"


def hourly_counts(payload: dict[str, Any]) -> dict[str, int]:
    hourly = payload.get("hourly") or {}
    return {
        key: sum(value is not None for value in values)
        for key, values in hourly.items()
        if key != "time" and isinstance(values, list)
    }


def run_previous_runs_probe() -> dict[str, Any]:
    base = "https://previous-runs-api.open-meteo.com/v1/forecast"
    families = {
        "fixed_lead_precipitation": [
            "precipitation_previous_day1",
            "precipitation_previous_day2",
            "precipitation_previous_day3",
        ],
        "fixed_lead_atmosphere": [
            "temperature_2m_previous_day1",
            "relative_humidity_2m_previous_day1",
            "wind_gusts_10m_previous_day1",
            "surface_pressure_previous_day1",
        ],
    }
    report: dict[str, Any] = {}
    for name, variables in families.items():
        ok, payload = fetch(
            base,
            {
                "latitude": LAT,
                "longitude": LON,
                "start_date": "2024-07-12",
                "end_date": "2024-07-18",
                "hourly": variables,
                "timezone": "Africa/Lagos",
            },
        )
        report[name] = {
            "request_ok": ok,
            "variables": variables,
            "non_null_counts": hourly_counts(payload) if ok and isinstance(payload, dict) else {},
            "detail": None if ok else payload,
        }
    return report


def run_historical_forecast_probe() -> dict[str, Any]:
    base = "https://historical-forecast-api.open-meteo.com/v1/forecast"
    variables = [
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
    ok, payload = fetch(
        base,
        {
            "latitude": LAT,
            "longitude": LON,
            # Antecedent-only window ending before the 15 Jul Mainok onset.
            "start_date": "2024-07-01",
            "end_date": "2024-07-14",
            "hourly": variables,
            "timezone": "Africa/Lagos",
        },
    )
    return {
        "request_ok": ok,
        "variables": variables,
        "non_null_counts": hourly_counts(payload) if ok and isinstance(payload, dict) else {},
        "detail": None if ok else payload,
    }


def run_single_ecmwf_probe() -> dict[str, Any]:
    base = "https://single-runs-api.open-meteo.com/v1/forecast"
    candidates = [
        ["precipitation", "wind_gusts_10m", "cape", "soil_moisture_0_to_7cm", "soil_moisture_7_to_28cm", "runoff"],
        ["precipitation", "wind_gusts_10m", "cape", "soil_moisture_0_to_7cm", "soil_moisture_7_to_28cm", "surface_runoff"],
    ]
    attempts: list[dict[str, Any]] = []
    for variables in candidates:
        ok, payload = fetch(
            base,
            {
                "latitude": LAT,
                "longitude": LON,
                "models": "ecmwf_ifs",
                "run": "2024-07-12T00:00",
                "forecast_hours": 96,
                "hourly": variables,
                "timezone": "Africa/Lagos",
            },
        )
        attempts.append(
            {
                "request_ok": ok,
                "variables": variables,
                "non_null_counts": hourly_counts(payload) if ok and isinstance(payload, dict) else {},
                "detail": None if ok else payload,
            }
        )
        if ok:
            break
    return {"attempts": attempts, "usable": any(item["request_ok"] for item in attempts)}


def main() -> None:
    previous = run_previous_runs_probe()
    historical = run_historical_forecast_probe()
    single = run_single_ecmwf_probe()

    precip_counts = previous["fixed_lead_precipitation"].get("non_null_counts", {})
    fixed_precip_ok = all(precip_counts.get(key, 0) > 0 for key in [
        "precipitation_previous_day1",
        "precipitation_previous_day2",
        "precipitation_previous_day3",
    ])

    hist_counts = historical.get("non_null_counts", {})
    antecedent_water_ok = any(
        hist_counts.get(key, 0) > 0
        for key in ["soil_moisture_0_to_1cm", "soil_moisture_1_to_3cm", "soil_moisture_3_to_9cm"]
    )

    report = {
        "status": "PASS" if fixed_precip_ok and antecedent_water_ok else "FAIL",
        "holdout_2026_queried": False,
        "probe_location": {"name": "Mainok development anchor", "latitude": LAT, "longitude": LON},
        "previous_runs": previous,
        "historical_forecast_antecedent": historical,
        "single_run_ecmwf_optional": single,
        "minimum_requirements": {
            "fixed_24_48_72_precipitation": fixed_precip_ok,
            "antecedent_water_state": antecedent_water_ok,
        },
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    if report["status"] != "PASS":
        raise SystemExit("minimum richer-feature contract not available")


if __name__ == "__main__":
    main()
