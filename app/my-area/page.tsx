"use client";

/**
 * My Area — PUBLIC, zero-login, the grandmother test.
 * This is the page you share on WhatsApp. No registration required.
 * One question answered in 3 seconds: "Is my area safe right now?"
 * Live Open-Meteo data for the user's real position.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MapPin, RefreshCw, Megaphone, ShieldCheck, ShieldAlert, Loader2, UserPlus } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

type Verdict = { score: number; headline: string; color: string; bg: string; actions: string[] };

function verdictFor(score: number): Verdict {
  if (score >= 75)
    return {
      score, color: "#EF4444", bg: "border-red-400/50 bg-red-50 dark:bg-red-950/30",
      headline: "High flood risk in your area",
      actions: [
        "Move documents, food and valuables off the floor now",
        "Plan your route to higher ground before nightfall",
        "Check on elderly neighbours and children",
      ],
    };
  if (score >= 60)
    return {
      score, color: "#F97316", bg: "border-orange-400/50 bg-orange-50 dark:bg-orange-950/30",
      headline: "Rising flood risk — stay alert",
      actions: [
        "Charge your phone and keep it charged",
        "Avoid low roads and bridges after heavy rain",
        "Know where your nearest high ground is",
      ],
    };
  if (score >= 40)
    return {
      score, color: "#F59E0B", bg: "border-amber-300/50 bg-amber-50 dark:bg-amber-950/30",
      headline: "Some rain expected — no danger now",
      actions: [
        "Normal activities are fine",
        "Clear drains and gutters around your home",
        "Check back tomorrow",
      ],
    };
  return {
    score, color: "#10B981", bg: "border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/30",
    headline: "Your area looks safe right now",
    actions: [
      "No flood indicators in the live data",
      "Nothing to do — enjoy your day",
      "We keep watching so you don't have to",
    ],
  };
}

function deriveScore(daily: any): { score: number; rain7: number } {
  const idx = daily.time.length - 5;
  const p: number[] = daily.precipitation_sum ?? [];
  const et0: number[] = daily.et0_fao_evapotranspiration ?? [];
  const sum = (a: number[], x: number, y: number) => a.slice(Math.max(0, x), y).reduce((m, n) => m + (n || 0), 0);
  const rain7 = sum(p, idx - 6, idx + 1);
  const rain3 = sum(p, idx - 2, idx + 1);
  const bal7 = rain7 - sum(et0, idx - 6, idx + 1);
  const score = Math.round(
    (Math.min(1, rain7 / 200) * 0.45 + Math.min(1, rain3 / 120) * 0.3 + Math.min(1, Math.max(0, (bal7 + 40) / 160)) * 0.25) * 100
  );
  return { score, rain7: +rain7.toFixed(1) };
}

export default function MyAreaPage() {
  const [state, setState] = useState<"locating" | "loading" | "ready" | "no-location" | "error">("locating");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [rain7, setRain7] = useState<number | null>(null);
  const [checked, setChecked] = useState<Date | null>(null);

  const load = useCallback((lat: number, lon: number) => {
    setState("loading");
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,et0_fao_evapotranspiration&past_days=10&forecast_days=4&timezone=Africa%2FLagos`,
      { cache: "no-store" }
    )
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((j) => {
        const { score, rain7 } = deriveScore(j.daily);
        setVerdict(verdictFor(score));
        setRain7(rain7);
        setChecked(new Date());
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  const locate = useCallback(() => {
    setState("locating");
    if (!("geolocation" in navigator)) { setState("no-location"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => load(p.coords.latitude, p.coords.longitude),
      () => setState("no-location"),
      { timeout: 8000 }
    );
  }, [load]);

  useEffect(() => { locate(); }, [locate]);

  return (
    <div className="min-h-screen bg-cloud dark:bg-midnight text-slate-900 dark:text-slate-200 font-body">
      {/* Minimal public header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-midnight-border">
        <Link href="/" className="font-display text-lg font-bold">
          NaijaClima<span className="text-radar">Guard</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="flex items-center gap-1.5 text-xs font-semibold text-radar hover:underline">
            <UserPlus className="h-3.5 w-3.5" /> Sign in for alerts
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6 pb-16">
        {(state === "locating" || state === "loading") && (
          <div className="flex flex-col items-center gap-4 pt-24 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-radar" />
            <p className="text-sm">{state === "locating" ? "Finding your area…" : "Checking live conditions…"}</p>
            <p className="text-xs text-slate-400">Uses satellite-derived weather data · no account needed</p>
          </div>
        )}

        {state === "no-location" && (
          <div className="mt-12 rounded-2xl border border-slate-200 dark:border-midnight-border p-8 text-center">
            <MapPin className="mx-auto h-10 w-10 text-slate-400" />
            <h1 className="mt-4 font-display text-xl font-bold">Allow location to check your risk</h1>
            <p className="mt-2 text-sm text-slate-500">
              We need your location once to check the weather above your home — we never store it. No account needed.
            </p>
            <button onClick={locate} className="mt-6 rounded-lg bg-radar px-6 py-3 font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">
              Allow location
            </button>
          </div>
        )}

        {state === "error" && (
          <div className="mt-12 rounded-2xl border border-slate-200 dark:border-midnight-border p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-slate-400" />
            <h1 className="mt-4 font-display text-xl font-bold">Live check unavailable</h1>
            <p className="mt-2 text-sm text-slate-500">The weather feed didn't respond. Try again.</p>
            <button onClick={locate} className="mt-6 rounded-lg border border-slate-200 dark:border-midnight-border px-6 py-3 font-semibold transition-all hover:border-radar/40">
              Retry
            </button>
          </div>
        )}

        {state === "ready" && verdict && (
          <div className="animate-slide-up space-y-6">
            {/* The one answer */}
            <div className={`rounded-3xl border-2 p-8 text-center ${verdict.bg}`}>
              {verdict.score < 60
                ? <ShieldCheck className="mx-auto h-14 w-14" style={{ color: verdict.color }} />
                : <ShieldAlert className="mx-auto h-14 w-14" style={{ color: verdict.color }} />}
              <h1 className="mt-4 font-display text-2xl font-bold leading-snug">{verdict.headline}</h1>
              <p className="mt-2 font-mono text-sm" style={{ color: verdict.color }}>
                Risk {verdict.score}/100 · {rain7} mm rain in the last 7 days
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Live satellite-derived data for your exact position
                {checked ? ` · checked ${checked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
              </p>
            </div>

            {/* Three actions */}
            <div className="rounded-2xl border border-slate-200 dark:border-midnight-border p-6">
              <h2 className="mb-4 text-sm font-semibold">What you should do</h2>
              <ol className="space-y-3">
                {verdict.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-radar/10 font-mono text-xs font-bold text-radar">
                      {i + 1}
                    </span>
                    {a}
                  </li>
                ))}
              </ol>
            </div>

            {/* Share + actions */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={locate}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-midnight-border px-4 py-4 font-semibold transition-all hover:border-radar/40 active:scale-[0.98]">
                <RefreshCw className="h-4 w-4" /> Check again
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent("Check your flood risk right now 🌊 https://naijaclimaguard.vercel.app/my-area")}`}
                target="_blank" rel="noopener"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-4 font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">
                Share on WhatsApp
              </a>
            </div>

            {/* Sign up CTA */}
            <div className="rounded-2xl border border-radar/20 bg-radar/5 p-5 text-center">
              <p className="text-sm font-semibold">Want alerts before the risk rises?</p>
              <p className="mt-1 text-xs text-slate-500">Create a free account to set up email and SMS alerts for your area.</p>
              <Link href="/register"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-radar px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">
                <UserPlus className="h-4 w-4" /> Create free account
              </Link>
            </div>

            {/* Report flooding */}
            <Link href="/report"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-midnight-border px-4 py-4 font-semibold transition-all hover:border-radar/40 active:scale-[0.98]">
              <Megaphone className="h-4 w-4 text-radar" /> Report flooding near you
            </Link>

            <p className="text-center text-[11px] text-slate-400">
              Data: Open-Meteo (NASA-derived) · Model: disclosed multi-factor formula · No account required
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
