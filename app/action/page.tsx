"use client";

import AppShell from "@/components/shared/AppShell";
import { useState, useEffect, useRef } from "react";
import { Zap, ShieldCheck, Terminal, AlertOctagon } from "lucide-react";

const SMS_LOGS = [
  { time: "14:32:01", msg: "[DISPATCH] SMS batch initiated → Lokoja LGA flood zone", type: "info" },
  { time: "14:32:02", msg: "[GATEWAY] Connecting to NCC emergency broadcast network...", type: "info" },
  { time: "14:32:03", msg: '[SENT] +234 803 *** 2841 → "FLOOD WARNING: Evacuate low-lying areas"', type: "success" },
  { time: "14:32:04", msg: '[SENT] +234 806 *** 1192 → "FLOOD WARNING: Move to higher ground"', type: "success" },
  { time: "14:32:05", msg: '[SENT] +234 701 *** 5563 → "FLOOD WARNING: 48hr flood probability 94%"', type: "success" },
  { time: "14:32:06", msg: "[QUEUE] 2,847 remaining recipients in batch...", type: "info" },
  { time: "14:32:07", msg: '[SENT] +234 809 *** 7741 → "FLOOD WARNING: Evacuate immediately"', type: "success" },
  { time: "14:32:08", msg: "[GRID] Checking micro-grid asset status in flood zone...", type: "warning" },
  { time: "14:32:09", msg: "[GRID] 240 solar installations identified in risk perimeter", type: "warning" },
  { time: "14:32:10", msg: "[GRID] Awaiting TRIGGER GRID PROTECTION command...", type: "warning" },
  { time: "14:32:11", msg: '[SENT] +234 812 *** 3356 → "FLOOD WARNING: Move valuables upstairs"', type: "success" },
  { time: "14:32:12", msg: "[DISPATCH] Batch progress: 1,204 / 4,051 delivered", type: "info" },
];

const GRID_LOGS = [
  { time: "14:33:01", msg: "[GRID] ⚡ GRID PROTECTION TRIGGERED", type: "danger" },
  { time: "14:33:02", msg: "[GRID] Sending disconnect signal to Lokoja micro-grid cluster...", type: "danger" },
  { time: "14:33:03", msg: "[GRID] Node KG-SOL-001 → ISLAND MODE ✓", type: "success" },
  { time: "14:33:04", msg: "[GRID] Node KG-SOL-002 → ISLAND MODE ✓", type: "success" },
  { time: "14:33:05", msg: "[GRID] Node KG-SOL-003 → ISLAND MODE ✓", type: "success" },
  { time: "14:33:06", msg: "[GRID] Cluster disconnect complete. 240 assets secured.", type: "success" },
  { time: "14:33:07", msg: "[GRID] ✅ ALL SOLAR ASSETS IN SAFE MODE", type: "success" },
];

export default function ActionPage() {
  const [logs, setLogs] = useState<typeof SMS_LOGS>([]);
  const [logIndex, setLogIndex] = useState(0);
  const [gridTriggered, setGridTriggered] = useState(false);
  const [gridComplete, setGridComplete] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gridTriggered || logIndex >= SMS_LOGS.length) return;
    const t = setTimeout(() => {
      setLogs((prev) => [...prev, SMS_LOGS[logIndex]]);
      setLogIndex((i) => i + 1);
    }, 800);
    return () => clearTimeout(t);
  }, [logIndex, gridTriggered]);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  const triggerGrid = () => {
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 600);
    setGridTriggered(true);
    GRID_LOGS.forEach((entry, i) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, entry]);
        if (i === GRID_LOGS.length - 1) setGridComplete(true);
      }, (i + 1) * 700);
    });
  };

  const typeColors: Record<string, string> = {
    info: "text-cyan",
    success: "text-radar",
    warning: "text-amber",
    danger: "text-crimson",
  };

  return (
    <AppShell>
      <div className={`space-y-6 ${screenFlash ? "animate-flash" : ""}`}>
        <div>
          <h1 className="font-display text-2xl font-bold">Layer 2: Action</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Early Warning Dispatch & Grid Protection</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Terminal */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="h-4 w-4 text-radar" />
              <h2 className="text-sm font-bold">Telemetry Terminal</h2>
            </div>
            <div
              ref={termRef}
              className="rounded-xl p-5 h-[480px] overflow-y-auto font-mono text-xs leading-relaxed"
              style={{ background: "#0a0a0a", border: "1px solid #262626", color: "#10B981" }}
            >
              <div className="text-slate-600 mb-3">─── NaijaClimaGuard Emergency Dispatch v2.1 ───</div>
              {logs.map((entry, i) => (
                <div key={i} className={typeColors[entry.type] || "text-radar"}>
                  <span style={{ color: "#4a5568" }}>{entry.time}</span> {entry.msg}
                </div>
              ))}
              <span className="inline-block w-2 h-4 bg-radar animate-pulse" />
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-sm font-bold mb-4">SMS Dispatch Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/30 p-4">
                  <p className="text-xs text-slate-400">Sent</p>
                  <p className="text-2xl font-display font-bold text-radar">
                    {Math.min(logs.filter((l) => l.type === "success").length * 312, 4051).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/30 p-4">
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-2xl font-display font-bold">4,051</p>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-radar transition-all duration-500"
                  style={{ width: `${Math.min((logs.filter((l) => l.type === "success").length / 12) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <h3 className="text-sm font-bold mb-2">Micro-Grid Asset Protection</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                240 solar installations in flood risk perimeter. Trigger Island Mode to prevent electrical damage.
              </p>
              {!gridComplete ? (
                <button
                  onClick={triggerGrid}
                  disabled={gridTriggered}
                  className={`w-full rounded-xl py-4 text-base font-bold flex items-center justify-center gap-3 transition-all ${
                    gridTriggered
                      ? "bg-amber/20 text-amber border border-amber/30 cursor-wait"
                      : "bg-gradient-to-r from-crimson to-amber text-white shadow-xl shadow-crimson/20 hover:shadow-crimson/30"
                  }`}
                >
                  <Zap className="h-5 w-5" />
                  {gridTriggered ? "Securing Assets..." : "Trigger Grid Protection"}
                </button>
              ) : (
                <div className="w-full rounded-xl py-4 bg-radar/10 border border-radar/30 flex items-center justify-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-radar" />
                  <span className="text-base font-bold text-radar">240 Solar Assets Secured</span>
                </div>
              )}
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertOctagon className="h-5 w-5 text-crimson" />
                <h3 className="text-sm font-bold">Threat Level</h3>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`flex-1 h-3 rounded-full ${i <= 2 ? "bg-gradient-to-r from-amber to-crimson" : "bg-slate-200 dark:bg-slate-700"}`} />
                ))}
              </div>
              <p className="text-xs font-bold text-crimson mt-2 uppercase tracking-wider">HIGH — Active flood warning</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}