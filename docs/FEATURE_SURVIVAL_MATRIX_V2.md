# NaijaClimaGuard V2 Feature Survival Matrix

Status: FROZEN PRODUCT DIRECTION BEFORE UI REDESIGN

## Rule

The current product is not being thrown away. Existing capabilities survive only when they strengthen the new promise:

**NaijaClimaGuard tells you what tomorrow could take from you before it gets the chance.**

Every surviving capability must help answer at least one of these questions:

1. What is coming or building?
2. When could it affect me?
3. Is somewhere I care about at risk?
4. What could it affect in my safety, money or time?
5. What should I protect?
6. What should I do and by when?
7. Did the warning become true and did the action help?

Primary consumer navigation must not expose the internal complexity of the platform.

## Keep and upgrade

### Location risk check / current risk API

Decision: KEEP, UPGRADE.

Old job: user checks flood risk for a location.

V2 job: instant no-login entry into **My Tomorrow** for any location.

Upgrade required:
- multi-hazard result instead of flood-only framing;
- timing/window of concern;
- Safety, Money and Time consequences;
- clear action and action deadline;
- confidence/evidence link;
- no fake precision.

Comparison with original: CLEARLY BETTER when all fields are evidence-backed.

### Saved locations

Decision: KEEP, EXPAND.

Old job: save locations for alerts.

V2 job: protect things the user actually cares about: Home, Mum, School, Work, Shop, Farm and selected routes.

A saved item is not just a map pin. It is a protection object with a relationship to the user.

Comparison with original: CLEARLY BETTER.

### Alerts and delivery preferences

Decision: KEEP, UPGRADE.

Old job: threshold warning.

V2 job: tell the user only when something meaningful changed or an action deadline is approaching.

Examples:
- "Your route changed from low to high disruption risk."
- "Move the car before 4:00 PM."
- "Mum's area is now at higher flood risk than this morning."

Keep language/channel preferences, phone verification and last-mile delivery.

Do not use fear spam or meaningless daily notifications.

Comparison with original: BETTER if alert burden stays controlled.

### Multilingual delivery and speech

Decision: KEEP AS CORE ADVANTAGE.

English, Nigerian Pidgin, Hausa, Yoruba and Igbo remain part of the product experience, not a pitch-only feature. TTS/read-aloud remains useful for accessibility and last-mile understanding.

Comparison with original: MUST BE AT LEAST AS GOOD. No regression allowed.

### Official advisory precedence and source freshness

Decision: KEEP AS TRUST LAYER.

Official advisories can override or qualify product guidance where appropriate. Freshness and source status remain visible through the evidence layer.

Comparison with original: MUST BE AT LEAST AS GOOD.

### Evidence ledger / model evidence

Decision: KEEP, MOVE OUT OF PRIMARY CONSUMER FLOW.

Old job: technical/public proof pages.

V2 job:
- consumer: "Why should I trust this?" expandable evidence;
- competition: complete model evidence pack;
- enterprise: audit trail and issue-time proof.

Users should not have to understand ROC-AUC to know what to do.

Comparison with original: BETTER usability while preserving stronger proof.

### Safe Route

Decision: KEEP, MERGE INTO MY TOMORROW.

Old job: separate route page.

V2 job: appears automatically under **Time / Movement** when a saved or requested journey is affected.

The user should not have to remember that a separate flood-routing tool exists.

Comparison with original: CLEARLY BETTER experience if routing evidence is reliable.

### Citizen reports / incident reconciliation

Decision: KEEP, REDESIGN AS ONE-TAP OUTCOME PROOF.

Old job: submit flood reports.

V2 job: very low-friction confirmations such as:
- "Did this road actually flood?"
- "Was your journey delayed?"
- "Did this shop/area close?"
- "Did the advice help?"

Reports must be quality-scored and privacy-safe before affecting other users.

This becomes part of the climate-impact data moat, not a burdensome survey system.

Comparison with original: CLEARLY BETTER if verification quality is preserved.

### Emergency preparation content

Decision: KEEP, CONTEXTUALISE.

Old job: separate Emergency Pack page.

V2 job: preparation appears only when relevant to the user's hazard, place and time window.

The separate reference pack may remain as secondary content, but it is not primary navigation.

Comparison with original: BETTER.

### Economic impact capability

Decision: KEEP, REBUILD CAREFULLY.

Old job: broad economic impact / avoided-loss framing.

V2 job: explain likely exposure in understandable terms and, where data supports it, show an estimated range rather than false naira precision.

Personal values must say what assumptions they use. Until sufficient personal/exposure data exists, the product should prefer qualitative or ranged language.

Longer-term user value: "what NaijaClimaGuard helped you protect" based on observed outcomes, not invented savings.

Comparison with original: POTENTIALLY MUCH BETTER, NOT YET PROVEN.

### Offline/PWA support

Decision: KEEP.

Climate information is most valuable when connectivity is unreliable. Critical saved guidance should degrade gracefully when possible.

