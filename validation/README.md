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

## Event registry

`event_registry.csv` contains independently documented flood events for the five locations used by the original model:

- Lokoja, Kogi
- Makurdi, Benue
- Yenagoa, Bayelsa
- Onitsha, Anambra
- Hadejia, Jigawa

The registry is deliberately small at first. It should grow using NiHSA/NEMA/SEMA records, satellite-derived flood extent datasets, peer-reviewed sources and other high-quality event evidence.

## Data standard

The minimum daily feature table accepted by `validate_v2.py` contains:

- `date`
- `location`
- `precipitation_sum`
- `precipitation_hours`
- `et0_fao_evapotranspiration`

Recommended additions:

- real/modelled `river_discharge`
- `soil_moisture`
- archived forecast precipitation issued at T-24/T-48
- archived discharge forecasts issued at T-24/T-48

### Important data-source correction

Open-Meteo's Historical Weather API provides reanalysis/model data including ERA5/ERA5-Land/ECMWF products. Do **not** describe generic Open-Meteo archive precipitation as "NASA GPM IMERG-derived" unless a specific Open-Meteo endpoint/product explicitly documents that provenance.

For river discharge, use a genuine hydrological source such as GloFAS or NiHSA observations. Do **not** rename rainfall-minus-ET0 moisture balance as `river_discharge`.

## Forecast validation versus hindcast validation

A historical reanalysis can tell us what atmospheric/hydrological conditions existed, but it cannot by itself prove that those values were available as forecasts 48 or 72 hours earlier.

Therefore we maintain two separate claims:

- **Hindcast/event detection:** Did the model identify conditions associated with a documented flood using past/current observations?
- **Forecast lead time:** Using an archived forecast issued at time `t`, did the model warn before the independently documented flood date?

Only the second can justify a statement such as "48-hour advance warning."

## Running the benchmark

```bash
python validation/validate_v2.py \
  --features validation/features_daily.csv \
  --events validation/event_registry.csv \
  --cutoff 2022-01-01 \
  --threshold 0.50
```

The script writes `validation_results.json` and reports:

- precision
- recall
- ROC-AUC when mathematically valid
- PR-AUC
- event-by-event detection
- first threshold crossing
- lead time in hours
- a `publishable` or `exploratory_only` status

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

Do not use the website's existing "Oct 5 detection → Oct 7 government advisory → 48 hours early" narrative. Public records show Kogi authorities were already citing NiHSA/NiMet flood predictions and response actions before that date, and flooding was already occurring by the beginning of October 2022.

The correct v2 task is to reconstruct Lokoja with archived data and answer:

> At T-72, T-48 and T-24, using only information that would genuinely have been available then, what risk would NaijaClimaGuard have produced?

That result—not a hard-coded timeline—should become the future case study.
