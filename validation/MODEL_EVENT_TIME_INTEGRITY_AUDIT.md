# Flood Event-Time Integrity Audit

## Purpose

This audit freezes a key finding from Model v5 and Model v6 development: the current benchmark registry uses `observed_by_date` as the event timestamp, but many registry records describe a documentation, assessment, publication, or already-active flood date rather than a verified flood-onset date.

This file does not alter Model v5, Model v6, the frozen event registry, their thresholds, their gates, or their recorded decisions. Both existing model decisions remain immutable evidence.

## Why this matters

The development target is a documented flood strictly after issue time and within the next 72 hours. That target is only a valid forward-forecast target when the event timestamp represents a defensible flood onset or first-impact time.

If `observed_by_date` is instead the date on which an already-active flood was reported or assessed, the benchmark can create two forms of temporal mislabelling:

1. An issue row during an already-active flood can be labelled as a future positive because the documentation date is still one to three days ahead.
2. The true hydrological precursor may occur before the benchmark's positive window, so a correct river/rain signal can be scored as a false negative.

This is target-timestamp uncertainty, not model leakage and not a reason to relax any operating gate.

## 2022-2024 evaluation inventory

The 19 events evaluated by Model v5/v6 are the 5 registry events in 2022, 4 in 2023, and 10 in 2024.

### High-confidence date semantics from the registry note

These records contain wording that is comparatively close to an event/impact date:

- `makurdi-2023-09-04`: nearly 12-hour downpour flooded named Makurdi areas.
- `yenagoa-2024-07-08`: heavy rain on 8 July caused flash flooding; report published 9 July.
- `makurdi-2024-07-19`: roughly 12-hour torrential rainfall submerged multiple Makurdi neighbourhoods.
- `hadejia-2024-09-07`: flooded river incident explicitly dated 7 September.
- `makurdi-2024-10-14`: more than nine-hour downpour caused flooding in named Makurdi areas.

These are still subject to source-level verification, but the registry notes themselves provide a comparatively direct temporal anchor.

### Explicitly documentation/assessment/already-active semantics

The following registry notes do not establish a clean flood-onset timestamp and therefore should not be treated as exact onset without source-level adjudication:

- `makurdi-2022-09-26`: Sentinel-1 flood extent was acquired over Doma/Makurdi/Guma on 25-26 September. This is observation of inundation extent, not onset.
- `lokoja-2022-09-28`: homes, roads and farmland were **already submerged by** 28 September. The true onset precedes the registry timestamp.
- `yenagoa-2022-09-30`: NEMA/SEMA **assessment documented** affected communities on 30 September. Assessment date is not necessarily onset.
- `onitsha-2022-10-21`: manufacturers' leadership **assessed massive flood devastation** on 21 October. The note does not identify onset.
- `hadejia-2022-10-28`: state emergency reporting **listed Hadejia among badly affected LGAs** during the 2022 flooding. The note does not identify onset.
- `makurdi-2023-07-10`: report documented areas submerged after the **preceding weekend** rainstorm; the registry explicitly says this is a documented-by date.
- `onitsha-2023-09-14`: flooding had overrun hostels and paralysed activities; the note does not establish first impact/onset time.
- `yenagoa-2023-10-06`: community was reported to be suffering hardship caused by flood; this is clearly an already-active condition.
- `makurdi-2024-07-04`: federal situation briefing listed Makurdi among LGAs **already submerged**. Not onset.
- `onitsha-2024-07-04`: federal situation briefing listed Onitsha North among LGAs **already submerged**. Not onset.
- `hadejia-2024-08-14`: SEMA reported flooding after **days of rainfall** across multiple LGAs; Hadejia was separately identified as affected. Exact onset is unresolved.
- `yenagoa-2024-09-11`: multiple neighbourhoods were submerged by flash floods; registry note does not establish first impact time.
- `lokoja-2024-10-21`: NEMA visited during an **active Kogi flood response**, with shelters already accommodating displaced people and rescue/evacuation active. Not onset.
- `yenagoa-2024-11-07`: communities were submerged as floodwaters **remained high**. This is an ongoing-flood observation, not onset.

## Immediate scientific conclusion

At least 14 of the 19 current 2022-2024 evaluation records have registry-note wording that does not itself establish a precise flood onset. Only 5 have comparatively direct event-day wording in the frozen registry notes.

Therefore the current 19-event benchmark is suitable as a historical flood-evidence registry, but it is not yet strong enough to serve unqualified as a precise 72-hour onset benchmark.

This does not invalidate the Model v5 or Model v6 results. Those results remain valid answers to the exact frozen benchmark that was preregistered. It does mean that further model iteration against the same timestamps risks optimizing against documentation latency rather than flood physics.

## Required next step before any further model candidate

Perform a source-level temporal adjudication for all 19 evaluation events. Each event must receive one of the following immutable classifications:

- `onset_exact`: defensible first-impact/onset date is explicitly documented.
- `onset_bounded`: source evidence provides a bounded onset interval, for example "overnight" or "preceding weekend".
- `documentation_only`: evidence confirms flooding but does not establish onset closely enough for a strict 72-hour forecast target.

For `onset_bounded`, preserve both lower and upper date bounds. Do not silently replace the frozen `observed_by_date` field.

Only after this adjudication should a new forward-forecast benchmark be defined. The old V5/V6 benchmark and results must remain preserved exactly as executed.

## Decision rule

No Model v7 or further model-shopping is authorized from the current benchmark. The next decision is a target-validity decision, not an algorithm decision.
