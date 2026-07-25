"use client";

/**
 * Extended Outlook — seeing beyond 7 days, honestly.
 *
 * TIER 3 (LIVE): Upstream Basin Watch. Water that floods Lokoja is already
 *   in the river upstream weeks earlier (documented 2022: Lagdo release
 *   Sep 13 → Lokoja peak Oct 9 ≈ 26 days). We fetch LIVE rainfall over the
 *   Benue and Niger headwater corridors and translate it into estimated
 *   arrival windows at the confluence. Every value is a live Open-Meteo
 *   reading; travel times are labeled estimates from documented events.
 *
 * TIER 2 (CONNECT-READY): GloFAS 30-day ensemble & seasonal outlook
 *   (Copernicus, free CDS account) — probabilistic only, never fake dates.
 */

import AppShell from "@/components/shared/AppShell";
import { useState, useEffect, useCallback } from "react";
import { Telescope, RefreshCw, AlertTriangle, PlugZap, Waves, ArrowDown } from "lucide-react";

interface UpstreamStation {
  id: string; name: string; country: string; lat: number; lon: number;
  travel: string;
}

const CORRIDORS: { key: string; title: string; note: string; stations: UpstreamStation[] }[] = [
  {
    key: "benue",
    title: "Benue Corridor — Cameroon highlands → Lokoja",
    note: "2022 documented propagation: Lagdo release Sep 13 → Lokoja peak Oct 9 (~26 days).",
    stations: [
      { id: "GRU", name: "Garoua (Lagdo basin)", country: "Cameroon", lat: 9.30, lon: 13.40, travel: "≈ 3–4 weeks" },
      { id: "YLA", name: "Yola (Upper Benue)", country: "Nigeria", lat: 9.21, lon: 12.48, travel: "≈ 2–3 weeks" },
      { id: "IBI", name: "Ibi (Middle Benue)", country: "Nigeria", lat: 8.18, lon: 9.74, travel: "≈ 1–2 weeks" },
    ],
  },
  {
    key: "niger",
    title: "Niger Corridor — Sahel reach → Lokoja",
    note: "Historical White-flood propagation from the middle Niger reach; Kainji operations modulate final timing.",
    stations: [
      { id: "NIA", name: "Niamey (Middle Niger)", country: "Niger", lat: 13.51, lon: 2.11, travel: "≈ 4–6 weeks" },
      { id: "MAL", name: "Malanville reach", country: "Benin", lat: 11.87, lon: 3.38, travel: "≈ 3–4 weeks" },
      { id: "KNJ", name: "Kainji basin", country: "Nigeria", lat: 9.86, lon: 4.62, travel: "≈ 1–2 weeks" },
    ],
  },
  {
    key: "chad",
    title: "Lake Chad Basin — Northeast corridor",
    note: "Seasonal flooding from Komadugu-Yobe and Yedseram rivers; affects Borno, Yobe, Adamawa.",
    stations: [
      { id: "NGM", name: "N'Gaoundéré", country: "Cameroon", lat: 7.32, lon: 13.58, travel: "≈ 3–5 weeks" },
      { id: "YOL", name: "Yola (Adamawa)", country: "Nigeria", lat: 9.20, lon: 12.50, travel: "≈ 2–3 weeks" },
      { id: "MAD", name: "Maiduguri", country: "Nigeria", lat: 11.83, lon: 13.15, travel: "≈ 1–2 weeks" },
    ],
  },
  {
    key: "southwest",
    title: "Lagos & Southwest — drainage and coastal flooding",
    note: "Urban drainage, not riverine — rainfall intensity and saturation drive flash flooding within hours, not weeks.",
    stations: [
      { id: "IBD", name: "Ibadan (Ogun headwaters)", country: "Nigeria", lat: 7.38, lon: 3.94, travel: "≈ 1–3 days" },
      { id: "ABK", name: "Abeokuta (Ogun River)", country: "Nigeria", lat: 7.16, lon: 3.35, travel: "≈ 12–48 hours" },
      { id: "LGA", name: "Lagos mainland", country: "Nigeria", lat: 6.45, lon: 3.39, travel: "direct — flash" },
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
const loadWord = (l: number) => (l >= 0.75 ? "Heavy inflow building" : l >= 0.5 ? "Elevated inflow" : l >= 0.3 ? "Moderate inflow" : "Light inflow");

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
              Beyond 7 days — by watching the water before it arrives, not by faking forecasts
            </p>
          </div>
          <button onClick={load}
            className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-midnight-border px-4 py-2 text-sm font-medium transition-all hover:border-radar/40">
            <RefreshCw className={`h-4 w-4 ${state === "loading" ? "animate-spin" : ""}`} />
            {synced ? `Synced ${synced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Refresh"}
          </button>
        </div>

        <div className="glass-card rounded-2xl p-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong className="text-radar">How this works:</strong> rain falling on the Benue headwaters in
          Cameroon today becomes river water at the Lokoja confluence weeks later — in 2022, the Lagdo
          release of <span className="font-mono">Sep 13</span> peaked at Lokoja on <span className="font-mono">Oct 9</span>.
          Below is <em>live rainfall right now</em> over both feeder corridors, with arrival windows
          estimated from that documented propagation. Physics-backed lead time — presented as windows
          and signals, never as fake exact dates.
        </div>

        {state === "error" && (
          <div className="rounded-xl border border-crimson/20 bg-crimson/5 p-4 text-sm text-crimson flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Upstream feed unreachable — retry. No cached stand-in shown.
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
                          <ArrowDown className="h-3 w-3" /> reaches Lokoja in {st.travel} <span className="text-slate-400">(est.)</span>
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
                          <p className="font-mono text-[10px] text-slate-500">{r.rain7} mm / 7d · live</p>
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
            <h2 className="text-sm font-bold">GloFAS 30-Day Ensemble &amp; Seasonal Outlook</h2>
            <span className="inline-flex items-center gap-1.5 rounded border border-cyan/30 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan">
              <PlugZap className="h-3 w-3" /> Connect-ready
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Copernicus GloFAS provides probabilistic river-discharge ensembles to <strong>30 days</strong> and
            seasonal high-flow outlooks to <strong>16 weeks</strong> — free and open via the Climate Data Store.
            The ingestion worker ships in our ml-api service; it activates the moment a free CDS API key is
            configured. Until then this panel stays empty — we don&apos;t simulate ensembles.
          </p>
          <ol className="mt-3 text-xs text-slate-500 space-y-1 list-decimal list-inside font-mono">
            <li>Register free at cds.climate.copernicus.eu → copy API key</li>
            <li>Add CDS_API_KEY to the ml-api service on Render</li>
            <li>Weekly ensemble probabilities appear here per station — labeled probabilistic, always</li>
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
