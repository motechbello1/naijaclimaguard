# Model v5 Operational-Native Forward Forecast Protocol

Status: preregistered before Model v5 source retrieval, feature assembly, candidate scoring, threshold selection, or replay evaluation.

## Goal
Develop a flood-forecast candidate whose development inputs structurally match the data available to NaijaClimaGuard at issue time: low-latency NASA IMERG Early rainfall plus GloFAS forecast trajectories. Model v5 predicts whether an independently documented flood event will occur strictly in the next 1–3 days.

Model v5 does not replace the frozen Model v4 prospective shadow generation. Model v4 continues collecting prospective evidence unchanged. Model v5 is a separate generation.

## Locations and outcome registry
Pilot locations remain:
- Lokoja
- Makurdi
- Onitsha
- Yenagoa
- Hadejia

Outcome anchors are frozen to `validation/model_v4_event_registry.csv` for this generation. The registry contains 35 independently documented 2018–2024 flood-event anchors. Event additions, removals, or date changes after any Model v5 score is inspected require a new model generation.

## Development data
### Rainfall
- NASA GPM IMERG Early Daily V07 (`GPM_3IMERGDE`).
- Historical development interval: 2018-01-01 through 2024-12-31.
- Only rainfall observations dated strictly before a Model v5 issue timestamp may enter a feature vector.
- Derived rainfall features: 1d, 3d, 7d, 14d, 30d accumulation; 3d/14d and 7d/30d concentration; 3d-vs-prior-3d acceleration; wet-day counts.

### River forecast
- Copernicus CEMS GloFAS medium-range reforecasts (`cems-glofas-reforecast`).
- Product type: `control_reforecast` for the primary development contract.
- Primary forecast leads: +24h, +48h, +72h.
- Reforecasts are development inputs, not evidence of what the historical operational system actually issued.
- GloFAS reforecast issue dates are used exactly as supplied by the reforecast archive; development rows are created only for available reforecast initialisation dates.
- Derived river features: q24, q48, q72, max(q24:q72), q48-q24, q72-q24, percentage rise, monotonic-rise indicator, forecast slope per day, and location-normalized forecast levels fit on training folds only.

### Operational replay
Archived GloFAS operational forecasts (`cems-glofas-forecast`, `system_version=operational`) are used only for a separate issue-time transfer/replay diagnostic where available. Archived operational replay never changes the selected candidate, feature set, hyperparameters, or threshold after development scoring.

## Strict future target
For an issue timestamp `t`:
- positive = a frozen event anchor for the same location occurs after `t` and no later than `t + 72 hours`;
- same-day / already-observed event anchors at or before `t` are not positive;
- no post-event row is labelled positive because of that event;
- rows whose future-outcome status cannot be determined from the frozen registry are retained as ordinary negatives except for the uncertainty exclusion below.

To reduce ambiguous near-event negatives, non-positive rows within 3 days after an event anchor are excluded from development evaluation. This does not create extra positives.

## Temporal validation
Walk-forward validation only. For every validation year Y in 2019–2024:
- train on issue rows strictly before January 1 of Y;
- validate on issue rows inside Y;
- all imputation, scaling, location normalization, class weighting, calibration, and feature selection are fit on the training fold only;
- no future year may influence an earlier fold.

A fold without both classes is reported and excluded from aggregate model ranking, not silently converted into a random split.

## Predeclared feature groups
### Group A — operational-native core
- NASA Early rainfall-derived features
- GloFAS q24 / q48 / q72 and trajectory features
- location-normalized GloFAS forecast features
- location one-hot indicators

### Group B — rainfall ablation
Same as Group A without NASA rainfall features.

### Group C — river ablation
NASA rainfall-derived features plus location indicators, without GloFAS forecast features.

Only Group A candidates are eligible to win. Groups B and C are diagnostic ablations to prove whether both source families add value.

## Eligible candidates
Hyperparameters are fixed before scoring:
1. `logistic_operational_native`
   - L2 regularization
   - C = 0.05
   - class_weight = balanced
   - max_iter = 4000
2. `random_forest_operational_native`
   - n_estimators = 600
   - min_samples_leaf = 4
   - max_features = sqrt
   - class_weight = balanced_subsample
   - random_state = 42
3. `xgboost_operational_native`
   - n_estimators = 400
   - max_depth = 3
   - learning_rate = 0.025
   - min_child_weight = 4
   - subsample = 0.85
   - colsample_bytree = 0.85
   - reg_lambda = 5.0
   - reg_alpha = 0.25
   - positive-class weight derived from the training fold only
   - random_state = 42

No hyperparameter sweep is permitted in this generation after scores are inspected. If these fixed candidates all fail, v5 fails and a new generation must preregister any tuning strategy.

## Candidate ranking
Among eligible Group A candidates:
1. highest mean temporal-fold PR-AUC;
2. lower pooled out-of-fold Brier score as tie-breaker;
3. higher pooled ROC-AUC as final tie-breaker.

PR-AUC is primary because flood-positive issue rows are rare.

## Development sanity gates
Before any threshold is eligible:
- every usable temporal fold PR-AUC must exceed its own positive prevalence baseline;
- pooled OOF PR-AUC must exceed pooled prevalence by at least 2x;
- the winning Group A candidate must beat both rainfall-only and GloFAS-only ablations in pooled PR-AUC, or the result is flagged as source-redundant and cannot be frozen without a new protocol;
- all five locations must be reported separately; location metrics with zero positives are marked insufficient rather than invented.

## Predeclared operating-threshold gate
Evaluate thresholds 0.01 through 0.99 in 0.01 steps on pooled OOF issue rows. A threshold qualifies only if all are true:
- independent event detection >= 75%;
- precision >= 10%;
- false-positive issue rows <= 10 per 1,000 negative issue rows;
- scientific sanity gates pass.

If multiple thresholds qualify, choose the highest threshold. If no threshold qualifies, Model v5 is not frozen for prospective replacement evaluation. Criteria are not relaxed after scoring.

## Event detection definition
An event is detected when at least one eligible issue row for the same location, issued strictly before the event and within the preceding 72 hours, crosses the threshold. Report first crossing and issue-to-event lead hours. These are historical reforecast-development lead times, not proof that the historical operational system issued the same warning.

## Operational-transfer replay
After model/threshold selection is complete, a separate replay may replace reforecast q24/q48/q72 with archived operational q24/q48/q72 for documented events where an exact issue-time operational archive can be retrieved. This replay is diagnostic only and may not be used to retune v5.

## Freeze rule
A freeze candidate may be serialized only if:
- source QA passes;
- temporal validation completes;
- development sanity gates pass;
- an eligible threshold exists;
- the exact feature contract is consistent across folds;
- all development-source and event-registry hashes are preserved.

A frozen v5 candidate remains shadow-only until it passes a new prospective acceptance study. Model v4 prospective evidence cannot be retroactively reassigned to v5.

## Production rule
Production remains `derived-v2`. Model v4 remains the currently frozen prospective shadow generation. Model v5 must not trigger public alerts, alter `/api/v1/risk`, or claim validated 24/48/72-hour warning skill merely because GloFAS forecast leads are inputs.