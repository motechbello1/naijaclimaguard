# National Retrospective Benchmark Protocol

## Purpose

Create a defensible Nigeria-wide benchmark now, without waiting months for a prospective flood season and without weakening the existing Riverine Watch v1 scientific boundary.

This benchmark is explicitly retrospective. It is designed to answer a different question from prospective operational validation:

> Given information that can be reconstructed consistently across Nigeria from open historical sources, how well does NaijaClimaGuard distinguish documented flood-event periods from non-event periods across states and years?

It does **not** prove that NaijaClimaGuard issued a warning before those events in real time. Prospective Riverine Watch evidence continues separately.

## Why this is the correct temporary substitute

The current bottleneck is not that Nigeria lacks historical evidence. The bottleneck is collecting enough new future flood events under one frozen operational source contract. Waiting for 20+ future independent events could take many months.

A national retrospective benchmark gives a number that can be produced much faster while remaining scientifically honest, provided the following rules are enforced:

1. independent documented flood events are used as labels;
2. all feature data are historical and date-bounded;
3. training and evaluation are separated by time and geography;
4. the benchmark reports event detection, false-alert burden, PR-AUC, ROC-AUC and calibration rather than a misleading generic accuracy score;
5. no retrospective result is described as prospective validation or as proof of a fixed warning lead time.

## Geographic scope

Target scope: all 36 states plus the Federal Capital Territory.

The benchmark should maintain a state coverage registry with four states of readiness:

- `SOURCE_READY`: required gridded feature sources are available for the jurisdiction;
- `EVENT_READY`: enough independent documented flood events have been verified;
- `BENCHMARK_READY`: source and event requirements are both satisfied;
- `INSUFFICIENT_EVIDENCE`: the jurisdiction remains visible but is excluded from the headline denominator until evidence quality is adequate.

No state is silently treated as safe because evidence is missing.

## Historical feature stack

The nationwide benchmark should use sources that are consistently reconstructable across the country and do not depend on slow archived operational-forecast acquisition.

### Dynamic features

- NASA GPM IMERG historical precipitation
- CHIRPS daily precipitation as an independent rainfall cross-check where useful
- ERA5-Land surface runoff, soil moisture and antecedent wetness variables
- optional historical river-discharge/reanalysis features where spatially valid and consistently available

### Static exposure and terrain features

- elevation and slope from SRTM/Copernicus DEM
- river-network and upstream-area context from HydroSHEDS/HydroRIVERS or equivalent open hydrography
- distance to mapped river/channel
- historical surface-water occurrence from JRC Global Surface Water
- settlement/building exposure from open population/building layers when used for impact analysis

Static exposure variables must not be used as proof that a flood occurred. They describe susceptibility/exposure only.

## Event labels

Independent event anchors should be collected from sources such as:

- NEMA situation reports and official flood publications
- NiHSA flood reports/outlooks where an observed event is explicitly documented
- State emergency-management agency publications where provenance is clear
- ReliefWeb/UNOCHA/IFRC situation reports
- peer-reviewed or institutional reports for events not adequately covered by national sources

Each event record must include at minimum:

- state
- LGA/community when known
- event date or bounded date interval
- flood type when known
- source URL
- source publisher
- publication date when available
- evidence excerpt/summary
- confidence grade
- duplicate/event-family identifier

News articles may support discovery but should not be the sole source for a headline benchmark event when a stronger institutional source is available.

## Label policy

For a documented event date `D`, create a predeclared event window appropriate to the benchmark objective. Recommended initial policy:

- positive window: `D-3` through `D`
- uncertainty exclusion: `D-14` through `D-4` and `D+1` through `D+14`
- negatives: eligible dates outside all event/uncertainty windows

The exact policy must be frozen before model scoring.

## Validation design

A single random train/test split is forbidden.

Use two complementary tests:

### Temporal generalisation

Train on earlier years and score later years using expanding walk-forward validation.

### Geographic generalisation

Use grouped state or basin holdout so the model is tested on jurisdictions not used for fitting/calibration in that fold.

The national headline should be produced only from out-of-fold predictions.

## Candidate models

Keep the candidate set intentionally small and auditable:

- regularised logistic regression
- random forest
- regularised gradient boosting/XGBoost

A simpler model may win. Model complexity is not a success criterion.

## Metrics

Headline metrics:

- independent event detection rate
- event-level precision / alert-episode precision
- false alert episodes per jurisdiction-year
- PR-AUC and prevalence baseline
- ROC-AUC
- Brier score / calibration
- geographic coverage denominator

Supporting metrics:

- per-state or per-basin event detection where the denominator is large enough
- confusion matrix at the frozen threshold
- sensitivity analysis by flood type

Generic accuracy must not be used as the primary headline because flood-event days are rare and accuracy can be high even for a useless model.

## National headline rule

The public number must always carry its denominator and scope.

Good example:

> `X of Y independently documented eligible flood events detected retrospectively across Z benchmark-ready jurisdictions (A%), using out-of-fold historical replay.`

Bad examples:

- `A% accurate across Nigeria`
- `A% chance of predicting every flood`
- `A% national real-time accuracy`

## Relationship to Riverine Watch v1

Riverine Watch v1 remains a separate operational-style riverine shadow model with its existing frozen evidence:

- Lokoja + Makurdi scope
- 14-day WATCH horizon
- historical event detection 4/5 = 80%
- PR-AUC 0.1763
- ROC-AUC 0.8371
- alert-episode precision 26.7%
- about 1.83 false alert episodes per location-year

The national retrospective benchmark must not rewrite or blend those metrics.

## Relationship to GloFAS and future local data

The national benchmark is deliberately designed so the first defensible national number does not depend on waiting for months of prospective GloFAS evidence.

GloFAS operational forecasts, local river gauges, NiHSA streamflow observations, dam-operation data and verified sensor feeds remain the **upgrade path** for riverine lead time, local calibration and prospective operational validation.

The investor/agency story is therefore:

1. establish national retrospective discrimination and coverage now;
2. keep Riverine Watch collecting real prospective evidence every day;
3. integrate national/local hydrological data where agreements permit;
4. publish prospective performance only after enough future events exist.

## Freeze controls

Before the national score is produced, commit:

- event registry version/hash
- feature source versions
- time period
- geographic inclusion rule
- label window
- model candidates
- threshold-selection rule
- metric definitions
- minimum jurisdiction/event denominator

After the score is observed, do not relax these gates merely to improve the headline.

## Competition-safe claim

Until the benchmark runs, the safe national statement is:

> NaijaClimaGuard is building a 36-state + FCT retrospective benchmark using independent documented flood events and nationally consistent open environmental data. The existing 80% result is confined to Riverine Watch v1's five eligible historical events in Lokoja and Makurdi and is not a national accuracy claim.
