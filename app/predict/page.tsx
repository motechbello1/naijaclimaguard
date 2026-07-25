"use client";

/**
 * Layer 1: Predict — honest data states throughout.
 *  · Chart: REAL daily precipitation from Open-Meteo (10 days past + 4 forecast).
 *  · Risk score: from the trained ML API when reachable; otherwise derived
 *    transparently from the same live Open-Meteo inputs (disclosed formula).
 *  · Scenario dropdown: clearly labeled SIMULATION — never mixed with live data.
 */

import AppShell from "@/components/shared/AppShell";
import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Droplets, Waves, CloudRain, Wifi, WifiOff, FlaskConical } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { getRiskLevel } from "@/lib/data";
import { ML_API_URL } from "@/lib/config";

const LOKOJA = { lat: 7.8023, lon: 6.7333 };

interface DayPoint { day: string; precip: number; isForecast: boolean; simulated?: number; }

function deriveFactors(daily: any) {
  const idx = daily.time.length - 5; // today (past_days=10, forecast_days=4)
  const p: number[] = daily.precipitation_sum ?? [];
  const et0: number[] = daily.et0_fao_evapotranspiration ?? [];
  const sum = (arr: number[], a: number, b: number) => arr.slice(Math.max(0, a), b).reduce((x, y) => x + (y || 0), 0);
  const precip7 = sum(p, idx - 6, idx + 1);
  const precip3 = sum(p, idx - 2, idx + 1);
  const balance7 = precip7 - sum(et0, idx - 6, idx + 1);
  const rainfall = Math.min(1, precip7 / 200);
  const burst = Math.min(1, precip3 / 120);
  const saturation = Math.min(1, Math.max(0, (balance7 + 40) / 160));
  const score = Math.round((rainfall * 0.45 + burst * 0.3 + saturation * 0.25) * 100);
  return { score, rainfall, burst, saturation };
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as DayPoint;
  return (
    <div className="glass-card rounded-lg p-3 text-sm">
      <p className="text-xs text-slate-400 mb-1">{d.day}{d.isForecast ? " · forecast" : ""}</p>
      <p>Precipitation: <strong>{d.precip} mm</strong></p>
      {typeof d.simulated === "number" && (
        <p className="text-amber">Simulated: <strong>{d.simulated} mm</strong></p>
      )}
    </div>
  );
}

