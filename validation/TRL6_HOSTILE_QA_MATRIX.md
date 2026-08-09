# NaijaClimaGuard TRL6 Hostile QA Matrix

This matrix separates three evidence classes so implementation checks are never presented as field proof.

## Evidence classes

- **A — Automated production evidence:** exercised against the deployed production URL.
- **B — Automated implementation contract:** verified from application/server code and CI, but not a substitute for a signed-in browser journey.
- **C — Manual/field evidence required:** requires a real account, device/browser, delivery provider, authorised partner feed, or external operator.

## User and UX matrix

| Requirement | Household | Farmer | Business | Agency | Evidence |
| --- | --- | --- | --- | --- | --- |
| Distinct role wording and actions | My Safety | My Farm Risk | Business Risk Overview | Operations Overview | B |
| Simple / Standard / Technical | Required | Required | Required | Required | B; C for visual usability |
| English / Pidgin / Hausa / Yoruba / Igbo | Required | Required | Required | Required | B; C for linguistic review |
| Mobile drawer closed by default | Required | Required | Required | Required | B; C on physical phones |
| Official advisory takes precedence visually | Required | Required | Required | Required | B; C with an authorised live advisory |
| Missing partner source never means safe | Required | Required | Required | Required | B |

## Operational journey matrix

| Journey | Expected invariant | Evidence now | Still required |
| --- | --- | --- | --- |
| Anonymous risk check | Public derived-v2 API responds and discloses provenance | A | Periodic live monitoring |
| Save/delete location | Session required; deletion scoped to current user | B; anonymous 401 is A | C signed-in create/delete |
| Create/update/delete alert | Session required; saved location must belong to current user | B; anonymous 401 is A | C signed-in end-to-end |
| Phone-based alert setup | Verified phone required before SMS/WhatsApp/voice can be enabled | B | C provider/device delivery proof |
| Change delivery phone | Existing verification and phone channels are revoked | B | C signed-in browser proof |
| Platform vs alert language | Stored independently | B | C reload/device persistence proof |
| Flood report | Ground report remains separate from validated model labels | B | C submit/review workflow |
| Evidence ledger | SHA-256 hash chain with previous-hash linkage inside DB transaction | B | C append/read/tamper-detection exercise |
| Agency command | Enterprise-only; canonical official advisories only; stale advisories rejected | B; anonymous 401 is A | C authorised Enterprise account + advisory feed |
| Agency acknowledge/escalate/resolve | Source advisory stays immutable; command action is separate evidence | B | C end-to-end operator exercise |
| Intelligence health | Enterprise-only; fresh/stale/suspect/missing represented explicitly | B; anonymous 401 is A | C authorised partner feeds |
| Assistant education | Basic flood questions produce topic-specific answers | B; public UI surface is A | C multilingual conversational review |
| Assistant live risk | Must use platform live-risk path and not masquerade education as warning | B | C browser interaction |

## Safety and claim gates

The following are blocking failures for a TRL6 demonstration build:

1. `0.9928`, `99.28`, `48 hours before government`, or `tamper-proof` reappears as a public product claim.
2. Model v5 is presented as the production engine before its final governed decision exists.
3. A low model score is allowed to suppress or contradict a connected official emergency warning.
4. Missing/stale source data is converted into a normal/safe state.
5. Anonymous users can read or mutate saved locations, alert rules, delivery preferences, Agency Command, or Enterprise intelligence health.
6. Phone-based channels can be enabled without phone verification.
7. Agency Command can manufacture or mutate an official source advisory.
8. User/community flood reports are automatically promoted into validated model labels.

## What this does not prove

Passing the matrix does **not** by itself prove nationally live NIHSA/NEMA feeds, physical river-gauge coverage, dam telemetry, safe evacuation routing, insurer-approved parametric triggers, SMS/WhatsApp/voice provider delivery, Model v5 production validation, or prospective field performance. Those require separate partner/field evidence and must remain labelled accordingly.
