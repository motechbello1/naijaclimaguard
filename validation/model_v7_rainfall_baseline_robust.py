#!/usr/bin/env python3
"""Resilient transport wrapper for the frozen Model V7 rainfall baseline.

This changes only how the same Previous Runs data are downloaded. It does not
change the baseline score family, event labels, threshold selection rule or
2025 evaluation boundary defined in model_v7_rainfall_baseline.py.
"""

from __future__ import annotations

import datetime as dt
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import model_v7_rainfall_baseline as baseline

TIMEOUT = 75
RETRIES = 4
VARIABLES = [
    "precipitation_previous_day1",
    "precipitation_previous_day2",
    "precipitation_previous_day3",
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
    url = f"{baseline.API}?{urllib.parse.urlencode(params, doseq=True)}"
    last_error: Exception | None = None
    for attempt in range(RETRIES):
        req = urllib.request.Request(
            url,
            headers={"Accept": "application/json", "User-Agent": "NaijaClimaGuard-V7-RainBaseline/1.1"},
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if payload.get("error"):
                raise RuntimeError(str(payload))
            return payload
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt + 1 < RETRIES:
                time.sleep(2 ** attempt)
    raise RuntimeError(
        f"Previous Runs fetch failed after {RETRIES} attempts for {start}..{end} at {lat},{lon}: {last_error}"
    )


def resilient_fetch_hourly(lat: float, lon: float, year: int) -> dict[str, Any]:
    # Smaller requests avoid a single long archive query becoming a flaky CI gate.
    periods = [
        (dt.date(year, 1, 2), dt.date(year, 4, 30)),
        (dt.date(year, 5, 1), dt.date(year, 8, 31)),
        (dt.date(year, 9, 1), dt.date(year + 1, 1, 3)),
    ]
    merged: dict[str, list[Any]] = {"time": []}
    for variable in VARIABLES:
        merged[variable] = []

    for start, end in periods:
        payload = fetch_period(lat, lon, start, end)
        hourly = payload.get("hourly") or {}
        times = hourly.get("time") or []
        if not times:
            raise RuntimeError(f"empty hourly time axis for {start}..{end} at {lat},{lon}")
        merged["time"].extend(times)
        for variable in VARIABLES:
            values = hourly.get(variable)
            if not isinstance(values, list) or len(values) != len(times):
                raise RuntimeError(f"missing/misaligned {variable} for {start}..{end} at {lat},{lon}")
            merged[variable].extend(values)

    return {"hourly": merged}


if __name__ == "__main__":
    baseline.fetch_hourly = resilient_fetch_hourly
    baseline.main()
