"use client";

/**
 * Intelligence Center — command surface for selected Nigerian locations.
 *
 * STATUS MODEL:
 *   LIVE        — real data/functionality available now.
 *   CONNECTED   — integration path exists but depends on a credential/service.
 *   DEPLOYABLE  — partner-dependent capability, not live production functionality.
 *
 * Current risk values on this page come from /api/v1/risk, the same derived-v2
 * engine used by saved-location dashboards and alert evaluation. They are not
 * Validation v2 XGBoost scores.
 */

import AppShell from "@/components/shared/AppShell";
import { useState, useEffect, useMemo, useCallback } from "react";
import { RefreshCw, Radio, PlugZap, Boxes } from "lucide-react";

const STATIONS = [
  { id: "LKJ", name: "Lokoja", state: "Kogi", note: "Niger–Benue confluence", lat: 7.8023, lon: 6.7333 },
  { id: "MKD", name: "Makurdi", state: "Benue", note: "River Benue", lat: 7.7322, lon: 8.5391 },
  { id: "ONI", name: "Onitsha", state: "Anambra", note: "Lower Niger", lat: 6.1407, lon: 6.7869 },
  { id: "YEN", name: "Yenagoa", state: "Bayelsa", note: "Niger Delta", lat: 4.9247, lon: 6.2642 },
  { id: "HDJ", name: "Hadejia", state: "Jigawa", note: "Hadejia–Nguru wetlands", lat: 12.4494, lon: 10.0447 },
  { id: "IBI", name: "Ibi", state: "Taraba", note: "Upper Benue", lat: 8.1817, lon: 9.7442 },
  { id: "LAG", name: "Lagos", state: "Lagos", note: "Coastal drainage flooding", lat: 6.4541, lon: 3.3947 },
  { id: "ABJ", name: "Abuja", state: "FCT", note: "Flash flood zones", lat: 9.0579, lon: 7.4951 },
  { id: "PHC", name: "Port Harcourt", state: "Rivers", note: "Coastal & riverine", lat: 4.8156, lon: 7.0498 },
  { id: "MAI", name: "Maiduguri", state: "Borno", note: "Lake Chad basin", lat: 11.8311, lon: 13.1510 },
  { id: "SOK", name: "Sokoto", state: "Sokoto", note: "Sokoto–Rima basin", lat: 13.0622, lon: 5.2339 },
  { id: "KEB", name: "Birnin Kebbi", state: "Kebbi", note: "Niger River floodplain", lat: 12.4539, lon: 4.1975 },
  { id: "ADM", name: "Yola", state: "Adamawa", note: "Upper Benue floodplain", lat: 9.2035, lon: 12.4954 },
  { id: "KAD", name: "Kaduna", state: "Kaduna", note: "Kaduna River", lat: 10.5105, lon: 7.4165 },
  { id: "KAN", name: "Kano", state: "Kano", note: "Urban flash flooding", lat: 12.0022, lon: 8.5920 },
  { id: "BEN", name: "Benin City", state: "Edo", note: "Drainage flooding", lat: 6.3350, lon: 5.6037 },
] as const;

type Station = (typeof STATIONS)[number];

interface RiskModel {
  score: number;
  factors: { rainfall: number; burst: number; saturation: number };
  raw: { precip7: number; precip3: number; balance7: number };
}
interface StationResult {
  station: Station;
  model: RiskModel;
}

function levelFor(s: number) {
  if (s >= 90) return { label: "Extreme", color: "#8E5CD9" };
  if (s >= 75) return { label: "Severe", color: "#EF4444" };
  if (s >= 60) return { label: "Warning", color: "#F97316" };
  if (s >= 40) return { label: "Watch", color: "#F59E0B" };
  return { label: "Normal", color: "#10B981" };
}

