# Model V7 Competition Protocol

Status: FROZEN BEFORE FIRST MODEL V7 SCORE

Model V7 is the competition successor to the failed Model V6 development candidate. It is deliberately designed around forecast sources that can also be obtained in the live product without a GloFAS approval dependency. No Model V6 threshold, metric or operating gate is being reused as a claimed success.

## Competition objective

The model must predict documented flood onset as an issue-time decision problem, not merely classify wet days. The competition claim will be based on unseen-time and unseen-location evidence, event detection, useful lead time, alert precision, false-alert burden, discrimination and calibration.

A high ROC-AUC alone is not sufficient for promotion.

## Source contract

Primary forecast source family:
- Open-Meteo Historical Forecast API for archived operational weather-model features and development reconstruction.
- Open-Meteo Previous Runs API where fixed 24 h, 48 h and 72 h lead-time forecast fields are available.
- Open-Meteo Single Runs API for exact archived ECMWF IFS runs from March 2024 onward.
- Open-Meteo live Forecast / ECMWF endpoints for production-compatible inference.

Independent event labels:
- documented flood event registry built from official agency material and independently published event evidence;
- an event date may enter the benchmark only after source citation, geographic adjudication and duplicate-event resolution;
- model/weather data may never create its own positive labels.

Optional static context that is known before issue time may include elevation, terrain/catchment context and location type. No future observations may be used as predictors.

## Frozen archive coverage boundary

A no-credential CI coverage probe was run before Model V7 training. It found that the Previous Runs API returns populated 24 h, 48 h and 72 h precipitation forecast fields for 2024 and 2025 across Lokoja, Makurdi, Onitsha, Yenagoa and Hadejia. The same fixed-lead fields were empty for the tested 2022 and 2023 dates.

Therefore:
- 2022 and 2023 may be used for historical climate context, antecedent-condition representation, event-registry development or pretraining only where the feature exists before issue time;
- 2022 and 2023 may not be presented as 24 h, 48 h or 72 h fixed-lead forecast validation from this source;
- fixed-lead competition validation begins in 2024;
- exact ECMWF run reconstruction may be used from March 2024 onward;
- 2025 and later independently documented events are to be added so unseen-time validation does not depend on the old 2022-2024 benchmark alone.

This boundary is frozen before the first Model V7 score and may not be loosened after results are seen.

## Model formulation

Model V7 is multi-horizon and event-aware.

For every forecast issue time it learns three related targets:
- Y24: flood onset in the next 0-24 hours;
- Y48: flood onset in the next 24-48 hours;
- Y72: flood onset in the next 48-72 hours.

The public risk probability can be derived from the three horizon probabilities, while the horizon outputs preserve a defendable answer to 'when'.

The initial candidate family is frozen before final-holdout scoring:
1. regularized logistic baseline;
2. XGBoost gradient-boosted trees;
3. CatBoost gradient-boosted trees if the CI environment supports it;
4. a calibrated soft-voting ensemble of eligible development winners.

Candidate selection occurs only inside development data. The final holdout is scored once.

## Feature families

All features must exist at issue time.

Forecast intensity:
- precipitation totals over 1 h, 3 h, 6 h, 12 h, 24 h, 48 h and 72 h;
- maximum hourly precipitation;
- forecast precipitation probability where archived;
- surface runoff where archived;
- CAPE, wind gust and severe-weather context where archived.

Antecedent wetness:
- recent precipitation accumulations available before issue time;
- soil moisture layers available before issue time;
- evapotranspiration / water-balance features.

Spatial context:
- centre point plus a frozen neighbourhood grid;
- spatial maximum, mean, spread and exceedance counts for rainfall/runoff/wetness;
- for explicitly riverine benchmark locations, any upstream/catchment points must be frozen before scoring and documented.

Persistence and change:
- change from earlier issue times;
- persistence across consecutive model runs;
- trend in forecast rainfall/runoff risk.

Season/location context:
- month sin/cos;
- leakage-safe location climatology fitted only on training data;
- location type when independently adjudicated before model fitting.

## Data splits

Development and final evaluation must prevent temporal and geographic leakage.

Development:
- walk-forward temporal folds using only periods with the required feature contract;
- grouped event handling so multiple issue rows for one flood cannot cross train/validation boundaries;
- leave-location-out stress tests for geographic generalisation.

Final competition holdout:
- frozen before final model fitting;
- contains dates and/or locations not used for candidate selection or threshold tuning;
- uses only events for which the required pre-event forecast archive is demonstrably available;
- evaluated once;
- failures remain in the report.

## Alert policy

Row probability is not the final alert metric. Alert episodes are formed from consecutive issue times. The persistence rule and cooldown are selected only inside development data and frozen before final-holdout scoring.

This is intended to reduce repeated false alarms while preserving event detection and lead time.

## Promotion gates

Model V7 is competition-promotable only if all mandatory gates pass on the frozen final holdout:

1. Event detection >= 80% of independently eligible flood events.
2. Alert-episode precision >= 30%.
3. False-alert burden <= 2.0 alert episodes per location-year, and the full denominator is reported.
4. Median first-alert lead time >= 48 hours for detected events that have at least 72 hours of eligible pre-event forecast coverage.
5. PR-AUC must exceed prevalence by at least 3x and beat the strongest frozen simple baseline by at least 20% relative.
6. Brier score must beat a location/season climatology baseline.
7. No catastrophic location failure may be hidden: per-location/event-family results are reported with denominators.
8. The model must pass leakage, issue-time and duplicate-event audits.

Target, not a gate: ROC-AUC >= 0.90. A value below 0.90 does not automatically invalidate an operationally strong model; a value above 0.90 does not compensate for poor event detection, lead time or false alarms.

## Original-submission comparison rule

The competition presentation may compare Model V7 with the original submission only on metrics that are measured under a valid comparable protocol. Old headline numbers are not copied forward merely because they are larger. The stronger claim is the strongest reproducible result that survives unseen-time, unseen-location and event-level testing.

If a legitimately leakage-free model achieves or exceeds the original headline discrimination numbers, report it. If it does not, do not manufacture or tune toward a cosmetic percentage.

## Freeze and reporting rule

Before final-holdout scoring, freeze:
- event registry version and hashes;
- source/API parameters;
- feature list;
- spatial grids/catchment points;
- candidate models and search spaces;
- candidate-selection metric;
- calibration method;
- alert persistence/cooldown policy;
- final operating threshold selection rule;
- final holdout membership.

The final evidence pack must include ROC-AUC, PR-AUC, precision, recall, F1, Brier score, event detection, median/mean lead time, false-alert episodes, per-location results, confusion matrices, confidence intervals where sample size permits, baseline comparisons and a plain-language limitations section.

No production/public-warning authority is implied by retrospective success. Prospective shadow validation remains required.