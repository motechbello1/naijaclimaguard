"use client";

/**
 * My Area — public, zero-login rainfall-based risk check.
 *
 * The live score is a disclosed heuristic from Open-Meteo precipitation,
 * rainfall intensity, and an antecedent-wetness proxy. It is decision support,
 * not an official warning or a complete hydraulic/local-drainage assessment.
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MapPin, RefreshCw, Megaphone, ShieldCheck, ShieldAlert, Loader2, UserPlus, CloudRain } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

type Verdict = { score: number; headline: string; color: string; bg: string; actions: string[]; floodType: string; maxHourly: number; rain7: number; };

function verdictFor(score: number, floodType: string, maxHourly: number, rain7: number): Verdict {
  const base = { score, floodType, maxHourly, rain7 };

  if (score >= 75)
    return {
      ...base,
      color: "#EF4444",
      bg: "border-red-400/50 bg-red-50 dark:bg-red-950/30",
      headline: "Elevated rainfall-based flood-risk signal",
      actions: [
        "Check official NiHSA, NiMet, NEMA/SEMA, and local emergency guidance",
        floodType === "urban" ? "Avoid low roads, underpasses, and drainage channels during heavy rain" : "Avoid low roads and flood-prone crossings if water is rising",
        "Prepare essential items and know a safer route to higher ground if authorities advise movement",
      ],
    };

  if (score >= 60)
    return {
      ...base,
      color: "#F97316",
      bg: "border-orange-400/50 bg-orange-50 dark:bg-orange-950/30",
      headline: "Rainfall-based risk indicators are rising",
      actions: [
        "Monitor official weather and flood advisories",
        "Avoid driving through flooded roads or fast-moving water",
        "Check drainage and low-lying access routes around your location",
      ],
    };

  if (score >= 40)
    return {
      ...base,
      color: "#F59E0B",
      bg: "border-amber-300/50 bg-amber-50 dark:bg-amber-950/30",
      headline: "Some rainfall-related indicators are elevated",
      actions: [
        "Normal plans may still be possible, but keep an eye on changing conditions",
        "Clear drains and gutters where it is safe to do so",
        "Recheck this page and official guidance if rainfall intensifies",
      ],
    };

  return {
    ...base,
    color: "#10B981",
    bg: "border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/30",
    headline: "Rainfall-based indicators are currently low",
    actions: [
      "This score does not include local river gauges, drainage capacity, tides, or every flood driver",
      "Continue to follow official warnings for your area",
      "Check again if weather or local water conditions change",
    ],
  };
}

export default function MyAreaPage() {
  const { data: session } = useSession();
  const [state, setState] = useState<"locating" | "loading" | "ready" | "no-location" | "error">("locating");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [checked, setChecked] = useState<Date | null>(null);

  const load = useCallback(async (lat: number, lon: number) => {
    setState("loading");
    try {
      const [dailyRes, hourlyRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,et0_fao_evapotranspiration&past_days=10&forecast_days=4&timezone=Africa%2FLagos`, { cache: "no-store" }),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation&past_hours=48&forecast_hours=0&timezone=Africa%2FLagos`, { cache: "no-store" }),
      ]);
      if (!dailyRes.ok) throw new Error();
      const daily = (await dailyRes.json()).daily;
      let hourlyData: number[] = [];
      if (hourlyRes.ok) {
        const h = (await hourlyRes.json()).hourly;
        hourlyData = h?.precipitation ?? [];
      }

      const idx = daily.time.length - 5;
      const p: number[] = daily.precipitation_sum ?? [];
      const et0: number[] = daily.et0_fao_evapotranspiration ?? [];
      const sum = (a: number[], x: number, y: number) => a.slice(Math.max(0, x), y).reduce((m: number, n: number) => m + (n || 0), 0);
      const rain7 = sum(p, idx - 6, idx + 1);
      const rain3 = sum(p, idx - 2, idx + 1);
      const bal7 = rain7 - sum(et0, idx - 6, idx + 1);
      const rainfallNorm = Math.min(1, rain7 / 200);
      const burstDaily = Math.min(1, rain3 / 120);
      const wetnessProxy = Math.min(1, Math.max(0, (bal7 + 40) / 160));

      const maxHourly = hourlyData.length ? Math.max(0, ...hourlyData.map((v: number) => v ?? 0)) : 0;
      let hourlyBurst = Math.min(1, maxHourly / 30);
      let max3h = 0;
      for (let i = 2; i < hourlyData.length; i++) {
        max3h = Math.max(max3h, (hourlyData[i] ?? 0) + (hourlyData[i - 1] ?? 0) + (hourlyData[i - 2] ?? 0));
      }
      hourlyBurst = Math.max(hourlyBurst, Math.min(1, max3h / 60));

      const effectiveBurst = Math.max(burstDaily, hourlyBurst);
      const floodType = hourlyBurst > burstDaily + 0.1 ? "urban" : burstDaily > hourlyBurst + 0.1 ? "riverine" : "mixed";
      const score = Math.round((rainfallNorm * 0.40 + effectiveBurst * 0.35 + wetnessProxy * 0.25) * 100);
      const clamped = Math.max(0, Math.min(100, score));

      setVerdict(verdictFor(clamped, floodType, +maxHourly.toFixed(1), +rain7.toFixed(1)));
      setChecked(new Date());
      setState("ready");
    } catch {
      setState("error");
    }
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
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-midnight-border">
        <Link href="/" className="font-display text-lg font-bold">NaijaClima<span className="text-radar">Guard</span></Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {!session ? (
            <Link href="/login" className="flex items-center gap-1.5 text-xs font-semibold text-radar hover:underline"><UserPlus className="h-3.5 w-3.5" /> Sign in</Link>
          ) : (
            <Link href="/dashboard" className="text-xs font-semibold text-radar hover:underline">Dashboard →</Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6 pb-16">
        {(state === "locating" || state === "loading") && (
          <div className="flex flex-col items-center gap-4 pt-24 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-radar" />
            <p className="text-sm">{state === "locating" ? "Finding your area…" : "Checking live conditions…"}</p>
            <p className="text-xs text-slate-400">Open-Meteo weather + recent hourly rainfall intensity · no account needed</p>
          </div>
        )}

        {state === "no-location" && (
          <div className="mt-12 rounded-2xl border border-slate-200 dark:border-midnight-border p-8 text-center">
            <MapPin className="mx-auto h-10 w-10 text-slate-400" />
            <h1 className="mt-4 font-display text-xl font-bold">Allow location to check your risk</h1>
            <p className="mt-2 text-sm text-slate-500">We need your location for this check. No account is required.</p>
            <button onClick={locate} className="mt-6 rounded-lg bg-radar px-6 py-3 font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">Allow location</button>
          </div>
        )}

        {state === "error" && (
          <div className="mt-12 rounded-2xl border border-slate-200 dark:border-midnight-border p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-slate-400" />
            <h1 className="mt-4 font-display text-xl font-bold">Live check unavailable</h1>
            <p className="mt-2 text-sm text-slate-500">Weather feed didn&apos;t respond. Try again.</p>
            <button onClick={locate} className="mt-6 rounded-lg border border-slate-200 dark:border-midnight-border px-6 py-3 font-semibold transition-all hover:border-radar/40">Retry</button>
          </div>
        )}

        {state === "ready" && verdict && (
          <div className="animate-slide-up space-y-6">
            <div className={`rounded-3xl border-2 p-8 text-center ${verdict.bg}`}>
              {verdict.score < 60
                ? <ShieldCheck className="mx-auto h-14 w-14" style={{ color: verdict.color }} />
                : <ShieldAlert className="mx-auto h-14 w-14" style={{ color: verdict.color }} />}
              <h1 className="mt-4 font-display text-2xl font-bold leading-snug">{verdict.headline}</h1>
              <p className="mt-2 font-mono text-sm" style={{ color: verdict.color }}>
                Risk index {verdict.score}/100 · {verdict.rain7} mm rain (7 days)
              </p>
              {verdict.maxHourly > 0 && (
                <p className="mt-1 font-mono text-xs text-slate-500 flex items-center justify-center gap-1.5">
                  <CloudRain className="h-3 w-3" />
                  Peak recent hourly precipitation: {verdict.maxHourly} mm/hr
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Live Open-Meteo inputs for your position
                {verdict.floodType === "urban" && " · short-duration rainfall burst is the stronger signal"}
                {checked ? ` · checked ${checked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-midnight-border p-6">
              <h2 className="mb-4 text-sm font-semibold">What you should consider</h2>
              <ol className="space-y-3">
                {verdict.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-radar/10 font-mono text-xs font-bold text-radar">{i + 1}</span>
                    {a}
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-midnight-border p-4 text-xs leading-relaxed text-slate-500">
              <strong className="text-slate-700 dark:text-slate-300">Limitation:</strong> this is a rainfall-based
              decision-support index. It does not currently ingest local river gauges, tide levels, drainage capacity,
              dam-operation data, or official emergency alerts for your exact position. Never use a low score to ignore
              an official warning or visible local flooding.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={locate} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-midnight-border px-4 py-4 font-semibold transition-all hover:border-radar/40 active:scale-[0.98]">
                <RefreshCw className="h-4 w-4" /> Check again
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent("Check the current rainfall-based flood-risk index for your area: https://naijaclimaguard.vercel.app/my-area")}`}
                target="_blank" rel="noopener"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-4 font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">
                Share on WhatsApp
              </a>
            </div>

            {!session ? (
              <div className="rounded-2xl border border-radar/20 bg-radar/5 p-5 text-center">
                <p className="text-sm font-semibold">Want threshold alerts?</p>
                <p className="mt-1 text-xs text-slate-500">Create a free account to configure saved locations and email alert rules.</p>
                <Link href="/register" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-radar px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]">
                  <UserPlus className="h-4 w-4" /> Create free account
                </Link>
              </div>
            ) : (
              <Link href="/action" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-radar/20 bg-radar/5 px-4 py-4 font-semibold text-radar transition-all hover:bg-radar/10 active:scale-[0.98]">
                <Megaphone className="h-4 w-4" /> Configure alert rules
              </Link>
            )}

            <Link href="/report" className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-midnight-border px-4 py-4 font-semibold transition-all hover:border-radar/40 active:scale-[0.98]">
              <Megaphone className="h-4 w-4 text-radar" /> Report flooding near you
            </Link>

            <p className="text-center text-[11px] text-slate-400">
              Live source: Open-Meteo · rainfall + ET0 heuristic · not an official warning
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
