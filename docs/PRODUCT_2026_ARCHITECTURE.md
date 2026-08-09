# NaijaClimaGuard 2026 Product Architecture

## Product thesis
NaijaClimaGuard is Nigeria's flood intelligence and early-action platform: prediction -> impact -> decision -> action -> confirmation -> evidence.

## Design principles
1. Do not compete with NiHSA's statutory authority; amplify authoritative hydrological intelligence.
2. Do not compete with NEMA's emergency-response mandate; provide the digital decision-and-delivery layer.
3. Do not claim global forecast superiority over Google Flood Hub; differentiate on Nigeria-specific operationalisation, users, assets, actions, accessibility and institutional workflows.
4. Treat physical water-level sensors as ingestible ground-truth sources, not as a competing architecture.
5. Separate user role from commercial plan. A farmer, insurer and emergency agency require different workflows even when their billing relationship differs.
6. Every technical forecast should have Simple, Detailed and Technical representations.
7. Every warning should answer: what is happening, who/what is exposed, what should be done, by when, and whether the action was acknowledged.
8. Maintain strict provenance and auditability for predictions, alerts and actions.

## Core layers
### 1. Forecast intelligence
NASA rainfall + GloFAS river forecasts + authorised local/government observations + optional sensor/community evidence.

### 2. Asset digital twins
Homes, farms, schools, warehouses, branches, roads, insured properties and public infrastructure can be registered as assets with a location, type and vulnerability context.

### 3. Action Engine
Risk is converted into role-specific Action Cards rather than generic warnings.

### 4. Action Autopilot
Organisations define human-approved escalation rules: notify teams, create incidents, request approval, or escalate when thresholds and evidence conditions are met.

### 5. Multi-channel delivery
Web first; email where configured; SMS/WhatsApp/voice/local-language delivery added through approved provider integrations.

### 6. Community and sensor intelligence
Community reports, official gauges and third-party/solar sensors are explicitly labelled by provenance and verification status.

### 7. Proof of Warning / Proof of Action
Record model/version, issue time, source evidence, recipient/delivery state, acknowledgement, recommended action and reported completion.

### 8. Government command workflow
National -> state -> LGA -> community drill-down, warning approval, dispatch, delivery status, acknowledgement, field reports, sensor health and audit trail.

## Roles
- Household / citizen
- Farmer / cooperative
- Small business
- Property owner / landlord
- Professional / consultant
- Insurer
- Bank / lender
- Logistics / infrastructure operator
- Government agency / emergency manager

## Commercial plans
Commercial plan is independent of role:
- Free
- Professional
- Enterprise / Government
- Transactional risk reports/API usage where applicable

## Build order
1. Role-specific Action Cards
2. Simple / Detailed / Technical interpretation modes
3. Asset registration / digital twins
4. Organisation/government alert workflows
5. Multi-channel delivery and local-language templates
6. Open sensor ingestion
7. Community corroboration and verification
8. Proof-of-warning/action ledger
9. Scenario simulator once scientifically constrained hazard-impact models are available

## Scientific boundary
No user-facing wording may turn a heuristic, hindcast, archived replay or unvalidated candidate into a prospective forecast claim. The production risk engine and every model candidate must be labelled accurately.
