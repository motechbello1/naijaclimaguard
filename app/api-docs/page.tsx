"use client";

import AppShell from "@/components/shared/AppShell";
import { useState } from "react";
import { Key, Globe, Lock, Zap, Copy, Check } from "lucide-react";

const endpoints = [
  { method: "GET", path: "/v1/risk", desc: "Get flood risk score for a location", params: [{ name: "latitude", type: "float", req: true }, { name: "longitude", type: "float", req: true }, { name: "forecast_hours", type: "int", req: false }] },
  { method: "GET", path: "/v1/risk/batch", desc: "Batch risk scores for multiple locations (max 50)", params: [{ name: "locations", type: "array", req: true }, { name: "forecast_hours", type: "int", req: false }] },
  { method: "GET", path: "/v1/risk/state/{code}", desc: "Aggregated state-level risk overview", params: [{ name: "state_code", type: "string", req: true }, { name: "include_lgas", type: "boolean", req: false }] },
  { method: "GET", path: "/v1/history", desc: "Historical risk data for a location", params: [{ name: "latitude", type: "float", req: true }, { name: "longitude", type: "float", req: true }, { name: "start_date", type: "ISO8601", req: true }, { name: "end_date", type: "ISO8601", req: true }] },
  { method: "POST", path: "/v1/alerts", desc: "Create alert configuration", params: [{ name: "latitude", type: "float", req: true }, { name: "longitude", type: "float", req: true }, { name: "threshold", type: "int", req: true }, { name: "channels", type: "array", req: true }] },
];

export default function ApiDocsPage() {
  const [copied, setCopied] = useState(false);

  return (
    <AppShell>
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="font-display text-2xl font-bold">API Documentation</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Integrate flood risk intelligence into your systems</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-radar" /> Base: <code className="font-mono text-radar">https://api.naijaclimaguard.com</code></span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-radar" /> Bearer token auth</span>
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-radar" /> 100 req/min (Pro)</span>
          </div>
        </div>

        {/* Auth */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Key className="h-5 w-5 text-radar" />
            <h2 className="font-bold">Authentication</h2>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-midnight border border-slate-200 dark:border-midnight-border p-3">
            <code className="flex-1 text-sm font-mono text-slate-600 dark:text-slate-400">Authorization: Bearer ncg_sk_live_xxxxxxxxxxxx</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText("Authorization: Bearer ncg_sk_live_xxxxxxxxxxxx");
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-slate-400 hover:text-radar transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Endpoints */}
        {endpoints.map((ep, i) => (
          <div key={i} className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-slate-100 dark:border-midnight-border">
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${
                ep.method === "GET"
                  ? "bg-radar/10 text-radar border-radar/20"
                  : "bg-cyan/10 text-cyan border-cyan/20"
              }`}>
                {ep.method}
              </span>
              <code className="text-sm font-mono font-medium">{ep.path}</code>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{ep.desc}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-midnight-border">
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 pb-2">Param</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 pb-2">Type</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 pb-2">Required</th>
                  </tr>
                </thead>
                <tbody>
                  {ep.params.map((p) => (
                    <tr key={p.name} className="border-b border-slate-50 dark:border-midnight-border/30 last:border-0">
                      <td className="py-2"><code className="text-xs font-mono text-radar">{p.name}</code></td>
                      <td className="py-2 text-xs text-slate-400 font-mono">{p.type}</td>
                      <td className="py-2">
                        {p.req
                          ? <span className="text-[10px] font-bold text-amber">Required</span>
                          : <span className="text-[10px] text-slate-400">Optional</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* SDKs */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-bold mb-4">SDKs & Libraries</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-50 dark:bg-midnight border border-slate-200 dark:border-midnight-border p-4">
              <p className="text-sm font-semibold">Python</p>
              <code className="text-xs font-mono text-radar mt-2 block">pip install naijaclimaguard</code>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-midnight border border-slate-200 dark:border-midnight-border p-4">
              <p className="text-sm font-semibold">JavaScript</p>
              <code className="text-xs font-mono text-radar mt-2 block">npm i naijaclimaguard</code>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-midnight border border-slate-200 dark:border-midnight-border p-4">
              <p className="text-sm font-semibold">cURL</p>
              <code className="text-xs font-mono text-radar mt-2 block">REST API — no SDK needed</code>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}