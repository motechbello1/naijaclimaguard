# NaijaClimaGuard Validation v2

This folder replaces the original circular-label evaluation with a conservative, independently auditable benchmark.

## Why v2 exists

The previous training pipeline created the `flood` target from extreme rainfall thresholds and then trained XGBoost using the same rainfall-derived variables. A random row-level train/test split also mixed nearby dates from the same locations across training and test sets. High ROC-AUC under that design does **not** establish independent real-world flood forecasting skill.

Validation v2 uses a different standard:

1. **Independent event labels** — flood dates come from externally documented events, not predictor thresholds.
2. **Past-only features** — rolling features end at decision date `t`; no centered windows or future observations.
3. **Chronological holdout** — older events train; newer events test. No random mixing of adjacent days.
4. **Event-level lead time** — report the first risk-threshold crossing relative to the documented flood date.
5. **No metric laundering** — small independent samples are explicitly marked exploratory and must not appear as headline pitch metrics.
6. **Ground calibration** — GloFAS discharge is checked against independent NiHSA/NIWA/NEMA observations where public values are available.

## Three-source model architecture

The validation model is built around three distinct source families with separate provenance:

### NASA GPM IMERG Final V07

Primary historical rainfall observation for training and event reconstruction.

- multi-satellite precipitation;
- ~0.1° grid;
- extracted directly from NASA Earthdata/GES DISC;
- never described as a 48-hour forecast.

### Copernicus/ECMWF GloFAS v4

River-discharge state in m³/s.

- historical/modelled discharge is fetched through the Open-Meteo Flood API while retaining GloFAS attribution;
- grid-cell/reach plausibility is checked against Nigerian hydrological observations;
- moisture balance is never relabelled as river discharge.

### ERA5-Land

Antecedent land-surface state.

- soil moisture at multiple depths;
- FAO ET0;
- temperature and precipitation-duration context;
- delivered through Open-Meteo Historical Weather API with ERA5-Land attribution.

The defensible public architecture statement is:

> NaijaClimaGuard fuses NASA GPM IMERG multi-satellite rainfall observations, Copernicus/ECMWF GloFAS river discharge, and ERA5-Land surface-state variables into a Nigeria-focused flood-risk decision layer.

That statement applies only to model versions that actually ingest all three streams.

## Independent event registry

`event_registry.csv` now contains documented events across Lokoja, Makurdi, Yenagoa, Onitsha and Hadejia from 2017–2024. Events are sourced from NEMA, Copernicus, reputable Nigerian reporting, UNICEF and other traceable evidence.

The registry remains intentionally conservative. The current 2022 chronological cutoff still leaves fewer than the 20 independent test events required by the validator for headline model metrics. Until the registry grows, computed scores remain exploratory.

## Nigerian ground hydrology checks

`ground_observations.csv` contains public NiHSA/NIWA/NEMA water-level and discharge observations, including:

- Lokoja 6 Oct 2022: NiHSA-reported peak around 25,424 m³/s;
- Lokoja 21 Oct 2024: 18,905.40 m³/s;
- Makurdi 21 Oct 2024: 10,830.48 m³/s.

`compare_glofas_ground.py` aligns those observations with the selected GloFAS series and reports bias/ratio diagnostics. Sparse public points are treated as reach-selection and calibration checks, **not** as a national GloFAS accuracy claim.

## Data files

The fused daily table produced by `build_features.py` contains NASA rainfall, GloFAS discharge, ERA5-Land soil state and past-only engineered features. Ground-truth labels are attached only later by `validate_v2.py` from `event_registry.csv`.

## Hindcast vs forecast

A historical observation/reanalysis can establish whether the model identifies flood-associated conditions, but it cannot by itself prove that those values were available 48 or 72 hours earlier.

Therefore we maintain two separate claims:

- **Hindcast/event detection:** Did the model identify conditions associated with a documented flood using past/current observations?
- **Forecast lead time:** Using an archived forecast issued at time `t`, did the model warn before the independently documented flood date?

Only the second can justify a statement such as `48-hour advance warning`.

## Reproducible pipeline

The GitHub Actions workflow `.github/workflows/validation-v2.yml` runs:

1. GloFAS historical discharge ingestion;
2. GloFAS-vs-ground hydrology diagnostics;
3. ERA5-Land historical surface-state ingestion;
4. NASA Earthdata preflight;
5. NASA IMERG Final streaming when `EARTHDATA_TOKEN` exists;
6. source coverage/provenance checks;
7. fused feature generation;
8. chronological XGBoost benchmark;
9. artifact upload of raw evidence and results.

NASA authentication must be held in the GitHub Actions secret `EARTHDATA_TOKEN`; it must never be committed to the repository.

## Running locally

```bash
pip install -r validation/requirements.txt

python validation/fetch_glofas.py --start 2018-01-01 --end 2024-12-31
python validation/compare_glofas_ground.py
python validation/fetch_era5_land.py --start 2018-01-01 --end 2024-12-31

# Requires EARTHDATA_TOKEN or Earthdata username/password environment variables.
python validation/fetch_nasa_imerg.py --start 2018-01-01 --end 2024-12-31

python validation/check_sources.py --start 2018-01-01 --end 2024-12-31
python validation/build_features.py
python validation/validate_v2.py \
  --features validation/features_daily.csv \
  --events validation/event_registry.csv \
  --cutoff 2022-01-01 \
  --threshold 0.50
```

The validator writes `validation_results.json` and reports precision, recall, ROC-AUC when mathematically valid, PR-AUC, event-by-event detection, first threshold crossing and lead time. It also returns either `publishable` or `exploratory_only`.

## Pitch-deck rule

A metric must not appear in the NiHSA deck merely because code can calculate it.

Before publication it should satisfy all of the following:

- independent ground truth;
- no target leakage;
- time-aware holdout;
- enough independent flood events;
- reproducible script and data manifest;
- uncertainty and false-negative behaviour disclosed;
- clearly distinguished hindcast vs forecast performance.

Until then, the product should be described as an **operational prototype / decision-support layer under independent validation**, not as a 99.28%-accurate national flood predictor.

## Current Lokoja position

Do not use the website's existing `Oct 5 detection → Oct 7 government advisory → 48 hours early` narrative. Public records show Kogi authorities were already citing NiHSA/NiMet flood predictions and response actions before that date, and flooding was already occurring by the beginning of October 2022.

The correct v2 task is to reconstruct Lokoja with archived forecasts and answer:

> At T-72, T-48 and T-24, using only information that would genuinely have been available then, what risk would NaijaClimaGuard have produced?

That result—not a hard-coded timeline—should become the future case study.
