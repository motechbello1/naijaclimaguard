"use client";

import { CloudLightning, MapPinned, RefreshCw, ScanSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Hotspot = {
  lga: string;
  state: string;
  scoutScore: number;
  scoutLevel: "CRITICAL" | "HIGH" | "ELEVATED" | "QUIET";
  recent1hMm: number;
  recent3hMm: number;
  recent6hMm: number;
  next3hMm: number;
  next6hMm: number;
  maxHourlyMm: number;
  capeMaxJkg: number;
  deepRisk?: {
    score: number;
    level: string;
    drivers: string[];
  };
};

type ScoutPayload = {
  generatedAt: string;
  coverage: number;
  available: number;
  elevated: number;
  high: number;
  critical: number;
  hotspots: Hotspot[];
  stateSummary: Array<{ state: string; highestScore: number; highestLevel: string; hotspotLga: string; elevatedLgas: number }>;
  methodology: string;
  limitation: string;
};

const levelClass: Record<string, string> = {
  CRITICAL: "border-crimson/30 bg-crimson/10 text-crimson",
  HIGH: "border-amber/30 bg-amber/10 text-amber",
  ELEVATED: "border-radar/30 bg-radar/10 text-radar",
  QUIET: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800",
};

export default function NationwideLgaScout() {
  const [data, setData] = useState<ScoutPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [state, setState] = useState("ALL");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/national-lga-scout?limit=100", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Nationwide rainfall scout unavailable");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nationwide rainfall scout unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 15 * 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const states = useMemo(() => ["ALL", ...Array.from(new Set((data?.hotspots || []).map((item) => item.state))).sort()], [data]);
  const hotspots = useMemo(() => (data?.hotspots || []).filter((item) => state === "ALL" || item.state === state).slice(0, 18), [data, state]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-radar"><ScanSearch className="h-4 w-4" /> Nationwide early scout</div>
          <h2 className="mt-1 font-display text-xl font-bold">All-LGA rainfall screening</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">NaijaClimaGuard now checks one geographic point for every Nigerian LGA, then automatically performs a deeper 7-day rainfall scan only where the lightweight screen looks suspicious. This catches risk outside state capitals without pretending an LGA centroid is street-level sensing.</p>
        </div>
        <div className="flex gap-2">
          <select value={state} onChange={(e) => setState(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-midnight-border dark:bg-midnight-light">
            {states.map((item) => <option key={item} value={item}>{item === "ALL" ? "All hotspot states" : item}</option>)}
          </select>
          <button onClick={() => load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-midnight-border dark:bg-midnight-light"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Re-scan</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="LGA registry" value={data?.coverage || "—"} detail="Nationwide geographic points" />
        <Metric label="Weather online" value={data?.available || "—"} detail="Points successfully screened" />
        <Metric label="Elevated+" value={data?.elevated ?? "—"} detail="Needs closer attention" />
        <Metric label="High+" value={data?.high ?? "—"} detail="Strong rainfall signal" warning />
        <Metric label="Critical" value={data?.critical ?? "—"} detail="Highest screening tier" danger />
      </div>

      {error ? <div className="rounded-xl border border-crimson/20 bg-crimson/5 p-4 text-sm text-crimson">{error}</div> : null}
      {loading && !data ? <div className="glass-card rounded-2xl p-8 text-center text-sm text-slate-500">Scanning Nigerian LGAs in weather batches…</div> : null}

      {hotspots.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {hotspots.map((item) => {
            const effectiveScore = Math.max(item.scoutScore, item.deepRisk?.score ?? 0);
            const effectiveLevel = item.deepRisk?.level || item.scoutLevel;
            return (
              <article key={`${item.state}-${item.lga}`} className="glass-card rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.state}</p><h3 className="truncate text-base font-bold">{item.lga} LGA</h3></div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${levelClass[effectiveLevel] || levelClass[item.scoutLevel]}`}>{effectiveLevel} · {effectiveScore}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center"><Rain label="Recent 3h" value={item.recent3hMm} /><Rain label="Next 3h" value={item.next3hMm} /><Rain label="Next 6h" value={item.next6hMm} /></div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><CloudLightning className="h-3.5 w-3.5 text-radar" /><span>Peak hour {item.maxHourlyMm.toFixed(1)} mm · CAPE {item.capeMaxJkg.toLocaleString()} J/kg</span></div>
                {item.deepRisk ? <p className="mt-2 text-[11px] leading-5 text-slate-500">Deep scan: {item.deepRisk.drivers?.[0] || "Antecedent rainfall check completed."}</p> : <p className="mt-2 text-[11px] leading-5 text-slate-400">Lightweight scout only. Deeper history is triggered for the strongest candidates.</p>}
              </article>
            );
          })}
        </div>
      ) : data && !loading ? <div className="rounded-2xl border border-slate-200 p-5 text-sm text-slate-500 dark:border-midnight-border">No LGA crossed the current elevated screening threshold in this scan.</div> : null}

      <div className="flex gap-2 rounded-xl border border-slate-200 p-3 text-xs leading-5 text-slate-500 dark:border-midnight-border"><MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-radar" /><span>{data?.limitation || "LGA-centroid screening improves national coverage but does not replace local radar, drainage sensors, terrain data or verified street-level reports."}</span></div>
    </section>
  );
}

function Metric({ label, value, detail, warning = false, danger = false }: { label: string; value: string | number; detail: string; warning?: boolean; danger?: boolean }) {
  return <div className={`glass-card rounded-2xl p-4 ${danger ? "border-crimson/20" : warning ? "border-amber/20" : ""}`}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-2 font-mono text-2xl font-bold ${danger ? "text-crimson" : warning ? "text-amber" : ""}`}>{value}</p><p className="mt-1 text-[11px] text-slate-500">{detail}</p></div>;
}

function Rain({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-midnight"><p className="text-[9px] font-bold uppercase text-slate-400">{label}</p><p className="mt-0.5 font-mono text-xs font-bold">{value.toFixed(1)}<span className="ml-0.5 text-[9px] font-normal text-slate-400">mm</span></p></div>;
}
