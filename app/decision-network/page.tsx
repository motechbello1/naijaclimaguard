"use client";

import AppShell from "@/components/shared/AppShell";
import { useExperienceProfile, type ExperienceRole } from "@/components/shared/ExperienceProfile";
import {
  Activity, ArrowRight, BadgeCheck, BrainCircuit, CheckCircle2, CircleDot,
  DatabaseZap, GitBranch, Loader2, Network, Plus, RefreshCw, Save, ShieldAlert,
  SlidersHorizontal, Sparkles, Target, TriangleAlert, Users, Waves,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ASSETS, assessSourceTrust, compileDecisionActions, computeImpactGraph,
  type ImpactAsset, type SourceKind, type SourceSignal,
} from "@/lib/decision-network/engine";

type Location = { id: string; name: string; state: string; latitude: number; longitude: number };
type RiskResponse = {
  risk: { score: number; level?: string; flood_type?: string };
  safety_state?: { active: boolean; headline?: string | null; instruction?: string | null; authority?: string | null; observedAt?: string | null };
  meta?: { model?: string; data_source?: string; generated_at?: string; source_note?: string };
};
type HealthSource = { slug: string; provider: string; name: string; sourceKind: string; health: "fresh" | "stale" | "suspect" | "missing"; ageMinutes: number | null; latest?: { variable?: string; unit?: string; value?: number } | null };

type Tab = "network" | "impact" | "sandbox" | "receipts";

const ROLE_LABEL: Record<ExperienceRole, string> = { HOUSEHOLD: "Household", FARMER: "Farmer", BUSINESS: "Business", AGENCY: "Agency" };

function sourceKind(raw: string): SourceKind {
  const v = raw.toLowerCase();
  if (v.includes("official") || v.includes("advis")) return "official";
  if (v.includes("gauge") || v.includes("sensor") || v.includes("water")) return "gauge";
  if (v.includes("forecast") || v.includes("glofas") || v.includes("river")) return "forecast";
  if (v.includes("satellite") || v.includes("nasa")) return "satellite";
  if (v.includes("citizen") || v.includes("community")) return "citizen";
  if (v.includes("weather") || v.includes("rain")) return "weather";
  return "other";
}

