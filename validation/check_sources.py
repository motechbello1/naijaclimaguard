#!/usr/bin/env python3
"""Validate source coverage/provenance before model training.

This script is intentionally strict. It fails rather than silently training on a
partially fused or mis-attributed dataset.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import pandas as pd

LOCATIONS = {"Lokoja", "Makurdi", "Onitsha", "Yenagoa", "Hadejia"}


def read(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    if "date" not in df or "location" not in df:
        raise ValueError(f"{path} must contain date and location")
    df["date"] = pd.to_datetime(df["date"])
    return df


def coverage(df: pd.DataFrame, start: str, end: str, value_col: str) -> dict:
    expected_days = (pd.Timestamp(end) - pd.Timestamp(start)).days + 1
    expected_rows = expected_days * len(LOCATIONS)
    actual_locations = set(df["location"].dropna().unique())
    missing_locations = sorted(LOCATIONS - actual_locations)
    unique_rows = df.drop_duplicates(["date", "location"])
    nonnull = int(unique_rows[value_col].notna().sum())
    return {
        "rows": int(len(unique_rows)),
        "expected_rows": int(expected_rows),
        "coverage_fraction": round(len(unique_rows) / expected_rows, 4),
        "nonnull_fraction": round(nonnull / expected_rows, 4),
        "missing_locations": missing_locations,
        "date_min": str(unique_rows["date"].min().date()) if len(unique_rows) else None,
        "date_max": str(unique_rows["date"].max().date()) if len(unique_rows) else None,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2018-01-01")
    ap.add_argument("--end", default="2023-12-31")
    ap.add_argument("--imerg", default="validation/raw/nasa_imerg_daily.csv")
    ap.add_argument("--glofas", default="validation/raw/glofas_daily.csv")
    ap.add_argument("--era5", default="validation/raw/era5_land_daily.csv")
    ap.add_argument("--out", default="validation/source_quality.json")
    args = ap.parse_args()

    imerg = read(Path(args.imerg))
    glofas = read(Path(args.glofas))
    era5 = read(Path(args.era5))

    checks = {
        "period": {"start": args.start, "end": args.end},
        "nasa_imerg": coverage(imerg, args.start, args.end, "nasa_imerg_precip_mm_day"),
        "glofas": coverage(glofas, args.start, args.end, "river_discharge_m3s"),
        "era5_land_soil": coverage(era5, args.start, args.end, "soil_moisture_0_to_7cm"),
        "era5_land_et0": coverage(era5, args.start, args.end, "et0_fao_evapotranspiration"),
    }

    # Provenance checks prevent accidental marketing misattribution.
    if "source_precipitation" not in imerg or not imerg["source_precipitation"].astype(str).str.contains("NASA GPM IMERG", regex=False).all():
        raise RuntimeError("IMERG file lacks consistent NASA GPM IMERG provenance")
    if "source" not in glofas or not glofas["source"].astype(str).str.contains("GloFAS", regex=False).all():
        raise RuntimeError("GloFAS file lacks consistent GloFAS provenance")
    if "source_surface_state" not in era5 or not era5["source_surface_state"].astype(str).str.contains("ERA5-Land", regex=False).all():
        raise RuntimeError("ERA5-Land file lacks consistent ERA5-Land provenance")

    for source, report in checks.items():
        if source == "period":
            continue
        if report["coverage_fraction"] < 0.98:
            raise RuntimeError(f"{source} row coverage below 98%: {report}")
        if report["nonnull_fraction"] < 0.95:
            raise RuntimeError(f"{source} non-null coverage below 95%: {report}")
        if report["missing_locations"]:
            raise RuntimeError(f"{source} missing locations: {report['missing_locations']}")

    out = Path(args.out)
    out.write_text(json.dumps(checks, indent=2), encoding="utf-8")
    print(json.dumps(checks, indent=2))
    print("Source quality checks passed.")


if __name__ == "__main__":
    main()
