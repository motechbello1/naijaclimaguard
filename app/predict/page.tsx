"use client";

import AppShell from "@/components/shared/AppShell";
import AccessibleSeriesChart from "@/components/shared/AccessibleSeriesChart";
import RiverineWatchEvidence from "@/components/shared/RiverineWatchEvidence";
import { useNationalArea } from "@/components/shared/NationalArea";
import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import { AlertTriangle, Droplets, Waves, CloudRain, Wifi, WifiOff, FlaskConical, MapPin, Plus } from "lucide-react";
import { getRiskLevel } from "@/lib/data";

type SavedLocation = { id: string; name: string; state: string; latitude: number; longitude: number };
interface DayPoint { day: string; precip: number; isForecast: boolean; simulated?: number; }

export default function PredictPage() {
  const { area } = useNationalArea();
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [scenario, setScenario] = useState("");
  const [series, setSeries] = useState<DayPoint[]>([]);
  const [dataState, setDataState] = useState<"loading" | "live" | "error">("loading");
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [riskLevel, setRiskLevel] = useState("");
  const [riskSource, setRiskSource] = useState<"api" | "unavailable" | null>(null);
  const [factors, setFactors] = useState({ rainfall: 0, burst: 0, wetness: 0 });
  const selected = useMemo(() => locations.find((item) => item.id === selectedId) ?? locations[0], [locations, selectedId]);

  useEffect(() => {
    fetch("/api/locations", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const list: SavedLocation[] = data.locations ?? [];
        setLocations(list);
        const inWorkingArea = list.find((item) => item.state === area.name);
        setSelectedId((inWorkingArea ?? list[0])?.id ?? "");
      })
      .catch(() => setLocations([]));
  }, [area.name]);

  const load = useCallback(async () => {
    if (!selected) return;
    setDataState("loading");
    setRiskSource(null);
    setRiskScore(null);
    setRiskLevel("");
    setFactors({ rainfall: 0, burst: 0, wetness: 0 });

    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${selected.latitude}&longitude=${selected.longitude}&daily=precipitation_sum,et0_fao_evapotranspiration&past_days=10&forecast_days=4&timezone=Africa%2FLagos`;
      const response = await fetch(weatherUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("weather fetch failed");
      const json = await response.json();
      const daily = json.daily;
      const todayIdx = daily.time.length - 5;
      setSeries(daily.time.map((time: string, index: number) => ({
        day: new Date(time).toLocaleDateString([], { month: "short", day: "numeric" }),
        precip: Math.round((daily.precipitation_sum[index] ?? 0) * 10) / 10,
        isForecast: index > todayIdx,
      })));
      setDataState("live");

      try {
        const risk = await fetch(`/api/v1/risk?latitude=${selected.latitude}&longitude=${selected.longitude}`, { cache: "no-store" });
        if (!risk.ok) throw new Error("risk API unavailable");
        const data = await risk.json();
        setRiskScore(data.risk.score);
        setRiskLevel(data.risk.level);
        setFactors({ rainfall: data.factors.rainfall_7d, burst: data.factors.burst_intensity, wetness: data.factors.soil_saturation });
        setRiskSource("api");
      } catch {
        setRiskSource("unavailable");
      }
    } catch {
      setDataState("error");
      setRiskSource("unavailable");
    }
  }, [selected]);

  useEffect(() => { if (selected) load(); }, [selected, load]);

  const chartSeries = useMemo(() => series.map((point) => {
    if (!scenario || !point.isForecast) return { ...point, simulated: undefined };
    const mult = scenario === "monsoon" ? 2.4 : 1.8;
    return { ...point, simulated: Math.round(point.precip * mult * 10) / 10 + (scenario === "dam" ? 25 : 15) };
  }), [series, scenario]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] bg-[#071713] p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d9ff57]">National location analysis</p>
              <h1 className="mt-3 max-w-3xl font-display text-3xl font-black tracking-tight sm:text-5xl">Analyse the exact place you care about, anywhere in Nigeria.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">The public risk engine uses the coordinates of your saved place. State names organise the national experience; they do not fabricate a state-wide forecast.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 lg:min-w-[320px]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Working area</p>
              <p className="mt-1 text-lg font-black">{area.name}</p>
              <p className="mt-1 text-xs text-white/45">36 states + FCT supported for saved-place organisation</p>
            </div>
          </div>
        </section>

        {locations.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <MapPin className="mx-auto h-8 w-8 text-emerald-700 dark:text-radar" />
            <h2 className="mt-4 text-xl font-black">Add a place before running location analysis</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Save your home, farm, business, road or community with its real coordinates. That lets NaijaClimaGuard analyse locations across Nigeria without inventing one representative point for an entire state.</p>
            <Link href="/dashboard" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#071713] px-5 py-3 text-sm font-black text-white dark:bg-radar dark:text-slate-950"><Plus className="h-4 w-4" /> Add a saved place</Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
              <label className="flex min-w-0 items-center gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-emerald-700 dark:text-radar" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Analyse</span>
                <select value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black dark:border-slate-700 dark:bg-slate-950">
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.state}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <div className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold ${riskSource === "api" ? "border-radar/20 bg-radar/5 text-radar" : "border-amber/20 bg-amber/5 text-amber"}`}>
                  {riskSource === "api" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{riskSource === "api" ? "Live risk API" : "Risk API checking"}
                </div>
                <select value={scenario} onChange={(event) => setScenario(event.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-950">
                  <option value="">Live conditions</option><option value="monsoon">Scenario: rainfall surge</option><option value="dam">Scenario: added water release</option>
                </select>
              </div>
            </div>

            {scenario && <div className="flex items-start gap-3 rounded-2xl border border-amber/30 bg-amber/5 p-4"><FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-amber" /><p className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-amber">Scenario only.</strong> The dashed overlay is illustrative and is never presented as observed or forecast truth.</p></div>}

            {riskScore !== null && selected && (
              <div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
                <div className="rounded-[2rem] bg-[#d9ff57] p-6 text-[#071713] sm:p-8">
                  <p className="text-xs font-black uppercase tracking-[0.18em]">Current public risk index</p>
                  <h2 className="mt-2 text-3xl font-black">{selected.name}, {selected.state}</h2>
                  <p className="mt-3 max-w-2xl text-sm text-[#071713]/65">Canonical derived-v2 live API for this exact coordinate. Riverine Watch v1 remains a separate pilot evidence stream for Lokoja and Makurdi only.</p>
                </div>
                <div className="flex items-center justify-between rounded-[2rem] bg-[#071713] p-6 text-white lg:flex-col lg:items-start lg:justify-center">
                  <span className="text-5xl font-black" style={{ color: getRiskLevel(riskScore).color }}>{riskScore}</span>
                  <div><p className="text-xs text-white/40">out of 100</p><p className="mt-1 text-sm font-black uppercase" style={{ color: getRiskLevel(riskScore).color }}>{riskLevel}</p></div>
                </div>
              </div>
            )}

            {riskSource === "unavailable" && dataState === "live" && <div className="flex items-start gap-3 rounded-2xl border border-amber/20 bg-white p-5 dark:bg-slate-900"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber" /><div><p className="font-bold">Risk score temporarily unavailable</p><p className="mt-1 text-xs text-slate-500">The weather chart can remain live, but no fallback risk formula is substituted.</p></div></div>}

            {riskScore !== null && <div className="grid gap-4 sm:grid-cols-3">{[
              { icon: CloudRain, label: "Rainfall load (7d)", value: factors.rainfall },
              { icon: Waves, label: "Rainfall burst", value: factors.burst },
              { icon: Droplets, label: "Wetness proxy", value: factors.wetness },
            ].map((stat) => <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><stat.icon className="h-5 w-5 text-emerald-700 dark:text-radar" /><span className="text-sm font-bold">{stat.label}</span></div><p className="mt-5 text-3xl font-black">{Math.round(stat.value * 100)}%</p></div>)}</div>}

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-black">Daily precipitation · {selected?.name}</h2><p className="mt-1 text-xs text-slate-500">10 past days + 4 forecast days at the saved coordinate</p></div><span className="text-xs font-mono text-slate-400">{dataState === "live" ? "Open-Meteo · Live" : dataState === "loading" ? "Syncing…" : "Feed offline"}</span></div>
              {dataState === "error" ? <div className="flex h-[300px] flex-col items-center justify-center gap-3"><AlertTriangle className="h-8 w-8 text-slate-400" /><p className="text-sm text-slate-500">Weather feed unreachable.</p><button onClick={load} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold">Retry</button></div> : <AccessibleSeriesChart points={chartSeries.map((point) => ({ label: point.day, primary: point.precip, secondary: point.simulated }))} primaryLabel="Daily precipitation (mm)" secondaryLabel={scenario ? "Illustrative scenario (mm)" : undefined} />}
              <p className="mt-3 border-l-2 border-slate-200 pl-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-700">This chart is coordinate-specific. NaijaClimaGuard does not infer a whole-state flood forecast from a state name.</p>
            </div>
          </>
        )}

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><RiverineWatchEvidence compact /></div>
      </div>
    </AppShell>
  );
}
