# NaijaClimaGuard Platform v3 — Flood Intelligence & Decision Layer

## Product position

NaijaClimaGuard is not a replacement for NiHSA gauges, NiMet forecasts, NASA satellites, GloFAS river models, NEMA/SEMA operations, or third-party flood sensors.

Platform v3 is the common decision layer that can ingest those sources, preserve their provenance and quality, compare them, attach a validated decision policy, distribute the resulting intelligence, and retain an auditable record of why each action was taken.

The unit of value is the decision, not the sensor.

## Architecture

```text
NASA / weather / GloFAS / NiHSA gauges / third-party sensors /
dam operations / citizen reports / official advisories
                         |
                         v
                 Source adapters
                         |
                         v
             Canonical observations
     (units + time + location + quality + provenance)
                         |
                         v
             Evidence / source-health layer
                         |
                         v
       Validated risk model + decision policy
                         |
                         v
 dashboard / API / alerts / reports / institutional workflows
                         |
                         v
             outcome + audit history
```

## Phase 1 — Canonical observation contract

Every source is normalized into the same internal shape:

- source kind
- provider and source ID
- canonical variable and unit
- observation time and receive time
- latitude/longitude
- quality status and optional confidence/flags
- source version / external record ID
- original variable/unit retained as provenance

Canonical variables currently include:

- precipitation (mm)
- rainfall intensity (mm/h)
- river discharge (m3/s)
- water level (m)
- soil moisture (fraction)
- evapotranspiration (mm)
- flood observation
- official advisory level
- dam release (m3/s)

## Phase 2 — Source adapters

Adapters translate vendor/provider payloads into canonical observations.

The first adapter is deliberately vendor-neutral: `genericSensor`. A partner can map a JSON payload once (for example `level_cm`, `timestamp`, `lat`, `lon`) and NaijaClimaGuard converts each record into canonical water-level observations while retaining the provider/source identity.

This is how a solar water-level sensor becomes an input to NaijaClimaGuard rather than a competing architecture.

Provider-specific adapters should only be added when the real provider schema/API is available. We do not invent a NiHSA, NASA, or vendor payload format.

## Phase 3 — Source health and evidence snapshots

Before any model uses an observation, the platform records whether each source is:

- fresh
- stale
- suspect
- missing

Freshness windows are source-family defaults and can be overridden for an integration.

Evidence is grouped into rainfall, hydrology, ground and operational families. The evidence layer does not itself manufacture a flood probability.

## Phase 4 — Validated decision engine

The historical/operational Validation v2 work determines what model and thresholds deserve to be attached here.

Until then, Platform v3 must remain `evidence_only` for the new multi-source layer. No arbitrary weighting is introduced simply to make the architecture look complete.

When validated, the decision engine should return:

- risk/decision level
- probability or score only if properly calibrated
- source-health summary
- reasons/factors that changed the level
- model/version
- decision-policy/version
- timestamp
- evidence IDs/provenance
- any degraded-mode warning if critical sources are unavailable

## Phase 5 — Action engine

Institutional/user policies can then decide what happens when a validated decision changes:

- dashboard escalation
- email
- SMS/USSD/voice/WhatsApp where configured
- webhook/API event
- NEMA/SEMA workflow
- insurer/bank/telco integration

Alert delivery must never claim a channel is live unless the account/contact data and provider integration are genuinely operational.

## Phase 6 — Audit and learning loop

Each issued decision should eventually retain:

- the evidence available at decision time
- the decision/model/policy version
- who/what was notified
- acknowledgements where available
- subsequent observed outcome
- whether the event was detected, missed, or a false alarm

This turns NaijaClimaGuard from a dashboard into an auditable operational system.

## Reliability principle

Platform v3 does not claim software is inherently more reliable than hardware. It uses complementary redundancy.

A local gauge can be the strongest observation at its installed point. Satellite/radar/weather/hydrological models provide broader context. When independent sources agree, confidence can increase after the decision policy is validated. When they disagree, the disagreement itself must be visible rather than hidden.

A source failure should degrade the evidence state explicitly; it should not silently replace missing data with simulated values.

## Production rule

The current public `derived-v2` risk API remains the production model until Validation v2 establishes a replacement that passes the predeclared evidence gates.

Platform-v3 integration code is developed on a separate branch and must not be merged merely because it compiles. Database migrations, authentication for partner ingestion, rate limits, replay/idempotency, and end-to-end integration tests are required before production ingestion is enabled.
