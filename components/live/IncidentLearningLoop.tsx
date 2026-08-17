"use client";

import { BrainCircuit, CheckCircle2, Clock3, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useExplanationMode } from "@/components/shared/ExplanationMode";

type Audit = {
  state: string;
  sentinel: string;
  screeningPoint?: string | null;
  pointsChecked?: number;
  firstReportAt: string;
  firstReportTitle: string;
  firstReportSource: string;
  outcome: "RAINFALL_SIGNAL_PRESENT" | "MISS_TO_LEARN" | "AUDIT_DATA_UNAVAILABLE";
  explanation: string;
  observedRainfallAudit: null | {
    score: number;
    level: string;
    features: { rain_1h_mm: number; rain_3h_mm: number; rain_24h_mm: number; rain_72h_mm: number; max_3h_last_24h_mm: number };
  };
};

type ForecastReplay = {
  state: string;
  eventAt: string;
  headline?: string | null;
  source?: string | null;
  finding: string;
  earliestUsefulLeadHours: number | null;
  audits: Array<{
    requestedLeadHours: number;
    effectiveLeadHours: number;
    run: string;
    available: boolean;
    signalScore?: number;
    signalLevel?: string;
    precipitation3hMaxMm?: number;
    precipitation6hWindowMm?: number;
    capeMaxJkg?: number;
    highestPoint?: string;
  }>;
};

