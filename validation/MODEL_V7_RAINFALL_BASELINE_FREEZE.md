# Model V7 Rainfall Baseline Freeze

Status: FROZEN BEFORE FIRST SUCCESSFUL BASELINE SCORE

This freeze exists so the diagnostic rainfall-only baseline cannot be improved or weakened after seeing the 2025 evaluation result by changing event membership.

## Development year: 2024

Threshold and rainfall score family may use only these currently eligible 2024 events.

Previously adjudicated onset events:
- yenagoa-2024-07-08
- makurdi-2024-07-19
- yenagoa-2024-09-11
- makurdi-2024-10-14

New official NEMA events added before first successful score:
- mainok-2024-07-15
- kaduna-metropolis-2024-07-15
- argungu-2024-08-03
- barkin-ladi-2024-08-30
- calabar-2024-09-21, bounded onset 21-22 September

Explicitly excluded:
- shagari-bodinga-2024-08-19 because the source covers about 20 communities across two LGAs and the current single-anchor representation would be misleading.

Development event count expected by the baseline: 9.

## Evaluation year: 2025

The 2025 events below are evaluation-only for the rainfall baseline. They may not influence score-family or threshold selection.

Frozen evaluation events:
- mokwa-2025-05-28
- yola-south-2025-07-27
- maiduguri-jere-2025-07-30
- shendam-shimankar-2025-08-03
- yola-north-2025-09-03
- kwami-jurara-2025-09-04
- kaduna-metropolis-2025-09-05
- yola-north-south-2025-09-16

Explicitly excluded:
- gurara-tofa-lolitapi-2025-08-12 because no sufficiently defensible spatial anchor has been resolved.

Evaluation event count expected by the baseline: 8.

## Frozen baseline candidate family

The diagnostic is deliberately simple. It may choose one of these rainfall scores using only the 2024 development set:
- total_72
- max_day
- max_hour
- front_loaded

Candidate thresholds remain 1 through 200 in one-unit increments.

Selection order remains:
1. highest development event detection;
2. lowest false-alert episodes per location-year;
3. highest alert-episode precision;
4. highest threshold as final tie-break.

After selection, that exact score and threshold are applied unchanged to 2025.

## Data contract

Forecast features come from Open-Meteo Previous Runs fixed-lead precipitation fields:
- precipitation_previous_day1 = value forecast 24 hours before valid time;
- precipitation_previous_day2 = value forecast 48 hours before valid time;
- precipitation_previous_day3 = value forecast 72 hours before valid time.

Transport-level retry, batching, caching or chunking may be changed if needed to make acquisition reliable. Event membership, feature semantics, threshold candidate set and scoring rules may not be changed after this freeze merely to improve the result.

## Claim boundary

This baseline is not Model V7, not a national flood accuracy figure and not a production warning system. It exists to establish the minimum performance a trained V7 candidate must exceed.
