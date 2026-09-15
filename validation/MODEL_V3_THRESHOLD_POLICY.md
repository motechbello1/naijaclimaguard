# Model v3 development-only operating-threshold policy

## Status

This policy is predeclared **before any Model v3 development score is generated**. It governs whether a provisional development candidate is even eligible to become a frozen candidate for a later untouched/prospective evaluation.

It does **not** authorize production alerts and does not change the live `derived-v2` engine.

## Why a policy is needed

Maximising F1 after looking at the development predictions is useful as a diagnostic but is not a defensible operational warning policy. Flood-warning thresholds must balance missed documented events against alert burden.

The Model v3 evaluator therefore exposes a fixed threshold frontier from 0.05 to 0.95 in 0.05 increments. This policy selects from that frontier using constraints fixed in advance.

## Eligibility gates

A threshold is eligible only if all of the following are true on pooled **2019-2021 out-of-fold development predictions**:

1. **Independent event-window detection rate >= 75%.**
   - With the frozen 12-event OOF registry this means at least 9 of 12 documented events must be detected in their development event windows.
2. **False-positive burden <= 10 per 1,000 negative location-days.**
   - This is a development diagnostic for alert burden, not a count of delivered SMS/email notifications.
3. **Precision >= 10%.**
   - This prevents a threshold that obtains event coverage only by labelling nearly everything positive.
4. The separate Model v3 scientific sanity review must pass its minimum fold/location/seasonality checks.

If no frontier threshold satisfies all gates, **there is no eligible Model v3 operating threshold** and the model-development generation is blocked from freeze. The policy must not be relaxed after seeing the result; relaxing it would require a new declared model generation and a new future untouched evaluation plan.

## Selection rule when multiple thresholds qualify

Choose the **highest qualifying threshold**.

Rationale: once the predeclared minimum event-detection requirement is met, the highest qualifying threshold is the more conservative choice against unnecessary positive location-days. The false-positive and precision gates remain mandatory.

## What this policy does not establish

Passing this policy does not establish:

- national Nigerian flood-prediction accuracy;
- a validated 24/48/72-hour issue-time warning claim;
- performance outside the five development locations;
- production readiness;
- permission to replace official NiHSA/NEMA guidance.

A qualifying threshold only allows the exact development pipeline to be serialized as a **freeze candidate**. That candidate must then be tested once on a genuinely new untouched/prospective holdout obtained after the freeze.