export default function IncidentLearningLoop() {
  const { mode } = useExplanationMode();
  const simple = mode === "simple";
  const [audits, setAudits] = useState<Audit[]>([]);
  const [forecastReplay, setForecastReplay] = useState<ForecastReplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/incident-reconciliation", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not audit incidents");
      setAudits(payload.audits || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not audit incidents"); }
    finally { setLoading(false); }
  };

  const loadForecastReplay = async () => {
    setForecastLoading(true);
    try {
      const response = await fetch("/api/forecast-lead-audit", { cache: "no-store" });
      const payload = await response.json();
      if (response.ok) setForecastReplay(payload);
    } catch {
      // Historical replay is enrichment; live incident intelligence remains usable if it is unavailable.
    } finally { setForecastLoading(false); }
  };

  useEffect(() => { load(); loadForecastReplay(); }, []);
  const misses = audits.filter((audit) => audit.outcome === "MISS_TO_LEARN").length;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-radar"><BrainCircuit className="h-4 w-4" /> {simple ? "Learning from real floods" : "Automatic learning loop"}</div><h2 className="mt-1 font-display text-xl font-bold">{simple ? "Did the system see warning signs early?" : "Did we see it before the headline?"}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{simple ? "When a flood is reported, NaijaClimaGuard looks back at the information that was available beforehand. If the system missed useful warning signs, the miss stays visible so it can be improved." : "Every newly reported flood is checked two ways: what rainfall was actually present by the first report, and what archived ECMWF forecasts available beforehand were already indicating. Misses remain visible and become learning evidence."}</p></div>
        <button onClick={() => { load(); loadForecastReplay(); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-midnight-border dark:bg-midnight-light"><RefreshCw className={`h-3.5 w-3.5 ${loading || forecastLoading ? "animate-spin" : ""}`} /> {simple ? "Check again" : "Re-audit"}</button>
      </div>

      {forecastReplay ? (
        <div className="rounded-2xl border border-radar/20 bg-radar/[0.04] p-4 sm:p-5">
          <div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-radar" /><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-radar">{simple ? `Earlier warning check · ${forecastReplay.state}` : `Could we have known earlier? · ${forecastReplay.state}`}</p><h3 className="mt-1 text-sm font-bold leading-5">{forecastReplay.headline || "Latest reported flood replay"}</h3>{!simple ? <p className="mt-1 text-xs text-slate-500">First selected report: {new Date(forecastReplay.eventAt).toLocaleString("en-NG")} {forecastReplay.source ? `· ${forecastReplay.source}` : ""}</p> : null}<p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{forecastReplay.finding}</p>{simple && forecastReplay.earliestUsefulLeadHours ? <p className="mt-3 text-sm font-bold text-radar">Useful warning signs appeared about {Math.round(forecastReplay.earliestUsefulLeadHours)} hours earlier.</p> : null}</div></div>
          {!simple ? <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {forecastReplay.audits.map((item) => <div key={`${item.requestedLeadHours}-${item.run}`} className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-midnight-border dark:bg-midnight/60"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">~{item.effectiveLeadHours}h before</p>{item.available ? <><p className={`mt-1 font-mono text-xl font-bold ${(item.signalScore || 0) >= 55 ? "text-amber" : ""}`}>{item.signalScore}<span className="ml-1 text-[10px] font-normal text-slate-400">/100</span></p><p className="mt-0.5 text-[10px] font-bold text-slate-500">{item.signalLevel} · {item.highestPoint || "grid"}</p><p className="mt-2 text-[10px] leading-4 text-slate-400">3h {item.precipitation3hMaxMm ?? 0}mm · 6h {item.precipitation6hWindowMm ?? 0}mm</p></> : <p className="mt-2 text-xs text-slate-400">Run unavailable</p>}</div>)}
          </div> : null}
          {!simple ? <p className="mt-3 text-[11px] leading-5 text-slate-500">This replays only forecast information that would have been available before the report, with a conservative model-publication delay. It does not use later observations to make an old forecast look better.</p> : null}
        </div>
      ) : forecastLoading ? <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500 dark:border-midnight-border">{simple ? "Checking what was known before the latest flood report…" : "Replaying pre-event ECMWF forecast runs…"}</div> : null}

      {audits.length ? <div className={`rounded-xl border p-4 text-sm ${misses ? "border-amber/30 bg-amber/5" : "border-radar/20 bg-radar/5"}`}><strong>{misses ? `${misses} ${simple ? "case needs learning" : `miss-to-learn case${misses === 1 ? "" : "s"}`} in the last 24 hours.` : simple ? "No clear missed rainfall warning was found in the current reports." : "No reconstructed rainfall misses found in the current 24-hour incident set."}</strong>{!simple ? " These cases become evidence for improving data coverage, thresholds and the shadow urban model." : " The system keeps misses visible instead of hiding them."}</div> : null}
      {error ? <div className="rounded-xl border border-crimson/20 bg-crimson/5 p-3 text-sm text-crimson">{error}</div> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {audits.slice(0, simple ? 6 : audits.length).map((audit) => {
          const miss = audit.outcome === "MISS_TO_LEARN";
          return <article key={`${audit.state}-${audit.firstReportAt}`} className={`glass-card ncg-simple-card rounded-2xl p-4 ${miss ? "border-amber/20" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{simple ? audit.state : `${audit.state} · ${audit.sentinel} · ${audit.pointsChecked || 1} point${audit.pointsChecked === 1 ? "" : "s"}`}</p><h3 className="mt-1 text-sm font-bold leading-5 line-clamp-2">{audit.firstReportTitle}</h3><p className="mt-1 text-xs text-slate-500">{audit.firstReportSource} · {new Date(audit.firstReportAt).toLocaleString("en-NG")}</p></div>{miss ? <TriangleAlert className="h-5 w-5 shrink-0 text-amber" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-radar" />}</div>{!simple && audit.observedRainfallAudit ? <div className="mt-4 grid grid-cols-4 gap-2"><Stat label="Audit score" value={audit.observedRainfallAudit.score} /><Stat label="1h rain" value={`${audit.observedRainfallAudit.features.rain_1h_mm} mm`} /><Stat label="3h rain" value={`${audit.observedRainfallAudit.features.rain_3h_mm} mm`} /><Stat label="24h rain" value={`${audit.observedRainfallAudit.features.rain_24h_mm} mm`} /></div> : null}<p className="mt-3 text-xs leading-5 text-slate-500">{audit.explanation}</p></article>;
        })}
      </div>
      <p className="text-xs leading-5 text-slate-500">{simple ? "A miss does not automatically mean the model failed. Very local rain, blocked drainage, terrain or missing local reports can also explain what happened." : "A miss can expose a highly local cloudburst, drainage or terrain vulnerability, a flooded location outside the current grid, or thresholds that need retraining. We keep those possibilities separate instead of automatically blaming or crediting the ML model."}</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg bg-slate-50 px-2 py-2 text-center dark:bg-midnight"><p className="text-[9px] font-bold uppercase text-slate-400">{label}</p><p className="mt-0.5 font-mono text-xs font-bold">{value}</p></div>; }
