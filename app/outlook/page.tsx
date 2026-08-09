"use client";

import AppShell from "@/components/shared/AppShell";
import { useState, useEffect, useCallback } from "react";
import { Telescope, RefreshCw, AlertTriangle, PlugZap, Waves, ArrowDown, Sprout, Info } from "lucide-react";

interface UpstreamStation {
  id: string; name: string; country: string; lat: number; lon: number;
  context: string;
}

const CORRIDORS: { key: string; title: string; simpleTitle: string; note: string; stations: UpstreamStation[] }[] = [
  {
    key: "benue", title: "Benue Corridor — Cameroon highlands → Nigeria", simpleTitle: "Benue / Upper Benue area",
    note: "Rainfall context across selected Benue-basin locations. This does not model river travel time or reservoir releases.",
    stations: [
      { id: "GRU", name: "Garoua (Lagdo basin)", country: "Cameroon", lat: 9.30, lon: 13.40, context: "upper-basin rainfall context" },
      { id: "YLA", name: "Yola (Upper Benue)", country: "Nigeria", lat: 9.21, lon: 12.48, context: "upper-Benue rainfall context" },
      { id: "IBI", name: "Ibi (Middle Benue)", country: "Nigeria", lat: 8.18, lon: 9.74, context: "middle-Benue rainfall context" },
    ],
  },
  {
    key: "niger", title: "Niger Corridor — Sahel reach → Nigeria", simpleTitle: "River Niger upstream area",
    note: "Rainfall context at selected Niger-basin locations. Reservoir operations, tributaries and river routing are not represented here.",
    stations: [
      { id: "NIA", name: "Niamey (Middle Niger)", country: "Niger", lat: 13.51, lon: 2.11, context: "middle-Niger rainfall context" },
      { id: "MAL", name: "Malanville reach", country: "Benin", lat: 11.87, lon: 3.38, context: "downstream Niger rainfall context" },
      { id: "KNJ", name: "Kainji basin", country: "Nigeria", lat: 9.86, lon: 4.62, context: "reservoir-area rainfall context" },
    ],
  },
  {
    key: "chad", title: "Lake Chad Basin — Northeast context", simpleTitle: "Northeast / Lake Chad area",
    note: "Selected rainfall observations for situational awareness only; local river and drainage behaviour require separate hydrological data.",
    stations: [
      { id: "NGM", name: "N'Gaoundéré", country: "Cameroon", lat: 7.32, lon: 13.58, context: "regional rainfall context" },
      { id: "YOL", name: "Yola (Adamawa)", country: "Nigeria", lat: 9.20, lon: 12.50, context: "regional rainfall context" },
      { id: "MAD", name: "Maiduguri", country: "Nigeria", lat: 11.83, lon: 13.15, context: "local rainfall context" },
    ],
  },
  {
    key: "southwest", title: "Lagos & Southwest — urban rainfall context", simpleTitle: "Lagos and Southwest",
    note: "Urban and coastal flood risk also depends on drainage, tides and local exposure. This page currently shows rainfall context only.",
    stations: [
      { id: "IBD", name: "Ibadan", country: "Nigeria", lat: 7.38, lon: 3.94, context: "regional rainfall context" },
      { id: "ABK", name: "Abeokuta", country: "Nigeria", lat: 7.16, lon: 3.35, context: "regional rainfall context" },
      { id: "LGA", name: "Lagos mainland", country: "Nigeria", lat: 6.45, lon: 3.39, context: "local urban rainfall context" },
    ],
  },
];

interface Reading { rain7: number; rain14: number; load: number; }

function computeReading(daily: any): Reading {
  const p: number[] = daily.precipitation_sum ?? [];
  const n = p.length;
  const sum = (a: number, b: number) => p.slice(Math.max(0, a), b).reduce((x: number, y: number) => x + (y || 0), 0);
  const rain7 = sum(n - 8, n - 1);
  const rain14 = sum(n - 15, n - 1);
  return { rain7: +rain7.toFixed(1), rain14: +rain14.toFixed(1), load: Math.min(1, rain14 / 300) };
}

const loadColor = (l: number) => (l >= 0.75 ? "#EF4444" : l >= 0.5 ? "#F97316" : l >= 0.3 ? "#F59E0B" : "#10B981");
const loadWord = (l: number) => (l >= 0.75 ? "Heavy rainfall" : l >= 0.5 ? "Rainfall is elevated" : l >= 0.3 ? "Moderate rainfall" : "Rainfall is light");
const farmerAdvice = (l: number) => l >= 0.75
  ? "Review low-lying fields, livestock routes and stored inputs now. Watch your farm alerts closely."
  : l >= 0.5
    ? "Rain has been building in this wider area. Check drainage, access roads and anything that may need moving."
    : l >= 0.3
      ? "Keep watching conditions, especially if your farm is close to a river or low ground."
      : "No strong rainfall build-up is visible in this regional view, but local conditions can still change.";

