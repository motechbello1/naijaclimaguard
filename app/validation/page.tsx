"use client";

import AppShell from "@/components/shared/AppShell";
import { Target, CheckCircle, TrendingUp, Award } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { LOKOJA_TIMELINE } from "@/lib/data";

const accuracy = [
  { month: "Jan", predicted: 12, actual: 10 },
  { month: "Feb", predicted: 8, actual: 7 },
  { month: "Mar", predicted: 15, actual: 18 },
  { month: "Apr", predicted: 35, actual: 32 },
  { month: "May", predicted: 52, actual: 55 },
  { month: "Jun", predicted: 68, actual: 64 },
  { month: "Jul", predicted: 75, actual: 78 },
  { month: "Aug", predicted: 82, actual: 85 },
  { month: "Sep", predicted: 88, actual: 91 },
  { month: "Oct", predicted: 92, actual: 95 },
  { month: "Nov", predicted: 45, actual: 42 },
  { month: "Dec", predicted: 18, actual: 15 },
];

export default function ValidationPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Historical Validation</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Every prediction verified against reality</p>
        </div>

        {/* Metrics */}
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { icon: Target, value: "0.9928", label: "ROC-AUC" },
            { icon: CheckCircle, value: "96.2%", label: "Accuracy" },
            { icon: TrendingUp, value: "48hrs", label: "Lead Time" },
            { icon: Award, value: "TRL-5", label: "Readiness" },
          ].map((m) => (
            <div key={m.label} className="glass-card rounded-xl p-5">
              <m.icon className="h-5 w-5 text-radar mb-3" />
              <p className="text-2xl font-display font-bold">{m.value}</p>
              <p className="text-xs text-slate-400 mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-base font-bold mb-6">Predicted vs Actual — 2022</h2>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={accuracy}>
                <defs>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="predicted" name="Predicted" stroke="#10B981" strokeWidth={2} fill="url(#pg)" dot={{ r: 3, fill: "#10B981" }} />
                <Area type="monotone" dataKey="actual" name="Actual" stroke="#F59E0B" strokeWidth={2} fill="url(#ag)" dot={{ r: 3, fill: "#F59E0B" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lokoja timeline */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-base font-bold mb-4">Lokoja Megaflood Timeline</h2>
          <div className="space-y-3">
            {LOKOJA_TIMELINE.map((item, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-lg bg-slate-50 dark:bg-midnight/50 border border-slate-100 dark:border-midnight-border">
                <div className="shrink-0 w-24 text-right">
                  <p className="text-sm font-mono font-bold">{item.date}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.event}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}