"use client";

import { BrainCircuit, CheckCircle2, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

type Audit = {
  state: string;
  sentinel: string;
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

export default function IncidentLearningLoop() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { load(); }, []);
  const misses = audits.filter((audit) => audit.outcome === "MISS_TO_LEARN").length;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-radar"><BrainCircuit className="h-4 w-4" /> Automatic learning loop</div><h2 className="mt-1 font-display text-xl font-bold">Did our rainfall screen see it before the headline?</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">Every newly reported flood is reconciled against the rainfall signal that existed at the first discovered report time. If the screen stayed below WATCH, NaijaClimaGuard records a <strong>miss-to-learn</strong> instead of pretending the event was predicted.</p></div>
        <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-midnight-border dark:bg-midnight-light"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Re-audit</button>
      </div>

      {audits.length ? <div className={`rounded-xl border p-4 text-sm ${misses ? "border-amber/30 bg-amber/5" : "border-radar/20 bg-radar/5"}`}><strong>{misses ? `${misses} miss-to-learn case${misses === 1 ? "" : "s"} in the last 24 hours.` : "No reconstructed rainfall misses found in the current 24-hour incident set."}</strong> These cases become evidence for improving data coverage, thresholds and the shadow urban model.</div> : null}
      {error ? <div className="rounded-xl border border-crimson/20 bg-crimson/5 p-3 text-sm text-crimson">{error}</div> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {audits.map((audit) => {
          const miss = audit.outcome === "MISS_TO_LEARN";
          return <article key={`${audit.state}-${audit.firstReportAt}`} className={`glass-card rounded-2xl p-4 ${miss ? "border-amber/20" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{audit.state} · {audit.sentinel} sentinel</p><h3 className="mt-1 text-sm font-bold leading-5 line-clamp-2">{audit.firstReportTitle}</h3><p className="mt-1 text-xs text-slate-500">{audit.firstReportSource} · {new Date(audit.firstReportAt).toLocaleString("en-NG")}</p></div>{miss ? <TriangleAlert className="h-5 w-5 shrink-0 text-amber" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-radar" />}</div>{audit.observedRainfallAudit ? <div className="mt-4 grid grid-cols-4 gap-2"><Stat label="Audit score" value={audit.observedRainfallAudit.score} /><Stat label="1h rain" value={`${audit.observedRainfallAudit.features.rain_1h_mm} mm`} /><Stat label="3h rain" value={`${audit.observedRainfallAudit.features.rain_3h_mm} mm`} /><Stat label="24h rain" value={`${audit.observedRainfallAudit.features.rain_24h_mm} mm`} /></div> : null}<p className="mt-3 text-xs leading-5 text-slate-500">{audit.explanation}</p></article>;
        })}
      </div>
      <p className="text-xs leading-5 text-slate-500">A miss here does not automatically mean the ML model is wrong. It can expose a local cloudburst missed by the weather-model grid, a flood away from the state-capital sentinel, drainage/terrain vulnerability, or thresholds that need retraining. That distinction is kept visible for auditability.</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg bg-slate-50 px-2 py-2 text-center dark:bg-midnight"><p className="text-[9px] font-bold uppercase text-slate-400">{label}</p><p className="mt-0.5 font-mono text-xs font-bold">{value}</p></div>; }
