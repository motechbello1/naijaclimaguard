# Model v5 Operational-Archive Forward Forecast Protocol

Status: preregistered before any Model v5 candidate score, threshold result, ablation result, or freeze decision is available.

## Why this protocol replaces the reforecast-development contract
The original Model v5 protocol specified GloFAS medium-range reforecasts. During source acquisition, EWDS repeatedly rejected the requested reforecast combinations and the catalogue showed that the reforecast product is not currently downloadable through the normal download form. No Model v5 scientific result files had been produced when this amendment was made.

The replacement source is the archived operational GloFAS forecast product (`cems-glofas-forecast`). This is scientifically stronger for the intended claim because these are actual historical operational forecast trajectories rather than hindcast/reforecast proxies.

## Goal
Predict whether an independently documented flood event will occur strictly in the next 1–3 days using only data structurally available at issue time: NASA GPM IMERG Early rainfall history plus archived operational GloFAS +24/+48/+72-hour river-discharge forecasts.

Model v5 remains shadow-only and does not replace production or the frozen Model v4 prospective collection.

## Locations and outcome registry
Pilot locations remain Lokoja, Makurdi, Onitsha, Yenagoa and Hadejia. The frozen 35-event registry remains `validation/model_v4_event_registry.csv`. No event may be added, removed or date-shifted after scoring.

## Development sources
### NASA rainfall
- NASA GPM IMERG Early Daily V07 (`GPM_3IMERGDE`).
- Complete rainfall observations strictly before the issue date only.
- Features remain: 1d, 3d, 7d, 14d, 30d accumulation; concentration ratios; 3d acceleration; wet-day counts.

### GloFAS river forecasts
- Dataset: `cems-glofas-forecast`.
- System version: `operational`.
- Product type: `control_forecast`.
- Variable: river discharge in the last 24 hours.
- Primary leads: +24h, +48h, +72h.
- Archive eligibility begins 2019-11-05; the primary walk-forward scoring years are 2020–2024.
- Development rows are created only for dates actually retrieved from the operational archive.
- River features remain q24, q48, q72, qmax, q48-q24, q72-q24, percentage rise, monotonic-rise indicator, slope and training-fold-only location normalization.

## Strict future target
For issue timestamp/date `t`, positive means a frozen event for the same location occurs strictly after `t` and no later than `t + 72 hours`. Same-day/already-observed events are not positives. Non-positive rows within 3 days after an event anchor remain excluded from development evaluation.

## Temporal validation
Walk-forward validation only for validation years 2020, 2021, 2022, 2023 and 2024:
- train only on eligible issue rows before January 1 of the validation year;
- validate only on issue rows within that year;
- all preprocessing, imputation, scaling, location normalization, class weighting and feature transformations are fit on the training fold only;
- no future year influences an earlier fold.

Events before the operational archive begins are preserved in the registry for provenance but are not included in the Model v5 event-detection denominator because no eligible operational issue row can exist for them. Event detection is evaluated only for frozen events dated 2020–2024 that have an eligible operational-archive period.

## Candidate feature groups
Group A (eligible to win): NASA rainfall + GloFAS forecast trajectory features + location indicators.
Group B: GloFAS-only ablation.
Group C: NASA-only ablation.

## Eligible candidates and fixed hyperparameters
1. Logistic Regression: L2, C=0.05, class_weight=balanced, max_iter=4000.
2. Random Forest: 600 trees, min_samples_leaf=4, max_features=sqrt, class_weight=balanced_subsample, random_state=42.
3. Regularized XGBoost: 400 trees, depth=3, learning_rate=0.025, min_child_weight=4, subsample=0.85, colsample_bytree=0.85, lambda=5.0, alpha=0.25, training-fold-derived positive weight, random_state=42.

No post-score hyperparameter sweep is permitted.

## Ranking
Highest mean temporal-fold PR-AUC wins; lower pooled OOF Brier score breaks ties; higher pooled ROC-AUC is the final tie-breaker.

## Sanity gates
Before threshold selection:
- every usable fold PR-AUC must exceed its positive-prevalence baseline;
- pooled OOF PR-AUC must exceed pooled prevalence by at least 2x;
- the winning combined model must beat both NASA-only and GloFAS-only ablations in pooled PR-AUC;
- all five locations are reported separately.

## Threshold gate
Thresholds 0.01–0.99 in 0.01 steps are evaluated on pooled OOF rows. A threshold qualifies only if all are true:
- independent eligible-event detection >=75%;
- precision >=10%;
- false-positive issue rows <=10 per 1,000 negative issue rows;
- sanity gates pass.

If multiple thresholds qualify, choose the highest. Gates are not relaxed after scoring.

## Freeze rule
A candidate serializes only if source QA, temporal validation, sanity gates, threshold gate, feature-contract consistency and source/event hashes all pass. The serialized status remains `freeze_candidate_serialized_not_production_validated`; otherwise the status is `freeze_blocked`.

## Claim boundary
Because this protocol uses archived operational forecasts, successful historical lead-time results may be described as archived operational replay evidence for 2020–2024. They are still not prospective proof. Production remains unchanged until a separate prospective acceptance study passes.