Comparison with original: MUST NOT REGRESS.

## Merge into My Tomorrow

The following current pages are useful capabilities but should no longer compete as separate mental models for an ordinary user:

- Dashboard
- My Area
- Outlook
- Predict
- Action / Action Center
- Safe Route

Their strongest capabilities become sections or drill-downs of **My Tomorrow**.

Proposed My Tomorrow order:

1. **What tomorrow could take from you**
2. **What is coming and when**
3. **Safety**
4. **Money**
5. **Time / Movement**
6. **Protect this**
7. **Do this before [time]**
8. **What changed since your last check**
9. **Why we think this**
10. **Afterwards: what actually happened**

Comparison with original: CLEARLY BETTER information architecture if execution remains simple.

## Keep but de-emphasise for consumers

### Live Floods / National Nowcast / LGA Scout

Decision: KEEP AS AREA CONTEXT AND INTELLIGENCE, NOT THE MAIN PRODUCT PROMISE.

These remain valuable for exploration, institutional views and event context. The consumer should first see what a situation means for them.

### Tools / How to Use

Decision: KEEP AS SUPPORT CONTENT, REMOVE FROM PRIMARY DECISION FLOW.

The main experience must be understandable without a tutorial.

### Validation / Model Evidence / Evidence pages

Decision: KEEP FOR COMPETITION, INVESTORS, TECHNICAL USERS AND TRUST DRILL-DOWN.

Do not make technical evidence the consumer home screen.

## Enterprise side survives separately

Commercial/API/intelligence capabilities remain important and should evolve around the aggregated climate-impact graph.

Enterprise products to develop from verified outcomes:
- Risk and Disruption API
- Route/Operations Impact API
- Location/Asset Impact History
- Claims Evidence / Event Forensics
- Retail/Demand Impact signals where evidence supports them
- Supply-chain disruption intelligence

Commercial rule: **sell decisions and verified impact intelligence, not commodity weather data and not personal identities.**

Comparison with original: POTENTIALLY MUCH BETTER BUSINESS MODEL, still requires paying-customer validation.

## Payment structure

Core safety must remain useful without payment. Do not lock a critical immediate warning behind a paywall.

Free should prove the product's value:
- instant My Tomorrow check;
- one primary protected place;
- critical local warnings;
- basic actions;
- sharing.

A paid protection layer should become valuable after the user understands the free product. Candidate paid value includes:
- multiple protected people/places/assets;
- family protection view;
- multiple routes and work/shop monitoring;
- earlier/planning-oriented outlooks where model evidence supports them;
- deeper history and "what changed" tracking;
- advanced impact/exposure planning;
- richer notification controls.

Pricing is not frozen until willingness-to-pay testing is completed.

## Daily return rule

The product must have something truthful to say on quiet days. A safe day is still useful information.

Examples:
- "Nothing serious is developing around your saved places tomorrow."
- "Your home looks fine. Your evening route has a 90-minute heavy-rain window."
- "No protection action needed today."

Return reasons come from changing reality, saved responsibility and useful planning, not artificial streaks, random rewards, fear or notification spam.

## Primary-navigation target

Consumer V2 should aim for a very small primary navigation model:

- **My Tomorrow**
- **Protected**
- **Explore**
- **You**

Alerts, actions, route guidance, reports and evidence surface contextually inside those areas instead of each becoming a competing top-level destination.

Enterprise/institutional experiences may use their own navigation after role/account detection.

## Original submission comparison checkpoint

| Area | Original build | V2 direction | Current judgment |
| --- | --- | --- | --- |
| Core emotional problem | Strong flood-warning delivery gap | Keeps warning gap and adds personal consequence | Better on paper |
| Daily usefulness | Mostly event-driven | My Tomorrow is useful on quiet and risky days | Clearly better design |
| Personal relevance | Location/risk focused | Safety + Money + Time + protected people/things | Clearly better design |
| Actionability | Alerts and action content | One timed action attached to consequence | Better |
| Sharing | General app/report sharing | Share a specific useful warning to someone | Better |
| Payment reason | Premium capabilities | Deeper ongoing protection after free value is proven | Better logic, unvalidated |
| Trust | Strong evidence direction | Same evidence, simpler consumer explanation | Better if proof is preserved |
| AI | Flood model evidence | Multi-horizon V7 with stronger gates | Method better, performance not yet proven |
| Hazards | Flood-centric | Multi-hazard architecture, flood first | Better extensibility |
| Data business | Risk/API/data licensing | Verified consequence/action/outcome intelligence | Stronger potential, unvalidated |
| Complexity | Many overlapping pages | One daily decision surface | Clearly better architecture |

## Lock condition

No UI redesign is approved merely because it looks premium.

A redesigned screen must demonstrate that it makes the core answer faster and clearer than the current build. If an old feature cannot be connected to the north-star promise without adding confusion, it leaves primary navigation even if its backend capability remains available.
