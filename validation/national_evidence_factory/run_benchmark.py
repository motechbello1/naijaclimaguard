#!/usr/bin/env python3
"""Run frozen national retrospective benchmark with temporal + geographic holdout.

For each test state-year, models are trained only on *earlier years* and on *other
states*. A 1% training-negative alert-budget threshold is selected without seeing
the test block. The public result must remain labelled retrospective historical
replay, never prospective warning accuracy.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.metrics import average_precision_score, roc_auc_score, brier_score_loss, precision_score

FEATURES=["precip_mm","rain_3d_mm","rain_7d_mm","rain_14d_mm","rain_30d_mm","rain_3d_max_30d_mm","wetness_proxy_30d_mm","elevation_m"]


def label(features, events):
    df=features.copy(); df["date"]=pd.to_datetime(df["date"]); df["label"]=0; df["excluded"]=False; df["event_id"]=""
    for _,e in events.iterrows():
        if not bool(e["headline_eligible"]): continue
        d=pd.to_datetime(e["event_date"]); state=e["state"]
        pos=(df.state.eq(state)&df.date.between(d-pd.Timedelta(days=3),d)); uncertainty=(df.state.eq(state)&df.date.between(d-pd.Timedelta(days=14),d+pd.Timedelta(days=14))&~pos)
        df.loc[pos,"label"]=1; df.loc[pos,"event_id"]=str(e["event_id"]); df.loc[uncertainty,"excluded"]=True
    return df[~df.excluded].copy()


def event_detection(block, pred, threshold):
    tmp=block[["event_id","label"]].copy(); tmp["pred"]=pred
    events=tmp[tmp.event_id.ne("")].groupby("event_id")["pred"].max()
    return int((events>=threshold).sum()), int(len(events))


def model_factories():
    return {
      "logistic":lambda: Pipeline([("impute",SimpleImputer(strategy="median")),("scale",StandardScaler()),("m",LogisticRegression(max_iter=2000,class_weight="balanced",C=.5))]),
      "random_forest":lambda: Pipeline([("impute",SimpleImputer(strategy="median")),("m",RandomForestClassifier(n_estimators=300,min_samples_leaf=8,class_weight="balanced_subsample",random_state=42,n_jobs=-1))]),
      "hist_gradient_boosting":lambda: Pipeline([("impute",SimpleImputer(strategy="median")),("m",HistGradientBoostingClassifier(max_iter=180,max_leaf_nodes=15,l2_regularization=2.0,random_state=42))]),
    }


def prior_year_oof(factory, train):
    parts=[]
    years=sorted(int(y) for y in train.year.unique())
    for inner_year in years[1:]:
        tr=train[train.year<inner_year]; va=train[train.year==inner_year]
        if tr.label.sum()<8 or va.empty: continue
        model=factory(); model.fit(tr[FEATURES],tr.label)
        pred=model.predict_proba(va[FEATURES])[:,1]
        parts.append(pd.DataFrame({"label":va.label.to_numpy(),"probability":pred}))
    return pd.concat(parts,ignore_index=True) if parts else pd.DataFrame(columns=["label","probability"])


def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--features",default="validation/national_evidence_factory/out/state_daily_features.csv"); ap.add_argument("--events",default="validation/national_evidence_factory/out/national_event_registry.csv"); ap.add_argument("--out",default="validation/national_evidence_factory/out/national_benchmark_results.json"); args=ap.parse_args()
    f=pd.read_csv(args.features); e=pd.read_csv(args.events); e["headline_eligible"]=e["headline_eligible"].astype(str).str.lower().isin(["true","1","yes"])
    df=label(f,e); df["year"]=pd.to_datetime(df.date).dt.year
    eligible_events=e[e.headline_eligible].copy(); eligible_events["year"]=pd.to_datetime(eligible_events.event_date).dt.year
    test_years=sorted(y for y in df.year.unique() if y>=2021)
    oof=[]; folds=[]
    factories=model_factories()
    for year in test_years:
      states=sorted(eligible_events[eligible_events.year.eq(year)].state.unique())
      for state in states:
        train=df[(df.year<year)&(df.state!=state)]; test=df[(df.year==year)&(df.state==state)]
        if train.label.sum()<12 or test.empty: continue
        ranked=[]
        for name,factory in factories.items():
          inner=prior_year_oof(factory,train)
          if len(inner) and inner.label.nunique()>1:
            ranked.append((average_precision_score(inner.label,inner.probability),name,inner))
        if ranked:
          ranked.sort(reverse=True,key=lambda x:x[0]); _,name,inner=ranked[0]
          neg=inner.loc[inner.label.eq(0),"probability"].to_numpy()
          threshold=float(np.quantile(neg,0.99)) if len(neg) else 0.5
          selector="prior-year-inner-oof-pr-auc"
        else:
          name="logistic"; threshold=0.5; selector="predeclared-logistic-0.5-insufficient-inner-oof"
        model=factories[name](); model.fit(train[FEATURES],train.label)
        pred=model.predict_proba(test[FEATURES])[:,1]
        testout=test.copy(); testout["probability"]=pred; testout["threshold"]=threshold; testout["model"]=name; testout["selector"]=selector
        detected,total=event_detection(testout,pred,threshold)
        oof.append(testout)
        folds.append({"test_year":int(year),"held_out_state":state,"train_rows":len(train),"train_positives":int(train.label.sum()),"test_rows":len(test),"model":name,"model_selector":selector,"threshold":threshold,"threshold_rule":"99th percentile of prior-year inner-OOF negatives (1% training alert budget), else frozen 0.5 fallback","detected_events":detected,"eligible_events":total})
    if not oof:
      raise RuntimeError("No eligible temporal/geographic OOF folds. Event coverage is not yet sufficient for a national number.")
    o=pd.concat(oof,ignore_index=True); y=o.label.to_numpy(); p=o.probability.to_numpy(); alert=p>=o.threshold.to_numpy()
    event_rows=o[o.event_id.ne("")]
    ev={eid: bool((g.probability>=g.threshold).any()) for eid,g in event_rows.groupby("event_id")}
    detected=int(sum(ev.values())); total=int(len(ev)); neg=o.label.eq(0)
    fp=int((alert & neg.to_numpy()).sum()); negatives=int(neg.sum())
    result={
      "status":"retrospective_oof_research_benchmark",
      "scope":"Nigeria national evidence factory; only jurisdictions with eligible independent events enter denominator",
      "headline":{"detected_events":detected,"eligible_events":total,"event_detection_rate":detected/total if total else None,"jurisdictions_scored":int(o.state.nunique())},
      "metrics":{"pr_auc":float(average_precision_score(y,p)) if len(np.unique(y))>1 else None,"roc_auc":float(roc_auc_score(y,p)) if len(np.unique(y))>1 else None,"brier":float(brier_score_loss(y,p)),"row_precision":float(precision_score(y,alert,zero_division=0)),"false_positive_rows_per_1000_negatives":1000*fp/negatives if negatives else None,"prevalence":float(y.mean())},
      "validation":"Each scored state-year is future in time and the state is excluded from fitting. Model family is selected only from prior-year inner OOF predictions; threshold uses only prior-year inner-OOF negatives.",
      "folds":folds,
      "claim_boundary":"Retrospective historical replay with prior-year + held-out-state scoring. Not prospective validation, not fixed lead-time proof, and not national real-time accuracy.",
      "feature_limit":"v0 uses one ERA5-Land capital anchor per jurisdiction; promotion requires ADM1 multi-point sampling / NASA IMERG and stronger local hydrology where available.",
    }
    out=Path(args.out); out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(result,indent=2),encoding="utf-8"); o.to_csv(out.with_name("national_oof_predictions.csv"),index=False); print(json.dumps(result["headline"]|result["metrics"],indent=2))

if __name__=="__main__": main()
