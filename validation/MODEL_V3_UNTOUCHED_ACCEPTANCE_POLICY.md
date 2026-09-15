# Model v3 untouched/prospective acceptance policy

## Status

This acceptance policy is declared **before the new untouched/prospective holdout is opened**. It must not be relaxed after the holdout is observed.

The already-observed 2022-2024 period is permanently ineligible as the final untouched Model v3 evaluation.

## Holdout eligibility

A final Model v3 acceptance evaluation is eligible only when:

- the exact freeze candidate artifact and threshold were serialized before holdout collection;
- every evaluated feature date is strictly after the freeze date recorded in the freeze manifest;
- the model, feature list, calibration constants and threshold are unchanged;
- ground-truth events are independently documented and are not created from predictor thresholds;
- at least **20 independent documented flood-event anchors** are available;
- evaluation remains within the five frozen pilot locations unless a separately declared external-generalization study is being run.

If fewer than 20 events are available, results may be reported as interim shadow-pilot evidence but cannot pass the final acceptance gate.

## Predeclared final acceptance gates

The frozen Model v3 candidate passes the minimum final evidence gate only if all of the following hold on the new untouched/prospective period:

1. **Independent event-window detection rate >= 75%.**
2. The **95% Wilson lower confidence bound** for event detection is >= 50%.
3. **False-positive burden <= 10 per 1,000 negative location-days.**
4. **Precision >= 10%.**
5. **PR-AUC is at least 2x the positive-row prevalence baseline.**
6. **Brier score is better (lower) than the constant-prevalence probability baseline.**
7. For every pilot location with at least three independent holdout events, event-window detection at that location is >= 50%.

If any gate fails, the frozen candidate fails the final acceptance test. The holdout remains consumed; the model may not be tuned and retested on the same period.

## Lead-time claim gate

Model v3's current feature design is an observational/current-state historical risk model. Passing the final acceptance policy above **does not establish a 24/48/72-hour issue-time warning claim**.

A fixed lead-time claim requires a separate frozen decision model evaluated on genuinely archived or prospective **issue-time forecast features** across multiple independent events. Historical/reanalysis observations must not be relabelled as forecast-time evidence.

## Production decision

Even a statistical pass does not automatically override NiHSA/NEMA operational authority. Deployment requires a separate operational readiness review covering source uptime, degraded mode, notification delivery, audit logging, security, user messaging and institutional sign-off.
