# Model v5 Confirmatory Nested Scoring Protocol

Status: frozen before any confirmatory score exists.

## Purpose
This protocol is a scoring-only confirmation of the existing Model v5 archived-operational development experiment. It must use the exact frozen issue-time dataset produced from NASA IMERG Early V07 plus archived operational GloFAS control forecasts. It must not retrieve new source data, change features, change candidate hyperparameters, or authorize production replacement.

## Scientific role
The original Model v5 development result remains development evidence under its preregistered protocol. This confirmatory pass exists only to remove optimism from pooled post-hoc operating-threshold selection and to test the full selection procedure under nested temporal isolation.

## Outer evaluation
Scoring years are fixed to 2022, 2023, and 2024.

For outer scoring year Y:
1. prior data = rows with issue_date strictly before Y-01-01;
2. outer test data = rows whose issue_date is in Y;
3. no row from Y or any later year may influence candidate selection, threshold selection, normalization statistics, fitting, or fallback decisions;
4. outer test probabilities and decisions are generated once after all prior-only choices are frozen.

## Inner selection
Inside the prior-data window only, candidate models are compared using expanding monthly temporal holdouts. Random cross-validation is prohibited.

Candidates remain exactly:
- Logistic Regression
- Random Forest
- regularized XGBoost

Candidate ranking is by inner temporal PR-AUC, with Brier score and ROC-AUC as tie-breakers.

## Threshold selection
For each outer year, the operating threshold is selected only from prior-data inner out-of-fold predictions.

The fixed threshold grid is 0.01 through 0.99 in increments of 0.01.

A threshold qualifies only if prior-only evidence meets all of:
- eligible-event detection rate >= 0.75;
- precision >= 0.10;
- false-positive issue rows <= 10 per 1,000 negatives.

The highest qualifying threshold is selected.

If no usable temporal inner fold exists, the predeclared fallback is Logistic Regression at threshold 0.50.
If inner model selection is usable but no threshold qualifies, the predeclared fallback threshold is 0.50 for the prior-selected candidate.
Fallback use must be explicit in the result file and must never be silently treated as a tuned threshold.

## Feature groups / ablations
The same nested prior-only procedure is run independently for:
- combined NASA + GloFAS core features;
- NASA-only rainfall features;
- GloFAS-only river features.

Combined performance must beat both single-source groups on pooled untouched outer PR-AUC to satisfy the source-fusion gate.

## Metrics
Threshold-free outer metrics:
- PR-AUC;
- ROC-AUC;
- Brier score.

Threshold-dependent outer metrics using each fold's prior-selected threshold:
- precision;
- eligible-event detection rate;
- false-positive issue rows;
- false-positive issue rows per 1,000 negatives;
- median lead time among detected eligible events;
- confusion matrix.

All headline metrics must also be reported by location.

## Event denominator
Every result must report both:
- eligible evaluated events in the confirmatory outer years;
- documented events in the frozen registry.

The wording structure is mandatory, but numeric values are generated from the frozen run artifact and must never be hard-coded from a previous result.

## Data availability
This confirmatory scorer consumes only the already-built issue-time dataset. Archived operational GloFAS issue provenance and NASA IMERG Early source provenance remain inherited from the frozen dataset manifest. Retrospective reanalysis may not be substituted.

## Decision state
The only final states are:
- `freeze_candidate_serialized_not_production_validated` when all confirmatory gates pass;
- `freeze_blocked` otherwise.

Even a passing result does not authorize public-alert replacement. Production remains `derived-v2` until prospective validation and controlled deployment evidence exist.
