# NaijaClimaGuard Claim Gates

A strong source stack is not automatically a validated forecast. This file defines the evidence required before language is allowed into a NiHSA-facing deck or product page.

## Gate 0 — Architecture exists

**Evidence required**
- ingestion code exists for each named data source;
- source provenance is explicit;
- no synthetic values are presented as live data.

**Allowed language**
> NaijaClimaGuard is designed to fuse NASA GPM IMERG rainfall, GloFAS river discharge and ERA5-Land surface-state information.

**Not yet allowed**
> The fused model is validated.

---

## Gate 1 — Historical source fusion is reproducible

**Evidence required**
- NASA IMERG Final historical table;
- GloFAS historical discharge table;
- ERA5-Land historical surface-state table;
- coverage/provenance checks pass;
- one reproducible fused `features_daily.csv` artifact.

**Allowed language**
> We have built a reproducible historical NASA–GloFAS–ERA5-Land feature stack for Nigerian flood-risk modelling.

---

## Gate 2 — Independent hindcast validation

**Evidence required**
- flood ground truth comes from independent documented events;
- no rainfall-derived target labels;
- chronological holdout;
- frozen model and reproducible evaluation;
- adequate number of independent test events;
- precision, recall, PR-AUC/ROC-AUC and false negatives disclosed.

**Allowed language**
> In independent historical event testing, the model achieved [metric] on [N] unseen flood events.

**Not yet allowed**
> 48-hour advance warning.

---

## Gate 3 — Operational source replay

**Evidence required**
- NASA IMERG Early/Late product that was available at the historical decision time;
- archived operational GloFAS forecast issued at that time;
- forecast issue timestamp and lead time retained;
- Nigerian ground observations/event dates retained independently.

**Allowed language**
> We reconstructed the information that was operationally available at T-72/T-48/T-24 before the event.

**Not yet allowed**
> Our model would have warned at T-48.

---

## Gate 4 — Frozen-model historical forecast replay

**Evidence required**
- model trained without the target event and without future information;
- operational T-72/T-48/T-24 feature vectors match the training feature definition;
- threshold fixed before inspecting the target-event result;
- forecast result preserved with code/data hashes;
- event onset and hydrological peak are not conflated.

**Allowed language**
> In an out-of-sample operational replay, the frozen model crossed its pre-specified warning threshold [X] hours before [precisely defined event milestone].

This is the minimum gate for a historical lead-time claim.

---

## Gate 5 — Prospective shadow pilot with NiHSA

**Evidence required**
- predictions timestamped before outcomes;
- no retrospective changes;
- comparison with NiHSA/NiMet observations and advisories under an agreed protocol;
- false alarms, misses, latency and calibration measured prospectively.

**Allowed language**
> During a prospective [duration] shadow pilot, NaijaClimaGuard delivered [measured result].

This is the strongest government-facing evidence because it removes hindsight entirely.

---

# Current status

- Gate 0: **implemented on `validation-v2`**.
- Gate 1: **pipeline implemented; execution awaits authenticated NASA historical retrieval**.
- Gate 2: **method implemented; event registry still below the minimum test-event threshold for headline metrics**.
- Gate 3: **pipeline implemented for Lokoja 2022; execution requires Earthdata + CEMS EWDS credentials**.
- Gate 4: **not yet satisfied**.
- Gate 5: **proposed NiHSA 90-day shadow/co-validation pilot**.

# Pitch discipline

The source names themselves are valuable: NASA, Copernicus/ECMWF and ERA5-Land are credible global systems. But the product's defensible differentiation is not ownership of those datasets. It is the Nigerian calibration, fusion, validation, workflow integration, delivery and institutional learning layer built on top of them.
