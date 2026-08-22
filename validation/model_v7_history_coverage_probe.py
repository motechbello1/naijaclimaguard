#!/usr/bin/env python3
"""Probe fixed-lead forecast archive coverage for Model V7.

This is a data-contract test, not a model score. It checks whether precipitation
forecasts that were issued 24h, 48h and 72h before valid time can be retrieved
for benchmark-era dates without credentials or approval.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

BASE = "https://previous-runs-api.open-meteo.com/v1/forecast"
TIMEOUT = 30

CASES = [
    ("2022", "2022-09-25", "2022-09-28"),
    ("2023", "2023-09-01", "2023-09-05"),
    ("2024", "2024-07-01", "2024-07-05"),
    ("2025", "2025-08-01", "2025-08-05"),
]

LOCATIONS = {
    "Lokoja": (7.8023, 6.7333),
    "Makurdi": (7.7322, 8.5391),
    "Onitsha": (6.1407, 6.7869),
    "Yenagoa": (4.9247, 6.2642),
    "Hadejia": (12.4494, 10.0447),
}

VARIABLES = [
    "precipitation_previous_day1",
    "precipitation_previous_day2",
    "precipitation_previous_day3",
]


def request(params: dict[str, Any]) -> tuple[int, dict[str, Any] | str]:
    url = f"{BASE}?{urllib.parse.urlencode(params, doseq=True)}"
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "NaijaClimaGuard-V7-CoverageProbe/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            payload = json.loads(response.read().decode("utf-8"))
            return response.status, payload
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")[:2000]


def non_null_count(payload: dict[str, Any], key: str) -> int:
    hourly = payload.get("hourly") or {}
    values = hourly.get(key) or []
    return sum(value is not None for value in values)


def main() -> None:
    report: dict[str, Any] = {
        "source": BASE,
        "approval_or_api_key_required": False,
        "variables": VARIABLES,
        "years": {},
    }

    # Test the full historical range at one fixed pilot coordinate first.
    lat, lon = LOCATIONS["Lokoja"]
    for label, start_date, end_date in CASES:
        status, payload = request(
            {
                "latitude": lat,
                "longitude": lon,
                "start_date": start_date,
                "end_date": end_date,
                "hourly": VARIABLES,
                "timezone": "Africa/Lagos",
            }
        )
        if status != 200 or not isinstance(payload, dict) or payload.get("error"):
            report["years"][label] = {"ok": False, "http_status": status, "detail": payload}
            continue
        counts = {key: non_null_count(payload, key) for key in VARIABLES}
        report["years"][label] = {
            "ok": all(count > 0 for count in counts.values()),
            "http_status": status,
            "non_null_counts": counts,
            "rows": len((payload.get("hourly") or {}).get("time") or []),
        }

    # For 2024, verify that the fixed-lead fields are populated across every
    # existing pilot location, not just Lokoja.
    location_check: dict[str, Any] = {}
    for name, (lat, lon) in LOCATIONS.items():
        status, payload = request(
            {
                "latitude": lat,
                "longitude": lon,
                "start_date": "2024-07-01",
                "end_date": "2024-07-05",
                "hourly": VARIABLES,
                "timezone": "Africa/Lagos",
            }
        )
        if status != 200 or not isinstance(payload, dict) or payload.get("error"):
            location_check[name] = {"ok": False, "http_status": status}
            continue
        counts = {key: non_null_count(payload, key) for key in VARIABLES}
        location_check[name] = {"ok": all(v > 0 for v in counts.values()), "non_null_counts": counts}

    report["pilot_locations_2024"] = location_check
    report["usable_fixed_lead_years"] = [year for year, result in report["years"].items() if result.get("ok")]
    report["all_pilot_locations_2024_ok"] = all(v.get("ok") for v in location_check.values())

    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
