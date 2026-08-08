"use client";

/**
 * Extended Outlook — upstream rainfall context, clearly separated from a
 * hydrological routing forecast.
 *
 * LIVE TODAY: recent Open-Meteo rainfall at selected basin/context locations.
 * The displayed load is a rainfall-accumulation indicator only. It is not river
 * inflow, discharge, or a validated travel-time forecast.
 *
 * INTEGRATION TARGET: operational Copernicus/ECMWF GloFAS ensemble discharge.
 * Validation v2 contains GloFAS ingestion/replay work, but the production
 * Extended Outlook does not yet serve those ensembles.
 */

import AppShell from "@/components/shared/AppShell";
import { useState, useEffect, useCallback } from "react";
import { Telescope, RefreshCw, AlertTriangle, PlugZap, Waves, ArrowDown } from "lucide-react";

interface UpstreamStation {
  id: string; name: string; country: string; lat: number; lon: number;
  context: string;
}

const CORRIDORS: { key: string; title: string; note: string; stations: UpstreamStation[] }[] = [
  {
    key: "benue",
    title: "Benue Corridor — Cameroon highlands → Nigeria",
    note: "Rainfall context across selected Benue-basin locations. This page does not model river routing or assign a travel time to Lokoja.",
    stations: [
      { id: "GRU", name: "Garoua (Lagdo basin)", country: "Cameroon", lat: 9.30, lon: 13.40, context: "upper-basin rainfall context" },
      { id: "YLA", name: "Yola (Upper Benue)", country: "Nigeria", lat: 9.21, lon: 12.48, context: "upper-Benue rainfall context" },
      { id: "IBI", name: "Ibi (Middle Benue)", country: "Nigeria", lat: 8.18, lon: 9.74, context: "middle-Benue rainfall context" },
    ],
  },
  {
    key: "niger",
    title: "Niger Corridor — Sahel reach → Nigeria",
    note: "Rainfall context at selected Niger-basin locations. Reservoir operations, tributaries, and river routing are not represented by the rainfall load shown here.",
    stations: [
      { id: "NIA", name: "Niamey (Middle Niger)", country: "Niger", lat: 13.51, lon: 2.11, context: "middle-Niger rainfall context" },
      { id: "MAL", name: "Malanville reach", country: "Benin", lat: 11.87, lon: 3.38, context: "downstream Niger rainfall context" },
      { id: "KNJ", name: "Kainji basin", country: "Nigeria", lat: 9.86, lon: 4.62, context: "reservoir-area rainfall context" },
    ],
  },
  {
    key: "chad",
    title: "Lake Chad Basin — Northeast context",
    note: "Selected rainfall observations for situational awareness only; local river and drainage behaviour require separate hydrological data.",
    stations: [
      { id: "NGM", name: "N'Gaoundéré", country: "Cameroon", lat: 7.32, lon: 13.58, context: "regional rainfall context" },
      { id: "YOL", name: "Yola (Adamawa)", country: "Nigeria", lat: 9.20, lon: 12.50, context: "regional rainfall context" },
      { id: "MAD", name: "Maiduguri", country: "Nigeria", lat: 11.83, lon: 13.15, context: "local rainfall context" },
    ],
  },
  {
    key: "southwest",
    title: "Lagos & Southwest — urban rainfall context",
    note: "Urban and coastal flood risk depends on rainfall intensity, drainage, tides, and local exposure. This page currently shows rainfall context only.",
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
const loadWord = (l: number) => (l >= 0.75 ? "Heavy rainfall load" : l >= 0.5 ? "Elevated rainfall load" : l >= 0.3 ? "Moderate rainfall load" : "Light rainfall load");

export default function OutlookPage() {
  const [readings, setReadings] = useState<Record<string, Reading | "error">>({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [synced, setSynced] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    const all = CORRIDORS.flatMap((c) => c.stations);
    try {
      const results = await Promise.all(
        all.map(async (st) => {
          try {
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${st.lat}&longitude=${st.lon}&daily=precipitation_sum&past_days=14&forecast_days=1&timezone=Africa%2FLagos`,
              { cache: "no-store" }
            );
            if (!res.ok) throw new Error();
            return [st.id, computeReading((await res.json()).daily)] as const;
          } catch {
            return [st.id, "error"] as const;
          }
        })
      );
      setReadings(Object.fromEntries(results));
      setSynced(new Date());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const corridorLoad = (key: string) => {
    const vals = CORRIDORS.find((c) => c.key === key)!.stations
      .map((s) => readings[s.id])
      .filter((r): r is Reading => typeof r === "object");
    if (!vals.length) return null;
    return vals.reduce((m, r) => m + r.load, 0) / vals.length;
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Telescope className="h-6 w-6 text-radar" /> Extended Outlook
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Basin-scale rainfall context beyond the immediate local view
            </p>
          </div>
          <button onClick={load}
            className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-midnight-border px-4 py-2 text-sm font-medium transition-all hover:border-radar/40">
            <RefreshCw className={`h-4 w-4 ${state === "loading" ? "animate-spin" : ""}`} />
            {synced ? `Synced ${synced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Refresh"}
          </button>
        </div>

        <div className="glass-card rounded-2xl p-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong className="text-radar">What this page is:</strong> a live rainfall watch over selected upstream
          and regional locations. The 2022 sequence included the Lagdo release period beginning in September and a
          NiHSA-recorded Lokoja maximum discharge on October 6, but this page does not infer a one-to-one travel time
          between those milestones. River routing, reservoir operations, and actual discharge require hydrological inputs
          such as GloFAS and Nigerian gauge data.
        </div>

        {state === "error" && (
          <div className="rounded-xl border border-crimson/20 bg-crimson/5 p-4 text-sm text-crimson flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Rainfall feed unreachable — retry. No cached stand-in shown.
          </div>
        )}

        {CORRIDORS.map((c) => {
          const cl = corridorLoad(c.key);
          return (
            <div key={c.key} className="glass-card rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Waves className="h-4 w-4 text-cyan" /> {c.title}
                </h2>
                {cl !== null && (
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded border"
                    style={{ color: loadColor(cl), borderColor: `${loadColor(cl)}55` }}>
                    {loadWord(cl)} · {Math.round(cl * 100)}%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mb-4">{c.note}</p>

              <div className="space-y-2">
                {c.stations.map((st) => {
                  const r = readings[st.id];
                  return (
                    <div key={st.id} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-midnight-border px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">{st.name} <span className="text-slate-400 font-normal text-xs">· {st.country}</span></p>
                        <p className="font-mono text-[11px] text-slate-500 flex items-center gap-1">
                          <ArrowDown className="h-3 w-3" /> {st.context}
                        </p>
                      </div>
                      {r === undefined || state === "loading" ? (
                        <div className="h-8 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
                      ) : r === "error" ? (
                        <span className="font-mono text-xs text-slate-400">feed unreachable</span>
                      ) : (
                        <div className="text-right">
                          <p className="font-mono text-sm font-bold" style={{ color: loadColor(r.load) }}>
                            {r.rain14} mm <span className="text-[10px] font-normal">/ 14d</span>
                          </p>
                          <p className="font-mono text-[10px] text-slate-500">{r.rain7} mm / 7d · live rainfall</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="glass-card rounded-2xl p-6 border-cyan/20">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold">GloFAS Ensemble Discharge Integration</h2>
            <span className="inline-flex items-center gap-1.5 rounded border border-cyan/30 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan">
              <PlugZap className="h-3 w-3" /> Integration target
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Copernicus/ECMWF GloFAS provides operational and longer-range probabilistic river-discharge products.
            Validation v2 includes authenticated historical and archived-forecast ingestion work so those signals can be
            evaluated against Nigerian events and ground observations. The production Extended Outlook does not yet serve
            a live GloFAS ensemble, so no ensemble probabilities are simulated on this page.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