export default function OutlookPage() {
  const [readings, setReadings] = useState<Record<string, Reading | "error">>({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [synced, setSynced] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    const all = CORRIDORS.flatMap((c) => c.stations);
    try {
      const results = await Promise.all(all.map(async (st) => {
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${st.lat}&longitude=${st.lon}&daily=precipitation_sum&past_days=14&forecast_days=1&timezone=Africa%2FLagos`, { cache: "no-store" });
          if (!res.ok) throw new Error();
          return [st.id, computeReading((await res.json()).daily)] as const;
        } catch { return [st.id, "error"] as const; }
      }));
      setReadings(Object.fromEntries(results)); setSynced(new Date()); setState("ready");
    } catch { setState("error"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const corridorLoad = (key: string) => {
    const vals = CORRIDORS.find((c) => c.key === key)!.stations.map((s) => readings[s.id]).filter((r): r is Reading => typeof r === "object");
    if (!vals.length) return null;
    return vals.reduce((m, r) => m + r.load, 0) / vals.length;
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Telescope className="h-6 w-6 text-radar" />
              <span className="simple-only role-farmer-inline">Rain outlook for farming</span>
              <span className="simple-only role-household-inline">Rain outlook</span>
              <span className="simple-only role-business-inline">Regional rainfall outlook</span>
              <span className="simple-only role-agency-inline">Regional rainfall watch</span>
              <span className="standard-up">Extended Outlook</span>
            </h1>
            <p className="simple-only mt-1 text-sm text-slate-500">See where rain has been building up and whether you should pay closer attention.</p>
            <p className="standard-up mt-1 text-sm text-slate-500">Regional and upstream rainfall context beyond the immediate local view.</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-midnight-border px-4 py-2 text-sm font-medium hover:border-radar/40">
            <RefreshCw className={`h-4 w-4 ${state === "loading" ? "animate-spin" : ""}`} />
            <span className="simple-only">Check again</span><span className="standard-up">{synced ? `Synced ${synced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Refresh"}</span>
          </button>
        </div>

        <div className="simple-only rounded-2xl border border-radar/20 bg-radar/5 p-5">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-radar" />
            <p className="text-sm leading-relaxed">This page watches rainfall across wider areas. It can tell you when rain is building up, but it cannot by itself tell you exactly when a river will overflow at your location. Your local risk page and official warnings remain more important.</p>
          </div>
        </div>

        <div className="standard-up glass-card rounded-2xl p-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong className="text-radar">Purpose:</strong> live rainfall context over selected upstream and regional locations. River routing, reservoir operations and discharge require separate hydrological inputs.
        </div>

        {state === "error" && (
          <div className="rounded-xl border border-crimson/20 bg-crimson/5 p-4 text-sm text-crimson flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> We could not reach the rainfall feed. Try again.</div>
        )}

        {CORRIDORS.map((c) => {
          const cl = corridorLoad(c.key);
          return (
            <div key={c.key} className="glass-card rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-bold flex items-center gap-2"><Waves className="h-4 w-4 text-cyan" /><span className="simple-only">{c.simpleTitle}</span><span className="standard-up">{c.title}</span></h2>
                {cl !== null && <span className="rounded-full border px-3 py-1 text-sm font-bold" style={{ color: loadColor(cl), borderColor: `${loadColor(cl)}55` }}>{loadWord(cl)}<span className="standard-up"> · {Math.round(cl * 100)}%</span></span>}
              </div>

              {cl !== null && (
                <div className="simple-only mt-4">
                  <p className="role-farmer-only flex items-start gap-2 text-sm leading-relaxed"><Sprout className="mt-0.5 h-4 w-4 shrink-0 text-radar" />{farmerAdvice(cl)}</p>
                  <p className="role-household-only text-sm leading-relaxed text-slate-600 dark:text-slate-300">{cl >= 0.5 ? "Rain is building across this wider area. Keep an eye on your local risk and avoid relying on this regional view alone." : "No strong regional rainfall build-up is visible here right now. Keep following your local risk and official warnings."}</p>
                  <p className="role-business-only text-sm leading-relaxed text-slate-600 dark:text-slate-300">{cl >= 0.5 ? "Consider whether access routes, outdoor operations or vulnerable sites in this region need closer monitoring." : "No strong regional rainfall build-up is visible here right now."}</p>
                  <p className="role-agency-only text-sm leading-relaxed text-slate-600 dark:text-slate-300">{cl >= 0.5 ? "Regional rainfall accumulation is elevated; review local gauges, forecasts and field reports before operational escalation." : "Regional rainfall accumulation is currently limited in this context layer."}</p>
                </div>
              )}

              <p className="standard-up mt-2 text-[11px] text-slate-500">{c.note}</p>
              <div className="standard-up mt-4 space-y-2">
                {c.stations.map((st) => {
                  const r = readings[st.id];
                  return (
                    <div key={st.id} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-midnight-border px-4 py-3">
                      <div><p className="text-sm font-semibold">{st.name} <span className="text-slate-400 font-normal text-xs">· {st.country}</span></p><p className="font-mono text-[11px] text-slate-500 flex items-center gap-1"><ArrowDown className="h-3 w-3" /> {st.context}</p></div>
                      {r === undefined || state === "loading" ? <div className="h-8 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" /> : r === "error" ? <span className="font-mono text-xs text-slate-400">feed unreachable</span> : <div className="text-right"><p className="font-mono text-sm font-bold" style={{ color: loadColor(r.load) }}>{r.rain14} mm <span className="text-[10px] font-normal">/ 14d</span></p><p className="font-mono text-[10px] text-slate-500">{r.rain7} mm / 7d</p></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="technical-only glass-card rounded-2xl p-6 border-cyan/20">
          <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-bold">GloFAS Ensemble Discharge Integration</h2><span className="inline-flex items-center gap-1.5 rounded border border-cyan/30 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan"><PlugZap className="h-3 w-3" /> Integration target</span></div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Operational GloFAS ensemble discharge is being validated separately under the Model v5 archive protocol. This production outlook does not simulate or fabricate GloFAS probabilities before that evidence is accepted.</p>
        </div>
      </div>
    </AppShell>
  );
}
