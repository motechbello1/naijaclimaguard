"use client";

import AppShell from "@/components/shared/AppShell";
import { Activity, TrendingUp, CloudRain, Bell, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getRiskLevel } from "@/lib/data";

const highRiskStates = [
  { name: "Bayelsa", risk: 71 },
  { name: "Kogi", risk: 67 },
  { name: "Rivers", risk: 63 },
  { name: "Niger", risk: 61 },
  { name: "Delta", risk: 58 },
  { name: "Benue", risk: 55 },
  { name: "Anambra", risk: 52 },
  { name: "Akwa Ibom", risk: 49 },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Risk Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">National flood risk overview</p>
          </div>
          <Link href="/predict" className="flex items-center gap-2 text-sm text-radar font-medium hover:underline">
            Open Prediction Map <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Activity, label: "National Average", value: "34/100", color: "text-radar" },
            { icon: TrendingUp, label: "Elevated States", value: "8", color: "text-crimson" },
            { icon: CloudRain, label: "Highest Risk", value: "Bayelsa", color: "text-amber" },
            { icon: Bell, label: "Active Alerts", value: "4", color: "text-cyan dark:text-cyan text-sky-600" },
          ].map((card) => (
            <div key={card.label} className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/50">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{card.label}</p>
                  <p className={`text-xl font-display font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* High risk states */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider mb-4">Elevated Risk States</h2>
          <div className="space-y-3">
            {highRiskStates.map((s) => {
              const risk = getRiskLevel(s.risk);
              return (
                <div key={s.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.risk}%`, background: risk.color }} />
                    </div>
                    <span className="text-sm font-bold font-mono w-8 text-right" style={{ color: risk.color }}>{s.risk}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { href: "/predict", title: "Layer 1: Predict", desc: "72-hour hydrological forecast", icon: MapPin },
            { href: "/action", title: "Layer 2: Action", desc: "Early warning & grid protection", icon: Bell },
            { href: "/prove", title: "Layer 3: Prove", desc: "Impact ledger & audit reports", icon: Activity },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="glass-card rounded-xl p-6 block hover:border-radar/30 transition-all group">
              <link.icon className="h-5 w-5 text-radar mb-3" />
              <h3 className="font-display text-base font-bold group-hover:text-radar transition-colors">{link.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}