export default function PredictPage() {
  const [scenario, setScenario] = useState("");
  const [series, setSeries] = useState<DayPoint[]>([]);
  const [dataState, setDataState] = useState<"loading" | "live" | "error">("loading");
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [riskLevel, setRiskLevel] = useState("");
  const [riskSource, setRiskSource] = useState<"ml" | "derived" | null>(null);
  const [factors, setFactors] = useState({ rainfall: 0, discharge: 0, soil: 0 });

  const load = useCallback(async () => {
    setDataState("loading");
    // 1) Real weather series — the chart's single source of truth.
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${LOKOJA.lat}&longitude=${LOKOJA.lon}` +
        `&daily=precipitation_sum,et0_fao_evapotranspiration&past_days=10&forecast_days=4&timezone=Africa%2FLagos`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("weather fetch failed");
      const json = await res.json();
      const daily = json.daily;
      const todayIdx = daily.time.length - 5;
      const pts: DayPoint[] = daily.time.map((t: string, i: number) => ({
        day: new Date(t).toLocaleDateString([], { month: "short", day: "numeric" }),
        precip: Math.round((daily.precipitation_sum[i] ?? 0) * 10) / 10,
        isForecast: i > todayIdx,
      }));
      setSeries(pts);

      // 2) Risk score: prefer the trained ML API; fall back to the disclosed derived model.
      let usedML = false;
      try {
        const ml = await fetch(`${ML_API_URL}/v1/risk?latitude=${LOKOJA.lat}&longitude=${LOKOJA.lon}`, { cache: "no-store" });
        if (ml.ok) {
          const d = await ml.json();
          setRiskScore(d.risk_assessment.current_score);
          setRiskLevel(d.risk_assessment.level);
          setFactors({
            rainfall: d.contributing_factors.rainfall_intensity,
            discharge: d.contributing_factors.river_discharge,
            soil: d.contributing_factors.soil_saturation,
          });
          setRiskSource("ml");
          usedML = true;
        }
      } catch { /* fall through to derived */ }

      if (!usedML) {
        const f = deriveFactors(daily);
        setRiskScore(f.score);
        setRiskLevel(getRiskLevel(f.score).label.toUpperCase());
        setFactors({ rainfall: f.rainfall, discharge: f.burst, soil: f.saturation });
        setRiskSource("derived");
      }
      setDataState("live");
    } catch {
      setDataState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Scenario overlay — pure simulation, drawn as a separate labeled series.
  useEffect(() => {
    setSeries((prev) =>
      prev.map((p) => {
        if (!scenario || !p.isForecast) return { ...p, simulated: undefined };
        const mult = scenario === "monsoon" ? 2.4 : 1.8;
        return { ...p, simulated: Math.round(p.precip * mult * 10) / 10 + (scenario === "dam" ? 25 : 15) };
      })
    );
  }, [scenario]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Layer 1: Predict</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Lokoja station · live precipitation &amp; flood risk</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
              riskSource === "ml"
                ? "text-radar border-radar/20 bg-radar/5"
                : riskSource === "derived"
                ? "text-cyan border-cyan/20 bg-cyan/5"
                : "text-slate-400 border-slate-200 dark:border-midnight-border"
            }`}>
              {riskSource ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {riskSource === "ml" ? "XGBoost API: Live" : riskSource === "derived" ? "Derived model: Live data" : "Connecting…"}
            </div>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light px-4 py-2 text-sm focus:border-radar focus:outline-none"
            >
              <option value="">Live conditions</option>
              <option value="monsoon">Simulate: Monsoon surge</option>
              <option value="dam">Simulate: Dam release</option>
            </select>
          </div>
        </div>

        {/* Simulation banner — impossible to mistake for live data */}
        {scenario && (
          <div className="rounded-xl border-2 border-amber/50 bg-amber/5 dark:bg-amber/10 p-4 flex items-center gap-3 animate-slide-up">
            <FlaskConical className="h-5 w-5 text-amber shrink-0" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong className="text-amber">Simulation mode.</strong> The dashed overlay is an illustrative
              {scenario === "monsoon" ? " monsoon-surge" : " dam-release"} scenario — not live data. Live
              measurements remain the solid series.
            </p>
          </div>
        )}

        {/* Risk score card */}
        {riskScore !== null && (
          <div className="glass-card rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Current flood risk — Lokoja, Kogi State</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {riskSource === "ml"
                  ? "From the trained XGBoost model, on live Open-Meteo inputs"
                  : "Disclosed multi-factor formula on live Open-Meteo inputs (ML API offline)"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-display font-bold" style={{ color: getRiskLevel(riskScore).color }}>
                {riskScore}/100
              </span>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: getRiskLevel(riskScore).color }}>
                {riskLevel}
              </p>
            </div>
          </div>
        )}

        {/* Contributing factors — live values */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: CloudRain, label: "Rainfall load (7d)", value: factors.rainfall, color: "text-cyan" },
            { icon: Waves, label: "Burst intensity (3d)", value: factors.discharge, color: "text-radar" },
            { icon: Droplets, label: "Soil saturation", value: factors.soil, color: "text-amber" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 mr-3 overflow-hidden">
                  <div className="h-full rounded-full bg-radar transition-all duration-700" style={{ width: `${Math.round(stat.value * 100)}%` }} />
                </div>
                <span className="text-sm font-bold font-mono">{Math.round(stat.value * 100)}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Real precipitation chart */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-base font-bold">Daily Precipitation — Lokoja (10 days past · 4 days forecast)</h2>
            <span className="text-xs text-slate-400 font-mono">
              {dataState === "live" ? "Source: Open-Meteo · Live" : dataState === "loading" ? "Syncing…" : "Feed offline"}
            </span>
          </div>
          {dataState === "error" ? (
            <div className="h-[300px] flex flex-col items-center justify-center gap-3">
              <AlertTriangle className="h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-500">Weather feed unreachable. Live data will return on retry.</p>
              <button onClick={load} className="rounded-lg border border-slate-200 dark:border-midnight-border px-4 py-2 text-sm font-medium hover:border-radar/40 transition-all">
                Retry
              </button>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="precipGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} unit="mm" />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={64} stroke="#EF4444" strokeDasharray="6 4" label={{ value: "Heavy-rain threshold (64mm/day)", fill: "#EF4444", fontSize: 10, position: "insideTopLeft" }} />
                  <Area type="monotone" dataKey="precip" stroke="#06B6D4" strokeWidth={2} fill="url(#precipGrad)" dot={false} name="Measured / forecast" />
                  {scenario && (
                    <Area type="monotone" dataKey="simulated" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 4" fill="none" dot={false} name="Simulated scenario" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-3 text-[11px] text-slate-500 border-l-2 border-slate-200 dark:border-midnight-border pl-3 leading-relaxed">
            Solid series: real Open-Meteo measurements and forecast for this coordinate. The 64mm/day
            reference is the WMO heavy-rainfall threshold. Simulated overlays are always dashed, amber,
            and labeled.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
