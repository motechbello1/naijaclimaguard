# NaijaClimaGuard Product Experience vNext

## Non-negotiable

This is an additive evolution. Existing routes, Riverine Watch v1 evidence, current public risk engine, Action OS, alerts, reports, API documentation, authentication, pricing/entitlements, official-warning precedence, audit/provenance and validation assets remain intact unless a later change is explicitly reviewed and approved.

## Product thesis

NaijaClimaGuard becomes a Nigeria-focused climate-risk operating system that connects:

Forecast -> Exposure -> Economic Loss -> Action -> Financing -> Delivery -> Verification

Riverine Watch v1 remains a frozen evidence-backed component, not the entire product.

## Experience principle

The public experience must speak to a person before it speaks to a model. A resident should immediately understand: Is my place at risk? What could happen? What should I do? Who can help? An institution should be able to continue into evidence, exposure, action, economics and API workflows without entering a separate marketing site.

## Visual direction

Reference inspiration: Rokeya Akter's Floods Water Solution Branding Identity Design on Behance. Borrow the principles, not the artwork: strong water-led identity, bold editorial scale, confident whitespace, environmental/human photography, memorable graphic shapes and a coherent physical/digital brand system.

Do not copy the reference's logo, illustrations, layouts or proprietary assets.

NaijaClimaGuard's own direction:
- Nigerian people and places are the emotional centre.
- Large documentary flood photography, not generic SaaS gradients as the primary visual.
- Deep-water/navy foundation with radar green retained as the product signal colour; introduce flood-blue/cyan and warm human neutrals.
- Topographic/river-line motifs and subtle moving water/radar textures.
- Big, short statements in plain English paired with optional technical evidence.
- Mobile-first and low-bandwidth aware.
- Accessibility: readable contrast, reduced-motion support, keyboard navigation and descriptive image/video text.

## Homepage / direct pitch journey

### 1. Human hero
Full-bleed Nigerian flood photograph with controlled dark overlay. Headline should communicate human/economic protection, not model architecture. Primary actions: Check my area and Watch 2-minute story. Institutional secondary action: Open Command View.

### 2. Personal location pulse
Allow a visitor to enter/select a location and immediately receive a plain-language risk pulse. Keep technical detail expandable. Never imply official evacuation authority.

### 3. Investor-pitch film
Large cinematic video placeholder immediately after the hero or integrated into it. Support poster image, captions/transcript, play state and a fallback when no video URL has been configured. The eventual film should tell: Nigerian flood problem -> warning-to-action gap -> NaijaClimaGuard -> live product -> economic engine -> business model -> evidence -> ask.

### 4. From warning to outcome
Interactive visual pipeline:
Forecast -> People/assets exposed -> Naira exposure -> Recommended actions -> Action financing -> Delivery -> Verified outcome.

Each stage opens the relevant product surface.

### 5. Live Nigeria story
Human-readable cards for communities and pilot locations. Separate live/current public risk from Riverine Watch shadow evidence visually and semantically.

### 6. Economic Impact Engine
New product surface. Display scenario-based exposed population, homes/businesses/cropland/infrastructure, estimated economic exposure, intervention options, estimated avoidable loss and benefit-cost ratio. Every number must carry provenance, assumptions, confidence and scenario labels. Do not present an estimate as observed fact.

### 7. Action Engine
Preserve and extend Action OS. Translate risk into role-specific action cards for residents, emergency agencies, businesses, farmers, insurers, lenders and logistics operators. Include ownership, status and verification trail for institutional workflows.

### 8. Community layer
Design for connection rather than passive dashboard viewing: saved places, family/community watch locations, plain-language alerts, local-language-ready copy, shareable risk cards, community observations with moderation/verification status, and clear emergency/official-source context.

### 9. Evidence
Keep Riverine Watch v1 evidence visible and honest. Do not bury false alarms, source gaps, frozen thresholds or prospective status. Add a plain-English mode beside technical evidence.

### 10. Commercial pathways
Keep current pricing/entitlements and evolve packages around outcomes:
- Community/public: core personal risk and safety context.
- Professional: saved portfolios, reports and richer decision tools.
- Institution: command workflows, exposure/economic engine, collaboration and audit.
- API/data: risk, exposure and action integrations with metered enterprise access.

Do not fabricate customers, revenue, savings or ROI.

## New product modules

### Economic Impact Engine
Inputs: hazard/risk evidence, geospatial exposure layers, asset/population/cropland/infrastructure data, vulnerability assumptions and intervention assumptions.

Outputs: exposure ranges, scenario loss ranges, avoidable-loss ranges, action cost ranges, benefit-cost range and provenance.

Until validated datasets are integrated, UI must label demo/scenario values explicitly and must not publish invented national numbers.

### Action & Resilience Marketplace
Institutional workflow connecting an approved action to eligible response/resilience providers. Initial implementation is a product architecture and provider-verification workflow, not a claim of an operating marketplace. Include provider categories, procurement/request state, service area, verification and outcome evidence.

### Economic/API layer
Extend the existing developer experience rather than replacing it. Future endpoints should expose versioned hazard, exposure, scenario-economic and action objects with provenance and entitlement controls.

## Pitch mode

The website itself must be pitchable. Add a distraction-free Pitch Mode that walks through Problem, Gap, Product, Live Demo, Economic Value, Differentiation, Evidence, Business Model, Jobs/Economic Participation and Ask. It should use live product components where possible and visibly label demo/scenario content.

## Guardrails

- NIHSA/NEMA/official warnings retain precedence where applicable.
- No claim that NaijaClimaGuard predicts better than another system without validated comparative evidence.
- No fabricated accuracy, revenue, jobs, customer, loss or ROI numbers.
- Shadow evidence is never described as a public warning.
- Delayed/backfilled source data is never represented as same-day live issuance.
- Existing frozen model artifacts are not silently modified by UX/product work.

## First implementation slice

1. Preserve existing routes and tests.
2. Redesign public homepage around human hero + location pulse + pitch video placeholder.
3. Add `/impact` shell for the Economic Impact Engine with explicit scenario/provenance states.
4. Add `/pitch` presentation mode using real product/evidence components.
5. Add navigation paths into existing Action OS, dashboard, evidence and API.
6. Add visual tokens/motifs without copying Behance assets.
7. Run typecheck, platform-experience QA and production smoke before merge.
