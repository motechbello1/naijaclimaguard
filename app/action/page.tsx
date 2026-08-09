"use client";

import AppShell from "@/components/shared/AppShell";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle, BellOff, BellRing, Loader2, Mail, MapPin, MessageCircle,
  Play, Plus, Settings, ShieldAlert, ShieldCheck, Trash2, Volume2, Zap,
} from "lucide-react";

interface Loc { id: string; name: string; state: string; latitude: number; longitude: number; }
interface AlertRule {
  id: string; threshold: number; active: boolean; channels: string[];
  location: { id: string; name: string; state: string };
}
interface Delivery {
  phoneVerified: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  voiceEnabled: boolean;
  preferredLanguage: string;
}
interface CheckResult {
  location: string;
  score?: number;
  threshold?: number;
  status: string;
  emailStatus?: string;
  smsStatus?: string;
  whatsappStatus?: string;
  voiceStatus?: string;
  triggerReason?: "model_threshold" | "official_advisory";
  officialSafety?: {
    level: string;
    headline: string;
    authority: string;
    sourceName: string;
    observedAt: string;
  };
}

const SIMPLE_LEVELS = [
  { value: 45, label: "Tell me early", note: "More warnings, so you have extra time to prepare." },
  { value: 60, label: "Tell me when risk is high", note: "A balanced warning level for most people." },
  { value: 75, label: "Only urgent warnings", note: "Fewer warnings, only when risk is very high." },
];

const CHANNELS = [
  { id: "EMAIL", label: "Email", icon: Mail, availability: (d: Delivery | null) => d?.emailEnabled !== false },
  { id: "SMS", label: "SMS", icon: MessageCircle, availability: (d: Delivery | null) => Boolean(d?.phoneVerified && d.smsEnabled) },
  { id: "WHATSAPP", label: "WhatsApp", icon: MessageCircle, availability: (d: Delivery | null) => Boolean(d?.phoneVerified && d.whatsappEnabled) },
  { id: "VOICE", label: "Voice", icon: Volume2, availability: (d: Delivery | null) => Boolean(d?.phoneVerified && d.voiceEnabled) },
] as const;

function simpleThresholdLabel(value: number) {
  if (value <= 50) return "Early warning";
  if (value <= 70) return "High-risk warning";
  return "Urgent warning";
}

function deliveryLabel(status?: string) {
  if (!status) return "—";
  return status.replaceAll("_", " ");
}

