#!/usr/bin/env python3
"""Build an auditable Lokoja 2022 operational replay evidence table.

No prediction metric is manufactured here. The output aligns:
- NASA IMERG Early V06 rainfall available before each 00 UTC issue date;
- archived operational GloFAS 24/48/72h discharge forecasts;
- independently documented flood milestones.

Two milestones are deliberately kept separate:
1. documented flooding already present by 2022-09-28;
2. NiHSA-reported hydrological peak at Lokoja on 2022-10-06 (~25,424 m3/s).

The table is intended for later model scoring and scientific review.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import pandas as pd

MILESTONES = {
    "documented_flooding_present": pd.Timestamp("2022-09-28"),
    "nihsa_reported_peak": pd.Timestamp("2022-10-06"),
}
NIHSA_PEAK_DISCHARGE_M3S = 25424.0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nasa-daily", default="validation/nasa_imerg_early_lokoja_2022_daily.csv")
    ap.add_argument("--glofas-forecast", default="validation/glofas_operational_forecasts.csv")
    ap.add_argument("--out-csv", default="validation/lokoja_2022_operational_replay.csv")
    ap.add_argument("--out-json", default="validation/lokoja_2022_operational_replay_summary.json")
    args = ap.parse_args()

    rain = pd.read_csv(args.nasa_daily, parse_dates=["date"])
    fc = pd.read_csv(args.glofas_forecast, parse_dates=["issue_date", "valid_time"])
    fc = fc[fc["location"].eq("Lokoja")].copy()
    if rain.empty or fc.empty:
        raise RuntimeError("NASA Early and GloFAS operational forecast files are both required")

    rain = rain.sort_values("date")
    rows = []
    for _, f in fc.iterrows():
        issue = pd.Timestamp(f["issue_date"]).normalize()
        valid = pd.Timestamp(f["valid_time"]).normalize()

        # A 00 UTC forecast issue may only use *complete prior UTC days* from the
        # satellite stream, never rainfall later on the issue date.
        available = rain[(rain["date"] < issue) & rain["complete_day"].astype(bool)]
        def total(days: int):
            w = available[available["date"] >= issue - pd.Timedelta(days=days)]
            return float(w["imerg_early_daily_mm"].sum()) if len(w) else None

        row = {
            "issue_date": issue.date().isoformat(),
            "valid_date": valid.date().isoformat(),
            "lead_time_hours": int(f["lead_time_hours"]),
            "nasa_imerg_early_prior_1d_mm": total(1),
            "nasa_imerg_early_prior_3d_mm": total(3),
            "nasa_imerg_early_prior_7d_mm": total(7),
            "glofas_operational_forecast_discharge_m3s": float(f["forecast_discharge_m3s"]),
            "glofas_grid_latitude": f.get("latitude_grid"),
            "glofas_grid_longitude": f.get("longitude_grid"),
            "validates_documented_onset_date": valid == MILESTONES["documented_flooding_present"],
            "validates_nihsa_peak_date": valid == MILESTONES["nihsa_reported_peak"],
            "nihsa_peak_observed_discharge_m3s": NIHSA_PEAK_DISCHARGE_M3S if valid == MILESTONES["nihsa_reported_peak"] else None,
            "forecast_to_nihsa_peak_ratio": (
                float(f["forecast_discharge_m3s"]) / NIHSA_PEAK_DISCHARGE_M3S
                if valid == MILESTONES["nihsa_reported_peak"] else None
            ),
        }
        rows.append(row)

    replay = pd.DataFrame(rows).sort_values(["valid_date", "lead_time_hours"])
    Path(args.out_csv).write_text(replay.to_csv(index=False), encoding="utf-8")

    onset = replay[replay["validates_documented_onset_date"]].copy()
    peak = replay[replay["validates_nihsa_peak_date"]].copy()
    summary = {
        "status": "evidence_table_only_not_model_validation",
        "documented_flooding_present_by": "2022-09-28",
        "nihsa_peak_date": "2022-10-06",
        "nihsa_peak_discharge_m3s": NIHSA_PEAK_DISCHARGE_M3S,
        "onset_forecast_rows": int(len(onset)),
        "peak_forecast_rows": int(len(peak)),
        "available_peak_lead_hours": sorted(peak["lead_time_hours"].astype(int).unique().tolist()),
        "note": (
            "These values show what NASA Early antecedent rainfall and archived operational GloFAS discharge forecasts "
            "were available around the event. They do not by themselves prove NaijaClimaGuard warning lead time. "
            "A model trained without the 2022 event must score these issue-date features before any model lead-time claim."
        ),
    }
    Path(args.out_json).write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(replay.to_string(index=False))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
