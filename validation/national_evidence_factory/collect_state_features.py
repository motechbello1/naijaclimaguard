#!/usr/bin/env python3
"""Collect nationally consistent retrospective rainfall/wetness features.

This first nationwide research layer uses ERA5-Land through Open-Meteo's Historical
Weather API. It samples each jurisdiction at its capital as a reproducible initial
anchor and explicitly labels this limitation. It is not promoted as a local flood
inundation model. The pipeline is structured so ADM1 polygon sampling and NASA IMERG
can replace/augment the anchor layer without changing benchmark scoring code.
"""
from __future__ import annotations
import argparse, csv, json, math, time
from pathlib import Path
import pandas as pd
import requests

GEOCODE="https://geocoding-api.open-meteo.com/v1/search"
ARCHIVE="https://archive-api.open-meteo.com/v1/archive"


def get(url, params, tries=4):
    last=None
    for i in range(tries):
        try:
            r=requests.get(url,params=params,timeout=90,headers={"User-Agent":"NaijaClimaGuard/1.0"}); r.raise_for_status(); return r.json()
        except Exception as e:
            last=e; time.sleep(2**i)
    raise RuntimeError(f"{url}: {last}")


def geocode(capital):
    data=get(GEOCODE,{"name":capital,"count":10,"language":"en","format":"json"})
    results=data.get("results") or []
    ng=[r for r in results if str(r.get("country_code","")).upper()=="NG"]
    if not ng: raise RuntimeError(f"No Nigerian geocode for {capital}")
    r=ng[0]; return float(r["latitude"]),float(r["longitude"]),float(r.get("elevation") or 0)


def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--jurisdictions",default="validation/national_evidence_factory/jurisdictions.csv"); ap.add_argument("--start",default="2018-01-01"); ap.add_argument("--end",default="2025-12-31"); ap.add_argument("--out",default="validation/national_evidence_factory/out/state_daily_features.csv"); args=ap.parse_args()
    jurisdictions=list(csv.DictReader(open(args.jurisdictions,encoding="utf-8")))
    frames=[]; geocodes=[]
    for idx,j in enumerate(jurisdictions,1):
        lat,lon,elev=geocode(j["capital"]); geocodes.append({**j,"latitude":lat,"longitude":lon,"elevation_m":elev})
        data=get(ARCHIVE,{"latitude":lat,"longitude":lon,"start_date":args.start,"end_date":args.end,"daily":"precipitation_sum,et0_fao_evapotranspiration","models":"era5_land","timezone":"Africa/Lagos"})
        d=data.get("daily") or {}; dates=d.get("time") or []
        f=pd.DataFrame({"date":pd.to_datetime(dates),"precip_mm":d.get("precipitation_sum",[]),"et0_mm":d.get("et0_fao_evapotranspiration",[])})
        if f.empty: raise RuntimeError(f"No ERA5-Land daily data for {j['state']}")
        f["state"]=j["state"]; f["zone"]=j["zone"]; f["anchor"]=j["capital"]; f["latitude"]=lat; f["longitude"]=lon; f["elevation_m"]=elev
        f["precip_mm"]=pd.to_numeric(f["precip_mm"],errors="coerce").fillna(0.0); f["et0_mm"]=pd.to_numeric(f["et0_mm"],errors="coerce").fillna(0.0)
        for w in [3,7,14,30]:
            f[f"rain_{w}d_mm"]=f["precip_mm"].rolling(w,min_periods=1).sum()
        f["rain_3d_max_30d_mm"]=f["rain_3d_mm"].rolling(30,min_periods=1).max()
        f["wetness_proxy_30d_mm"]=f["rain_30d_mm"]-f["et0_mm"].rolling(30,min_periods=1).sum()
        doy=f["date"].dt.dayofyear
        f["season_sin"]=doy.map(lambda x: math.sin(2*math.pi*x/365.25)); f["season_cos"]=doy.map(lambda x: math.cos(2*math.pi*x/365.25))
        frames.append(f)
        print(f"[{idx}/{len(jurisdictions)}] {j['state']} {len(f)} days")
        time.sleep(0.15)
    out=Path(args.out); out.parent.mkdir(parents=True,exist_ok=True); pd.concat(frames,ignore_index=True).to_csv(out,index=False)
    Path(out.with_name("jurisdiction_geocodes.csv")).write_text(pd.DataFrame(geocodes).to_csv(index=False),encoding="utf-8")
    manifest={"source":"ERA5-Land via Open-Meteo Historical Weather API","model":"era5_land","period":[args.start,args.end],"jurisdictions":len(jurisdictions),"sampling":"one reproducible capital anchor per jurisdiction in v0; not a state-wide inundation representation","upgrade_path":["ADM1 polygon multi-point sampling","NASA GPM IMERG","river-network/static susceptibility","local gauge/GloFAS"]}
    Path(out.with_suffix(".manifest.json")).write_text(json.dumps(manifest,indent=2),encoding="utf-8")

if __name__=="__main__": main()
