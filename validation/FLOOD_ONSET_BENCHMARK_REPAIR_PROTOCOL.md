# Flood Onset Benchmark Repair Protocol

Status: FROZEN BEFORE ANY EXPANDED EVENT COLLECTION OR RESCORING

## Purpose

Model v5 and Model v6 remain immutable failed-freeze decisions against the original documented-event benchmark. This protocol does not replace or reinterpret those results.

The purpose of this protocol is to determine whether a scientifically defensible strict 72-hour flood-onset benchmark can be constructed for the five pilot locations from 2021-05-26 through 2024-12-31 without selecting events based on model scores.

## Pilot locations

- Hadejia
- Lokoja
- Makurdi
- Onitsha
- Yenagoa

No location may be added or removed based on model performance.

## Time window

Event collection is restricted to 2021-05-26 through 2024-12-31, matching the consistent archived-operational GloFAS source contract.

## Event discovery rule

Candidate flood events may be discovered only from sources that identify a specific pilot location or its directly corresponding LGA/urban area and provide contemporaneous evidence of actual inundation, river overflow, or flash flooding.

Preferred source order:

1. Nigerian government emergency/hydrological agencies and state emergency agencies.
2. Copernicus/JRC or other official satellite/emergency products.
3. Reputable Nigerian national news organisations carrying contemporaneous reporting.

The search must be location-year systematic rather than model-error driven. Searches must cover every pilot location for every eligible year, not only locations where V5/V6 performed poorly.

## Temporal eligibility classes

Each candidate event must be assigned independently of model predictions to exactly one class:

### onset_exact
A source explicitly anchors first impact/onset to a calendar date or to a time interval wholly contained within one calendar date.

### onset_bounded
A source bounds first impact/onset to a short interval of no more than two consecutive calendar dates, such as an overnight rainfall spanning two dates.

### documentation_only
Flooding is confirmed, but the source only gives an assessment, publication, satellite-acquisition, response, displacement, ongoing-water, or already-submerged date with no defensible first-impact interval of two days or less.

Only `onset_exact` and `onset_bounded` events are eligible for a strict onset benchmark.

## Duplicate-event rule

Reports describing the same continuous flood episode at the same location are one event. A second event at the same location is allowed only when source evidence supports a distinct new onset after the previous episode had materially receded or ended.

## Date handling

- Never overwrite the frozen `validation/model_v4_event_registry.csv`.
- Preserve source publication date separately from onset date.
- For `onset_bounded`, preserve both lower and upper onset bounds.
- A model issue is counted as detecting a bounded event only under a prespecified conservative rule: it must fall within 72 hours before the earliest plausible onset bound. The later bound may not be used to make detection easier.

## Model isolation

No V5 or V6 prediction, probability, error, threshold result, per-location metric, or missed-event list may be used to decide whether a candidate event is included.

Model v6 code, hyperparameters and existing result files remain frozen. No retraining, feature change, threshold change, or model replacement is authorized by this protocol.

## Expanded benchmark outputs

The collection process must write:

- `validation/flood_onset_benchmark_2021_2024.csv`
- source URL and source organisation for every event
- publication date
- onset class
- exact onset or conservative bounds
- short evidence note
- duplicate-episode identifier

## Interpretation

Any later rescore of already-frozen model outputs against this repaired benchmark is diagnostic/post-hoc unless a genuinely independent prospective or untouched temporal validation set exists. It cannot retroactively turn Model v5 or Model v6 into a preregistered pass.

The purpose is to determine whether the current failure is dominated by target timestamp quality and to establish a trustworthy benchmark for subsequent prospective validation, not to manufacture a passing historical score.
