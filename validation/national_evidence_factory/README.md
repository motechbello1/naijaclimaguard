# National Evidence Factory

This directory builds the first auditable Nigeria-wide retrospective flood benchmark while Riverine Watch v1 continues collecting prospective evidence separately.

## Scope

- 36 states plus the Federal Capital Territory are registered explicitly in `jurisdictions.csv`.
- Historical event candidates are discovered from GDACS and ReliefWeb and reconciled with the repository's already-curated event registry.
- Headline eligibility is evidence-gated. Discovery alone is not enough.
- A nationally consistent ERA5-Land research feature layer is acquired through the Open-Meteo historical archive for the initial v0 benchmark.
- The model is evaluated using out-of-time and held-out-jurisdiction folds. Random row splitting is forbidden.

## Evidence rules

The headline denominator may contain only events whose date, jurisdiction and source provenance are adequately supported. Repository-curated events remain eligible. Automatically discovered GDACS events require independent ReliefWeb corroboration near the event date before they enter the headline denominator.

A Grade A event has institutional/remote-sensing corroboration. Grade B has independent corroboration but not an institutional publisher. Grade C remains discovery evidence and is excluded from the headline score.

No missing state is called safe. Jurisdictions without adequate event evidence remain visible as evidence gaps.

## v0 feature contract

The first executable national layer uses ERA5-Land historical daily precipitation and FAO ET0 at each state-capital anchor, then derives antecedent rainfall/wetness features. This is intentionally a research benchmark layer, not a claim that one capital point represents every flood process in a state.

The planned v1 feature contract strengthens spatial realism with ADM1 multipoint/polygon sampling, NASA GPM IMERG, hydrography/river distance, elevation/slope, surface-water history and locally available hydrological observations.

## Validation contract

For every scored state-year:

1. the test state is excluded from model fitting;
2. the test year and later years are excluded from model fitting;
3. model family selection is based only on prior inner out-of-fold PR-AUC;
4. the alert threshold is selected only from prior negative predictions under a fixed 1% issue-row alert budget;
5. the held-out state-year is scored once;
6. event detection, precision, false-alert burden, PR-AUC, ROC-AUC and Brier score are reported.

The result is labelled `retrospective_oof_research_benchmark`. It is not prospective validation and does not establish a national warning lead time.

## Outputs

- `out/national_event_registry.csv`
- `out/national_event_registry.summary.json`
- `out/state_daily_features.csv`
- `out/state_feature_manifest.json`
- `out/national_oof_predictions.csv`
- `out/national_benchmark_results.json`

Generated outputs are uploaded as GitHub Actions artifacts first. A public headline is not updated automatically merely because a workflow produced a number; evidence quality and denominator must be reviewed.
