# Model v5 Operational-Archive Forward Forecast Protocol

Status: preregistered before any Model v5 candidate score, threshold result, ablation result, or freeze decision is available.

## Why this protocol replaces the reforecast-development contract
The original Model v5 protocol specified GloFAS medium-range reforecasts. During source acquisition, EWDS repeatedly rejected the requested reforecast combinations and no Model v5 scientific result files had been produced when this amendment was made.

The replacement source is the archived operational GloFAS forecast product (`cems-glofas-forecast`). This is scientifically stronger for the intended claim because these are actual historical operational forecast trajectories rather than hindcast/reforecast proxies.

During source verification, the current EWDS documentation and live service behaviour showed that the consistently retrievable archived **control-forecast** contract is `system_version=operational`, `hydrological_model=lisflood`, `product_type=control_forecast` from **2021-05-26 onward**. Earlier v2.x documentation exposes legacy ensemble-perturbed forecast retrievals rather than the same control-forecast contract. To avoid silently mixing fundamentally different forecast products, Model v5 is therefore restricted to the consistent archived control-forecast era beginning 2021-05-26. This restriction was made before any Model v5 score existed.

## Goal
Predict whether an independently documented flood event will occur strictly in the next 1–3 days using only data structurally available at issue time: NASA GPM IMERG Early rainfall history plus archived operational GloFAS +24/+48/+72-hour river-discharge control forecasts.

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
- System version request: `operational`.
- Hydrological model: `lisflood`.
- Product type: `control_forecast`.
- Variable: river discharge in the last 24 hours.
- Primary leads: +24h, +48h, +72h.
- Consistent control-forecast archive eligibility begins **2021-05-26**.
- Development rows are created only for issue dates actually retrieved from the archived operational product.
- River features remain q24, q48, q72, qmax, q48-q24, q72-q24, percentage rise, monotonic-rise indicator, slope and training-fold-only location normalization.

## Strict future target
For issue timestamp/date `t`, positive means a frozen event for the same location occurs strictly after `t` and no later than `t + 72 hours`. Same-day/already-observed events are not positives. Non-positive rows within 3 days after an event anchor remain excluded from development evaluation.

## Temporal validation
Walk-forward validation only for validation years **2022, 2023 and 2024**:
- 2021-05-26 through 2021-12-31 is development history available to the first 2022 fold;
- each validation fold trains only on eligible issue rows before January 1 of the validation year;
- validate only on eligible issue rows within that year;
- all preprocessing, imputation, scaling, location normalization, class weighting and feature transformations are fit on the training fold only;
- no future year influences an earlier fold.

Events before 2021-05-26 remain in the frozen registry for provenance but are not included in the Model v5 event-detection denominator because no issue row exists under this consistent control-forecast source contract. Event detection is evaluated only for frozen events after archive eligibility begins and within the 2022–2024 out-of-fold scoring years.

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
Because this protocol uses archived operational forecasts, successful historical lead-time results may be described only as archived operational replay evidence for the eligible 2022–2024 validation folds. They are still not prospective proof. Production remains unchanged until a separate prospective acceptance study passes.