export default function ActionPage() {
  const [locations, setLocations] = useState<Loc[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["EMAIL"]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLoc, setNewLoc] = useState("");
  const [newThreshold, setNewThreshold] = useState(60);
  const [checking, setChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<CheckResult[] | null>(null);
  const [providerState, setProviderState] = useState<Record<string, string> | null>(null);
  const [err, setErr] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const [locRes, alertRes, deliveryRes] = await Promise.all([
        fetch("/api/locations"),
        fetch("/api/alerts"),
        fetch("/api/profile/delivery", { cache: "no-store" }),
      ]);
      const locData = await locRes.json();
      const alertData = await alertRes.json();
      const deliveryData = await deliveryRes.json();
      setLocations(locData.locations ?? locData ?? []);
      setAlerts(alertData.alerts ?? []);
      if (deliveryRes.ok) setDelivery(deliveryData.delivery);
    } catch {
      setErr("We could not load your alerts. Check your connection and try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const toggleNewChannel = (id: string) => {
    const config = CHANNELS.find((channel) => channel.id === id);
    if (!config?.availability(delivery)) return;
    setSelectedChannels((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const createAlert = async () => {
    if (!newLoc || selectedChannels.length === 0) return;
    setCreating(true); setErr("");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: newLoc, threshold: newThreshold, channels: selectedChannels }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create alert");
      setNewLoc("");
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create alert");
    }
    setCreating(false);
  };

  const toggleAlert = async (a: AlertRule) => {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
      setProviderState(data.channels);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Check failed");
    }
    setChecking(false);
  };

  const simpleStatus = (r: CheckResult) => {
    if (r.status === "feed_unreachable") return { cls: "text-slate-500", text: "We could not check this place right now." };
    if (r.triggerReason === "official_advisory" && (r.status === "triggered" || r.status === "already_notified")) {
      return {
        cls: "text-crimson",
        text: r.status === "triggered"
          ? "An official warning is active. Follow the issuing authority now."
          : "An official warning is still active. We already warned you recently.",
      };
    }
    if (r.status === "triggered") return { cls: "text-crimson", text: "Your warning level has been reached. Check your action steps now." };
    if (r.status === "already_notified") return { cls: "text-amber", text: "Risk is still high. We already warned you recently." };
    return { cls: "text-radar", text: "No alert is needed right now." };
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold"><Zap className="h-6 w-6 text-radar" /> My alerts</h1>
            <p className="mt-1 text-sm text-slate-500">Choose when to warn you and how the warning should reach you.</p>
          </div>
          <button onClick={runCheck} disabled={checking || alerts.length === 0} className="flex items-center gap-2 rounded-lg bg-radar px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Check my places now
          </button>
        </div>

        <div className="rounded-2xl border border-radar/20 bg-radar/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-radar" />
            <div>
              <p className="font-semibold">You do not need to understand flood scores.</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pick how early you want us to warn you. A fresh connected official warning can still alert you even when the model score is low.</p>
            </div>
          </div>
        </div>

        {checkResults && (
          <div className="glass-card rounded-2xl p-5">
            <h2 className="mb-3 text-sm font-semibold">What we found</h2>
            <div className="space-y-3">
              {checkResults.map((r, i) => {
                const simple = simpleStatus(r);
                return (
                  <div key={i} className={`rounded-xl border px-4 py-3 ${r.triggerReason === "official_advisory" ? "border-crimson/30 bg-crimson/5" : "border-slate-100 dark:border-midnight-border"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{r.location}</p>
                        {r.officialSafety && <p className="mt-1 text-xs font-semibold text-crimson">{r.officialSafety.headline} · {r.officialSafety.authority}</p>}
                      </div>
                      <p className={`max-w-md text-sm font-semibold ${simple.cls}`}>{simple.text}</p>
                    </div>
                    {r.status === "triggered" && (
                      <div className="technical-only mt-3 grid gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-midnight-border sm:grid-cols-4">
                        <span>Email: {deliveryLabel(r.emailStatus)}</span>
                        <span>SMS: {deliveryLabel(r.smsStatus)}</span>
                        <span>WhatsApp: {deliveryLabel(r.whatsappStatus)}</span>
                        <span>Voice: {deliveryLabel(r.voiceStatus)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {providerState && (
              <div className="technical-only mt-4 border-t border-slate-100 pt-3 text-xs font-mono text-slate-500 dark:border-midnight-border">
                Provider readiness: {Object.entries(providerState).map(([key, value]) => `${key}=${value}`).join(" · ")}
              </div>
            )}
          </div>
        )}

        {err && <div className="flex items-center gap-2 rounded-lg border border-crimson/20 bg-crimson/5 p-3 text-sm text-crimson"><AlertTriangle className="h-4 w-4" />{err}</div>}

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold">Add a warning</h2>
          {locations.length === 0 && !loading ? (
            <p className="mt-4 text-sm text-slate-500">You have no saved places yet. <Link href="/dashboard" className="font-semibold text-radar">Add a place first</Link>.</p>
          ) : (
            <div className="mt-4 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold">Which place should we watch?</label>
                <select value={newLoc} onChange={(e) => setNewLoc(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base dark:border-midnight-border dark:bg-midnight-light">
                  <option value="">Choose a saved place…</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.state}</option>)}
                </select>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold">How early should we warn you?</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {SIMPLE_LEVELS.map((item) => (
                    <button key={item.value} type="button" onClick={() => setNewThreshold(item.value)} className={`rounded-xl border-2 p-4 text-left ${newThreshold === item.value ? "border-radar bg-radar/5" : "border-slate-200 dark:border-midnight-border"}`}>
                      <p className="font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">How should we reach you?</p>
                  <Link href="/profile" className="flex items-center gap-1 text-xs font-semibold text-radar"><Settings className="h-3.5 w-3.5" /> Delivery settings</Link>
                </div>
                <div className="grid gap-2 sm:grid-cols-4">
                  {CHANNELS.map((channel) => {
                    const available = channel.availability(delivery);
                    const selected = selectedChannels.includes(channel.id);
                    const Icon = channel.icon;
                    return (
                      <button key={channel.id} type="button" disabled={!available} onClick={() => toggleNewChannel(channel.id)} className={`rounded-xl border p-3 text-left disabled:opacity-35 ${selected ? "border-radar bg-radar/5" : "border-slate-200 dark:border-midnight-border"}`}>
                        <Icon className={`h-4 w-4 ${selected ? "text-radar" : "text-slate-400"}`} />
                        <p className="mt-2 text-sm font-semibold">{channel.label}</p>
                        {!available && channel.id !== "EMAIL" && <p className="mt-1 text-[10px] text-slate-500">Verify and enable in Profile</p>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button onClick={createAlert} disabled={!newLoc || creating || selectedChannels.length === 0} className="flex items-center justify-center gap-2 rounded-xl bg-radar px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Start watching this place
              </button>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold">Places we are watching for you</h2>
          {loading ? (
            <div className="flex h-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-radar" /></div>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-slate-500">You have not created an alert yet.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-4 dark:border-midnight-border">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold">{a.location.name} <span className="font-normal text-slate-400">· {a.location.state}</span></p>
                      <p className="mt-1 text-xs text-slate-500">{simpleThresholdLabel(a.threshold)} · {a.channels.join(" + ")} · {a.active ? "Watching now" : "Paused"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleAlert(a)} className={`rounded-lg border p-2 ${a.active ? "border-radar/30 text-radar" : "border-slate-200 text-slate-400 dark:border-midnight-border"}`}>{a.active ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}</button>
                    <button onClick={() => deleteAlert(a.id)} className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-crimson dark:border-midnight-border"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 p-4 text-xs leading-relaxed text-slate-500 dark:border-midnight-border">
          <div className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>NaijaClimaGuard only records a delivery when a configured provider accepts it. Phone-based alerts require a verified number. Official agency warnings remain separate from the model score and take priority in the safety message.</p></div>
        </div>
      </div>
    </AppShell>
  );
}
