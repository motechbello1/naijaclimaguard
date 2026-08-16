# NaijaClimaGuard TRL6 Preparation and Claim Boundary

This document defines what NaijaClimaGuard may and may not claim as operational evidence while Model v5 remains under validation.

## Operational today

- Production flood decision-support UI runs on the disclosed `derived-v2` public engine.
- Household, Farmer, Business and Agency experiences have distinct dashboard framing and actions.
- Platform language and alert language are separate persisted preferences.
- First-wave platform languages are English, Nigerian Pidgin, Hausa, Yorùbá and Igbo.
- Read-aloud and auto-read accessibility controls exist in the product.
- The assistant can answer basic flood education, preparedness, historical/platform questions and clarification prompts; live-risk questions remain separated from generic flood education.
- Official advisories, when authenticated and ingested into the canonical intelligence store, take precedence in the user-facing safety state without changing the underlying model score.
- Missing partner sources are never interpreted as safe or zero risk.
- Canonical schemas exist for intelligence sources, observations, official advisories, gauges, IoT sensors, dam-operation signals, citizen reports and source credentials.
- Agency Command supports received, acknowledged, escalated and resolved case evidence.
- Delivery preferences support verified phone state and opt-in email/SMS/WhatsApp/voice configuration.
- Evidence events store a unique event hash and operational metadata.
- Supabase production tables have been migrated and RLS is enabled; server-side Prisma remains the application data path.

## Operational only when configured/connected

These capabilities exist in the product architecture but must not be described as nationally live until the corresponding authorised feed/provider is connected and producing fresh evidence:

- NIHSA/NEMA or other official advisory ingestion.
- Official river-gauge observations.
- Dam-operation/release data.
- Partner IoT/water-level sensors.
- SMS, WhatsApp and voice delivery through a configured external provider.
- Local-language emergency-message templates that have completed human safety review.

The UI must label a source as connected/live only when the canonical source store contains actual registered source data inside its freshness window.

## Not yet production-proven

- Model v5 is not the public production model and cannot trigger public alerts.
- Model v5 archived operational replay is development/confirmatory evidence, not prospective field validation.
- A final Model v5 result is valid only after synchronized source QA and strict nested 2022–2024 confirmatory scoring.
- NaijaClimaGuard does not currently claim a verified multi-day flood lead-time advantage over NIHSA, NEMA, Google Flood Hub or local sensor systems.
- Astronomical tide availability alone does not prove local water level at every coastal/estuarine position.
- Dam announcements are advisory signals unless magnitude, timing, authority, routing and freshness are represented as operational data.
- Verified shelters do not imply safe evacuation routes; route safety requires current road/flood information.
- Citizen reports do not automatically become training labels or event-registry truth.
- Parametric insurance triggers require insurer/reinsurer governance, predefined source/index/threshold/fallback/dispute rules and basis-risk disclosure.

## Permanent safety boundary

A low NaijaClimaGuard score must never be used to ignore an official warning or visible local flooding.

The platform distinguishes:

1. model/decision-support output;
2. authenticated official warning state;
3. source availability and freshness;
4. user-specific action guidance;
5. delivery and command evidence.

None of those layers may silently rewrite another layer's evidence.

## TRL6 evidence interpretation

Passing the repository TRL6 Preparation Contract proves that the required product and evidence-control contracts are present in the implementation and that withdrawn claims have not re-entered the checked public surfaces. It does **not** by itself prove national deployment, partner-feed coverage, prospective flood-prediction accuracy, relevant-environment operation or institutional adoption.

The manual TRL6 Claim Gate reads `validation/TRL6_EVIDENCE_REGISTER.json` and intentionally fails until every field-evidence row is verified and an independent promotion decision is recorded. A failing claim gate is the correct state while the product remains pre-TRL6.

TRL6 presentation evidence should therefore combine:

- deployed working software;
- production database and operational workflows;
- reproducible CI contracts;
- live demonstration of user journeys;
- partner/source integration evidence where available;
- historical/archived scientific validation clearly labelled as such;
- transparent limitations and failure states.
