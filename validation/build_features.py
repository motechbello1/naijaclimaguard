#!/usr/bin/env python3
"""Fuse NASA IMERG rainfall, GloFAS discharge and ERA5-Land state into one daily table.

No target labels are created here. Ground truth comes only from event_registry.csv.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import numpy as np
import pandas as pd


def add_past_only_features(g: pd.DataFrame) -> pd.DataFrame:
    g = g.sort_values("date").copy()

    # NASA rainfall accumulations ending at t only.
    rain = g["nasa_imerg_precip_mm_day"]
    for w in (3, 7, 14, 30):
        g[f"nasa_rain_{w}d_sum"] = rain.rolling(w, min_periods=1).sum()

    # GloFAS antecedent discharge state. Shifted lag features are past-only.
    q = g["river_discharge_m3s"]
    g["discharge_lag1"] = q.shift(1)
    g["discharge_lag3"] = q.shift(3)
    g["discharge_lag7"] = q.shift(7)
    g["discharge_3d_mean"] = q.rolling(3, min_periods=1).mean()
    g["discharge_7d_mean"] = q.rolling(7, min_periods=1).mean()
    g["discharge_3d_change"] = q - q.shift(3)
    g["discharge_7d_change"] = q - q.shift(7)

    # ERA5-Land antecedent wetness.
    soil_cols = [
        "soil_moisture_0_to_7cm",
        "soil_moisture_7_to_28cm",
        "soil_moisture_28_to_100cm",
    ]
    existing = [c for c in soil_cols if c in g.columns]
    if existing:
        g["soil_moisture_profile_mean"] = g[existing].mean(axis=1)
        g["soil_moisture_7d_mean"] = g["soil_moisture_profile_mean"].rolling(7, min_periods=1).mean()

    if "et0_fao_evapotranspiration" in g.columns:
        g["nasa_rain_minus_et0"] = g["nasa_imerg_precip_mm_day"] - g["et0_fao_evapotranspiration"]
        g["water_balance_7d"] = g["nasa_rain_minus_et0"].rolling(7, min_periods=1).sum()

    g["month"] = g["date"].dt.month
    g["day_of_year"] = g["date"].dt.dayofyear
    return g


def read(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"])
    return df


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--imerg", default="validation/raw/nasa_imerg_daily.csv")
    ap.add_argument("--glofas", default="validation/raw/glofas_daily.csv")
    ap.add_argument("--era5", default="validation/raw/era5_land_daily.csv")
    ap.add_argument("--out", default="validation/features_daily.csv")
    args = ap.parse_args()

    imerg = read(args.imerg)
    glofas = read(args.glofas)
    era5 = read(args.era5)

    # Keep only useful columns from each source and make collisions impossible.
    imerg_keep = [c for c in imerg.columns if c in {
        "date", "location", "nasa_imerg_precip_mm_day", "source_precipitation",
        "latitude_grid", "longitude_grid", "nasa_short_name", "nasa_version"
    }]
    glofas_keep = [c for c in glofas.columns if c in {
        "date", "location", "river_discharge_m3s", "source", "glofas_model"
    }]
    era5_keep = [c for c in era5.columns if c in {
        "date", "location", "et0_fao_evapotranspiration", "temperature_2m_max",
        "temperature_2m_min", "precipitation_hours", "soil_moisture_0_to_7cm",
        "soil_moisture_7_to_28cm", "soil_moisture_28_to_100cm", "source_surface_state"
    }]

    df = imerg[imerg_keep].merge(glofas[glofas_keep], on=["date", "location"], how="inner")
    df = df.merge(era5[era5_keep], on=["date", "location"], how="inner")
    df = df.rename(columns={"source": "source_discharge"})

    df = df.groupby("location", group_keys=False).apply(add_past_only_features).reset_index(drop=True)

    # Quality flags, not silent imputation.
    df["quality_missing_imerg"] = df["nasa_imerg_precip_mm_day"].isna()
    df["quality_missing_glofas"] = df["river_discharge_m3s"].isna()
    soil = "soil_moisture_profile_mean"
    df["quality_missing_soil"] = df[soil].isna() if soil in df else True

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    df.sort_values(["location", "date"]).to_csv(out, index=False)
    print(f"Wrote {len(df):,} fused location-days to {out}")
    print("Sources: NASA IMERG Final V07 + Copernicus/ECMWF GloFAS v4 + ERA5-Land")


if __name__ == "__main__":
    main()
