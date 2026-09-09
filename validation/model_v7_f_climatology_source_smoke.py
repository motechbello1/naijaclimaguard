#!/usr/bin/env python3
"""V7-F pre-2024 climatology source smoke.

This is not a model score. It proves that a local anomaly layer can be built
from a long reanalysis baseline that ends before V7's 2024/2025 development
period. No 2024, 2025 or 2026 observations are requested by this smoke.
"""

from __future__ import annotations

import datetime as dt
import json
import math
import statistics
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from typing import Any

ARCHIVE_API = "https://archive-api.open-meteo.com/v1/archive"
START_DATE = "1991-01-01"
END_DATE = "2023-12-31"
TIMEOUT = 60


def fetch(params: dict[str, Any]) -> dict[str, Any]:
    url = f"{ARCHIVE_API}?{urllib.parse.urlencode(params, doseq=True)}"
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "NaijaClimaGuard-V7F-ClimatologySmoke/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Historical archive HTTP {exc.code}: {body[:1000]}") from exc
    if not isinstance(payload, dict) or payload.get("error"):
        raise RuntimeError(f"Unexpected historical archive response: {payload}")
    return payload


def percentile(values: list[float], q: float) -> float:
    clean = sorted(v for v in values if math.isfinite(v))
    if not clean:
        return float("nan")
    if len(clean) == 1:
        return clean[0]
    pos = (len(clean) - 1) * q
    lower = math.floor(pos)
    upper = math.ceil(pos)
    if lower == upper:
        return clean[lower]
    weight = pos - lower
    return clean[lower] * (1 - weight) + clean[upper] * weight


def rolling_sum(values: list[float], window: int) -> list[float]:
    out: list[float] = []
    running = 0.0
    queue: list[float] = []
    for value in values:
        queue.append(value)
        running += value
        if len(queue) > window:
            running -= queue.pop(0)
        out.append(running if len(queue) == window else float("nan"))
    return out


def main() -> None:
    # Lokoja is only the source-contract smoke point. V7-F will compute the same
    # frozen pre-2024 climatology independently for every development anchor.
    payload = fetch({
        "latitude": 7.8023,
        "longitude": 6.7333,
        "start_date": START_DATE,
        "end_date": END_DATE,
        "models": "era5",
        "daily": [
            "precipitation_sum",
            "soil_moisture_0_to_7cm_mean",
            "soil_moisture_7_to_28cm_mean",
        ],
        "timezone": "Africa/Lagos",
    })
    daily = payload.get("daily")
    if not isinstance(daily, dict):
        raise RuntimeError("Historical archive did not return daily data")

    times = daily.get("time") or []
    rain_raw = daily.get("precipitation_sum") or []
    soil_surface_raw = daily.get("soil_moisture_0_to_7cm_mean") or []
    soil_root_raw = daily.get("soil_moisture_7_to_28cm_mean") or []
    if not (len(times) == len(rain_raw) == len(soil_surface_raw) == len(soil_root_raw)):
        raise RuntimeError("Historical daily arrays have inconsistent lengths")
    if len(times) < 11000:
        raise RuntimeError(f"Expected a multi-decade baseline, received only {len(times)} daily rows")

    dates = [dt.date.fromisoformat(value) for value in times]
    if min(dates).year != 1991 or max(dates).year != 2023:
        raise RuntimeError(f"Unexpected climatology range: {min(dates)} to {max(dates)}")
    if any(date.year >= 2024 for date in dates):
        raise RuntimeError("LEAKAGE GUARD: climatology smoke received 2024 or later data")

    rain = [float(v) if v is not None else 0.0 for v in rain_raw]
    soil_surface = [float(v) if v is not None else float("nan") for v in soil_surface_raw]
    soil_root = [float(v) if v is not None else float("nan") for v in soil_root_raw]
    rain3 = rolling_sum(rain, 3)
    rain7 = rolling_sum(rain, 7)

    by_month: dict[int, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for index, date in enumerate(dates):
        by_month[date.month]["rain1"].append(rain[index])
        by_month[date.month]["rain3"].append(rain3[index])
        by_month[date.month]["rain7"].append(rain7[index])
        by_month[date.month]["soil_surface"].append(soil_surface[index])
        by_month[date.month]["soil_root"].append(soil_root[index])

    monthly: dict[str, Any] = {}
    for month in range(1, 13):
        store = by_month[month]
        monthly[str(month)] = {
            "rain1_p90_mm": percentile(store["rain1"], 0.90),
            "rain1_p95_mm": percentile(store["rain1"], 0.95),
            "rain1_p99_mm": percentile(store["rain1"], 0.99),
            "rain3_p95_mm": percentile(store["rain3"], 0.95),
            "rain7_p95_mm": percentile(store["rain7"], 0.95),
            "soil_surface_p90": percentile(store["soil_surface"], 0.90),
            "soil_root_p90": percentile(store["soil_root"], 0.90),
        }
        if not all(math.isfinite(float(value)) for value in monthly[str(month)].values()):
            raise RuntimeError(f"Month {month} produced non-finite climatology thresholds")

    report = {
        "status": "PASS",
        "purpose": "prove immediately accessible, leakage-safe local climatology inputs for V7-F",
        "approval_or_api_key_required_for_development_smoke": False,
        "model": "era5",
        "baseline_start": START_DATE,
        "baseline_end": END_DATE,
        "baseline_rows": len(times),
        "development_or_holdout_years_queried": False,
        "monthly_thresholds": monthly,
        "example_annual_rain_mean_mm_per_day": statistics.mean(rain),
    }
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
