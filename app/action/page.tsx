"use client";

/**
 * Layer 2: Action — real alert-rule console.
 *  · Lists saved locations and alert rules from Prisma.
 *  · Create / pause / delete alert rules.
 *  · "Run live check" evaluates rules against current Open-Meteo inputs.
 *  · Email can send through Resend when configured.
 *  · SMS is intentionally disabled until the user model stores a real phone number.
 */

import AppShell from "@/components/shared/AppShell";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Zap, Plus, Trash2, Play, Loader2, MailCheck, MessageSquareOff,
  BellRing, BellOff, CheckCircle2, AlertTriangle, MapPin,
} from "lucide-react";

interface Loc { id: string; name: string; state: string; latitude: number; longitude: number; }
interface AlertRule {
  id: string; threshold: number; active: boolean; channels: string[];
  location: { id: string; name: string; state: string };
}
interface CheckResult {
  location: string; score?: number; threshold?: number;
  status: string; emailStatus?: string; smsStatus?: string;
}

export default function ActionPage() {
  const [locations, setLocations] = useState<Loc[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLoc, setNewLoc] = useState("");
  const [newThreshold, setNewThreshold] = useState(60);
  const [checking, setChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<CheckResult[] | null>(null);
  const [channels, setChannels] = useState<{email:string;sms:string} | null>(null);
  const [err, setErr] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [locRes, alertRes] = await Promise.all([fetch("/api/locations"), fetch("/api/alerts")]);
      const locData = await locRes.json();
      const alertData = await alertRes.json();
      setLocations(locData.locations ?? locData ?? []);
      setAlerts(alertData.alerts ?? []);
    } catch { setErr("Could not load your alerts — check your connection."); }
    setLoading(false);
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  const createAlert = async () => {
    if (!newLoc) return;
    setCreating(true); setErr("");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: newLoc, threshold: newThreshold, channels: ["EMAIL"] }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Create failed");
      setNewLoc(""); await loadAll();
    } catch (e: any) { setErr(e.message); }
    setCreating(false);
  };

  const toggleAlert = async (a: AlertRule) => {
    await fetch("/api/alerts", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, active: !a.active }),
    });
    loadAll();
  };

  const deleteAlert = async (id: string) => {
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    loadAll();
  };

  const runCheck = async () => {
    setChecking(true); setCheckResults(null); setErr("");
    try {
      const res = await fetch("/api/alerts/check");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setCheckResults(data.results);
      setChannels(data.channels);
    } catch (e: any) { setErr(e.message); }
    setChecking(false);
  };

  const statusRow = (r: CheckResult) => {
    if (r.status === "feed_unreachable")
      return { icon: AlertTriangle, cls: "text-slate-400", text: "Live feed unreachable — no score" };
    if (r.status === "triggered")
      return { icon: BellRing, cls: "text-crimson", text: `TRIGGERED — ${r.score}/100 ≥ threshold ${r.threshold}` };
    if (r.status === "already_notified")
      return { icon: CheckCircle2, cls: "text-amber", text: `${r.score}/100 above threshold — already notified in last 12h` };
    return { icon: CheckCircle2, cls: "text-radar", text: `${r.score}/100 — below threshold ${r.threshold}` };
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-radar" /> Layer 2: Action
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Alert rules evaluated against the current disclosed live risk index
            </p>
          </div>
          <button onClick={runCheck} disabled={checking || alerts.length === 0}
            className="flex items-center gap-2 rounded-lg bg-radar px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {checking ? "Checking live data…" : "Run live check now"}
          </button>
        </div>

        {checkResults && (
          <div className="glass-card rounded-2xl p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Live evaluation results</h2>
              <div className="flex flex-col gap-1 items-end">
                <span className={`flex items-center gap-1.5 text-xs font-mono ${channels?.email === "live" ? "text-radar" : "text-cyan"}`}>
                  <MailCheck className="h-3.5 w-3.5" /> Email: {channels?.email === "live" ? "✓ live" : "Resend credential required"}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                  <MessageSquareOff className="h-3.5 w-3.5" /> SMS: phone capture not implemented
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {checkResults.map((r, i) => {
                const s = statusRow(r);
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-midnight-border px-4 py-3">
                    <span className="text-sm font-semibold">{r.location}</span>
                    <span className={`flex items-center gap-2 text-xs font-mono ${s.cls}`}>
                      <s.icon className="h-4 w-4" /> {s.text}
                    </span>
                  </div>
                );
              })}
              {checkResults.length === 0 && (
                <p className="text-sm text-slate-500">No active alert rules to evaluate.</p>
              )}
            </div>
          </div>
        )}

        {err && (
          <div className="rounded-lg border border-crimson/20 bg-crimson/5 p-3 text-sm text-crimson flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {err}
          </div>
        )}

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-4">Create an alert rule</h2>
          {locations.length === 0 && !loading ? (
            <p className="text-sm text-slate-500">
              You have no saved locations yet. <Link href="/dashboard" className="text-radar font-semibold">Add one on your Overview</Link> first — alerts watch your saved locations.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] items-end">
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Location</label>
                <select value={newLoc} onChange={(e) => setNewLoc(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light px-3 py-2.5 text-sm focus:border-radar focus:outline-none">
                  <option value="">Select a saved location…</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.state}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Alert at risk ≥ <strong className="text-radar">{newThreshold}</strong></label>
                <input type="range" min={30} max={90} step={5} value={newThreshold}
                  onChange={(e) => setNewThreshold(+e.target.value)} className="w-36 accent-radar" />
              </div>
              <button onClick={createAlert} disabled={!newLoc || creating}
                className="flex items-center gap-2 rounded-lg border border-radar/40 text-radar px-4 py-2.5 text-sm font-semibold transition-all hover:bg-radar/5 active:scale-[0.98] disabled:opacity-40">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
              </button>
            </div>
          )}
          <p className="mt-4 text-xs text-slate-500 flex items-center gap-2">
            <MessageSquareOff className="h-3.5 w-3.5" />
            Delivery: email through Resend when configured. SMS is not active until account phone-number support is implemented.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-4">Your alert rules</h2>
          {loading ? (
            <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50" />)}</div>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-slate-500">No rules yet — create your first above. When the current risk index crosses your threshold, the engine records the event and attempts configured email delivery.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-midnight-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold">{a.location.name} <span className="text-slate-400 font-normal">· {a.location.state}</span></p>
                      <p className="text-xs text-slate-500 font-mono">threshold ≥ {a.threshold} · {a.channels.join(", ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleAlert(a)} title={a.active ? "Pause" : "Resume"}
                      className={`rounded-lg border p-2 transition-all ${a.active ? "border-radar/30 text-radar" : "border-slate-200 dark:border-midnight-border text-slate-400"}`}>
                      {a.active ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => deleteAlert(a.id)} title="Delete"
                      className="rounded-lg border border-slate-200 dark:border-midnight-border p-2 text-slate-400 transition-all hover:border-crimson/40 hover:text-crimson">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
