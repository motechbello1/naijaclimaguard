# NaijaClimaGuard — Pitch-safe technical claims

Frozen for the current pre-NiHSA pitch state on 2026-08-08.

## What the live product can truthfully claim

- NaijaClimaGuard has a live web product with a public risk API and user-facing risk surfaces.
- The current live decision-support engine is `derived-v2`, a disclosed rainfall/intensity/antecedent-wetness heuristic using Open-Meteo daily and recent hourly weather inputs.
- The same canonical `derived-v2` implementation now feeds `/api/v1/risk`, My Area, Intelligence Center, Predict, alerts, and situation reports. User-facing surfaces should not silently substitute a different risk formula.
- Alert rules are implemented against the canonical live engine. Email delivery can operate through Resend when configured. The alert engine records delivery success truthfully and does not mark a failed/unavailable delivery as notified.
- A secured background alert-evaluation route exists and requires `CRON_SECRET`; scheduler activation remains an operational deployment/configuration decision.
- The product clearly labels its live risk score as decision support rather than an official emergency warning.
- The repository contains a source-agnostic Platform v3 intelligence architecture capable of normalizing satellite, hydrological-model, official-gauge, sensor, dam-operation, citizen-report and advisory evidence into one auditable contract. That architecture remains draft/disabled for production ingestion until its database migration and real partner schemas are tested.

## What the independent validation work established

Validation v2 used:

- NASA GPM IMERG Final V07 rainfall,
- Copernicus/ECMWF GloFAS v4 historical river discharge,
- ERA5-Land surface-state variables, and
- independent documented Nigerian flood events.

The frozen 2022–2024 chronological benchmark rejected the original XGBoost as production-ready. The preserved benchmark result is approximately:

- ROC-AUC 0.71478
- PR-AUC 0.05723
- precision 0.09375 at threshold 0.50
- recall 0.03
- event detection 1/20

That negative result is evidence of scientific discipline, not a public performance headline.

Model v3 was redesigned using only 2018–2021 development data with expanding temporal folds, a frozen 16-event registry / 12 OOF events, training-fold-only reach normalization, no raw month/day-of-year features in eligible candidates, per-location diagnostics, a season-only comparator, and a threshold policy declared before scores were observed.

A local reproduction from the preserved successful Validation v2 run #61 artifact selected regularized XGBoost by the frozen ranking rule and passed the minimum prevalence/seasonality sanity checks, but **failed the predeclared operational threshold gate**: no threshold simultaneously achieved >=75% event detection, <=10 false-positive location-days per 1,000 negative days, and >=10% precision. Therefore Model v3 is not a freeze candidate from that reproduction. Queued pinned-environment CI remains the reproducibility check.

## Claims that are prohibited unless future evidence changes

Do not say or imply any of the following:

- `99.28% accuracy`, `0.9928`, 91% precision, 73% recall, or 10 false alarms as current validated performance.
- NaijaClimaGuard currently predicts floods 48 or 72 hours ahead.
- NaijaClimaGuard warned Lokoja before NiHSA/government in 2022.
- The current live risk API directly ingests NASA IMERG or GloFAS.
- The current live risk score is a validated flood probability.
- SMS is live when the real phone-number/delivery path is not enabled.
- NaijaClimaGuard predicts floods more accurately than Google Flood Hub or any other system without a direct independent comparison proving that claim.
- Archived GloFAS T-72/T-48/T-24 signal evidence is equivalent to a NaijaClimaGuard issue-time warning.
- A local/CI development result establishes national accuracy or production readiness.

## Strong pitch position that remains defensible

The product should be positioned as a Nigerian flood-intelligence and last-mile decision layer rather than as a claim of a superior global forecasting model.

Defensible differentiation includes:

- one auditable decision layer across multiple evidence sources rather than dependence on a single sensor/model;
- a product architecture designed to accept official gauges, third-party sensors, satellite products, hydrological forecasts, dam information, citizen reports and official advisories through a common provenance contract;
- a single live risk contract across user surfaces and alert workflows;
- degraded-mode/source-health concepts rather than hiding missing feeds;
- institution-ready alerting, reporting and integration surfaces;
- ability to complement NiHSA/NEMA data and workflows rather than requiring those institutions to discard existing gauges, models or procurement investments;
- explicit model governance: failed models remain failed, thresholds are predeclared, consumed holdouts are not reused, and future production promotion requires genuinely new prospective evidence.

## Next scientific milestone

Do not spend the already-observed 2022–2024 period again.

The next meaningful model milestone is either:

1. a new development generation using stronger hydrological/event information while keeping future evidence untouched, followed by a frozen candidate; or
2. preferably, a NiHSA/NEMA shadow pilot that records issue-time inputs, platform decisions, official observations and outcomes prospectively.

A future production model must be frozen before its final prospective holdout is opened. Passing a historical event-window study still does not by itself establish 24/48/72-hour lead skill; that requires issue-time forecast-feature validation.

## Production invariant today

Until a future model satisfies the full validation and freeze gates:

**Production engine: `derived-v2`. Model v3 deployment: false. Fixed 24/48/72-hour warning claim: false.**
