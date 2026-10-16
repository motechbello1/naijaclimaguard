# My Tomorrow Screen Contract

Status: FROZEN BEFORE UI REDESIGN

## What this screen has to do

A user should understand the important answer in under ten seconds without knowing anything about weather models.

The screen exists to answer:

**What could tomorrow take from me, when, and what do I do before it gets the chance?**

## First visit

No registration wall before the first useful answer.

1. Detect location with permission or let the user type a place.
2. Load My Tomorrow.
3. Show the answer.
4. Only after value is visible, offer: **Protect this place**.

## Hero answer

The first card must contain only information the user can act on.

### Quiet example

**Tomorrow looks okay around you.**

No serious environmental threat is developing around your current area. Your saved route has a short heavy-rain window around 6 PM, but no protection action is currently needed.

### Action example

**Something could disrupt your evening tomorrow.**

Heavy rain and local flood conditions are most likely between 4:10 PM and 7:00 PM.

**Protect:** your parked car and evening route.

**Do before 3:45 PM:** move the car and leave before the highest-risk window if you can.

The product must not invent exact times if the model/source only supports a broader window.

## Required fields

- risk state: clear / watch / act / urgent;
- hazard(s);
- affected place;
- likely start window;
- likely end window where supported;
- confidence;
- what is likely to change;
- Safety consequence;
- Money consequence;
- Time/Movement consequence;
- what to protect;
- one primary action;
- action deadline/window;
- what changed since the previous check;
- evidence/source summary;
- last updated time.

Unknown values must be shown as unknown or omitted. They are never guessed for visual completeness.

## Safety, Money, Time

These are consequences, not three separate products.

### Safety

What could put a person, home or important place at risk?

### Money

What avoidable cost or exposure could the condition create?

Do not show a naira value unless a transparent calculation supports it. Prefer a range with assumptions when precision is weak.

### Time / Movement

What could happen to the user's normal route, commute, delivery or planned movement?

Safe Route appears here when relevant.

## Protect

A user can turn a location into a protected object.

Examples:
- Home
- Mum
- School
- Work
- Shop
- Farm
- Car parking area
- Route

The label describes why the place matters to the user. It does not expose private relationship information publicly.

## Daily-return mechanic

Every return should answer one of three truthful states:

1. **Nothing meaningful changed.**
2. **Something changed, but you do not need to act.**
3. **Something changed and there is something useful to do.**

The product explicitly shows **What changed since your last check** when there is a meaningful difference.

There are no artificial streaks, random rewards, fake urgency or fear notifications.

## Outcome loop

After the risk window passes, the same card changes from prediction to outcome.

Examples:
- "We warned about flooding on this route. Did it happen?" Yes / No / Not sure.
- "Was your journey delayed?" Yes / No.
- "Did you move the car before the warning window?" Yes / No / Not applicable.
- "Was this warning useful?" Yes / No.

One tap should normally be enough.

Outcome feedback is quality-scored before it influences nearby users or enterprise intelligence.

## Sharing

Sharing must send value, not an advertisement.

Primary share actions:
- **Send this warning**
- **Send Mum her warning** when the user has privately labelled a protected place that way
- **Share this route update**
- **Share this area update**

The shared page opens directly to the warning/area context. Account creation comes after the recipient sees the answer.

## Payment moment

Do not interrupt an urgent warning with a payment wall.

Free proves value first.

The natural upgrade moment is when the user tries to extend protection, for example:
- protect several people or places;
- monitor multiple routes;
- see deeper protection history;
- use advanced planning where model evidence supports it;
- configure richer notification rules;
- use family/work/shop protection views.

The paid message should be about **more protection and planning**, not "premium weather".

## Evidence drill-down

A simple **Why we think this** control reveals:
- contributing forecast/official sources;
- confidence;
- freshness;
- model version when applicable;
- any official advisory precedence;
- important limitations.

The technical evidence pack remains available deeper in the product but is not required reading for normal use.

## Multi-hazard behaviour

My Tomorrow does not have separate home screens for every hazard.

The same answer structure works for supported hazards:
- flood;
- extreme heat;
- severe storm;
- dry/drought stress where the time horizon is appropriate;
- future validated hazard engines.

Each hazard must earn its place through a documented data source, validation method and useful action. Adding a hazard icon is not the same as supporting the hazard.

## Comparison with the original build

The original build's strength was: **danger is coming and ordinary Nigerians need to receive the warning.**

My Tomorrow preserves that and adds:
- personal consequence;
- timing;
- protection target;
- action deadline;
- quiet-day usefulness;
- change tracking;
- outcome proof;
- natural sharing;
- a credible paid extension.

Current judgment: **clearly better product architecture, still requiring live user-retention and willingness-to-pay validation.**

## UI rule

Reuse the approved NaijaClimaGuard visual language. Do not redesign for novelty.

The redesign succeeds only if the answer becomes simpler, faster and more valuable than the current dashboard. Premium appearance is secondary to decision clarity.
