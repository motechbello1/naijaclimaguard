# Model v4 Prospective Shadow Evidence Protocol

Status: preregistered before a Model v4 candidate is frozen or prospectively scored.

## What counts as prospective
Prospective evidence begins only after a specific model artifact, feature contract, calibration state and operating threshold are frozen in Git with SHA-256 hashes and a UTC freeze timestamp. Any observation or event dated on or before that timestamp is not prospective evidence.

## Shadow-only first
The frozen candidate may run in shadow mode alongside the live `derived-v2` decision-support engine. Shadow probabilities and threshold decisions are logged, but the candidate must not trigger public alerts until the prospective acceptance gate is satisfied.

## Issue-time input rule
Each shadow prediction must preserve:
- prediction issue timestamp in UTC;
- location and coordinates;
- exact model/artifact hash;
- exact threshold;
- NASA product/version and source observation timestamps;
- GloFAS product/model and source observation/forecast timestamps;
- ERA5-Land or operational surface-state product/version and source timestamps;
- source freshness/latency at issue time;
- complete input feature vector or its content hash plus immutable source references;
- probability and binary threshold decision.

No future/reanalysis value that was unavailable at the prediction issue time may be backfilled into an already-issued prospective prediction.

## Source policy
Historical development can use retrospective-quality NASA IMERG Final V07, GloFAS historical discharge and ERA5-Land. Prospective inference must use source products actually available at issue time. NASA IMERG Early/Late, operational GloFAS forecast/near-real-time products, and the then-available surface-state product may be used, with product identity and latency preserved. Final/reanalysis products may later be attached for audit but cannot replace issue-time inputs.

## Outcome registry
Flood-event outcomes are added independently of model scores from official or reputable documentary evidence. Source URL/document, publication date, observed-by date, location and evidence note are preserved. Event inclusion decisions must not inspect the model probability for the event window.

## Minimum acceptance evidence
A first prospective acceptance study requires at least 20 independent documented flood event anchors after the model freeze, in the same five pilot locations unless a new protocol is preregistered before collection.

## Frozen acceptance gates
All must pass on the one-shot prospective set:
- event-window detection >= 75%;
- 95% Wilson lower confidence bound for event detection >= 50%;
- false-positive location-days <= 10 per 1,000 negative location-days;
- precision >= 10%;
- PR-AUC >= 2x the prospective prevalence baseline;
- Brier score better than a constant-prevalence predictor;
- any location with at least 3 prospective events must achieve >= 50% event detection.

The prospective set is consumed on first evaluation whether the model passes or fails. A failure requires a new model generation and a new future prospective set.

## Lead-time claims
Passing this protocol does not by itself prove 24/48/72-hour issue-time warning skill. Lead-time claims require a separate preregistered evaluation using predictions genuinely issued at those horizons and source data available at those issue times.

## Tonight's completion criterion
Tonight we can: preregister this protocol, build/freeze a candidate if development gates pass, and install the immutable shadow logger. We cannot honestly manufacture the future event outcomes required to complete the prospective acceptance study tonight.
