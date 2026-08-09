# NaijaClimaGuard Product 2026 Architecture

NaijaClimaGuard is a flood-intelligence and early-action platform. Its core product loop is:

**Prediction → Impact → Decision → Action → Confirmation → Evidence**

## Product rules

1. **Payment plan is not user type.** Free / Professional / Enterprise controls commercial capability. Household / Farmer / Business / Agency controls the information architecture and workflow.
2. **Simple is a different interface, not technical text rewritten with easier words.** Simple mode leads with safety state and actions and hides raw model/coordinate/diagnostic detail unless the user asks for it.
3. **The model never changes because of role or asset type.** Roles and asset profiles change guidance and workflow only.
4. **Missing data is never treated as safe data.** Source coverage must be visible to professional/agency users and reflected in confidence.
5. **Official emergency instructions can supersede model output.** An authenticated official warning must be able to override a low model score in the user-facing safety state.
6. **Model v5 remains scientifically isolated.** Archived-operational GloFAS/NASA validation does not become production merely because product UI is ready.

## User experiences

### Household
- My Area
- My Safety
- My Alerts
- Report Flood
- Safety History

Primary question: **Am I safe and what should I do now?**

### Farmer
- My Farm Risk
- Farm Alerts
- Rain Outlook
- Report Flood
- Farm History

Primary question: **What on my farm is exposed and what can I protect before flooding?**

### Business
- Risk Overview
- Alerts & Actions
- Risk Intelligence
- Operational Evidence

Primary question: **Which assets or operations are exposed and what continuity action is required?**

### Agency
- Operations
- Intelligence
- Location Analysis
- Outlook
- Alert Rules
- Field Reports
- Operational Evidence
- Model Evidence

Primary question: **Where is risk, which sources support it, who has been warned, what needs escalation, and what evidence exists?**

## Asset digital twins

Supported product profiles:
- Home
- Farm
- Business Premises
- Warehouse
- School
- Insured Property
- Government Facility
- Other

The asset profile controls action guidance. It never alters the underlying risk score.

## Multi-source flood intelligence

The Enterprise/Agency product explicitly tracks source state instead of pretending rainfall is the whole flood picture.

Current source classes:

- **Rainfall & weather — LIVE**: production derived-v2 uses current Open-Meteo rainfall/weather context.
- **Community observations — LIVE**: user reports are collected and can be operator-verified, but remain separate from model labels.
- **GloFAS discharge forecasts — VALIDATING**: Model v5 is testing archived operational +24/+48/+72 discharge signals with NASA rainfall before production promotion.
- **Local river gauges / IoT water-level sensors — INTEGRATION READY**: requires NiHSA, partner or registered sensor feeds.
- **Official advisories — INTEGRATION READY**: requires authorised NiHSA/NEMA/SEMA/NiMet feed or operator workflow. Authoritative warnings may override a low model safety state.
- **Dam/reservoir operations — INTEGRATION READY**: requires authorised release/operations feed.
- **Drainage/terrain susceptibility — NOT CONNECTED**: planned geospatial layer; not part of current production score.
- **Tide/surge context — NOT CONNECTED**: planned for coastal assets; not part of current production score.

The product must distinguish **Live**, **Under validation**, **Integration ready**, and **Not connected**. No source may be labelled live simply because an adapter or UI exists.

## Action guidance

Every scored asset receives a deterministic action card appropriate to role, asset type and risk level. Users can acknowledge completed actions. When the server evidence ledger is available, acknowledgements append immutable evidence events.

## Evidence

Two evidence products are intentionally separate:

1. **Operational Evidence** — warnings triggered, warnings delivered, actions acknowledged, timestamps, location/asset context and hash-chain provenance.
2. **Model Evidence** — scientific validation, calibration, event detection, false-positive burden, temporal folds and production-readiness boundaries.

These must never be conflated.

## Planned next layers

1. Apply and verify the EvidenceEvent migration in a controlled database environment.
2. Add authorised official-advisory ingestion and human approval/escalation workflow.
3. Add generic water-level sensor/gauge ingestion with device identity, freshness and health status.
4. Add location-level source fusion/confidence so missing inputs reduce confidence rather than silently becoming zero.
5. Add SMS / WhatsApp / voice delivery and local-language message templates.
6. Add drainage/terrain and coastal tide/surge layers where defensible data sources are available.

## Scientific boundary

Production remains the disclosed `derived-v2` risk engine until a replacement candidate has passed its preregistered validation and production acceptance process. Product innovation must not be used to overstate model evidence.
