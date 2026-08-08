#!/usr/bin/env python3
"""Compare GloFAS discharge against independent Nigerian hydrology observations.

This is a calibration diagnostic, not a flood-classification metric. Sparse official
observations remain useful for checking whether the selected GloFAS grid cell is
physically plausible at Lokoja/Makurdi before using it as a model feature.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import numpy as np
import pandas as pd


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--glofas", default="validation/raw/glofas_daily.csv")
    ap.add_argument("--ground", default="validation/ground_observations.csv")
    ap.add_argument("--out-csv", default="validation/glofas_ground_comparison.csv")
    ap.add_argument("--out-json", default="validation/glofas_ground_summary.json")
    args = ap.parse_args()

    q = pd.read_csv(args.glofas, parse_dates=["date"])
    obs = pd.read_csv(args.ground, parse_dates=["date"])
    obs = obs[obs["observed_discharge_m3s"].notna()].copy()
    if obs.empty:
        raise RuntimeError("No ground observations with discharge are available")

    merged = obs.merge(
        q[["date", "location", "river_discharge_m3s", "glofas_model", "source"]],
        on=["date", "location"],
        how="left",
    )
    merged = merged.rename(columns={"river_discharge_m3s": "glofas_discharge_m3s"})
    merged["error_m3s"] = merged["glofas_discharge_m3s"] - merged["observed_discharge_m3s"]
    merged["absolute_error_m3s"] = merged["error_m3s"].abs()
    merged["relative_error"] = merged["error_m3s"] / merged["observed_discharge_m3s"]
    merged["ratio_glofas_to_ground"] = merged["glofas_discharge_m3s"] / merged["observed_discharge_m3s"]

    usable = merged.dropna(subset=["glofas_discharge_m3s", "observed_discharge_m3s"])
    summary = {
        "status": "calibration_sparse" if len(usable) < 10 else "calibration_diagnostic",
        "matched_observations": int(len(usable)),
        "locations": sorted(usable["location"].unique().tolist()),
        "mean_absolute_error_m3s": float(usable["absolute_error_m3s"].mean()) if len(usable) else None,
        "mean_relative_error": float(usable["relative_error"].mean()) if len(usable) else None,
        "median_ratio_glofas_to_ground": float(usable["ratio_glofas_to_ground"].median()) if len(usable) else None,
        "pearson_r": None,
        "note": (
            "Do not present this as a national GloFAS accuracy score. It is a sparse local cell/reach plausibility check. "
            "Expand with NiHSA/NIWA daily gauge-discharge observations before calibration claims."
        ),
    }
    if len(usable) >= 3 and usable["glofas_discharge_m3s"].nunique() > 1 and usable["observed_discharge_m3s"].nunique() > 1:
        summary["pearson_r"] = float(np.corrcoef(usable["glofas_discharge_m3s"], usable["observed_discharge_m3s"])[0, 1])

    Path(args.out_csv).write_text(merged.to_csv(index=False), encoding="utf-8")
    Path(args.out_json).write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(merged.to_string(index=False))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
