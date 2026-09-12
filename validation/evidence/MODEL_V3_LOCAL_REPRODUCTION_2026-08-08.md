# Model v3 local development reproduction — 2026-08-08

## Status

**Development-only local reproduction. Not canonical CI and not production validation.**

This run was performed after the Model v3 registry, candidate set, scientific sanity review, threshold policy, and future untouched-holdout policy had already been committed. It uses **2018-01-01 through 2021-12-31 only**. The consumed 2022–2024 benchmark was not evaluated or used for model/threshold selection.

The source feature table came from the preserved successful GitHub Actions Validation v2 run **#61** (`run_id=31265455727`, artifact `validation-v2-evidence-61`, artifact id `9026046936`, artifact digest `sha256:0130872fcb0d54ca6175f2c0b0614250d2194989c51061c9d33e43d635bd2c3f`). The artifact contains the complete fused NASA IMERG Final V07 + GloFAS historical + ERA5-Land feature table.

Local runtime:

- pandas 2.2.3
- NumPy 2.3.5
- scikit-learn 1.8.0
- XGBoost 3.1.3

The committed Model v3 environment pins scikit-learn 1.9.0, so this file is evidence from a local reproduction and must not be relabelled as the canonical CI result. XGBoost matches the pinned 3.1.3 version.

## Development data

- fused 2018–2021 feature rows: **7,305**
- labelled rows after the frozen ±14-day uncertainty exclusions: **6,905**
- positive rows: **64**
- negative rows: **6,841**
- frozen development events: **16**
- OOF events in 2019–2021: **12**

## Frozen candidate ranking

| Candidate | Mean temporal-fold PR-AUC | Pooled OOF PR-AUC | Provisional F1 threshold | OOF events detected |
|---|---:|---:|---:|---:|
| logistic_balanced | 0.02766045 | 0.02542570 | 0.77 | 6/12 |
| random_forest_balanced | 0.06652162 | 0.04438331 | 0.14 | 5/12 |
| **xgboost_regularized** | **0.10265461** | **0.04456967** | **0.24** | **5/12** |
| xgboost_regularized_cyclic_season (diagnostic only) | 0.07344171 | 0.04029683 | 0.12 | 6/12 |

By the precommitted ranking rule (highest mean temporal-fold PR-AUC; Brier tie-breaker), the development winner is **`xgboost_regularized`**.

At its provisional F1 diagnostic threshold 0.24:

- precision: **0.06608**
- recall: **0.31250**
- F1: **0.10909**
- ROC-AUC: **0.80497**
- PR-AUC: **0.04457**
- Brier: **0.02287**
- TN 4,920 / FP 212 / FN 33 / TP 15
- false-alarm ratio: **0.93392**
- miss rate: **0.68750**
- event detection: **5/12**

These are development OOF diagnostics, not production performance claims.

## Scientific sanity review

The selected XGBoost clears the *minimum development sanity checks*.

Temporal-fold PR-AUC versus that fold's prevalence/random-PR baseline:

- 2019: PR-AUC **0.24085** vs prevalence **0.01176** (20.47×)
- 2020: PR-AUC **0.05491** vs prevalence **0.00925** (5.94×)
- 2021: PR-AUC **0.01220** vs prevalence **0.00686** (1.78×)

Per-location pooled OOF PR-AUC versus location prevalence:

- Hadejia: **0.02185** vs **0.00765** (2.86×)
- Lokoja: **0.07185** vs **0.00765** (9.39×)
- Makurdi: **0.07059** vs **0.01175** (6.01×)
- Onitsha: **0.00943** vs **0.00765** (1.23×)
- Yenagoa: **0.15474** vs **0.01175** (13.17×)

Season-only pooled PR-AUC: **0.03348187**.
Selected hydrological XGBoost pooled PR-AUC: **0.04456967**.
Absolute margin: **0.01108780**, which is just above the predeclared >0.01 minimum.

Therefore the minimum scientific sanity review passes, but that does **not** imply the operational threshold gate passes.

## Predeclared threshold policy result

The threshold policy was committed before these scores were seen. It requires all of:

1. event detection >= 75% (>=9/12 OOF events),
2. false-positive location-days <=10 per 1,000 negative location-days,
3. precision >=10%, and
4. the scientific sanity review to pass.

**No threshold on the frozen 0.05–0.95 frontier qualifies.**

Representative trade-off points:

- threshold 0.05: 8/12 events (66.7%), precision 4.36%, **102.49** FP days / 1,000 negatives
- threshold 0.50: 3/12 events (25.0%), precision 6.50%, **22.41** FP days / 1,000 negatives
- threshold 0.75: 3/12 events (25.0%), precision 6.78%, **10.72** FP days / 1,000 negatives
- threshold 0.80: 2/12 events (16.7%), precision 6.98%, **7.79** FP days / 1,000 negatives

The model cannot simultaneously achieve the required event detection, false-positive burden, and precision on the frozen development frontier.

## Freeze decision

**Model v3 is not eligible for a freeze candidate from this local reproduction.**

Do not relax the threshold policy, edit the event registry, inspect 2022–2024 for a more convenient configuration, or promote only the ROC-AUC/PR-AUC values while hiding the failed operational gate.

Production remains **`derived-v2`**.

A later pinned-environment CI reproduction may shift small numerical details, but the canonical decision must follow the same predeclared policy. If CI produces materially different results, preserve both and investigate reproducibility rather than selecting the more favorable output.
