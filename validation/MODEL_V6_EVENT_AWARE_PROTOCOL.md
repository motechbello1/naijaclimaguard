# Model v6 Event-Aware Development Protocol

Status: FROZEN BEFORE FIRST MODEL V6 SCORE

Model v5 remains immutable evidence with `freeze_blocked`. Model v6 is a single-shot successor design intended to test whether a location/season-aware event formulation can solve the operational-threshold failure without relaxing any gate.

## Evidence and target

- Reuse the preserved NASA IMERG Early V07 artifacts and the complete archived-operational GloFAS control-forecast archive already validated for Model v5.
- GloFAS source eligibility still begins 2021-05-26.
- Event registry remains `validation/model_v4_event_registry.csv` with the same 35 documented benchmark events.
- Target remains a documented flood strictly after issue time and within the next 72 hours. Same-day events never count as forecast positives.
- Development validation years remain 2022, 2023 and 2024, strictly walk-forward.

## Why Model v6 is structurally different

Model v5 proved that one conventional row classifier plus one national probability threshold is insufficient. A post-v5 diagnostic also proved that even an optimistic oracle using separate thresholds for all five pilot locations cannot satisfy the unchanged gate using the Model v5 score.

Model v6 therefore changes the risk representation, not the success criteria.

## Frozen Model v6 feature design

All transformations used to define local climatology are fit on the training portion of each temporal fold only.

Raw issue-time features retained:
- rain_1d, rain_3d, rain_7d, rain_14d, rain_30d
- rain_accel_3d, rain_3_14_ratio, rain_7_30_ratio
- wet_days_7d, wet_days_30d
- q24, q48, q72, qmax_72
- q48_minus_q24, q72_minus_q24, q72_pct_rise, q_slope_per_day, q_monotonic_rise

Leakage-safe location/season empirical-percentile features:
- q24_pct, q48_pct, q72_pct, qmax_pct
- qrise_abs_pct, qrise_rel_pct
- rain3_pct, rain7_pct, rain14_pct, rain30_pct

Issue-time persistence/change features, computed only from current and earlier issue dates for the same location:
- qmax_delta_1d
- qmax_delta_3d
- q72_delta_1d
- rain7_delta_1d
- qmax_roll3_max
- rain7_roll3_max

Frozen compound features:
- river_extreme = max(q24_pct, q48_pct, q72_pct, qmax_pct)
- river_future_extreme = max(q48_pct, q72_pct, qmax_pct)
- river_trend_extreme = max(qrise_abs_pct, qrise_rel_pct)
- rain_extreme = max(rain3_pct, rain7_pct, rain14_pct, rain30_pct)
- compound_product = river_extreme * rain_extreme
- compound_min = min(river_extreme, rain_extreme)
- river_trend_product = river_extreme * river_trend_extreme
- month_sin and month_cos

## Frozen weighting logic

Positive issue rows are event-balanced within each training fold: each documented future event contributes equal total positive weight regardless of how many eligible positive issue rows it creates. Positive total weight is then scaled to equal negative total weight. Negative rows retain unit weight.

This is intended to align learning with the event-level operational gate rather than allowing multi-row events to dominate training.

## Frozen candidate

Exactly one candidate is permitted:

`xgboost_event_aware_v6`

Fixed parameters:
- n_estimators=500
- max_depth=2
- learning_rate=0.02
- min_child_weight=5
- subsample=0.85
- colsample_bytree=0.80
- reg_lambda=10.0
- reg_alpha=1.0
- random_state=42
- eval_metric=aucpr
- tree_method=hist

No post-score hyperparameter sweep is permitted.

## Validation and ranking

- Walk-forward folds: 2022, 2023, 2024.
- Train only on issue dates before the validation year.
- Fit local/season climatology only from that fold's training data.
- Produce pooled out-of-fold probabilities over 2022-2024.
- Report PR-AUC, ROC-AUC and Brier overall and per fold.
- Report per-location PR-AUC and ROC-AUC.

## Unchanged operational freeze gate

A Model v6 development candidate may be serialized only if an operating threshold exists that simultaneously achieves:

- >=75% independent eligible-event detection
- >=10% precision
- <=10 false-positive issue rows per 1,000 negatives

Threshold candidates remain 0.01 through 0.99 in 0.01 increments. Selection rule remains the highest qualifying threshold.

If no threshold qualifies, status is `freeze_blocked`. Gates may not be relaxed after scoring.

## Claim boundary

A passing result is still archived historical out-of-fold replay evidence, not prospective production validation and not authorization for public alerts. Production remains unchanged unless and until a separate prospective validation process authorizes replacement.