async function fetchStation(st: Station): Promise<StationResult> {
  const res = await fetch(`/api/v1/risk?latitude=${st.lat}&longitude=${st.lon}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`risk API ${res.status}`);
  const data = await res.json();

  return {
    station: st,
    model: {
      score: data.risk.score,
      factors: {
        rainfall: data.factors.rainfall_7d,
        burst: data.factors.burst_intensity,
        saturation: data.factors.soil_saturation,
      },
      raw: {
        precip7: data.raw_weather.precipitation_7d_mm,
        precip3: data.raw_weather.precipitation_3d_mm,
        balance7: data.raw_weather.moisture_balance_7d_mm,
      },
    },
  };
}

const MODULES = [
  { name: "Current Risk Index", state: "LIVE", desc: "Canonical derived-v2 score from the same public risk API used by dashboard and alert workflows." },
  { name: "Live Monitoring", state: "LIVE", desc: "Selected Nigerian locations refreshed through one shared production risk engine." },
  { name: "Citizen Reporting", state: "LIVE", desc: "Geotagged report workflow with operator review. Additional media verification depends on storage/integration configuration." },
  { name: "Emergency Alerts", state: "CONNECTED", desc: "Threshold rules use the same derived-v2 engine; email can send through Resend when configured. SMS remains pending phone-number support." },
  { name: "Insurance Automation", state: "DEPLOYABLE", desc: "Partner-integration concept for insurer workflows; not a live automated claims system." },
  { name: "Sensor Network", state: "DEPLOYABLE", desc: "Ground-observation integration path for future gauge/device partnerships." },
  { name: "Extended Outlook", state: "LIVE", desc: "Basin rainfall watch is live. Production GloFAS ensemble discharge integration remains pending." },
] as const;

function StatePill({ state }: { state: string }) {
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    LIVE: { cls: "text-radar border-radar/30", icon: Radio, label: "Live" },
    CONNECTED: { cls: "text-cyan border-cyan/30", icon: PlugZap, label: "Integration-ready" },
    DEPLOYABLE: { cls: "text-slate-400 border-slate-300 dark:border-slate-600", icon: Boxes, label: "Partner-dependent" },
  };
  const m = map[state];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${m.cls}`}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

function Gauge({ score }: { score: number }) {
  const lvl = levelFor(score);
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <svg width="132" height="132" className="-rotate-90">
        <circle cx="66" cy="66" r={R} fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="9" />
        <circle cx="66" cy="66" r={R} fill="none" stroke={lvl.color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (score / 100) * C}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold">{score}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: lvl.color }}>{lvl.label}</span>
      </div>
    </div>
  );
}

