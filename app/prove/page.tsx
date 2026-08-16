"use client";

/**
 * Layer 3: Prove — reproducible evidence without overstating model skill.
 *
 * This page keeps the real Open-Meteo historical rainfall replay and situation
 * report download, but does not present rainfall accumulation as proof of a
 * 48-hour NaijaClimaGuard forecast. Independent model metrics and operational
 * lead time remain gated by Validation v2.
 */

import AppShell from "@/components/shared/AppShell";
import AccessibleSeriesChart from "@/components/shared/AccessibleSeriesChart";
import { useState, useEffect } from "react";
import { Activity, Database, Target, Download, Loader2, History, AlertTriangle } from "lucide-react";

interface Day { date: string; label: string; rain: number; cumulative: number; }

const EVENTS = [
  { date: "2022-09-28", label: "Flooding documented" },
  { date: "2022-10-01", label: "State response record" },
  { date: "2022-10-06", label: "NiHSA peak discharge" },
];

export default function ProvePage() {
  const [series, setSeries] = useState<Day[]>([]);
  const [replayState, setReplayState] = useState<"loading" | "ready" | "error">("loading");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(
      "https://archive-api.open-meteo.com/v1/archive?latitude=7.8023&longitude=6.7333" +
        "&start_date=2022-08-01&end_date=2022-10-31&daily=precipitation_sum&timezone=Africa%2FLagos",
      { cache: "no-store" }
    )
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((j) => {
        let cum = 0;
        const pts: Day[] = j.daily.time.map((t: string, i: number) => {
          const rain = Math.round((j.daily.precipitation_sum[i] ?? 0) * 10) / 10;
          cum += rain;
          return {
            date: t,
            label: new Date(t).toLocaleDateString([], { month: "short", day: "numeric" }),
            rain,
            cumulative: Math.round(cum),
          };
        });
        setSeries(pts);
        setReplayState("ready");
      })
      .catch(() => setReplayState("error"));
  }, []);

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/reports/generate", { method: "POST" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NaijaClimaGuard-Situation-Report-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* user can retry */ }
    setDownloading(false);
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-5xl">
        <div>
          <h1 className="font-display text-2xl font-bold">Layer 3: Prove</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Reproducible source evidence, with model-performance claims gated by Validation v2
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="glass-card rounded-2xl p-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-radar/20 bg-radar/10">
              <Activity className="h-7 w-7 text-radar" />
            </div>
            <p className="font-display text-3xl font-bold">Live</p>
            <p className="mt-1 text-sm text-slate-500">Current risk API</p>
            <p className="mt-1 font-mono text-xs text-radar">derived-v2 · disclosed heuristic</p>
          </div>

          <div className="glass-card rounded-2xl p-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan/10">
              <Database className="h-7 w-7 text-cyan" />
            </div>
            <p className="font-display text-3xl font-bold">3</p>
            <p className="mt-1 text-sm text-slate-500">Validation data families</p>
            <p className="mt-1 font-mono text-xs text-cyan">NASA IMERG · GloFAS · ERA5-Land</p>
          </div>

          <div className="glass-card rounded-2xl p-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber/20 bg-amber/10">
              <Target className="h-7 w-7 text-amber" />
            </div>
            <p className="font-display text-3xl font-bold">v2</p>
            <p className="mt-1 text-sm text-slate-500">Independent model validation</p>
            <p className="mt-1 font-mono text-xs text-amber">chronological holdout · event labels</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="mb-1 flex items-center gap-2">
            <History className="h-4 w-4 text-radar" />
            <h2 className="font-display text-base font-bold">2022 Lokoja — Historical Rainfall Replay</h2>
          </div>
          <p className="mb-5 text-xs text-slate-500 leading-relaxed">
            Daily rainfall for Lokoja (Aug–Oct 2022), fetched from the public Open-Meteo historical archive.
            The chart is evidence of historical rainfall conditions only. It is not presented as a NaijaClimaGuard
            forecast or as proof of a 48-hour advantage. Validation v2 separately reconstructs archived NASA and
            GloFAS inputs available at T−72, T−48, and T−24.
          </p>

          {replayState === "loading" && (
            <div className="flex h-[320px] items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Fetching the 2022 archive…
            </div>
          )}
          {replayState === "error" && (
            <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-slate-500">
              <AlertTriangle className="h-6 w-6" />
              <p className="text-sm">Archive feed unreachable — refresh to retry. No cached stand-in is shown.</p>
            </div>
          )}
          {replayState === "ready" && <AccessibleSeriesChart points={series.map((point) => ({ label: point.label, primary: point.rain, secondary: point.cumulative }))} primaryLabel="Daily rainfall (mm)" secondaryLabel="Season cumulative (mm)" primaryColor="#10b981" secondaryColor="#06b6d4" events={EVENTS.map((event) => ({ index: series.findIndex((point) => point.date === event.date), label: event.label })).filter((event) => event.index >= 0)} />}

          <p className="mt-3 border-l-2 border-slate-200 pl-3 text-[11px] leading-relaxed text-slate-500 dark:border-midnight-border">
            <strong className="text-radar">Green line</strong> = daily rain. <strong className="text-cyan">Blue curve</strong> = accumulated rainfall across the displayed period.
            The event markers distinguish documented flooding/official hydrology from the rainfall series itself.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-amber/20 bg-amber/5">
          <h2 className="font-display text-base font-bold mb-2">What is not being claimed yet</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            NaijaClimaGuard is not currently publishing a headline ROC-AUC, precision, recall, false-alarm rate,
            or fixed 48/72-hour lead-time result from Validation v2. Those numbers will only appear here after the
            independent event benchmark and archived operational replay are completed and preserved as reproducible artifacts.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold">Current Situation Report</h2>
            <p className="text-xs text-slate-500 mt-1">Generated from live Open-Meteo inputs and the disclosed current risk formula.</p>
          </div>
          <button
            onClick={downloadReport}
            disabled={downloading}
            className="flex items-center gap-2 rounded-lg bg-radar px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download report
          </button>
        </div>
      </div>
    </AppShell>
  );
}
