# Model v3 event-registry audit

## Purpose

This log exists to reduce event-selection bias. Development events are admitted from independent documentary evidence, not from rainfall/discharge values, model probabilities, class-balance needs or performance on 2022-2024.

The search scope is fixed to the five Model v3 locations (Lokoja, Makurdi, Onitsha, Yenagoa, Hadejia) and the 2018-2021 development period.

## Inclusion rule

An event may be enabled only when a contemporaneous or independently sourced report supports an **active, materially disruptive flood episode** at the named Model v3 location. Useful evidence includes one or more of:

- roads, markets, houses or farms explicitly submerged;
- displacement, evacuation or an official flood assessment;
- river overflow explicitly affecting the location;
- floodwater materially disrupting movement or normal activity.

Publication date alone is not enough if the article only discusses vulnerability, forecasts, preparedness or a previous year's flood.

Minor nuisance drainage/waterlogging reports are not automatically promoted to benchmark events. Reports that are geographically close but do not establish flooding at the named Model v3 location are excluded.

A second report close in time to an already-enabled event is treated as corroboration rather than a new event unless it clearly documents a separate episode.

## Enabled events after systematic review

The dedicated registry currently contains **16** enabled pre-2022 events. **12** occur in the 2019-2021 out-of-fold validation years.

The original dedicated-v3 registry contained 15 events. A systematic location/year audit added one further defensible event:

- **Onitsha — 2020-09-10**: contemporaneous reporting explicitly documents active floodwater around the Ochanja Market roundabout axis after heavy downpour. Added before any Model v3 candidate score was generated.

Previously added 2019 events that strengthened the sparse development registry were also sourced before Model v3 candidate scoring:

- Makurdi — 2019-08-08
- Hadejia — 2019-08-17
- Yenagoa — 2019-10-18
- Makurdi — 2019-10-28

## Explicit exclusions / non-events

These examples are documented because they could otherwise be tempting additions:

### Lokoja / 2021 Abuja-Lokoja highway report — excluded

A report dated 2021-08-08 described flood disruption on the Abuja-Lokoja-Okene highway, but the affected stretch identified in the article was between **Kwali and Abaji**, not Lokoja city. It is therefore not an independent Lokoja event anchor.

### Hadejia / May 2021 article — excluded

The May 2021 article `Save Hadejia from flood!` describes the severe **2020** Hadejia flood and warns about the possibility of another flood in the coming 2021 season. It does not document a new active 2021 Hadejia flood on the article date.

### Lokoja / 2021 vulnerability studies — excluded as dated events

Peer-reviewed/academic papers published in 2021 establish that Lokoja is highly flood-prone and experiences seasonal flooding, but their publication dates are not evidence that a distinct flood occurred on those dates. They are background evidence, not event anchors.

### Onitsha / 2019 building-collapse report — excluded as flood anchor

Contemporaneous reporting links a building/prison-wall collapse to heavy downpour in Onitsha, but the retrieved report does not clearly establish a materially disruptive flood episode at the benchmark location/date. It is therefore not promoted to an event anchor.

### Onitsha / February 2020 first-rain drainage report — excluded as benchmark-severity event

The report documents blocked drainage, traffic disruption and local floodwater after the first rain of the year. Because the evidence is closer to short-duration urban drainage nuisance than the materially disruptive benchmark definition, it remains excluded. The separate 2020-09-10 Onitsha event has stronger contemporaneous flood evidence.

### Makurdi / general flood-risk studies — excluded as dated events

Studies describing annual or recurrent Makurdi flooding are useful background evidence but cannot be converted into event dates merely from publication dates.

## Search/audit rule going forward

Do not add an event because a candidate model misses a year/location. Do not remove an event because it lowers performance. Any registry change after a Model v3 development run must be justified from documentary evidence alone, recorded here, and treated as a protocol change requiring a fresh model-development generation rather than silent retuning.

The 2022-2024 benchmark period remains observed and may not be used to decide which pre-2022 events should be added or removed.