function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-700 dark:text-slate-300">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${value * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  const [results, setResults] = useState<StationResult[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "partial" | "error">("loading");
  const [activeId, setActiveId] = useState("LKJ");
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    const settled = await Promise.allSettled(STATIONS.map(fetchStation));
    const data = settled
      .filter((item): item is PromiseFulfilledResult<StationResult> => item.status === "fulfilled")
      .map((item) => item.value);

    if (data.length === 0) {
      setStatus("error");
      return;
    }

    data.sort((a, b) => b.model.score - a.model.score);
    setResults(data);
    setLastSync(new Date());
    setStatus(data.length === STATIONS.length ? "ready" : "partial");
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = useMemo(
    () => results.find((r) => r.station.id === activeId) ?? results[0],
    [results, activeId]
  );
  const peak = results.length ? Math.max(...results.map((r) => r.model.score)) : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Intelligence Center</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Selected-location flood-risk monitoring · canonical derived-v2 API · live Open-Meteo inputs
            </p>
          </div>
          <button onClick={load}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium transition-all hover:border-radar/40 dark:border-midnight-border">
            <RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
            {status === "loading" ? "Syncing…" : lastSync ? `Synced ${lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Refresh"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Highest selected risk", value: status === "ready" || status === "partial" ? `${peak}` : "—", sub: levelFor(peak).label, color: levelFor(peak).color },
            { label: "Locations live", value: `${results.length}/${STATIONS.length}`, sub: status === "partial" ? "partial feed" : "shared API" },
            { label: "Live data source", value: "Open-Meteo", sub: "via risk API" },
            { label: "Current model", value: "Derived-v2", sub: "single engine" },
          ].map((m) => (
            <div key={m.label} className="glass-card rounded-xl p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{m.label}</p>
              <p className="mt-1 font-mono text-xl font-bold" style={m.color ? { color: m.color } : {}}>{m.value}</p>
              <p className="text-xs text-slate-500">{m.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="glass-card rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Monitored locations</h2>
              <StatePill state="LIVE" />
            </div>
            <div className="space-y-1">
              {status === "loading" && results.length === 0
                ? STATIONS.map((s) => (
                    <div key={s.id} className="h-11 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50" />
                  ))
                : results.map((r) => {
                    const lvl = levelFor(r.model.score);
                    const isActive = r.station.id === activeId;
                    return (
                      <button key={r.station.id} onClick={() => setActiveId(r.station.id)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all ${
                          isActive ? "border-radar/30 bg-radar/5" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}>
                        <span className="flex items-center gap-2.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: lvl.color }} />
                          <span>
                            <span className="text-sm font-semibold">{r.station.name}</span>
                            <span className="ml-2 text-xs text-slate-500">{r.station.state}</span>
                          </span>
                        </span>
                        <span className="font-mono text-sm font-bold" style={{ color: lvl.color }}>
                          {r.model.score}
                        </span>
                      </button>
                    );
                  })}
            </div>
            {status === "partial" && (
              <div className="mt-4 rounded-lg border border-amber/20 bg-amber/5 p-3 text-xs text-slate-500">
                {results.length} of {STATIONS.length} locations responded. Available locations remain live; retry to recover the rest.
              </div>
            )}
            {status === "error" && (
              <div className="mt-4 rounded-lg border border-crimson/20 bg-crimson/5 p-3 text-xs text-slate-500">
                Live sync failed. <button onClick={load} className="font-semibold text-crimson">Retry</button>
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {active ? `${active.station.name} · ${active.station.note}` : "Location detail"}
              </h2>
              <StatePill state="LIVE" />
            </div>
            {active?.model ? (
              <>
                <div className="flex items-center gap-5">
                  <Gauge score={active.model.score} />
                  <div className="flex-1">
                    <FactorBar label="7-day rainfall load" value={active.model.factors.rainfall} color="#06B6D4" />
                    <FactorBar label="Rainfall burst" value={active.model.factors.burst} color="#F59E0B" />
                    <FactorBar label="Antecedent wetness proxy" value={active.model.factors.saturation} color="#8E5CD9" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-200 pt-4 dark:border-midnight-border">
                  {[
                    { l: "7-day precip", v: `${active.model.raw.precip7} mm` },
                    { l: "3-day precip", v: `${active.model.raw.precip3} mm` },
                    { l: "Rain − ET0 bal.", v: `${active.model.raw.balance7} mm` },
                  ].map((x) => (
                    <div key={x.l}>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{x.l}</p>
                      <p className="font-mono text-sm font-bold">{x.v}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 border-l-2 border-slate-200 pl-3 text-[11px] leading-relaxed text-slate-500 dark:border-midnight-border">
                  Score = 0.40·7-day rainfall + 0.35·effective rainfall burst + 0.25·wetness proxy. This is the
                  same derived-v2 result served by the public risk API and alert engine. It is not a gauge measurement,
                  hydraulic model, or independently validated Validation v2 probability.
                </p>
              </>
            ) : (
              <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/50" />
            )}
          </div>

          <div className="glass-card rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Platform modules</h2>
              <span className="font-mono text-[10px] text-slate-500">
                {MODULES.filter((m) => m.state === "LIVE").length} live · {MODULES.filter((m) => m.state !== "LIVE").length} integration/partner-dependent
              </span>
            </div>
            <div className="space-y-2">
              {MODULES.map((m) => (
                <div key={m.name} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3 dark:border-midnight-border">
                  <div>
                    <p className="text-sm font-semibold">{m.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{m.desc}</p>
                  </div>
                  <StatePill state={m.state} />
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 dark:bg-slate-800/40">
              <strong className="text-slate-600 dark:text-slate-400">Status is explicit.</strong> Live means the
              function is available now. Integration-ready means a real external service/credential is still needed.
              Partner-dependent means the capability is not presented as production functionality until a partner or
              physical deployment exists.
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}