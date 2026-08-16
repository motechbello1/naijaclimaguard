#!/usr/bin/env python3
"""Build a provenance-first Nigeria economic exposure baseline.

This does NOT estimate flood loss by state. It creates defensible national/state
exposure denominators and explicit avoided-loss sensitivity scenarios that the
Impact Engine can use without presenting assumptions as observed savings.

Sources
- WorldPop Nigeria population v3.0 (29 Aug 2025), state totals scaled to the
  July 2025 UN World Population Prospects median projection.
- World Bank Nigeria flood diagnostic: 2022 direct damage range US$3.79bn to
  US$9.12bn, median US$6.68bn.
"""
from __future__ import annotations

import argparse
import io
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

WORLDPOP_TABLE_URL = "https://data.worldpop.org/repo/wopr/NGA/population/v3.0/NGA_population_v3_0_table.zip"
WORLDPOP_README = "https://data.worldpop.org/repo/wopr/NGA/population/v3.0/NGA_population_v3_0_README.pdf"
WORLD_BANK_DAMAGE_SOURCE = "https://documents1.worldbank.org/curated/en/099060223162027206/pdf/BOSIB0e7bb7cb702c0b6d40e7d4dc5834be.pdf"
DAMAGE_LOW_USD = 3.79e9
DAMAGE_MEDIAN_USD = 6.68e9
DAMAGE_HIGH_USD = 9.12e9
SENSITIVITY = [0.005, 0.01, 0.02, 0.05]

ALIASES = {
    "fct": "Federal Capital Territory",
    "abuja": "Federal Capital Territory",
    "federal capital territory": "Federal Capital Territory",
    "akwa-ibom": "Akwa Ibom",
    "cross-river": "Cross River",
    "nasarawa": "Nasarawa",
}


def canonical_state(value: object) -> str:
    text = re.sub(r"\s+", " ", str(value or "").strip())
    text = re.sub(r"\s+State$", "", text, flags=re.I).strip()
    return ALIASES.get(text.lower(), text)


def download_table() -> pd.DataFrame:
    r = requests.get(WORLDPOP_TABLE_URL, timeout=120, headers={"User-Agent": "NaijaClimaGuard-EconomicExposure/1.0"})
    r.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
        names = zf.namelist()
        state_name = next((n for n in names if n.lower().endswith("state_pop_total_scaled.csv")), None)
        if not state_name:
            raise RuntimeError(f"WorldPop archive missing state_pop_total_scaled.csv; files={names}")
        with zf.open(state_name) as fh:
            return pd.read_csv(fh)


def normalize_worldpop(df: pd.DataFrame) -> pd.DataFrame:
    cols = {str(c).lower(): c for c in df.columns}
    state_col = next((c for k, c in cols.items() if any(token in k for token in ["state", "admin1", "adm1", "name"])), None)
    if state_col is None:
        raise RuntimeError(f"Could not identify state-name column in {list(df.columns)}")

    numeric_candidates = []
    for c in df.columns:
        if c == state_col:
            continue
        series = pd.to_numeric(df[c], errors="coerce")
        if series.notna().mean() > 0.8:
            numeric_candidates.append((float(series.fillna(0).sum()), c, series))
    if not numeric_candidates:
        raise RuntimeError("Could not identify numeric population total column")

    # The scaled population total is expected to dominate numeric identifier columns.
    _, pop_col, pop_series = max(numeric_candidates, key=lambda x: x[0])
    out = pd.DataFrame({"state": df[state_col].map(canonical_state), "population_2025": pop_series.round().astype("Int64")})
    out = out[out.state.ne("") & out.population_2025.notna()].copy()
    out = out.groupby("state", as_index=False).population_2025.sum().sort_values("state")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--jurisdictions", default="validation/national_evidence_factory/jurisdictions.csv")
    ap.add_argument("--out-dir", default="validation/economic_exposure_factory/out")
    args = ap.parse_args()

    expected = pd.read_csv(args.jurisdictions)
    expected_states = set(expected.state.astype(str))
    population = normalize_worldpop(download_table())
    population_states = set(population.state.astype(str))
    missing = sorted(expected_states - population_states)
    extra = sorted(population_states - expected_states)
    if missing:
        raise RuntimeError(f"WorldPop state table missing registered jurisdictions: {missing}")

    population = expected[["state", "capital", "zone", "kind"]].merge(population, on="state", how="left")
    total_population = int(population.population_2025.sum())

    scenarios = []
    for share in SENSITIVITY:
        scenarios.append({
            "avoidable_loss_share": share,
            "avoidable_loss_percent": share * 100,
            "protected_value_usd_at_2022_median_damage": round(DAMAGE_MEDIAN_USD * share, 2),
            "interpretation": "Sensitivity scenario only. Not a realized NaijaClimaGuard saving or forecast of future damage.",
        })

    payload = {
        "status": "economic_exposure_baseline_v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "population": {
            "source": "WorldPop Nigeria population v3.0",
            "source_url": WORLDPOP_README,
            "reference_year": 2025,
            "registered_jurisdictions": len(expected_states),
            "population_total_from_state_table": total_population,
            "extra_worldpop_labels_not_used": extra,
            "boundary": "Population exposure is not flood exposure until intersected with a hazard/inundation footprint.",
        },
        "2022_direct_damage_usd": {
            "low": DAMAGE_LOW_USD,
            "median": DAMAGE_MEDIAN_USD,
            "high": DAMAGE_HIGH_USD,
            "source": "World Bank Nigeria flood diagnostic",
            "source_url": WORLD_BANK_DAMAGE_SOURCE,
            "boundary": "National historical damage reference. It is not allocated to states by population and is not a NaijaClimaGuard performance result.",
        },
        "avoided_loss_sensitivity": scenarios,
        "next_exposure_layers": [
            "WorldPop 100m gridded population intersected with flood footprint",
            "Google Open Buildings v3 / OSM building footprint exposure",
            "ESA WorldCover 2021 cropland/built-up exposure",
            "OpenStreetMap roads, hospitals and schools",
            "sector-specific replacement/loss functions calibrated from Nigerian post-disaster evidence",
        ],
    }

    outdir = Path(args.out_dir); outdir.mkdir(parents=True, exist_ok=True)
    population.to_csv(outdir / "nigeria_state_population_2025.csv", index=False)
    (outdir / "national_economic_baseline.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({"jurisdictions": len(population), "population_2025": total_population, "scenarios": scenarios}, indent=2))


if __name__ == "__main__":
    main()
