# Model v4 Development Protocol

Status: preregistered before Model v4 scoring.

## Goal
Build a stronger hydrological flood-risk candidate without reusing 2022-2024 for model, feature, hyperparameter, or threshold selection.

## Development data
- Locations: Lokoja, Makurdi, Onitsha, Yenagoa, Hadejia.
- Development period: 2018-01-01 through 2021-12-31 only.
- Inputs: fused NASA GPM IMERG precipitation, GloFAS river discharge, ERA5-Land soil moisture / surface state, plus rolling and lagged hydrological features already generated from those sources.
- 2022-2024 remains previously observed evidence and is permanently ineligible as an untouched holdout.

## Outcome registry
The existing independent documentary event anchors remain the initial v4 labels. Any future expansion of the event registry must be performed under a documented source-search protocol that does not inspect Model v4 scores while selecting events; an expanded registry creates a new generation and invalidates prior v4 scores.

## Target
- Positive: anchor-3 days through the independent observed event anchor date.
- No post-event positive days.
- Exclude non-positive rows within +/-14 days of a known event anchor from negative training/evaluation.

## Leakage controls
- Expanding temporal CV only: 2018->2019, 2018-2019->2020, 2018-2020->2021.
- Every location/reach statistic, quantile, percentile transform, imputation value and scaling parameter is fit inside the training fold only.
- Raw month and day_of_year are forbidden from eligible candidates.
- A cyclic-season model remains diagnostic only and cannot win.
- No 2022-2024 result may alter v4 candidate design or threshold.

## Predeclared feature engineering
In addition to the hydrological source variables already used by v3, v4 may derive, training-fold-only:
- location-relative robust z-scores and ratios;
- empirical percentile ranks for discharge, 3/7/14/30-day rainfall, soil-moisture profile and 7-day water balance;
- exceedance ratios to training-fold location q90 and q95 levels;
- normalized discharge changes and rainfall acceleration;
- antecedent rainfall concentration ratios (3d/14d and 7d/30d);
- hydrological interactions: discharge percentile x soil percentile, rainfall percentile x soil percentile, and discharge percentile x rainfall percentile;
- one-hot location indicators.

## Hard-negative weighting
Training only. Negative rows that are hydrologically active (top training-fold quintile of discharge percentile or 7-day rainfall percentile) receive 3x negative weight; other negatives receive baseline weight. Positives receive class-balancing weight. Evaluation rows are never resampled or reweighted.

## Predeclared eligible candidates
1. `xgboost_hydro_interactions`
2. `random_forest_hydro_interactions`
3. `logistic_hydro_interactions`

A cyclic-season XGBoost variant and season-only logistic model may be computed as diagnostics but are not eligible winners.

## Candidate ranking and operating gate
For every candidate, pooled out-of-fold probabilities are produced for 2019-2021. Threshold frontier is evaluated from 0.01 to 0.99 in 0.01 steps.

A candidate/threshold pair is operationally eligible only if all are true:
- independent event-window detection >= 75% (at least 9/12 OOF anchors);
- false-positive location-days <= 10 per 1,000 negative OOF location-days;
- precision >= 10%;
- every temporal fold PR-AUC exceeds its own prevalence baseline;
- every pilot location with positive OOF rows has PR-AUC above its own prevalence baseline;
- pooled PR-AUC exceeds the season-only diagnostic by > 0.01 absolute.

If no pair qualifies, Model v4 fails and is not frozen. Criteria are not relaxed after scoring.

If one or more pairs qualify, choose the candidate with the highest mean temporal-fold PR-AUC; tie-break by lower pooled Brier score, then lower false-positive burden. For that candidate choose the highest qualifying threshold.

## Production rule
Passing development permits creation of a frozen shadow candidate only. It does not authorize public warnings or replacement of `derived-v2`.
