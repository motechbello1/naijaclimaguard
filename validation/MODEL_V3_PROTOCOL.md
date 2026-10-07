# NaijaClimaGuard Model v3 development protocol

## Status

**Development only. Not production validated.**

The live NaijaClimaGuard risk engine remains `derived-v2`. Model v3 must not be connected to `/api/v1/risk`, alerts, public performance claims or fixed lead-time claims until the freeze and new-holdout gates below are completed.

## Why v3 exists

Validation v2 replaced the former random row-level/proxy-label evaluation with independent documented flood events and a chronological 2022-2024 holdout. Its first local frozen benchmark showed weak later-period generalization, and a second local reproduction differed slightly at the fixed 0.50 threshold. Both runs led to the same scientific conclusion: the tested XGBoost is not production-ready. Raw calendar features (`day_of_year`, `month`) dominated the model's importance diagnostics, creating a seasonal-overfitting warning.

Because 2022-2024 has now been observed, it is permanently excluded from Model v3 feature selection, model selection, hyperparameter tuning, calibration and threshold selection.

## Hard development boundary

- development start: `2018-01-01`
- development end: `2021-12-31`
- hard cutoff: `2022-01-01`
- no development row or enabled Model v3 event may be on or after the cutoff
- 2022-2024 is not a Model v3 holdout and must not be used to rescue or rank candidates

## Ground-truth registry

Model v3 uses `validation/model_v3_event_registry.csv`, separate from the frozen Validation v2 registry.

The registry is now frozen for this Model v3 development generation at **16 independently documented pre-2022 flood-event anchors** across Lokoja, Makurdi, Onitsha, Yenagoa and Hadejia. The distribution is fixed at:

- 2018: 4 events
- 2019: 5 events
- 2020: 4 events
- 2021: 3 events

Five independently sourced anchors were added during the pre-score development-registry audit, before Model v3 candidate scores were generated:

- Makurdi — 2019-08-08
- Hadejia — 2019-08-17
- Yenagoa — 2019-10-18
- Makurdi — 2019-10-28
- Onitsha — 2020-09-10

The selection rule is documentary evidence of an active, materially disruptive flood event at the named location/date, not rainfall, discharge, model probability or desired class balance. Inclusion and exclusion decisions are recorded separately in `validation/MODEL_V3_EVENT_REGISTRY_AUDIT.md` so events cannot be silently added or removed after model scores are seen.

Any later registry change is a protocol change and requires a new model-development generation rather than a quiet rerun of this one.

## Development target

Primary development positives are the documented anchor date and the preceding three days (`anchor-3d` through `anchor`). Post-event days are **not** positive training labels.

Rows inside a ±14-day event uncertainty window that are not primary positives are excluded from development scoring/training. This avoids confidently treating near-event days as negatives while keeping the event anchor independent of predictor thresholds.

This remains a **historical event-window target**. It does not by itself demonstrate issue-time 24/48/72-hour warning skill.

## Temporal cross-validation

Candidate ranking uses expanding-year forward validation only:

1. train on 2018 → validate on 2019
2. train on 2018-2019 → validate on 2020
3. train on 2018-2020 → validate on 2021

The frozen registry supplies **12 independent event anchors in the 2019-2021 out-of-fold validation years**. This clears the provisional development gate for candidate comparison but remains a modest event sample; uncertainty, per-fold, per-event and per-location behavior must be reported rather than hidden behind a single aggregate metric.

## Location/reach calibration

Empirical normalization is fitted **inside each fold from training years only** and then applied to that fold's validation year. Current calibrated features include:

- discharge / training-location median discharge
- robust discharge deviation from the training-location baseline
- robust rainfall deviation from the training-location baseline

No statistic may be fitted on a future validation year. These features are reach-normalization diagnostics, not a claim that sparse GloFAS-vs-ground comparisons establish national discharge accuracy.

## Seasonal-overfitting controls

Raw `month` and `day_of_year` are forbidden from all candidates eligible to win Model v3 selection.

Two calendar diagnostics remain intentionally available:

- a season-only cyclic logistic baseline
- a regularized XGBoost variant with cyclic season features

They are **diagnostic only** and cannot be selected as the winner. If the hydrological winner fails to materially outperform season-only signal, that is a warning against freezing the model.

## Candidate set

Current predeclared candidate families are:

- class-balanced logistic regression
- class-balanced random forest
- regularized XGBoost

The fixed comparison set is intentionally small. The already-observed 2022-2024 results must never be used to add/remove a candidate or tune its parameters.

## Metrics and threshold

Primary ranking metric: temporal-fold PR-AUC, appropriate for the rare-event setting.

Also report:

- ROC-AUC
- Brier score
- precision / recall / F1
- false-alarm ratio
- miss rate
- confusion matrix
- independent event-window detection rate
- per-fold metrics
- per-location metrics
- a development-only threshold frontier showing event detection and false-alert burden

A threshold chosen by pooled out-of-fold F1 is treated only as a **provisional development diagnostic**, not as an operational flood-warning threshold. Before freeze, threshold choice must be justified from development data under an explicit false-alert / missed-event operating policy. It is never optimized against 2022-2024.

## Reproducibility

Model v3 uses Python 3.11 and `validation/model_v3_requirements.txt` with exact package versions. CI records `pip freeze` as a retained runtime artifact. Do not widen package versions during the current candidate/freeze cycle.

Every full development result must preserve:

- source/input fingerprints
- event-registry fingerprint
- code commit SHA
- exact Python/package runtime
- candidate definitions
- provisional threshold and its development-only origin
- fold-level metrics
- per-location diagnostics
- threshold frontier / alert-burden diagnostics

## Freeze gate

Do **not** freeze Model v3 merely because one development metric looks attractive. Before freeze:

1. Validation v2 CI must establish the canonical historical benchmark without cherry-picking either local reproduction.
2. Model v3 protocol/registry CI must pass in the pinned environment.
3. A complete 2018-2021 development run must be reproduced in CI.
4. Event definition, seasonal diagnostic and location/reach behavior must be reviewed.
5. The operating-threshold policy must be declared from development-only evidence and its false-alert / missed-event tradeoff documented.
6. The exact feature builder, candidate, parameters, preprocessing/calibration and threshold must be committed and fingerprinted.

Only then may the entire decision pipeline be frozen.

## New untouched evaluation

The final validation target must be a **new genuinely untouched/prospective holdout** obtained after the pipeline is frozen. The already-observed 2022-2024 period is not eligible to become untouched again.

No features, hyperparameters, calibration constants or thresholds may be changed after the new holdout is opened. If the frozen model fails, the result is recorded and a later model generation begins with a different future holdout.
