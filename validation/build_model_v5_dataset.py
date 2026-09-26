#!/usr/bin/env python3
"""Build Model v5 issue-time development rows from NASA Early + GloFAS reforecasts."""
from __future__ import annotations

import argparse
import glob
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

PILOT_LOCATIONS = {"Lokoja", "Makurdi", "Onitsha", "Yenagoa", "Hadejia"}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def expand_inputs(patterns: list[str]) -> list[Path]:
    paths: list[Path] = []
    for pattern in patterns:
        matches = [Path(p) for p in glob.glob(pattern)]
        if not matches and Path(pattern).exists():
            matches = [Path(pattern)]
        paths.extend(matches)
    unique = sorted({p.resolve() for p in paths})
    if not unique:
        raise FileNotFoundError(f"No input files matched: {patterns}")
    return [Path(p) for p in unique]


def read_many(paths: list[Path]) -> pd.DataFrame:
    frames = [pd.read_csv(p) for p in paths]
    return pd.concat(frames, ignore_index=True)


def build_rain_features(nasa: pd.DataFrame) -> pd.DataFrame:
    required = {"date", "location", "nasa_imerg_early_mm_day"}
    missing = required - set(nasa.columns)
    if missing:
        raise ValueError(f"NASA inputs missing columns: {sorted(missing)}")
    x = nasa.copy()
    x["date"] = pd.to_datetime(x["date"])
    x["nasa_imerg_early_mm_day"] = pd.to_numeric(x["nasa_imerg_early_mm_day"], errors="coerce")
    x = x.sort_values(["location", "date"]).drop_duplicates(["location", "date"], keep="last")
    rows: list[pd.DataFrame] = []
    for location, g in x.groupby("location", sort=False):
        g = g.sort_values("date").copy()
        rain = g["nasa_imerg_early_mm_day"].clip(lower=0)
        g["rain_1d"] = rain
        for days in (3, 7, 14, 30):
            g[f"rain_{days}d"] = rain.rolling(days, min_periods=max(1, days // 2)).sum()
        g["rain_prev_3d"] = rain.shift(3).rolling(3, min_periods=2).sum()
        g["rain_accel_3d"] = g["rain_3d"] - g["rain_prev_3d"]
        g["rain_3_14_ratio"] = g["rain_3d"] / (g["rain_14d"].abs() + 1e-6)
        g["rain_7_30_ratio"] = g["rain_7d"] / (g["rain_30d"].abs() + 1e-6)
        wet = (rain >= 1.0).astype(float)
        g["wet_days_7d"] = wet.rolling(7, min_periods=3).sum()
        g["wet_days_30d"] = wet.rolling(30, min_periods=10).sum()
        # A forecast issued at 00 UTC on D may use only complete rainfall days < D.
        g["issue_date"] = g["date"] + pd.Timedelta(days=1)
        rows.append(g[[
            "issue_date", "location", "rain_1d", "rain_3d", "rain_7d", "rain_14d", "rain_30d",
            "rain_accel_3d", "rain_3_14_ratio", "rain_7_30_ratio", "wet_days_7d", "wet_days_30d",
        ]])
    return pd.concat(rows, ignore_index=True)


def build_glofas_features(glofas: pd.DataFrame) -> pd.DataFrame:
    required = {"issue_date", "location", "lead_time_hours", "forecast_discharge_m3s"}
    missing = required - set(glofas.columns)
    if missing:
        raise ValueError(f"GloFAS inputs missing columns: {sorted(missing)}")
    g = glofas.copy()
    g["issue_date"] = pd.to_datetime(g["issue_date"])
    g["lead_time_hours"] = pd.to_numeric(g["lead_time_hours"], errors="raise").astype(int)
    g["forecast_discharge_m3s"] = pd.to_numeric(g["forecast_discharge_m3s"], errors="coerce")
    g = g[g["lead_time_hours"].isin([24, 48, 72])]
    pivot = g.pivot_table(
        index=["issue_date", "location"], columns="lead_time_hours",
        values="forecast_discharge_m3s", aggfunc="last"
    ).reset_index().rename(columns={24: "q24", 48: "q48", 72: "q72"})
    for c in ("q24", "q48", "q72"):
        if c not in pivot:
            pivot[c] = np.nan
    pivot["qmax_72"] = pivot[["q24", "q48", "q72"]].max(axis=1)
    pivot["q48_minus_q24"] = pivot["q48"] - pivot["q24"]
    pivot["q72_minus_q24"] = pivot["q72"] - pivot["q24"]
    pivot["q72_pct_rise"] = pivot["q72_minus_q24"] / (pivot["q24"].abs() + 1e-6)
    pivot["q_slope_per_day"] = pivot["q72_minus_q24"] / 2.0
    pivot["q_monotonic_rise"] = ((pivot["q24"] <= pivot["q48"]) & (pivot["q48"] <= pivot["q72"])).astype(int)
    return pivot


def attach_future_target(rows: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:
    e = events.copy()
    enabled = e["include_in_benchmark"].astype(str).str.lower().eq("true")
    e = e[enabled].copy()
    e["observed_by_date"] = pd.to_datetime(e["observed_by_date"])
    if e["event_id"].nunique() != 35:
        raise ValueError(f"Model v5 requires frozen 35-event registry; got {e['event_id'].nunique()}")
    if set(e["location"].unique()) != PILOT_LOCATIONS:
        raise ValueError("Model v5 event registry location set changed")

    out = rows.copy()
    out["label"] = 0
    out["future_event_ids"] = ""
    out["excluded_after_event"] = False
    for _, event in e.iterrows():
        same = out["location"].eq(event["location"])
        anchor = event["observed_by_date"]
        future = same & (out["issue_date"] < anchor) & (anchor <= out["issue_date"] + pd.Timedelta(days=3))
        out.loc[future, "label"] = 1
        existing = out.loc[future, "future_event_ids"].astype(str)
        out.loc[future, "future_event_ids"] = np.where(
            existing.eq(""), str(event["event_id"]), existing + ";" + str(event["event_id"])
        )
        after = same & (out["issue_date"] > anchor) & (out["issue_date"] <= anchor + pd.Timedelta(days=3))
        out.loc[after & ~future, "excluded_after_event"] = True
    return out[~out["excluded_after_event"]].drop(columns=["excluded_after_event"]).reset_index(drop=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nasa", nargs="+", required=True, help="CSV paths or glob patterns")
    ap.add_argument("--glofas", nargs="+", required=True, help="CSV paths or glob patterns")
    ap.add_argument("--events", default="validation/model_v4_event_registry.csv")
    ap.add_argument("--start", default="2018-01-01")
    ap.add_argument("--end", default="2024-12-31")
    ap.add_argument("--out", default="validation/model_v5_issue_dataset.csv")
    ap.add_argument("--manifest", default="validation/model_v5_dataset_manifest.json")
    args = ap.parse_args()

    nasa_paths = expand_inputs(args.nasa)
    glofas_paths = expand_inputs(args.glofas)
    event_path = Path(args.events)
    nasa = read_many(nasa_paths)
    glofas = read_many(glofas_paths)
    rain = build_rain_features(nasa)
    river = build_glofas_features(glofas)
    merged = river.merge(rain, on=["issue_date", "location"], how="left", validate="one_to_one")
    merged = merged[merged["issue_date"].between(pd.Timestamp(args.start), pd.Timestamp(args.end))].copy()
    merged = attach_future_target(merged, pd.read_csv(event_path))
    merged = merged.sort_values(["issue_date", "location"]).reset_index(drop=True)

    if merged.empty:
        raise RuntimeError("Model v5 issue dataset is empty")
    if set(merged["location"].unique()) != PILOT_LOCATIONS:
        raise RuntimeError(f"Model v5 dataset missing locations: {sorted(PILOT_LOCATIONS - set(merged['location'].unique()))}")
    core = ["rain_7d", "q24", "q48", "q72"]
    coverage = {c: float(merged[c].notna().mean()) for c in core}
    if min(coverage.values()) < 0.90:
        raise RuntimeError(f"Model v5 core source coverage below 90%: {coverage}")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    merged.to_csv(out_path, index=False)
    manifest = {
        "status": "model_v5_issue_dataset_built",
        "target": "documented flood strictly after issue and within next 72 hours",
        "rows": int(len(merged)),
        "positive_issue_rows": int(merged["label"].sum()),
        "issue_dates": int(merged["issue_date"].nunique()),
        "locations": sorted(merged["location"].unique().tolist()),
        "start": str(merged["issue_date"].min().date()),
        "end": str(merged["issue_date"].max().date()),
        "core_coverage": coverage,
        "nasa_files": [{"path": str(p), "sha256": sha256_file(p)} for p in nasa_paths],
        "glofas_files": [{"path": str(p), "sha256": sha256_file(p)} for p in glofas_paths],
        "events_path": str(event_path),
        "events_sha256": sha256_file(event_path),
        "output_sha256": sha256_file(out_path),
    }
    manifest_path = Path(args.manifest)
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
