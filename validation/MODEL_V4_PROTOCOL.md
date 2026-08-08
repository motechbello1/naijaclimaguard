# Model v4 Full-History Forward Forecast Protocol

Status: development protocol for the final pre-prospective candidate generation.

## Objective
Train an ML model to estimate whether an independently documented flood event will occur in the next 1-3 days at each pilot location. This is a forward-warning target, not a same-day flood classifier.

## Historical development data
All already-consumed historical evidence may be used for development because none of it will be represented as untouched evidence again.

- Period: 2018-01-01 through 2024-12-31.
- Locations: Lokoja, Makurdi, Onitsha, Yenagoa, Hadejia.
- 12,785 fused location-days.
- 35 independently documented flood-event anchors.
- Inputs: NASA GPM IMERG precipitation, GloFAS discharge, ERA5-Land surface state, and lagged/rolling hydrological features derived only from information at or before each prediction date.

2022-2024 is explicitly DEVELOPMENT data in this generation. It must never again be described as an untouched holdout.

## Forward target
For an event with observed anchor date D:
- positive prediction dates are D-3, D-2 and D-1;
- D itself is not a positive prediction row;
- no post-event day is a positive;
- non-positive rows within +/-14 days of an event anchor are excluded from negative training/evaluation to reduce documentary date uncertainty.

This target asks: `Will a documented flood occur within the next 72 hours?`

## Leakage controls
- Expanding temporal validation: train on all years before Y, validate on Y for Y=2019..2024.
- NASA/GloFAS/ERA5 rolling and lagged fields may only use values dated at or before the prediction issue date.
- Any location normalization, imputation, scaling or calibration parameter is fit on the training fold only.
- Raw month and day_of_year are forbidden from eligible models.
- No future operational forecast or later reanalysis value may be inserted into a historical issue-time row.

## Candidate search
The development search may compare regularized logistic regression, random forest, XGBoost, CatBoost/LightGBM where reproducibly available, and simple ensembles. Hyperparameters are selected only from the historical development corpus using expanding temporal validation.

Primary ranking:
1. robust temporal PR-AUC / PR lift across validation years;
2. every validation year should beat its own prevalence baseline where possible;
3. pooled PR-AUC and Brier score as secondary diagnostics;
4. simpler models are preferred when performance is materially similar.

Because the next evidence phase is genuinely prospective, historical development may be iterated before freeze. Once the prospective freeze commit is created, no model, feature, calibration or threshold change is allowed for that prospective generation.

## Historical operating threshold
A fixed shadow threshold is selected before prospective collection. The threshold-selection rule and resulting threshold must be written into the freeze manifest. Historical threshold performance is development evidence only; it is not a claim of operational accuracy.

## Full-source inference contract
The prospective full-source model must record at issue time:
- NASA IMERG near-real-time rainfall product/version and timestamps;
- GloFAS operational forecast / current discharge product, model version, issue time and lead time;
- available surface-state / soil-moisture product and timestamp;
- all feature values or a content hash;
- model hash, threshold, probability and decision.

A degraded-source prediction may be produced for continuity, but it is marked `degraded` and cannot count toward the full-source replacement evidence unless a separate protocol predeclares that mode.

## Freeze and production rule
After final historical development, fit the chosen model on all permitted 2018-2024 development rows, serialize the exact artifact, record SHA-256 hashes, and freeze the operating threshold and feature contract.

The frozen model may immediately issue future predictions in SHADOW mode. It does not replace `derived-v2` until the prospective acceptance protocol passes.