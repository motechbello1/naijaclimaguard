#!/usr/bin/env python3
"""Build issue-time Model v4 input rows from NASA Early + GloFAS + surface state.

The source contract is deliberately explicit. NASA is the latest complete IMERG
Early daily accumulation. GloFAS is the current operational control forecast.
The surface-state proxy is obtained from Open-Meteo and is recorded as a source
shift from the historical ERA5-Land development fields.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import requests

LOCATIONS = {
    "Lokoja": (7.8023, 6.7333),
    "Makurdi": (7.7322, 8.5391),
    "Onitsha": (6.1407, 6.7869),
    "Yenagoa": (4.9247, 6.2642),
    "Hadejia": (12.4494, 10.0447),
}


def rolling_sum(group: pd.DataFrame, end: pd.Timestamp, days: int) -> float:
    start = end - pd.Timedelta(days=days - 1)
    values = group[group["date"].between(start, end)]["nasa_imerg_precip_mm_day"].astype(float)
    if len(values) < max(1, int(days * 0.7)):
        raise ValueError(f"NASA coverage insufficient for {days}d rainfall window ending {end.date()}")
    return float(values.sum())


def weighted_layer(a: np.ndarray, b: np.ndarray, c: np.ndarray, weights: tuple[float, float, float]) -> np.ndarray:
    return (a * weights[0] + b * weights[1] + c * weights[2]) / sum(weights)


def fetch_surface_state(location: str, lat: float, lon: float, obs_date: pd.Timestamp) -> tuple[dict, dict]:
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join([
            "soil_moisture_0_to_1cm", "soil_moisture_1_to_3cm", "soil_moisture_3_to_9cm",
            "soil_moisture_9_to_27cm", "soil_moisture_27_to_81cm", "precipitation",
        ]),
        "daily": "temperature_2m_max,temperature_2m_min",
        "past_days": 8,
        "forecast_days": 1,
        "timezone": "UTC",
    }
    res = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=20)
    res.raise_for_status()
    payload = res.json()
    hourly = pd.DataFrame(payload.get("hourly", {}))
    daily = pd.DataFrame(payload.get("daily", {}))
    if hourly.empty or daily.empty:
        raise RuntimeError(f"Open-Meteo surface-state response incomplete for {location}")
    hourly["time"] = pd.to_datetime(hourly["time"], utc=True)
    hourly["date"] = hourly["time"].dt.tz_localize(None).dt.normalize()
    daily["time"] = pd.to_datetime(daily["time"]).dt.normalize()

    def daily_layers(day: pd.Timestamp) -> tuple[float, float, float]:
        h = hourly[hourly["date"].eq(day)]
        if h.empty:
            raise RuntimeError(f"No operational surface-state hours for {location} {day.date()}")
        s01 = h["soil_moisture_0_to_1cm"].astype(float).to_numpy()
        s13 = h["soil_moisture_1_to_3cm"].astype(float).to_numpy()
        s39 = h["soil_moisture_3_to_9cm"].astype(float).to_numpy()
        s927 = h["soil_moisture_9_to_27cm"].astype(float).to_numpy()
        s2781 = h["soil_moisture_27_to_81cm"].astype(float).to_numpy()
        sm0_7 = float(np.nanmean(weighted_layer(s01, s13, s39, (1, 2, 4))))
        sm7_28 = float(np.nanmean(weighted_layer(s39, s927, s2781, (2, 18, 1))))
        sm28_100 = float(np.nanmean(s2781))
        return sm0_7, sm7_28, sm28_100

    sm0, sm7_28, sm28_100 = daily_layers(obs_date)
    profile = float((7 * sm0 + 21 * sm7_28 + 72 * sm28_100) / 100.0)
    recent_profiles = []
    for day in pd.date_range(obs_date - pd.Timedelta(days=6), obs_date, freq="D"):
        try:
            a, b, c = daily_layers(day)
            recent_profiles.append((7 * a + 21 * b + 72 * c) / 100.0)
        except RuntimeError:
            pass
    soil7 = float(np.nanmean(recent_profiles)) if recent_profiles else profile

    hday = hourly[hourly["date"].eq(obs_date)]
    precip_hours = float((hday["precipitation"].astype(float) >= 0.1).sum())
    drow = daily[daily["time"].eq(obs_date)]
    if drow.empty:
        raise RuntimeError(f"No daily temperature row for {location} {obs_date.date()}")

    features = {
        "soil_moisture_0_to_7cm": sm0,
        "soil_moisture_7_to_28cm": sm7_28,
        "soil_moisture_28_to_100cm": sm28_100,
        "soil_moisture_profile_mean": profile,
        "soil_moisture_7d_mean": soil7,
        "temperature_2m_max": float(drow.iloc[0]["temperature_2m_max"]),
        "temperature_2m_min": float(drow.iloc[0]["temperature_2m_min"]),
        "precipitation_hours": precip_hours,
    }
    metadata = {
        "provider": "Open-Meteo",
        "product": "operational soil-moisture/temperature proxy",
        "observation_date_utc": str(obs_date.date()),
        "historical_training_source": "ERA5-Land",
        "source_shift_declared": True,
        "deep_layer_note": "27-81cm operational layer used as proxy for historical 28-100cm feature",
    }
    return features, metadata


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nasa", type=Path, required=True)
    ap.add_argument("--glofas", type=Path, required=True)
    ap.add_argument("--output", type=Path, required=True)
    ap.add_argument("--issue-time-utc", help="ISO issue time; default now UTC")
    args = ap.parse_args()

    issue_time = pd.Timestamp(args.issue_time_utc) if args.issue_time_utc else pd.Timestamp.now(tz="UTC")
    if issue_time.tzinfo is None:
        issue_time = issue_time.tz_localize("UTC")
    else:
        issue_time = issue_time.tz_convert("UTC")
    obs_date = (issue_time.normalize() - pd.Timedelta(days=1)).tz_localize(None)

    nasa = pd.read_csv(args.nasa, parse_dates=["date"])
    nasa["date"] = pd.to_datetime(nasa["date"]).dt.normalize()
    glofas = pd.read_csv(args.glofas)
    if glofas.empty:
        raise ValueError("GloFAS operational forecast file is empty")

    rows = []
    for location, (lat, lon) in LOCATIONS.items():
        ng = nasa[nasa["location"].eq(location)].sort_values("date")
        if ng.empty or ng["date"].max() < obs_date:
            raise ValueError(f"NASA Early does not include complete observation day {obs_date.date()} for {location}")
        rain_today = float(ng.loc[ng["date"].eq(obs_date), "nasa_imerg_precip_mm_day"].iloc[-1])

        gg = glofas[glofas["location"].eq(location)].copy()
        if gg.empty:
            raise ValueError(f"Missing GloFAS current forecast for {location}")
        gg["lead_time_hours"] = pd.to_numeric(gg["lead_time_hours"], errors="coerce")
        q24_rows = gg[gg["lead_time_hours"].eq(24)]
        if q24_rows.empty:
            q24_rows = gg.sort_values("lead_time_hours").head(1)
        q24 = float(q24_rows.iloc[-1]["forecast_discharge_m3s"])
        issue_date = str(q24_rows.iloc[-1].get("issue_date", issue_time.date()))

        surface_features, surface_meta = fetch_surface_state(location, lat, lon, obs_date)
        row = {
            "issue_time_utc": issue_time.isoformat(),
            "location": location,
            "latitude": lat,
            "longitude": lon,
            "nasa_imerg_precip_mm_day": rain_today,
            "nasa_rain_3d_sum": rolling_sum(ng, obs_date, 3),
            "nasa_rain_7d_sum": rolling_sum(ng, obs_date, 7),
            "nasa_rain_14d_sum": rolling_sum(ng, obs_date, 14),
            "nasa_rain_30d_sum": rolling_sum(ng, obs_date, 30),
            "river_discharge_m3s": q24,
            **surface_features,
            "source_metadata": {
                "nasa_imerg": {
                    "provider": "NASA GPM",
                    "product": "GPM_3IMERGDE",
                    "version": "07",
                    "run": "Early",
                    "observation_date_utc": str(obs_date.date()),
                    "latency_class": "near_real_time",
                },
                "glofas": {
                    "provider": "Copernicus CEMS",
                    "dataset": "cems-glofas-forecast",
                    "system_version_request": str(q24_rows.iloc[-1].get("system_version_request", "operational")),
                    "hydrological_model": str(q24_rows.iloc[-1].get("hydrological_model", "lisflood")),
                    "product_type": str(q24_rows.iloc[-1].get("product_type", "control_forecast")),
                    "issue_date": issue_date,
                    "lead_time_hours_used_as_river_state_proxy": int(q24_rows.iloc[-1]["lead_time_hours"]),
                    "forecast_valid_time": str(q24_rows.iloc[-1].get("valid_time", "")),
                    "source_shift_declared": True,
                    "historical_training_source": "GloFAS historical discharge",
                },
                "surface_state": surface_meta,
            },
        }
        rows.append(row)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()
