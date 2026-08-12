# Riverine Watch v1 Evidence Pack

Freeze date: 12 August 2026

Model ID: `riverine-watch-v1`

Status: `shadow_candidate_serialized_not_production_validated`

## Executive statement

Riverine Watch v1 is a frozen 14-day riverine flood-onset WATCH model for Lokoja and Makurdi. It is designed to identify elevated conditions that may precede a documented flood onset within the next 14 days. The model is a shadow decision-support model. It is not authorized to issue autonomous public warnings and it does not replace the current `derived-v2` public risk engine.

The current defensible retrospective headline is:

**Riverine Watch v1 detected 4 of 5 eligible historical flood-onset events in retrospective testing for Lokoja and Makurdi, an 80% event-detection rate.**

This must not be described as 80% accuracy. It is not a national result and it is not prospective public-warning validation.

## Model function

For each supported location, Riverine Watch v1 uses:

- exactly 30 complete NASA GPM IMERG Early V07 daily rainfall observations strictly before the model issue date;
- Copernicus CEMS GloFAS operational LISFLOOD control-forecast discharge at +24, +48 and +72 hours for the matching issue date;
- derived rainfall-load, wet-day and river-trajectory features;
- a frozen logistic-regression scorer;
- a WATCH threshold of 0.70.

The output is one of three states:

- `NORMAL`: no elevated Riverine Watch condition at the frozen operating point;
- `MONITOR`: elevated probability below the WATCH threshold;
- `WATCH`: probability at or above 0.70, indicating elevated conditions consistent with flood onset within the 14-day horizon.

The model output is a preparedness signal, not an evacuation order. Official warnings and visible local flooding take priority.

## Frozen scope

Supported locations:

- Lokoja
- Makurdi

Forecast horizon: 14 days

WATCH threshold: 0.70

Alert episode cooldown: 7 days

Training period: 26 May 2021 to 31 December 2024

Retrospective outer evaluation years: 2022, 2023 and 2024

## Retrospective evidence

Eligible independently repaired flood-onset events in the supported two-location scope: 5

Detected events: 4

Event-detection rate: 0.80

Pooled issue-row PR-AUC: 0.1763367025320199

Pooled issue-row ROC-AUC: 0.8371472784191798

Deduplicated alert episodes: 15

True alert episodes: 4

False alert episodes: 11

Alert-episode precision: 0.26666666666666666

False alert episodes per supported location-year: 1.8333333333333333

Evidence class: retrospective development evidence, not prospective validation.

## Why the benchmark was repaired

The earlier Model v5 benchmark contained event dates that were not consistently defensible as actual flood-onset dates. Some represented assessment, publication, satellite observation or already-underway flooding. The repair process separated events into onset-exact, onset-bounded and documentation-only classes and prevented model performance from influencing event inclusion.

The original Model v5 failed-freeze result remains immutable historical evidence. The repaired benchmark was used diagnostically and did not retroactively convert Model v5 into a preregistered pass.

Riverine Watch v1 was subsequently scoped to the riverine locations where the repaired evidence could support a practical pilot rather than forcing one national model onto locations with different flood mechanisms or insufficient onset evidence.

## Real-source operational replay

A preserved operational NASA plus GloFAS source bundle was replayed after the model freeze to verify deterministic end-to-end scoring without source substitution.

Model issue date: 10 August 2026

NASA feature window: 11 July 2026 through 9 August 2026, exactly 30 complete prior days.

GloFAS issue date: 10 August 2026.

Replay results:

- Lokoja: probability 0.04075237319720808, `NORMAL`
- Makurdi: probability 0.8503209079848945, `WATCH`

This replay proves that the frozen scorer can consume a genuine preserved operational source bundle and produce the expected decision states. It is not counted as prospective validation because the replay was performed after the source issue date.

## Live source reliability contract

Riverine Watch v1 does not silently replace missing NASA or GloFAS inputs with unrelated sources.

The prospective issuer checks GloFAS source age in this order:

- age 0 days: eligible live source;
- age 1 day: eligible bounded fallback;
- age 2 days: delayed backfill only, no new WATCH episode may be emitted;
- older than 2 days: no model issue, status becomes `SOURCE_DELAYED`.

NASA rainfall is aligned to the selected GloFAS issue date so later rainfall cannot leak into an earlier model issue.

## Product boundary

The current general public risk engine is `derived-v2`. It remains responsible for the current public live risk index used across general locations.

Riverine Watch v1 is separate. It is a shadow riverine pilot for Lokoja and Makurdi only. Its 80% retrospective event-detection result must not be attached to the `derived-v2` score or to unsupported locations.

## Claims that are supported

The following wording is supported:

> Riverine Watch v1 detected 4 of 5 eligible historical flood-onset events in retrospective testing for Lokoja and Makurdi, an 80% event-detection rate.

It is also supported to say that:

- the model has a frozen 14-day flood-onset WATCH horizon;
- it uses prior NASA IMERG Early rainfall and matching operational GloFAS discharge forecasts;
- it returns NORMAL, MONITOR or WATCH;
- its frozen WATCH threshold is 0.70;
- it has been run successfully on a genuine preserved operational source bundle;
- prospective shadow evidence collection is the next validation stage.

## Claims that are not supported

Do not say:

- 80% accuracy;
- 80% national flood-prediction accuracy;
- 80% prospective accuracy;
- the model is validated for all of Nigeria;
- the model is authorized to issue autonomous evacuation instructions;
- Riverine Watch v1 has replaced `derived-v2`;
- GloFAS values are local physical gauge measurements;
- a low model score overrides an official warning or visible flooding.

## Production and promotion status

Current status: `shadow_candidate_serialized_not_production_validated`

Replacement of the current public risk engine is not authorized.

Autonomous public action is not authorized.

Promotion requires prospective evidence to accumulate and be independently reviewed. The prospective ledger must preserve source issue dates, source age, probabilities, decision states and any emitted WATCH episode without rewriting earlier issues.

## Frozen evidence artifacts

- `validation/RIVERINE_WATCH_V1_FREEZE_MANIFEST.json`
- `validation/riverine_watch_v1_model.json`
- `validation/riverine_watch_v1.py`
- `validation/riverine_watch_v1_retrospective_metrics.json`
- `validation/riverine_watch_v1_operational_replay_2026-08-10.json`
- `validation/riverine_watch_v1_prospective.py`
- `.github/workflows/riverine-watch-v1-prospective.yml`

Prospective evidence is written separately from product code so forecast records do not continually mutate or redeploy the production application.

## Final scientific position

The Model v5 experiment is closed and remains `freeze_blocked` as historical evidence. Riverine Watch v1 is the functioning scoped model produced from the subsequent evidence repair and deployment work. Its current number is useful and defensible only within its stated retrospective scope.

The correct next scientific objective is not to keep changing the historical number. It is to accumulate prospective forecasts, observe real flood outcomes, calculate live event detection, warning precision, false-warning burden and lead time, and then decide whether Riverine Watch v1 is eligible for broader operational promotion.
