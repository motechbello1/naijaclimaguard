# Live Risk Engine — Single-Source Invariant

NaijaClimaGuard currently serves the disclosed `derived-v2` rainfall-based decision-support index.

## Invariant

For a given coordinate and evaluation time, every user-facing current-risk surface must obtain its score from the same production implementation.

Current path:

```text
Open-Meteo daily + hourly weather
             |
             v
lib/risk/derived-v2.ts
             |
             v
/api/v1/risk
   |     |       |        |
   v     v       v        v
Dashboard  My Area  Intelligence  Predict
             |
             +---- Alerts (shared server helper)
             +---- Situation reports (shared server helper)
```

## Why

Duplicated formulas are operationally unsafe. Before this cleanup, the public API used the current 40/35/25 derived-v2 formula with hourly rainfall bursts while the alert checker and Intelligence Center still used older daily-only calculations. That meant the same location could show one score on screen and be evaluated against another score elsewhere.

## Rules

1. Do not create a new user-facing risk calculation inside a page/component.
2. Browser surfaces should use `/api/v1/risk` unless there is a specific documented reason not to.
3. Server-side batch/report/alert jobs should call `fetchDerivedV2Risk` from the shared helper.
4. If the canonical risk engine is unavailable, show the risk as unavailable; do not silently substitute a second formula.
5. Simulation/scenario features must remain explicitly labeled and must never replace the live score.
6. A future Validation-v2 model must replace the canonical backend contract only after its evidence gates are met; clients should not each implement their own model migration.

## Current limitation

`derived-v2` remains a rainfall/intensity/antecedent-wetness heuristic over Open-Meteo. It is not the independent NASA + GloFAS + ERA5-Land XGBoost validation model and must not be described as such.
