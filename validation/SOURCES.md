# Validation v2 — Source Manifest

This file defines the data provenance that NaijaClimaGuard may claim publicly.

## 1. NASA GPM IMERG Final V07 — observed precipitation

**Role:** primary historical rainfall observation / hindcast input.

- Product: GPM IMERG Final Precipitation L3, 1 day, 0.1° x 0.1°, Version 07
- NASA short name: `GPM_3IMERGDF`
- DOI: `10.5067/GPM/IMERGDF/DAY/07`
- Spatial resolution: 0.1° (~10 km)
- Record: 1998-present in the current V07 archive
- Official dataset page: https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDF_07/summary
- NASA GPM directory: https://gpm.nasa.gov/data/directory

**Permitted wording:**

> NASA GPM IMERG multi-satellite precipitation observations.

**Do not say:**

> Open-Meteo rainfall is NASA-derived.

unless the exact Open-Meteo endpoint explicitly documents that provenance.

IMERG Final is an observed/research precipitation product. It is not itself a 48-hour flood forecast. It is appropriate for model training, event reconstruction, rainfall accumulation, anomaly features and observational verification. For operational low-latency use, IMERG Early/Late can be evaluated separately.

## 2. Copernicus/ECMWF GloFAS v4 — river discharge

**Role:** historical and forecast hydrological input.

Primary system: Copernicus Emergency Management Service Global Flood Awareness System (GloFAS), produced by ECMWF/CEMS using LISFLOOD.

For the reproducible validation pipeline, historical discharge may be retrieved through Open-Meteo's Flood API while retaining the source attribution as GloFAS:

- API: https://flood-api.open-meteo.com/v1/flood
- Model: `consolidated_v4`
- Variable: `river_discharge`
- Units: m³/s
- Spatial resolution: 0.05° (~5 km)
- Open-Meteo documentation: https://open-meteo.com/en/docs/flood-api
- ECMWF GloFAS v4 background: https://www.ecmwf.int/en/about/media-centre/news/2022/copernicus-emergency-management-service-releases-glofas-v40

For direct primary-source downloads, use the CEMS Early Warning Data Store dataset `cems-glofas-historical`, system version 4.0, LISFLOOD and `river_discharge_in_the_last_24_hours`.

**Important:** river-grid-cell selection must be audited per station. Open-Meteo warns that the nearest river may not always be selected correctly at 5 km resolution. A coordinate cannot be accepted merely because the API returned a number.

## 3. ERA5-Land via Open-Meteo — antecedent surface state

**Role:** soil moisture, ET0 and supporting meteorological state. Rainfall from this source is a cross-check, not the primary rainfall feature when NASA IMERG is available.

- API: https://archive-api.open-meteo.com/v1/archive
- Model: `era5_land`
- Official documentation: https://open-meteo.com/en/docs/historical-weather-api
- Spatial resolution: 0.1° (~11 km)

Core variables:

- `soil_moisture_0_to_7cm`
- `soil_moisture_7_to_28cm`
- `soil_moisture_28_to_100cm`
- `et0_fao_evapotranspiration`
- temperature / humidity variables when needed

**Permitted wording:**

> ERA5-Land reanalysis surface-state variables delivered through Open-Meteo.

## Public architecture statement

The defensible architecture is:

> NaijaClimaGuard fuses NASA GPM IMERG multi-satellite rainfall observations, Copernicus/ECMWF GloFAS river-discharge modelling, and ERA5-Land surface-state variables into a Nigeria-focused flood-risk decision layer.

That statement is only valid for model versions that actually ingest all three sources.

## Hindcast vs forecast

NASA IMERG Final and ERA5-Land reanalysis describe historical observed/reconstructed conditions. They support historical model development and event detection.

A claim such as `48-hour advance warning` requires archived forecast inputs that were available at T-48, not reanalysis produced with later observations. For modern events, use archived weather model runs and GloFAS forecast/reforecast products and preserve their model initialisation times.
