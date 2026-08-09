"use client";

import AppShell from "@/components/shared/AppShell";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Zap, Plus, Trash2, Play, Loader2, MailCheck, MessageSquareOff,
  BellRing, BellOff, CheckCircle2, AlertTriangle, MapPin, ShieldCheck,
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

const SIMPLE_LEVELS = [
  { value: 45, label: "Tell me early", note: "More warnings, so I have time to prepare." },
  { value: 60, label: "Tell me when risk is high", note: "A balanced warning level." },
  { value: 75, label: "Only urgent warnings", note: "Fewer warnings, only when risk is very high." },
];

function simpleThresholdLabel(value: number) {
  if (value <= 50) return "Early warning";
  if (value <= 70) return "High-risk warning";
  return "Urgent warning";
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
    } catch { setErr("We could not load your alerts. Check your connection and try again."); }
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
      if (!res.ok) throw new Error((await res.json()).error || "Could not create alert");
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

  const simpleStatus = (r: CheckResult) => {
    if (r.status === "feed_unreachable") return { cls: "text-slate-500", text: "We could not check this place right now." };
    if (r.status === "triggered") return { cls: "text-crimson", text: "Risk is high enough for your alert. Take a look now." };
    if (r.status === "already_notified") return { cls: "text-amber", text: "Risk is still high. We already warned you recently." };
    return { cls: "text-radar", text: "No alert is needed right now." };
  };

  const technicalStatus = (r: CheckResult) => {
    if (r.status === "feed_unreachable") return `feed unreachable`;
    if (r.status === "triggered") return `${r.score}/100 ≥ threshold ${r.threshold}`;
    if (r.status === "already_notified") return `${r.score}/100 above threshold; within 12h cooldown`;
    return `${r.score}/100 below threshold ${r.threshold}`;
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-radar" />
              <span className="simple-only">My alerts</span>
              <span className="standard-up">Alerts & Action</span>
            </h1>
            <p className="simple-only mt-1 text-sm text-slate-500">Choose when NaijaClimaGuard should warn you about a place you care about.</p>
            <p className="standard-up mt-1 text-sm text-slate-500 dark:text-slate-400">Create and manage alert rules for your saved locations.</p>
          </div>
          <button onClick={runCheck} disabled={checking || alerts.length === 0}
            className="flex items-center gap-2 rounded-lg bg-radar px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="simple-only">Check my places now</span>
            <span className="standard-up">Run live check</span>
          </button>
        </div>

        <div className="simple-only rounded-2xl border border-radar/20 bg-radar/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-radar" />
            <div>
              <p className="font-semibold">You do not need to understand flood scores.</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pick how early you want to hear from us. We will use the numbers in the background and show you the warning in plain language.</p>
            </div>
          </div>
        </div>

        {checkResults && (
          <div className="glass-card rounded-2xl p-5 animate-slide-up">
            <h2 className="text-sm font-semibold mb-3"><span className="simple-only">What we found</span><span className="standard-up">Live evaluation results</span></h2>
            <div className="space-y-2">
              {checkResults.map((r, i) => {
                const simple = simpleStatus(r);
                return (
                  <div key={i} className="rounded-xl border border-slate-100 dark:border-midnight-border px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{r.location}</span>
                      <span className={`simple-only text-sm font-semibold ${simple.cls}`}>{simple.text}</span>
                      <span className="standard-up font-mono text-xs text-slate-500">{technicalStatus(r)}</span>
                    </div>
                  </div>
                );
              })}
              {checkResults.length === 0 && <p className="text-sm text-slate-500">You do not have any active alerts yet.</p>}
            </div>
            <div className="technical-only mt-4 border-t border-slate-100 pt-3 dark:border-midnight-border">
              <p className="flex items-center gap-2 text-xs font-mono text-slate-500"><MailCheck className="h-3.5 w-3.5" /> Email channel: {channels?.email ?? "unknown"}</p>
              <p className="mt-1 flex items-center gap-2 text-xs font-mono text-slate-500"><MessageSquareOff className="h-3.5 w-3.5" /> SMS: phone capture not yet implemented</p>
            </div>
          </div>
        )}

        {err && (
          <div className="rounded-lg border border-crimson/20 bg-crimson/5 p-3 text-sm text-crimson flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {err}
          </div>
        )}

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-4"><span className="simple-only">Add a warning</span><span className="standard-up">Create an alert rule</span></h2>
          {locations.length === 0 && !loading ? (
            <p className="text-sm text-slate-500">You have no saved places yet. <Link href="/dashboard" className="text-radar font-semibold">Add a place first</Link>.</p>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold block mb-2"><span className="simple-only">Which place should we watch?</span><span className="standard-up">Location</span></label>
                <select value={newLoc} onChange={(e) => setNewLoc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light px-4 py-3 text-base focus:border-radar focus:outline-none">
                  <option value="">Choose a saved place…</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.state}</option>)}
                </select>
              </div>

              <div className="simple-only">
                <p className="mb-3 text-sm font-semibold">How early should we warn you?</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {SIMPLE_LEVELS.map((item) => (
                    <button key={item.value} type="button" onClick={() => setNewThreshold(item.value)}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${newThreshold === item.value ? "border-radar bg-radar/5" : "border-slate-200 dark:border-midnight-border"}`}>
                      <p className="font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.note}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="standard-up">
                <label className="text-xs text-slate-500 block mb-1.5">Alert threshold: <strong className="text-radar">{newThreshold}/100</strong></label>
                <input type="range" min={30} max={90} step={5} value={newThreshold}
                  onChange={(e) => setNewThreshold(+e.target.value)} className="w-full accent-radar" />
              </div>

              <button onClick={createAlert} disabled={!newLoc || creating}
                className="flex items-center justify-center gap-2 rounded-xl bg-radar px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="simple-only">Start watching this place</span><span className="standard-up">Create alert</span>
              </button>
            </div>
          )}
          <p className="simple-only mt-4 text-xs text-slate-500">Email warnings are available when delivery is configured. More delivery options will appear here as they become operational.</p>
          <p className="technical-only mt-4 text-xs font-mono text-slate-500">Current delivery: Resend email when configured; SMS disabled until verified account phone-number support exists.</p>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-4"><span className="simple-only">Places we are watching for you</span><span className="standard-up">Your alert rules</span></h2>
          {loading ? (
            <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50" />)}</div>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-slate-500">You have not created an alert yet.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-midnight-border px-4 py-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold">{a.location.name} <span className="text-slate-400 font-normal">· {a.location.state}</span></p>
                      <p className="simple-only mt-1 text-xs text-slate-500">{simpleThresholdLabel(a.threshold)} · {a.active ? "Watching now" : "Paused"}</p>
                      <p className="standard-up mt-1 text-xs text-slate-500 font-mono">threshold ≥ {a.threshold} · {a.channels.join(", ")}</p>
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
