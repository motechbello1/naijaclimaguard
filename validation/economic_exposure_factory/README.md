# Economic Exposure Factory

NaijaClimaGuard's economic layer must distinguish three things that are often incorrectly collapsed into one number:

1. **Exposure**: people, buildings, roads, farms or facilities located inside a hazard footprint.
2. **Expected loss**: a modeled monetary consequence using vulnerability and replacement/loss functions.
3. **Avoided loss**: the difference in outcome attributable to an intervention, which requires action and outcome evidence.

The current factory builds the first defensible national/state **exposure denominator** and a national historical damage sensitivity baseline. It deliberately does not allocate the World Bank's 2022 national damage estimate to states by population.

## Current verified sources

- **WorldPop Nigeria population v3.0 (2025)**: state totals scaled to the July 2025 UN World Population Prospects median projection. The release also provides an approximately 100 m gridded Nigeria population surface for later hazard-footprint intersections.
- **World Bank Nigeria flood diagnostic**: 2022 direct economic damage range US$3.79bn to US$9.12bn, median US$6.68bn.
- **geoBoundaries gbOpen Nigeria ADM1**: commercial-compatible CC BY 4.0 state/FCT boundaries used by the national evidence factory.

## Next spatial layers

The production-grade Economic Impact Engine should calculate exposure from the actual footprint of a hazard rather than assigning a whole-state value. Planned layers are:

- WorldPop 100 m population within the footprint;
- Google Open Buildings v3 and/or OSM building footprints;
- ESA WorldCover 2021 built-up and cropland classes;
- OSM/HDX roads, hospitals, schools and other critical facilities;
- local asset portfolios supplied by banks, insurers, businesses and government partners;
- Nigerian sector-specific damage/vulnerability curves where defensible evidence exists.

## Claim rules

A displayed currency value must be tagged as one of `historical_observed_reference`, `scenario`, `modeled_expected_loss`, or `measured_avoided_loss`. The interface must never present a sensitivity scenario as money already saved by NaijaClimaGuard.

An avoided-loss claim is only eligible after a pilot preserves: warning issue time, action decision, action timing/cost, exposed assets, observed outcome and a defensible counterfactual/comparison method.
