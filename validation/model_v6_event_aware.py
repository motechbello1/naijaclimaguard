#!/usr/bin/env python3
"""Frozen Model v6 event-aware development harness.

Protocol: validation/MODEL_V6_EVENT_AWARE_PROTOCOL.md
No gate or hyperparameter changes are permitted after the first score.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import average_precision_score, brier_score_loss, confusion_matrix, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

RANDOM_STATE = 42
ARCHIVE_START = pd.Timestamp("2021-05-26")
VALIDATION_YEARS = (2022, 2023, 2024)
LOCATIONS = {"Lokoja", "Makurdi", "Onitsha", "Yenagoa", "Hadejia"}
MIN_EVENT_DETECTION = 0.75
MIN_PRECISION = 0.10
MAX_FP_PER_1000 = 10.0

RAW = [
    "rain_1d", "rain_3d", "rain_7d", "rain_14d", "rain_30d",
    "rain_accel_3d", "rain_3_14_ratio", "rain_7_30_ratio", "wet_days_7d", "wet_days_30d",
    "q24", "q48", "q72", "qmax_72", "q48_minus_q24", "q72_minus_q24",
    "q72_pct_rise", "q_slope_per_day", "q_monotonic_rise",
]
PERSIST = ["qmax_delta_1d", "qmax_delta_3d", "q72_delta_1d", "rain7_delta_1d", "qmax_roll3_max", "rain7_roll3_max"]
PCT_SOURCE = {
    "q24_pct": "q24", "q48_pct": "q48", "q72_pct": "q72", "qmax_pct": "qmax_72",
    "qrise_abs_pct": "q72_minus_q24", "qrise_rel_pct": "q72_pct_rise",
    "rain3_pct": "rain_3d", "rain7_pct": "rain_7d", "rain14_pct": "rain_14d", "rain30_pct": "rain_30d",
}
COMPOUND = ["river_extreme", "river_future_extreme", "river_trend_extreme", "rain_extreme", "compound_product", "compound_min", "river_trend_product", "month_sin", "month_cos"]
FEATURES = RAW + PERSIST + list(PCT_SOURCE) + COMPOUND


def metric_bundle(y_true, probability, threshold=.5):
    y=np.asarray(y_true,dtype=int); p=np.asarray(probability,dtype=float); pred=(p>=threshold).astype(int)
    tn,fp,fn,tp=confusion_matrix(y,pred,labels=[0,1]).ravel()
    out={
        "precision":float(precision_score(y,pred,zero_division=0)),
        "recall":float(recall_score(y,pred,zero_division=0)),
        "f1":float(f1_score(y,pred,zero_division=0)),
        "brier_score":float(brier_score_loss(y,p)),
        "confusion_matrix":{"tn":int(tn),"fp":int(fp),"fn":int(fn),"tp":int(tp)},
        "prevalence":float(y.mean()),
    }
    if np.unique(y).size==2:
        out["pr_auc"]=float(average_precision_score(y,p)); out["roc_auc"]=float(roc_auc_score(y,p))
    else:
        out["pr_auc"]=None; out["roc_auc"]=None
    return out


def add_persistence(df):
    x=df.sort_values(["location","issue_date"]).copy()
    g=x.groupby("location",sort=False)
    x["qmax_delta_1d"]=x["qmax_72"]-g["qmax_72"].shift(1)
    x["qmax_delta_3d"]=x["qmax_72"]-g["qmax_72"].shift(3)
    x["q72_delta_1d"]=x["q72"]-g["q72"].shift(1)
    x["rain7_delta_1d"]=x["rain_7d"]-g["rain_7d"].shift(1)
    x["qmax_roll3_max"]=g["qmax_72"].rolling(3,min_periods=1).max().reset_index(level=0,drop=True)
    x["rain7_roll3_max"]=g["rain_7d"].rolling(3,min_periods=1).max().reset_index(level=0,drop=True)
    return x.sort_index()


def fit_ecdf_stats(train):
    cols=sorted(set(PCT_SOURCE.values()))
    stats={"loc_month":{},"loc":{},"global":{}}
    for c in cols:
        a=pd.to_numeric(train[c],errors="coerce").dropna().to_numpy(float); a.sort(); stats["global"][c]=a
    for loc,g in train.groupby("location"):
        stats["loc"][str(loc)]={}
        for c in cols:
            a=pd.to_numeric(g[c],errors="coerce").dropna().to_numpy(float); a.sort(); stats["loc"][str(loc)][c]=a
        for month,gm in g.groupby(g["issue_date"].dt.month):
            d={}
            for c in cols:
                a=pd.to_numeric(gm[c],errors="coerce").dropna().to_numpy(float); a.sort(); d[c]=a
            stats["loc_month"][(str(loc),int(month))]=d
    return stats


def pct_value(stats,loc,month,col,value):
    if pd.isna(value): return np.nan
    a=stats["loc_month"].get((str(loc),int(month)),{}).get(col)
    if a is None or len(a)<20: a=stats["loc"].get(str(loc),{}).get(col)
    if a is None or len(a)<20: a=stats["global"].get(col)
    if a is None or len(a)==0: return np.nan
    return float(np.searchsorted(a,float(value),side="right")/len(a))


def transform(df,stats):
    x=df.copy(); months=x["issue_date"].dt.month
    for outcol,src in PCT_SOURCE.items():
        x[outcol]=[pct_value(stats,l,m,src,v) for l,m,v in zip(x["location"],months,x[src])]
    x["river_extreme"]=x[["q24_pct","q48_pct","q72_pct","qmax_pct"]].max(axis=1)
    x["river_future_extreme"]=x[["q48_pct","q72_pct","qmax_pct"]].max(axis=1)
    x["river_trend_extreme"]=x[["qrise_abs_pct","qrise_rel_pct"]].max(axis=1)
    x["rain_extreme"]=x[["rain3_pct","rain7_pct","rain14_pct","rain30_pct"]].max(axis=1)
    x["compound_product"]=x["river_extreme"]*x["rain_extreme"]
    x["compound_min"]=x[["river_extreme","rain_extreme"]].min(axis=1)
    x["river_trend_product"]=x["river_extreme"]*x["river_trend_extreme"]
    x["month_sin"]=np.sin(2*np.pi*months/12.0); x["month_cos"]=np.cos(2*np.pi*months/12.0)
    return x


def eligible_events(events,years=None):
    e=events[events["include_in_benchmark"].astype(str).str.lower().eq("true")].copy()
    e["observed_by_date"]=pd.to_datetime(e["observed_by_date"])
    if years is not None: e=e[e["observed_by_date"].dt.year.isin(list(years))]
    return e


def event_ids_for_rows(df,events):
    e=eligible_events(events)
    out=[]
    for _,r in df.iterrows():
        d=r["issue_date"]; loc=r["location"]
        hits=e[e["location"].eq(loc)&(e["observed_by_date"]>d)&(e["observed_by_date"]<=d+pd.Timedelta(days=3))]
        out.append(hits["event_id"].astype(str).tolist())
    return out


def event_balanced_weights(train,events):
    ids=event_ids_for_rows(train,events)
    counts={}
    for row_ids in ids:
        for eid in row_ids: counts[eid]=counts.get(eid,0)+1
    w=np.ones(len(train),dtype=float)
    pos_raw=[]
    for i,(label,row_ids) in enumerate(zip(train["label"].astype(int),ids)):
        if label!=1: continue
        val=sum(1.0/counts[eid] for eid in row_ids if counts.get(eid,0)>0)
        if val<=0: val=1.0
        w[i]=val; pos_raw.append(i)
    neg_total=float((train["label"].astype(int)==0).sum())
    pos_total=float(w[pos_raw].sum()) if pos_raw else 1.0
    scale=neg_total/pos_total if pos_total>0 else 1.0
    if pos_raw: w[pos_raw]*=scale
    return w


def make_model():
    pre=ColumnTransformer([
        ("num",Pipeline([("imputer",SimpleImputer(strategy="median"))]),FEATURES),
        ("location",OneHotEncoder(handle_unknown="ignore",sparse_output=False),["location"]),
    ],remainder="drop")
    model=xgb.XGBClassifier(
        n_estimators=500,max_depth=2,learning_rate=0.02,min_child_weight=5,
        subsample=0.85,colsample_bytree=0.80,reg_lambda=10.0,reg_alpha=1.0,
        random_state=RANDOM_STATE,eval_metric="aucpr",tree_method="hist",
    )
    return Pipeline([("pre",pre),("model",model)])


def event_detection(scored,events,threshold):
    e=eligible_events(events,VALIDATION_YEARS); rows=[]
    for _,event in e.sort_values("observed_by_date").iterrows():
        anchor=event["observed_by_date"]
        w=scored[scored["location"].eq(event["location"])&(scored["issue_date"]<anchor)&(anchor<=scored["issue_date"]+pd.Timedelta(days=3))]
        crossed=w[w["probability"]>=threshold]
        first=crossed["issue_date"].min() if not crossed.empty else pd.NaT
        rows.append({"event_id":str(event["event_id"]),"location":str(event["location"]),"observed_by_date":str(anchor.date()),"detected":not crossed.empty,"first_crossing_issue_date":None if pd.isna(first) else str(first.date()),"max_probability":None if w.empty else float(w["probability"].max())})
    n=sum(r["detected"] for r in rows)
    return {"detected_events":int(n),"evaluated_events":len(rows),"event_detection_rate":float(n/len(rows)) if rows else None,"events":rows}


def evaluate(df,events):
    folds=[]; scored=[]
    for year in VALIDATION_YEARS:
        train0=df[(df["issue_date"]>=ARCHIVE_START)&(df["issue_date"]<pd.Timestamp(f"{year}-01-01"))].copy()
        val0=df[df["issue_date"].dt.year.eq(year)].copy()
        if train0.empty or val0.empty or train0["label"].nunique()<2 or val0["label"].nunique()<2:
            folds.append({"validation_year":year,"usable":False,"train_rows":len(train0),"validation_rows":len(val0)}); continue
        stats=fit_ecdf_stats(train0); train=transform(train0,stats); val=transform(val0,stats)
        weights=event_balanced_weights(train,events); model=make_model(); cols=FEATURES+["location"]
        model.fit(train[cols],train["label"].astype(int),model__sample_weight=weights)
        p=model.predict_proba(val[cols])[:,1]
        folds.append({"validation_year":year,"usable":True,"train_rows":int(len(train)),"validation_rows":int(len(val)),"validation_positive_rows":int(val["label"].sum()),"metrics":metric_bundle(val["label"],p)})
        part=val[["issue_date","location","label","future_event_ids"]].copy(); part["probability"]=p; part["validation_year"]=year; scored.append(part)
    oof=pd.concat(scored,ignore_index=True).sort_values(["issue_date","location"])
    return folds,oof


def location_diag(scored):
    out={}
    for loc,g in scored.groupby("location"):
        m=metric_bundle(g["label"],g["probability"]); prev=float(g["label"].mean())
        out[str(loc)]={"rows":int(len(g)),"positive_rows":int(g["label"].sum()),"prevalence":prev,"pr_auc":m["pr_auc"],"roc_auc":m["roc_auc"],"pr_lift_vs_prevalence":None if not prev else float(m["pr_auc"]/prev)}
    return out


def frontier(scored,events):
    y=scored["label"].astype(int).to_numpy(); p=scored["probability"].to_numpy(float); negatives=int((y==0).sum()); rows=[]
    for t in np.round(np.arange(.01,1.00,.01),2):
        m=metric_bundle(y,p,float(t)); ev=event_detection(scored,events,float(t)); fp=m["confusion_matrix"]["fp"]; fp1000=1000*fp/negatives
        q=ev["event_detection_rate"]>=MIN_EVENT_DETECTION and m["precision"]>=MIN_PRECISION and fp1000<=MAX_FP_PER_1000
        rows.append({"threshold":float(t),"precision":m["precision"],"recall_issue_rows":m["recall"],"f1":m["f1"],"false_positive_issue_rows":int(fp),"false_positive_issue_rows_per_1000_negative":float(fp1000),"detected_events":ev["detected_events"],"evaluated_events":ev["evaluated_events"],"event_detection_rate":ev["event_detection_rate"],"qualifies":bool(q)})
    return rows


def final_fit(df,events,threshold,model_out):
    stats=fit_ecdf_stats(df); x=transform(df,stats); w=event_balanced_weights(x,events); model=make_model(); cols=FEATURES+["location"]
    model.fit(x[cols],x["label"].astype(int),model__sample_weight=w)
    payload={"candidate":"xgboost_event_aware_v6","threshold":float(threshold),"features":FEATURES,"ecdf_stats":stats,"model":model,"archive_start":"2021-05-26","claim_boundary":"development archive replay; not production validated"}
    joblib.dump(payload,model_out)


def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--dataset",required=True); ap.add_argument("--events",required=True); ap.add_argument("--output",required=True); ap.add_argument("--scored-output",required=True); ap.add_argument("--manifest-out",required=True); ap.add_argument("--model-out",required=True); args=ap.parse_args()
    df=pd.read_csv(args.dataset,parse_dates=["issue_date"]); df=add_persistence(df); events=pd.read_csv(args.events)
    assert set(df["location"].unique())==LOCATIONS
    folds,scored=evaluate(df,events); scored.to_csv(args.scored_output,index=False)
    pooled=metric_bundle(scored["label"],scored["probability"]); fr=frontier(scored,events); qualifying=[r for r in fr if r["qualifies"]]; chosen=max(qualifying,key=lambda r:r["threshold"]) if qualifying else None
    mean_pr=float(np.mean([f["metrics"]["pr_auc"] for f in folds if f.get("usable")]))
    result={
        "status":"model_v6_development_passed_freeze_gate" if chosen else "model_v6_development_failed_freeze_gate",
        "protocol":"event-aware location/season empirical-percentile NASA + archived-operational GloFAS; strict next-1-to-3-day target",
        "candidate":"xgboost_event_aware_v6","frozen_before_score":True,"mean_fold_pr_auc":mean_pr,"folds":folds,"pooled_oof_metrics":pooled,
        "per_location":location_diag(scored),"threshold_policy":{"minimum_event_detection_rate":MIN_EVENT_DETECTION,"minimum_precision":MIN_PRECISION,"maximum_false_positive_issue_rows_per_1000_negative":MAX_FP_PER_1000,"selection_rule":"highest qualifying threshold","chosen_threshold":None if chosen is None else chosen["threshold"],"chosen_threshold_metrics":chosen},"threshold_frontier":fr,
        "evidence_warning":"Archived operational replay is historical out-of-fold development evidence, not prospective validation or authorization for public alerts.",
    }
    Path(args.output).write_text(json.dumps(result,indent=2)+"\n")
    manifest={"status":"freeze_blocked" if chosen is None else "freeze_candidate_serialized_not_production_validated","replacement_authorized":False,"production_engine_remains":"derived-v2","blockers":[] if chosen else ["Model v6 did not pass the preregistered development freeze gate.","No eligible operating threshold exists."]}
    if chosen is not None: final_fit(df[df["issue_date"]>=ARCHIVE_START].copy(),events,chosen["threshold"],args.model_out)
    Path(args.manifest_out).write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps({"status":result["status"],"mean_fold_pr_auc":mean_pr,"pooled":pooled,"chosen":chosen,"freeze":manifest["status"]},indent=2))

if __name__=="__main__": main()
