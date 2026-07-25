"use client";

/**
 * Report Flood — built for the grandmother test.
 * One question per step. Big touch targets. Auto-location. Real submission.
 */

import AppShell from "@/components/shared/AppShell";
import { useState, useEffect, useCallback } from "react";
import { MapPin, CheckCircle2, AlertTriangle, Loader2, Megaphone } from "lucide-react";

const LEVELS = [
  { key: "ANKLE", emoji: "🦶", label: "Ankle deep", sub: "Water covers the road surface" },
  { key: "KNEE", emoji: "🦵", label: "Knee deep", sub: "Hard to walk through" },
  { key: "WAIST", emoji: "🧍", label: "Waist deep", sub: "Dangerous — avoid crossing" },
  { key: "ABOVE_HEAD", emoji: "🌊", label: "Above head", sub: "Life-threatening flooding" },
] as const;

const levelBadge = (l: string) =>
  l === "ANKLE" ? "text-amber" : l === "KNEE" ? "text-amber" : l === "WAIST" ? "text-crimson" : "text-crimson";

export default function ReportPage() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locState, setLocState] = useState<"asking" | "ok" | "denied">("asking");
  const [area, setArea] = useState("");
  const [level, setLevel] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!("geolocation" in navigator)) { setLocState("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }); setLocState("ok"); },
      () => setLocState("denied"),
      { timeout: 8000 }
    );
  }, []);

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/citizen-reports");
      if (res.ok) setRecent((await res.json()).reports ?? []);
    } catch { /* list is optional */ }
  }, []);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  // Operator (ENTERPRISE) verification capability — backend-enforced, UI-revealed.
  const [isOperator, setIsOperator] = useState(false);
  useEffect(() => {
    fetch("/api/profile").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.user?.plan === "ENTERPRISE") setIsOperator(true);
    }).catch(() => {});
  }, []);

  const moderate = async (id: string, status: "VERIFIED" | "REJECTED") => {
    const res = await fetch("/api/citizen-reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) loadRecent();
  };

  const canSubmit = level && area.trim().length >= 2 && (coords || area.trim().length >= 2) && submitState !== "sending";

  const submit = async () => {
    setSubmitState("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/citizen-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: coords?.lat ?? 9.0765,   // Abuja fallback only when location denied —
          longitude: coords?.lon ?? 7.3986,  // area text remains the primary locator
          area: area.trim(),
          waterLevel: level,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitState("done");
      loadRecent();
    } catch (e: any) {
      setErrorMsg(e.message);
      setSubmitState("error");
    }
  };

  if (submitState === "done") {
    return (
      <AppShell>
        <div className="mx-auto max-w-md pt-16 text-center animate-slide-up">
          <CheckCircle2 className="mx-auto h-16 w-16 text-radar" />
          <h1 className="mt-6 font-display text-2xl font-bold">Report received</h1>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            Thank you. Your report is now visible to the community and queued for verification.
            Reports like yours make every prediction better.
          </p>
          <button
            onClick={() => { setSubmitState("idle"); setLevel(null); setArea(""); setDescription(""); }}
            className="mt-8 rounded-lg bg-radar px-6 py-3 font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Report another location
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-3">
            <Megaphone className="h-6 w-6 text-radar" /> Report flooding
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Three quick steps. Your report helps neighbours and improves the model.
          </p>
        </div>

        {/* Step 1 — location */}
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-3">1 · Where is the flooding?</h2>
          <div className={`flex items-center gap-2 text-sm mb-4 ${locState === "ok" ? "text-radar" : "text-slate-500"}`}>
            <MapPin className="h-4 w-4" />
            {locState === "ok" && coords
              ? `Using your location (${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)})`
              : locState === "asking"
              ? "Requesting your location…"
              : "Location unavailable — the area name below will be used"}
          </div>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            maxLength={120}
            placeholder="Area name — e.g. Adankolo, Lokoja"
            className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light px-4 py-3 text-base focus:border-radar focus:outline-none"
          />
        </section>

        {/* Step 2 — water level, one tap */}
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-4">2 · How deep is the water?</h2>
          <div className="grid grid-cols-2 gap-3">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                onClick={() => setLevel(l.key)}
                className={`rounded-xl border-2 p-4 text-left transition-all active:scale-[0.98] ${
                  level === l.key
                    ? "border-radar bg-radar/5"
                    : "border-slate-200 dark:border-midnight-border hover:border-radar/40"
                }`}
              >
                <span className="text-2xl">{l.emoji}</span>
                <span className="mt-1 block font-semibold">{l.label}</span>
                <span className="block text-xs text-slate-500">{l.sub}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Step 3 — optional detail + submit */}
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-3">3 · Anything else? <span className="font-normal text-slate-400">(optional)</span></h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="e.g. Bridge on Murtala road is impassable"
            className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light px-4 py-3 text-sm focus:border-radar focus:outline-none"
          />
          {submitState === "error" && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-crimson/20 bg-crimson/5 p-3 text-sm text-crimson">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {errorMsg}
            </div>
          )}
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-radar px-6 py-4 text-base font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitState === "sending" ? (<><Loader2 className="h-5 w-5 animate-spin" /> Sending…</>) : "Submit report"}
          </button>
        </section>

        {/* Community reports — real data */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Recent community reports</h2>
          {recent.length === 0 ? (
            <p className="glass-card rounded-xl p-5 text-sm text-slate-500">
              No reports yet. Yours can be the first — every verified report strengthens the warning system.
            </p>
          ) : (
            <div className="space-y-2">
              {recent.slice(0, 8).map((r) => (
                <div key={r.id} className="glass-card flex items-center justify-between rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      {r.area}
                      <span className={`font-mono text-[9px] uppercase tracking-wider rounded px-1.5 py-0.5 border ${
                        r.status === "VERIFIED" ? "text-radar border-radar/30" :
                        r.status === "REJECTED" ? "text-slate-400 border-slate-300 dark:border-slate-600 line-through" :
                        "text-amber border-amber/30"
                      }`}>{r.status}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {r.description ? ` · ${r.description.slice(0, 60)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs font-bold ${levelBadge(r.waterLevel)}`}>
                      {r.waterLevel.replace("_", " ")}
                    </span>
                    {isOperator && r.status === "PENDING" && (
                      <span className="flex gap-1">
                        <button onClick={() => moderate(r.id, "VERIFIED")} title="Verify report"
                          className="rounded border border-radar/40 px-2 py-1 text-[10px] font-bold text-radar transition-all hover:bg-radar/10">✓</button>
                        <button onClick={() => moderate(r.id, "REJECTED")} title="Reject report"
                          className="rounded border border-crimson/40 px-2 py-1 text-[10px] font-bold text-crimson transition-all hover:bg-crimson/10">✕</button>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