function DecisionNetworkInner() {
  const { role } = useExperienceProfile();
  const [tab, setTab] = useState<Tab>("network");
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState("");
  const [risk, setRisk] = useState<RiskResponse | null>(null);
  const [healthSources, setHealthSources] = useState<HealthSource[]>([]);
  const [healthRestricted, setHealthRestricted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [simulation, setSimulation] = useState(false);
  const [simScore, setSimScore] = useState(70);
  const [simOfficial, setSimOfficial] = useState(false);
  const [receiptState, setReceiptState] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [receiptCount, setReceiptCount] = useState(0);
  const storageKey = `naijaclimaguard.impact-graph.${role.toLowerCase()}.v1`;
  const [assets, setAssets] = useState<ImpactAsset[]>(DEFAULT_ASSETS[role]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setAssets(raw ? JSON.parse(raw) : DEFAULT_ASSETS[role]);
    } catch { setAssets(DEFAULT_ASSETS[role]); }
  }, [role, storageKey]);

  const saveAssets = (next: ImpactAsset[]) => {
    setAssets(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const loadRisk = useCallback(async (loc: Location) => {
    const res = await fetch(`/api/v1/risk?latitude=${loc.latitude}&longitude=${loc.longitude}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Risk service unavailable");
    setRisk(data);
    setSimScore(data.risk?.score ?? 50);
    setSimOfficial(Boolean(data.safety_state?.active));
  }, []);

  const loadSourceHealth = useCallback(async () => {
    const res = await fetch("/api/v1/intelligence/health", { cache: "no-store" });
    if (res.status === 403) { setHealthRestricted(true); setHealthSources([]); return; }
    if (!res.ok) { setHealthSources([]); return; }
    const data = await res.json();
    setHealthRestricted(false);
    setHealthSources(data.sources ?? []);
  }, []);

  const loadReceipts = useCallback(async () => {
    const res = await fetch("/api/evidence/events", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const count = (data.events ?? []).filter((e: any) => e.eventType === "ACTION_ACKNOWLEDGED" && e.metadata?.decisionNetworkVersion === "fdn-v1").length;
    setReceiptCount(count);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await fetch("/api/locations", { cache: "no-store" });
        const data = await res.json();
        const list: Location[] = data.locations ?? data ?? [];
        setLocations(list);
        if (list[0]) { setSelected(list[0].id); await loadRisk(list[0]); }
        else setError("Add a saved location first so the Decision Network has a live place to evaluate.");
        await Promise.allSettled([loadSourceHealth(), loadReceipts()]);
      } catch (e) { setError(e instanceof Error ? e.message : "Decision Network could not load"); }
      finally { setLoading(false); }
    })();
  }, [loadRisk, loadSourceHealth, loadReceipts]);

  const selectedLocation = locations.find((l) => l.id === selected);
  const changeLocation = async (id: string) => {
    const loc = locations.find((l) => l.id === id);
    if (!loc) return;
    setSelected(id); setError(""); setLoading(true);
    try { await loadRisk(loc); } catch (e) { setError(e instanceof Error ? e.message : "Risk service unavailable"); }
    finally { setLoading(false); }
  };

  const liveSources = useMemo<SourceSignal[]>(() => {
    const base: SourceSignal[] = [];
    if (risk) {
      base.push({ id: "live-model", name: risk.meta?.model || "Live decision engine", kind: "model", health: "fresh", detail: risk.meta?.source_note || null });
      if (risk.meta?.data_source) base.push({ id: "live-weather", name: risk.meta.data_source, kind: "weather", health: "fresh", detail: "Current production input family" });
      if (risk.safety_state?.active) base.push({ id: "official", name: risk.safety_state.authority || "Connected official advisory", kind: "official", health: "fresh", authority: risk.safety_state.authority || null, detail: risk.safety_state.headline || null });
    }
    for (const source of healthSources) base.push({ id: source.slug, name: source.name, kind: sourceKind(source.sourceKind), health: source.health, ageMinutes: source.ageMinutes, detail: source.provider });
    if (healthRestricted) base.push({ id: "enterprise-restricted", name: "Partner/source-health registry", kind: "other", health: "restricted", detail: "Enterprise source-health detail is not exposed to this account." });
    return base;
  }, [risk, healthSources, healthRestricted]);

  const trust = useMemo(() => assessSourceTrust(liveSources), [liveSources]);
  const decisionScore = simulation ? simScore : risk?.risk.score ?? 0;
  const officialWarning = simulation ? simOfficial : Boolean(risk?.safety_state?.active);
  const impact = useMemo(() => computeImpactGraph(assets, decisionScore, officialWarning), [assets, decisionScore, officialWarning]);
  const actions = useMemo(() => compileDecisionActions(role, impact, trust, officialWarning), [role, impact, trust, officialWarning]);

  const acknowledge = async (code: string, label: string) => {
    if (simulation || !selectedLocation) return;
    setReceiptState((s) => ({ ...s, [code]: "saving" }));
    try {
      const res = await fetch("/api/evidence/events", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "ACTION_ACKNOWLEDGED",
          locationId: selectedLocation.id,
          assetType: ROLE_LABEL[role],
          actionCode: code,
          actionText: label,
          metadata: {
            decisionNetworkVersion: "fdn-v1",
            decisionScore,
            sourceTrustScore: trust.score,
            sourceTrustBand: trust.band,
            officialWarningActive: officialWarning,
            locationName: selectedLocation.name,
            outcomeState: "acknowledged",
          },
        }),
      });
      if (!res.ok) throw new Error("Evidence ledger unavailable");
      setReceiptState((s) => ({ ...s, [code]: "saved" }));
      setReceiptCount((n) => n + 1);
    } catch { setReceiptState((s) => ({ ...s, [code]: "error" })); }
  };

  const updateAsset = (id: string, patch: Partial<ImpactAsset>) => saveAssets(assets.map((a) => a.id === id ? { ...a, ...patch } : a));
  const addAsset = () => saveAssets([...assets, { id: `custom-${Date.now()}`, name: "New dependency", category: "custom", criticality: 3, vulnerability: 3, recoveryDifficulty: 3, enabled: true }]);

  const tabs: Array<{ id: Tab; label: string; icon: any }> = [
    { id: "network", label: "Decision Network", icon: Network },
    { id: "impact", label: "Impact Graph", icon: GitBranch },
    { id: "sandbox", label: "Decision Sandbox", icon: SlidersHorizontal },
    { id: "receipts", label: "Action Receipts", icon: BadgeCheck },
  ];

  return <div className="mx-auto max-w-7xl space-y-5">
    <section className="relative overflow-hidden rounded-3xl border border-radar/20 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-5 text-white shadow-xl sm:p-8">
      <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-radar/20 blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em]"><BrainCircuit className="h-4 w-4 text-cyan-300" /> Flood Decision Network · FDN v1</div>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-black tracking-tight sm:text-5xl">From flood signal to verified action — in one closed loop.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">NaijaClimaGuard now evaluates evidence trust, models what the hazard means to your people/assets, compiles role-specific actions, records acknowledgements, and preserves the outcome trail. Translation and delivery are outputs of the network — not the invention itself.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          {[["Decision", `${decisionScore}/100`], ["Source trust", `${trust.score}/100`], ["Top exposure", `${impact[0]?.exposureScore ?? 0}/100`], ["Receipts", String(receiptCount)]].map(([k,v]) => <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</p><p className="mt-1 font-display text-xl font-black">{v}</p></div>)}
        </div>
      </div>
    </section>

    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-bold ${tab === id ? "border-radar bg-radar text-white" : "border-slate-200 bg-white dark:border-midnight-border dark:bg-midnight-light"}`}><Icon className="h-4 w-4" />{label}</button>)}
    </div>

    {error && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-100"><TriangleAlert className="mr-2 inline h-4 w-4" />{error}</div>}

    {tab === "network" && <div className="space-y-5">
      <section className="grid gap-3 lg:grid-cols-6">
        {[{n:"01",t:"Observe",d:"Live risk, official advisories and connected evidence",i:DatabaseZap},{n:"02",t:"Trust",d:"Freshness, authority and degraded-feed policy",i:ShieldAlert},{n:"03",t:"Impact",d:"People, assets and dependency exposure",i:Target},{n:"04",t:"Decide",d:"Role-aware action compiler",i:BrainCircuit},{n:"05",t:"Act",d:"Acknowledgement and delivery workflow",i:Activity},{n:"06",t:"Learn",d:"Evidence and verified outcomes return",i:BadgeCheck}].map(({n,t,d,i:Icon},idx) => <div key={t} className="relative rounded-2xl border border-slate-200 bg-white p-4 dark:border-midnight-border dark:bg-midnight-light"><p className="text-[10px] font-black text-radar">{n}</p><Icon className="mt-3 h-5 w-5 text-radar"/><h3 className="mt-2 font-display font-bold">{t}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{d}</p>{idx<5 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 text-slate-300 lg:block"/>}</div>)}
      </section>

      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <section className="glass-card rounded-3xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Source Trust Engine</p><h2 className="mt-1 font-display text-2xl font-bold">Evidence confidence, not blind averaging.</h2></div><div className="rounded-2xl border border-radar/20 bg-radar/5 px-4 py-2 text-right"><p className="text-[10px] font-bold uppercase text-slate-400">Trust</p><p className="font-display text-2xl font-black text-radar">{trust.score}</p></div></div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{trust.explanation}</p>
          <div className="mt-4 space-y-2">{liveSources.map((s) => <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-midnight-border"><CircleDot className={`h-4 w-4 ${s.health === "fresh" ? "text-emerald-500" : s.health === "restricted" ? "text-slate-400" : "text-amber-500"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{s.name}</p><p className="text-xs text-slate-500">{s.kind} · {s.health}{s.ageMinutes != null ? ` · ${s.ageMinutes} min old` : ""}</p></div></div>)}</div>
        </section>

        <section className="glass-card rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Decision compiler</p><h2 className="mt-1 font-display text-2xl font-bold">What should happen next?</h2></div>{locations.length>0 && <select value={selected} onChange={(e)=>changeLocation(e.target.value)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-midnight-border dark:bg-midnight-light">{locations.map(l=><option key={l.id} value={l.id}>{l.name} · {l.state}</option>)}</select>}</div>
          {loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-radar"/></div> : <div className="mt-4 space-y-3">{actions.slice(0,5).map((a,idx)=><div key={a.code} className="rounded-2xl border border-slate-200 p-4 dark:border-midnight-border"><div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-radar/10 text-xs font-black text-radar">{idx+1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{a.label}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500 dark:bg-slate-800">{a.timeframe}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{a.why}</p>{!simulation && <button onClick={()=>acknowledge(a.code,a.label)} disabled={receiptState[a.code]==="saving"} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-radar/20 px-3 text-xs font-bold text-radar">{receiptState[a.code]==="saving"?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:receiptState[a.code]==="saved"?<CheckCircle2 className="h-3.5 w-3.5"/>:<Save className="h-3.5 w-3.5"/>}{receiptState[a.code]==="saved"?"Receipt saved":"Acknowledge action"}</button>}</div></div></div>)}</div>}
        </section>
      </div>
    </div>}

    {tab === "impact" && <section className="glass-card rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Flood Digital Twin</p><h2 className="mt-1 font-display text-2xl font-bold">Model what the flood means to you.</h2><p className="mt-2 max-w-3xl text-sm text-slate-500">Exposure is a transparent scenario score from current decision state × criticality × vulnerability × recovery difficulty. It is <strong>not</strong> a flood probability or loss estimate.</p></div><button onClick={addAsset} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-radar px-4 text-sm font-bold text-white"><Plus className="h-4 w-4"/>Add dependency</button></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{assets.map(asset=>{const node=impact.find(i=>i.id===asset.id);return <article key={asset.id} className="rounded-2xl border border-slate-200 p-4 dark:border-midnight-border"><div className="flex items-start gap-3"><input type="checkbox" checked={asset.enabled} onChange={e=>updateAsset(asset.id,{enabled:e.target.checked})} className="mt-1"/><div className="flex-1"><input value={asset.name} onChange={e=>updateAsset(asset.id,{name:e.target.value})} className="w-full bg-transparent font-bold outline-none"/><p className="text-xs text-slate-500">{asset.category}</p></div><div className="text-right"><p className="text-[10px] font-black uppercase text-slate-400">Exposure</p><p className="font-display text-xl font-black text-radar">{node?.exposureScore ?? 0}</p></div></div><div className="mt-4 grid grid-cols-3 gap-2">{[["Criticality","criticality"],["Vulnerability","vulnerability"],["Recovery","recoveryDifficulty"]].map(([label,key])=><label key={key} className="text-[10px] font-bold uppercase text-slate-400">{label}<input type="range" min="1" max="5" value={(asset as any)[key]} onChange={e=>updateAsset(asset.id,{[key]:Number(e.target.value)} as any)} className="mt-2 w-full"/><span className="block text-center text-xs text-slate-500">{(asset as any)[key]}/5</span></label>)}</div></article>})}</div>
    </section>}

    {tab === "sandbox" && <section className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
      <div className="glass-card rounded-3xl p-5 sm:p-6"><div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-black uppercase text-amber-800 dark:bg-amber-950/20 dark:text-amber-200"><Sparkles className="h-3.5 w-3.5"/>Simulation only</div><h2 className="mt-3 font-display text-2xl font-bold">Decision Sandbox</h2><p className="mt-2 text-sm leading-6 text-slate-500">Rehearse a worse or better scenario without changing the live risk score, sending alerts, or writing operational evidence.</p><label className="mt-5 block text-xs font-black uppercase text-slate-400">Use simulation<input type="checkbox" checked={simulation} onChange={e=>setSimulation(e.target.checked)} className="ml-3"/></label><label className="mt-5 block text-xs font-black uppercase text-slate-400">Scenario decision score · {simScore}/100<input type="range" min="0" max="100" value={simScore} disabled={!simulation} onChange={e=>setSimScore(Number(e.target.value))} className="mt-3 w-full"/></label><label className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold dark:border-midnight-border"><input type="checkbox" checked={simOfficial} disabled={!simulation} onChange={e=>setSimOfficial(e.target.checked)}/>Simulate official warning active</label><div className="mt-5 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">Simulation can never acknowledge a real action, issue a warning, change production risk, or write an operational receipt.</div></div>
      <div className="glass-card rounded-3xl p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Scenario result</p><h2 className="mt-1 font-display text-2xl font-bold">If this state were real…</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/40"><p className="text-[10px] font-black uppercase text-slate-400">Decision</p><p className="mt-1 text-2xl font-black">{decisionScore}</p></div><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/40"><p className="text-[10px] font-black uppercase text-slate-400">Top exposure</p><p className="mt-1 text-2xl font-black">{impact[0]?.exposureScore ?? 0}</p></div><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/40"><p className="text-[10px] font-black uppercase text-slate-400">Activated actions</p><p className="mt-1 text-2xl font-black">{actions.length}</p></div></div><div className="mt-5 space-y-2">{actions.slice(0,6).map(a=><div key={a.code} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-midnight-border"><Waves className="mt-0.5 h-4 w-4 shrink-0 text-radar"/><div><p className="text-sm font-bold">{a.label}</p><p className="text-xs text-slate-500">{a.timeframe} · {a.why}</p></div></div>)}</div></div>
    </section>}

    {tab === "receipts" && <section className="glass-card rounded-3xl p-5 sm:p-6"><div className="flex items-start gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-radar/10 text-radar"><BadgeCheck className="h-6 w-6"/></div><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Action Receipt + Outcome Loop</p><h2 className="mt-1 font-display text-2xl font-bold">Prove the decision moved beyond the dashboard.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">A user acknowledgement is stored as user-asserted evidence, with the location, action code, decision state and source-trust snapshot. It cannot masquerade as a system-delivered warning or an official outcome.</p></div></div><div className="mt-6 grid gap-3 md:grid-cols-4">{[["Warning / signal","Observed"],["Action selected","Compiled"],["User acknowledgement",`${receiptCount} recent receipt${receiptCount===1?"":"s"}`],["Ground outcome","Pending verified evidence"]].map(([a,b],idx)=><div key={a} className="rounded-2xl border border-slate-200 p-4 dark:border-midnight-border"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-radar/10 text-xs font-black text-radar">{idx+1}</span><p className="text-sm font-bold">{a}</p></div><p className="mt-3 text-xs text-slate-500">{b}</p></div>)}</div><div className="mt-5 rounded-2xl border border-radar/20 bg-radar/5 p-4 text-sm leading-6"><strong>Closed-loop boundary:</strong> citizen reports remain pending until reviewed; official advisories remain authoritative evidence; action receipts prove acknowledgement, not that the flood occurred or that an action succeeded.</div></section>}
  </div>;
}

export default function DecisionNetworkPage() {
  return <AppShell><DecisionNetworkInner /></AppShell>;
}
