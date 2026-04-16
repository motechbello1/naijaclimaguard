"use client";

import AppShell from "@/components/shared/AppShell";
import { useState, useEffect } from "react";
import { AlertTriangle, Droplets, Waves, CloudRain } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { getRiskLevel } from "@/lib/data";

function generateForecast(surge?: string) {
  const base = 67;
  const points = [];
  const mult = surge === "monsoon" ? 1.6 : surge === "dam" ? 1.4 : 1.0;
  for (let h = 0; h <= 72; h += 3) {
    const seasonal = Math.sin((h / 72) * Math.PI) * 15;
    const noise = (Math.random() - 0.5) * 8;
    const extra = surge && h > 24 ? (h - 24) * mult * 0.4 : 0;
    const score = Math.max(0, Math.min(100, base + seasonal + noise + extra));
    points.push({
      hour: h,
      waterLevel: Math.round((score / 100) * 12 * 10) / 10,
      floodStage: 8.5,
    });
  }
  return points;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-card rounded-lg p-3 text-sm">
      <p className="text-xs text-slate-400 mb-1">+{d.hour}h</p>
      <p>Water Level: <strong>{d.waterLevel}m</strong></p>
      <p>Flood Stage: <strong className="text-crimson">{d.floodStage}m</strong></p>
    </div>
  );
}

export default function PredictPage() {
  const [surge, setSurge] = useState("");
  const [forecast, setForecast] = useState(generateForecast());
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    setForecast(generateForecast(surge || undefined));
    if (surge) {
      setShowAlert(true);
      const t = setTimeout(() => setShowAlert(false), 5000);
      return () => clearTimeout(t);
    } else {
      setShowAlert(false);
    }
  }, [surge]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Layer 1: Predict</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Hydrological Map & 72-Hour Forecast</p>
          </div>
          <select
            value={surge}
            onChange={(e) => setSurge(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light px-4 py-2 text-sm focus:border-radar focus:outline-none"
          >
            <option value="">Normal Conditions</option>
            <option value="monsoon">Monsoon Surge Event</option>
            <option value="dam">Dam Release Scenario</option>
          </select>
        </div>

        {/* Alert */}
        {showAlert && (
          <div className="rounded-xl border-2 border-crimson/50 bg-crimson/5 dark:bg-crimson/10 p-5 flex items-center gap-4 animate-slide-up">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crimson/10">
              <AlertTriangle className="h-6 w-6 text-crimson" />
            </div>
            <div>
              <h3 className="text-base font-bold text-crimson">Evacuation Alert — Kogi State</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {surge === "monsoon" ? "Monsoon" : "Dam release"} surge detected. Water levels projected to exceed flood stage within 36 hours.
              </p>
            </div>
          </div>
        )}

        {/* Contributing factors */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: CloudRain, label: "Rainfall Intensity", value: "72%", color: "text-cyan dark:text-cyan text-sky-600" },
            { icon: Waves, label: "River Discharge", value: "85%", color: "text-radar" },
            { icon: Droplets, label: "Soil Saturation", value: "61%", color: "text-amber" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 mr-3 overflow-hidden">
                  <div className="h-full rounded-full bg-radar" style={{ width: stat.value }} />
                </div>
                <span className="text-sm font-bold font-mono">{stat.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-base font-bold">72-Hour Water Level Forecast — Kogi State</h2>
            <span className="text-xs text-slate-400 font-mono">Updated: Live</span>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast}>
                <defs>
                  <linearGradient id="floodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} vertical={false} />
                <XAxis dataKey="hour" tickFormatter={(v: number) => `+${v}h`} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
                <YAxis domain={[0, 14]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} unit="m" />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={8.5} stroke="#EF4444" strokeDasharray="6 4" label={{ value: "Flood Stage", fill: "#EF4444", fontSize: 11, position: "insideTopLeft" }} />
                <Area type="monotone" dataKey="waterLevel" stroke="#06B6D4" strokeWidth={2} fill="url(#floodGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppShell>
  );
}