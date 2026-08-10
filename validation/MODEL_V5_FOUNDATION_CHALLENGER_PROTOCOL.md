# Model v5 Foundation-Model Challenger Protocol

Status: preregistered before any foundation-model challenger score exists.

## Purpose

Test whether a pretrained foundation model can improve NaijaClimaGuard's issue-time flood-event classification without weakening the frozen scientific rules used by Model v5.

This challenger is additive. It does not alter, cancel, replace, or reinterpret the frozen `MODEL_V5_OPERATIONAL_ARCHIVE_PROTOCOL.md` development experiment.

## Challenger A: TabPFN v2

TabPFN v2 is used as a pretrained tabular classification challenger because its pretraining is not based on NaijaClimaGuard's 2021-2024 Nigerian flood-event benchmark. It receives the same issue-time features already admitted by Model v5 and is evaluated on the same outer temporal years.

Evaluation years: 2022, 2023, 2024.

For outer year Y:

1. Training rows must have `issue_date < Y-01-01`.
2. Validation rows must have `issue_date` in Y.
3. Location-normalization statistics are fitted only on the outer training rows.
4. The foundation model sees no labels from Y before predicting Y.
5. Operating-threshold selection for threshold-dependent metrics uses prior-year information only. The held-out outer year cannot choose its own threshold.
6. No post-score hyperparameter sweep is permitted.

Feature sets are evaluated separately:

- `nasa_only`: Model v5 rainfall-history features.
- `glofas_only`: Model v5 archived-operational river trajectory and prior-fitted normalized river features.
- `combined`: NASA + GloFAS admitted issue-time features.

The feature set is not allowed to use retrospective GloFAS river state, same-day/future observations, event dates, labels, event IDs, or calendar shortcuts not already admitted by the frozen Model v5 protocol.

## Metrics

Headline discrimination/calibration metrics:

- temporal PR-AUC by outer year and pooled untouched outer predictions;
- temporal ROC-AUC by outer year and pooled untouched outer predictions;
- Brier score by outer year and pooled untouched outer predictions.

Operational metrics use a threshold chosen without the scoring year:

- eligible-event detection;
- precision;
- false-positive issue rows per 1,000 negative issue rows;
- median archived-operational lead time for detected eligible events;
- per-location PR-AUC, ROC-AUC and prevalence.

The output must always report both:

- eligible evaluated event count for the scored folds; and
- total documented registry count (35).

## Freeze relationship

This branch is a challenger study. A good TabPFN result does not automatically replace the frozen Model v5 winner or authorize production alerts.

The challenger is considered scientifically interesting only if it is evaluated on the same untouched outer years and materially improves the evidence profile without worsening calibration or false-positive burden.

Any production promotion still requires an explicit separate freeze decision and prospective validation.

## Challenger B: OpenHydroNet

Google Research's released OpenHydroNet pretrained weights were trained through 2023. Their own release documentation states that those weights must not be used to claim temporal forecasting performance on historical 1982-2023 data because the period was seen during pretraining.

Therefore the released OpenHydroNet weights are NOT eligible for NaijaClimaGuard's 2022 or 2023 temporal benchmark.

Permitted uses here are limited to:

- a 2024-only post-pretraining temporal challenger, provided the Nigerian inference data path is issue-time clean and the local basin is otherwise valid for the model;
- future/prospective inference after 2023;
- local fine-tuning once appropriate Nigerian streamflow/gauge targets and compatible basin attributes/forcing inputs exist.

OpenHydroNet must never be used to manufacture a 2022-2024 pooled score from weights that have already seen 2022-2023 during pretraining.

## Data-integrity rule

If the synchronized NASA+GloFAS Model v5 issue-time dataset is not yet available, this branch may compile and validate the challenger code but must not fabricate a score from partial or mismatched data merely to obtain an accuracy number.

No metric is publishable until its input manifest identifies source coverage, issue-time provenance, feature set, outer folds, model version and threshold-selection rule.
