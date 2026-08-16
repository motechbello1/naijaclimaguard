# NaijaClimaGuard Matched Competitor Benchmark Protocol

## Purpose

NaijaClimaGuard is being engineered to outperform available flood-information products on the complete Nigeria-specific warning-to-action journey. Superiority is never inferred from a feature checklist. A public `better than` statement requires a matched, reproducible test on the same task, geography, event and metric.

## Systems in the comparison set

The comparison set currently includes:

- Nigeria Hydrological Services Agency (NiHSA) public Annual Flood Outlook / Flood Forecast Dashboard where the relevant output is publicly observable;
- Google Flood Hub / published Google flood-forecast products where the relevant output is publicly accessible or available through an authorized research dataset/API;
- NaijaClimaGuard's current public risk engine, Riverine Watch, National Retrospective Benchmark and Flood Decision Network components;
- official NEMA/NiHSA warning or response timestamps when evaluating operational warning-to-action timing. NEMA is an authority/response institution, not treated as an ML model competitor.

## Dimensions

### A. Hazard intelligence

For the same independently documented events and locations, report:

- eligible event detection;
- precision / false-alert burden;
- PR-AUC and ROC-AUC where continuous scores exist;
- Brier/calibration where probabilities are comparable;
- warning lead time only where a genuine issue-time forecast is preserved;
- missing-source and unavailable-forecast rate.

No system receives a more favorable event denominator.

### B. Geographic usefulness

Measure separately:

- jurisdictions with a usable risk output;
- locations with independently validated performance;
- locations shown without local validation;
- granularity: national/state/LGA/community/coordinate/reach;
- riverine, pluvial/flash, coastal and compound-hazard support.

Coverage is not the same as validated skill.

### C. Warning-to-action conversion

A controlled usability study uses the same flood scenario and asks a user to identify the required next action. Metrics:

- time from opening the product to correct action comprehension;
- task completion rate without assistance;
- number of taps/clicks to reach action guidance;
- proportion correctly identifying official-warning precedence;
- proportion correctly identifying source freshness / uncertainty;
- action acknowledgement completion rate.

### D. Nigerian last-mile accessibility

Test on the same messages and devices:

- English, Nigerian Pidgin, Hausa, Yoruba and Igbo UI completion;
- language consistency across the full task, not only navigation;
- neural voice intelligibility reviewed by native speakers;
- low-bandwidth emergency content availability;
- SMS / WhatsApp / voice delivery success only when a real provider is connected;
- screen-reader, keyboard and mobile task completion.

### E. Exposure and economic decision intelligence

For the same hazard footprint:

- population exposure from the same population raster;
- buildings / cropland / roads / critical facilities identified;
- provenance completeness for every exposed-asset number;
- expected-loss uncertainty disclosure;
- intervention cost and avoided-loss claims only where the underlying action/outcome evidence exists.

### F. Institutional operations and auditability

Evaluate whether the system can preserve:

- source/forecast issue time;
- source freshness and failure state;
- official-advisory precedence;
- warning delivery evidence;
- action recommendation and acknowledgement;
- operator escalation/resolution;
- post-event outcome evidence;
- an auditable evidence chain.

## Superiority rule

A public superiority claim may only name the exact dimension won. Example:

> In a matched 2022–2025 Nigeria benchmark across X eligible events, NaijaClimaGuard detected Y/X events versus A/X for comparator B at a comparable false-alert budget.

or

> In a 40-participant Nigerian usability test, median time to identify the correct next action was X seconds in NaijaClimaGuard versus Y seconds in comparator B.

The following are prohibited without matched evidence:

- `better than Google` as a general statement;
- `more accurate than NiHSA` without the same event/location/metric;
- comparing NaijaClimaGuard retrospective replay with another system's prospective score;
- using coverage, feature count or UI preference as a proxy for model accuracy;
- changing thresholds after seeing competitor results.

## Acquisition-quality target

The engineering objective is a defensible advantage across the combined system:

`hazard evidence -> exposure -> role-specific decision -> Nigerian-language delivery -> action -> verification -> economic outcome`

A stronger raw forecast from an external source can be ingested rather than rejected. NaijaClimaGuard wins when the complete decision network creates measurably better Nigerian outcomes, and it must prove each claimed advantage with the matched test above.
