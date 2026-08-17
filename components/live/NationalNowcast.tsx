"use client";

import { CloudRain, Radar, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useExplanationMode } from "@/components/shared/ExplanationMode";

type Sentinel = {
  state: string;
  city: string;
  latitude: number;
  longitude: number;
  available: boolean;
  monitoredPoints?: number;
  availablePoints?: number;
  highestPoint?: string | null;
  risk?: {
    score: number;
    level: "EMERGENCY" | "WARNING" | "WATCH" | "NORMAL";
    features: {
      rain_1h_mm: number;
      rain_3h_mm: number;
      rain_6h_mm: number;
      rain_24h_mm: number;
      rain_72h_mm: number;
      rain_168h_mm: number;
      forecast_3h_mm: number;
      forecast_6h_mm: number;
    };
    drivers: string[];
  };
};

const levelStyle: Record<string, string> = {
  EMERGENCY: "border-crimson/30 bg-crimson/10 text-crimson",
  WARNING: "border-amber/30 bg-amber/10 text-amber",
  WATCH: "border-radar/30 bg-radar/10 text-radar",
  NORMAL: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
};

function plainLevel(level: string) {
  if (level === "EMERGENCY") return "Urgent attention";
  if (level === "WARNING") return "High attention";
  if (level === "WATCH") return "Keep watch";
  return "No strong signal";
}

export default function NationalNowcast() {
  const { mode } = useExplanationMode();
  const simple = mode === "simple";
  const [sentinels, setSentinels] = useState<Sentinel[]>([]);
  const [screeningPoints, setScreeningPoints] = useState(0);
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/national-nowcast", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load national nowcast");
      setSentinels(payload.sentinels || []);
      setScreeningPoints(Number(payload.screeningPoints || 0));
      setGeneratedAt(payload.generatedAt || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load national nowcast");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5 * 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const active = sentinels.filter((item) => item.available && item.risk && item.risk.level !== "NORMAL");
  const available = sentinels.filter((item) => item.available).length;
  const top = (simple && active.length ? active : sentinels.filter((item) => item.available && item.risk)).slice(0, simple ? 6 : 12);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-radar"><Radar className="h-4 w-4" /> {simple ? "Rainfall watch" : "Before the headline"}</div>
          <h2 className="mt-1 font-display text-xl font-bold">{simple ? "Which cities need attention now?" : "National urban rainfall nowcast"}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {simple
              ? "The system checks several rainfall points around each state-capital area and the FCT. It highlights places where recent or incoming rain looks more concerning than normal."
              : "Five rainfall screening points surround every state-capital/metro anchor and the FCT, checking the latest 1, 3, 6, 24, 72 and 168 hour rainfall plus the next six hours. This makes the screen less dependent on one city-centre coordinate when a local cloudburst falls several kilometres away."}
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-midnight-border dark:bg-midnight-light"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> {simple ? "Check again" : "Recheck rainfall"}</button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-midnight-border dark:bg-midnight-light">
        <div className={`grid gap-3 ${simple ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
          {!simple ? <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Rainfall points</p><p className="mt-1 font-mono text-2xl font-bold">{screeningPoints || "—"}</p></div> : null}
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{simple ? "Areas checked" : "States/FCT online"}</p><p className="mt-1 font-mono text-2xl font-bold">{available || "—"}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{simple ? "Need attention" : "Above normal"}</p><p className={`mt-1 font-mono text-2xl font-bold ${active.length ? "text-amber" : ""}`}>{active.length}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{simple ? "Last checked" : "Last rainfall scan"}</p><p className="mt-1 text-sm font-semibold">{generatedAt ? new Date(generatedAt).toLocaleString("en-NG", { timeStyle: "short", dateStyle: "medium" }) : loading ? "Checking…" : "Unavailable"}</p></div>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-crimson/20 bg-crimson/5 p-4 text-sm text-crimson">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {top.map((item) => {
          const risk = item.risk!;
          return <div key={item.state} className="glass-card ncg-simple-card rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-400">{item.state}</p><p className="font-display text-base font-bold">{item.city}</p>{!simple ? <p className="mt-0.5 text-[10px] text-slate-400">Highest screening point: {item.highestPoint || "centre"} · {item.availablePoints || 0}/{item.monitoredPoints || 5} online</p> : null}</div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${levelStyle[risk.level]}`}>{simple ? plainLevel(risk.level) : `${risk.level} · ${risk.score}`}</span></div><div className={`mt-4 grid gap-2 text-center ${simple ? "grid-cols-2" : "grid-cols-4"}`}><RainStat label={simple ? "Rain last 3h" : "1h"} value={simple ? risk.features.rain_3h_mm : risk.features.rain_1h_mm} />{!simple ? <RainStat label="3h" value={risk.features.rain_3h_mm} /> : null}{!simple ? <RainStat label="24h" value={risk.features.rain_24h_mm} /> : null}<RainStat label={simple ? "Rain expected next 6h" : "72h"} value={simple ? risk.features.forecast_6h_mm : risk.features.rain_72h_mm} /></div><p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500"><CloudRain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-radar" /> {simple ? `Main reason: ${risk.drivers[0]}` : risk.drivers[0]}</p></div>;
        })}
      </div>

      <p className="text-xs leading-5 text-slate-500">{simple ? "This is an early rainfall watch, not proof that a street is flooded. Local drainage, terrain and real reports still matter." : "Coverage note: this is a 5-point urban grid for every state/FCT anchor, not a single city-centre point. It is still a screening system rather than street-level radar. Drainage, terrain, exact road elevation and verified incident coordinates remain essential for final road-level warnings."}</p>
    </section>
  );
}

function RainStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-midnight"><p className="text-[9px] font-bold uppercase text-slate-400">{label}</p><p className="mt-0.5 font-mono text-xs font-bold">{value.toFixed(1)}<span className="ml-0.5 text-[9px] font-normal text-slate-400">mm</span></p></div>;
}
