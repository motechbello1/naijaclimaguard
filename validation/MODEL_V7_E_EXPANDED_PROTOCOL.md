# Model V7-E Expanded Development Protocol

Status: FROZEN BEFORE FIRST V7-E SCORE

V7-E begins only because V7-D failed the frozen operational acceptance criteria. V7-D reduced warning burden but collapsed 2025 event detection to 2/8 and is rejected. V7-E does not query the final 2026 holdout.

## Why V7-E exists

The previous V7 development stage selected model and alert policy from only nine 2024 flood events. That sample is too small to support repeated decision-policy tuning. V7-E therefore expands the independently documented development evidence and treats both 2024 and 2025 as development years because 2025 has already been inspected in V7-A through V7-D.

The final competition holdout remains 2026 and is not read, queried, scored, or used for feature engineering in V7-E.

## Frozen event membership expectation

V7-E expects:
- 10 forecast-suitable 2024 events;
- 9 forecast-suitable 2025 events;
- 19 total development events.

The two new clean additions before this freeze are:
- Otukpo LGA, Benue, 22 September 2024, NEMA documented;
- Ubeta / Ahoada-West LGA, Rivers, 1 April 2025, NEMA documented.

Broad multi-community incidents without a defensible forecast anchor remain excluded rather than forced to a single point.

## Data boundary

Allowed forecast/history years: 2024 and 2025 only.

Forbidden: any Open-Meteo request whose start or end year is 2026 or later.

The source family remains the no-approval Open-Meteo historical/previous-runs archive used by earlier V7 experiments.

## Model targets

Three issue-time targets remain frozen:
- 24 hour flood-onset probability;
- 48 hour flood-onset probability;
- 72 hour flood-onset probability.

No future observation may be used as a predictor.

## Candidate families

Frozen before first V7-E score:
- regularized logistic regression;
- XGBoost;
- equal-weight soft vote of logistic regression and XGBoost.

Frozen horizon aggregators:
- maximum horizon probability;
- mean of the top two horizon probabilities;
- second-highest horizon probability;
- mean of all three horizon probabilities.

No candidate family or aggregator may be added after the first V7-E score without starting a new named experiment.

## Primary development validation

Primary selection uses leave-location-out predictions across the combined 2024+2025 development pool.

All rows for the held-out location are excluded from training, including the same location in another year. This prevents Kaduna, Yola, Makurdi or another repeated location from training on itself in a different year.

## Temporal diagnostic

V7-E also reports a separate forward-time diagnostic:
- train on 2024;
- score 2025;
- no 2025-derived threshold or policy selection is allowed inside this diagnostic.

The forward diagnostic is supporting evidence, not the final competition result.

## Alert-policy search

Candidate policies are selected only from combined leave-location-out predictions.

Frozen search dimensions:
- low probability threshold;
- urgent/high probability threshold;
- persistence of 1, 2 or 3 consecutive issue days;
- cooldown of 0 or 1 day.

Cooldown is intentionally capped at one day so false-alert burden cannot be hidden by joining many warning days into a few long episodes.

## Internal product sanity gate

Warning fraction must be <= 15% of eligible issue days during development selection. This is not presented as a competition metric. It is an anti-gaming product constraint so a technically small episode count cannot represent months of continuous warnings.

## Selection priority

A policy is eligible for selection only if development leave-location-out evidence has:
1. event detection >= 80%;
2. median first-alert lead >= 48 hours;
3. warning fraction <= 15%.

Among eligible policies the frozen priority is:
1. pass false-alert burden <= 2.0 episodes/location-year;
2. pass alert-episode precision >= 30%;
3. lowest false-alert burden;
4. highest alert precision;
5. highest event detection;
6. longest median lead time;
7. lower warning fraction.

## Promotion rule

V7-E is not allowed to touch the 2026 final holdout merely because it improves on V7-B.

Before final-holdout preparation it should show, on development evidence:
- event detection >= 80%;
- alert-episode precision >= 30%;
- false-alert burden <= 2.0 episodes/location-year;
- median first-alert lead >= 48 hours;
- warning fraction <= 15%;
- PR-AUC lift >= 3x prevalence;
- leakage and holdout guards pass.

If these conditions are not achieved, V7-E remains development-only and 2026 stays untouched.

## Comparison rule

Every V7-E report must retain the previous reference points:
- rainfall-only benchmark;
- V7-A;
- V7-B;
- V7-C;
- V7-D.

A new model is not called stronger merely because one metric improves. The comparison must include event detection, alert precision, false-alert burden, lead time and warning burden.