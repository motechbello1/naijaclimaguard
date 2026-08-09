"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MapPin, RefreshCw, Megaphone, ShieldCheck, ShieldAlert, Loader2, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

type Verdict = { score: number; headline: string; plain: string; color: string; bg: string; actions: string[]; floodType: string; maxHourly: number; rain7: number; };

function verdictFor(score: number, floodType: string, maxHourly: number, rain7: number): Verdict {
  const base = { score, floodType, maxHourly, rain7 };
  if (score >= 75) return { ...base, color: "#EF4444", bg: "border-red-400/50 bg-red-50 dark:bg-red-950/30", headline: "Act now", plain: "Flood risk looks very high around you. Put safety first and check official instructions now.", actions: ["Check official emergency instructions for your area now.", "Keep people away from flooded roads, drains and fast-moving water.", "Take medicines, important documents and a charged phone if you may need to move." ] };
  if (score >= 60) return { ...base, color: "#F97316", bg: "border-orange-400/50 bg-orange-50 dark:bg-orange-950/30", headline: "Risk is high", plain: "Conditions are becoming concerning. Start preparing now instead of waiting for water to rise.", actions: ["Watch for official warnings and changes around you.", "Move important items away from low floors or exposed areas.", "Check the safest way out of your area before conditions get worse." ] };
  if (score >= 40) return { ...base, color: "#F59E0B", bg: "border-amber-300/50 bg-amber-50 dark:bg-amber-950/30", headline: "Get ready", plain: "Some conditions are becoming wetter. You may not need to act yet, but be ready if things worsen.", actions: ["Keep an eye on rain and nearby water levels.", "Clear safe drainage blockages around your home if you can.", "Check again later or sooner if rain becomes heavier." ] };
  return { ...base, color: "#10B981", bg: "border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/30", headline: "Risk looks low", plain: "We are not seeing a strong rainfall warning signal around you right now.", actions: ["Carry on, but keep following official warnings for your area.", "Check again if heavy rain starts or nearby water begins rising.", "Never ignore visible flooding just because this screen says risk is low." ] };
}

export default function MyAreaPage() {
  const { data: session } = useSession();
  const [state, setState] = useState<"locating" | "loading" | "ready" | "no-location" | "error">("locating");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [checked, setChecked] = useState<Date | null>(null);
  const [details, setDetails] = useState(false);

  const load = useCallback(async (lat: number, lon: number) => {
    setState("loading"); setDetails(false);
    try {
      const res = await fetch(`/api/v1/risk?latitude=${lat}&longitude=${lon}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVerdict(verdictFor(data.risk.score, data.risk.flood_type, data.hourly.max_mm_per_hour, data.raw_weather.precipitation_7d_mm));
      setChecked(new Date()); setState("ready");
    } catch { setState("error"); }
  }, []);

  const locate = useCallback(() => {
    setState("locating");
    if (!("geolocation" in navigator)) { setState("no-location"); return; }
    navigator.geolocation.getCurrentPosition((p) => load(p.coords.latitude, p.coords.longitude), () => setState("no-location"), { timeout: 8000 });
  }, [load]);

  useEffect(() => { locate(); }, [locate]);

  return (
    <div className="min-h-screen bg-cloud dark:bg-midnight text-slate-900 dark:text-slate-200 font-body">
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-midnight-border">
        <Link href="/" className="font-display text-lg font-bold">NaijaClima<span className="text-radar">Guard</span></Link>
        <div className="flex items-center gap-3"><ThemeToggle />{!session ? <Link href="/login" className="flex items-center gap-1.5 text-xs font-semibold text-radar hover:underline"><UserPlus className="h-3.5 w-3.5" /> Sign in</Link> : <Link href="/dashboard" className="text-xs font-semibold text-radar hover:underline">My dashboard →</Link>}</div>
      </header>

      <main className="mx-auto max-w-lg px-5 pt-6 pb-16">
        {(state === "locating" || state === "loading") && <div className="flex flex-col items-center gap-4 pt-24 text-slate-500"><Loader2 className="h-8 w-8 animate-spin text-radar" /><p className="text-base font-semibold">{state === "locating" ? "Finding where you are…" : "Checking your area…"}</p><p className="text-sm text-slate-400">This may take a few seconds.</p></div>}

        {state === "no-location" && <div className="mt-12 rounded-2xl border border-slate-200 dark:border-midnight-border p-8 text-center"><MapPin className="mx-auto h-10 w-10 text-slate-400" /><h1 className="mt-4 font-display text-xl font-bold">We need your location</h1><p className="mt-2 text-sm text-slate-500">Allow location so we can check conditions around you. You do not need an account.</p><button onClick={locate} className="mt-6 rounded-xl bg-radar px-6 py-3 font-semibold text-white">Use my location</button></div>}

        {state === "error" && <div className="mt-12 rounded-2xl border border-slate-200 dark:border-midnight-border p-8 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-slate-400" /><h1 className="mt-4 font-display text-xl font-bold">We could not check your area</h1><p className="mt-2 text-sm text-slate-500">The live service did not respond. Please try again.</p><button onClick={locate} className="mt-6 rounded-xl border border-slate-200 dark:border-midnight-border px-6 py-3 font-semibold">Try again</button></div>}

        {state === "ready" && verdict && (
          <div className="animate-slide-up space-y-6">
            <div className={`rounded-3xl border-2 p-8 text-center ${verdict.bg}`}>
              {verdict.score < 60 ? <ShieldCheck className="mx-auto h-14 w-14" style={{ color: verdict.color }} /> : <ShieldAlert className="mx-auto h-14 w-14" style={{ color: verdict.color }} />}
              <h1 className="mt-4 font-display text-3xl font-bold" style={{ color: verdict.color }}>{verdict.headline}</h1>
              <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-200">{verdict.plain}</p>
              {checked && <p className="mt-3 text-xs text-slate-500">Checked at {checked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-midnight-border p-6">
              <h2 className="mb-4 text-base font-bold">What to do now</h2>
              <ol className="space-y-4">{verdict.actions.map((a, i) => <li key={i} className="flex items-start gap-3 text-sm leading-relaxed"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-radar/10 font-bold text-radar">{i + 1}</span>{a}</li>)}</ol>
            </div>

            <button onClick={() => setDetails((v) => !v)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-midnight-border px-4 py-3 text-sm font-semibold"><span>Show {details ? "less" : "more"} detail</span>{details ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
            {details && <div className="rounded-xl border border-slate-200 dark:border-midnight-border p-4 text-sm leading-relaxed text-slate-500"><p><strong>Risk index:</strong> {verdict.score}/100</p><p className="mt-1"><strong>Rain in the last 7 days:</strong> {verdict.rain7} mm</p>{verdict.maxHourly > 0 && <p className="mt-1"><strong>Heaviest recent hour:</strong> {verdict.maxHourly} mm</p>}<p className="mt-3 text-xs">This is a rainfall-based decision-support signal. It does not yet include every local river gauge, drainage condition, tide, dam operation or official warning for your exact position.</p></div>}

            <div className="grid grid-cols-2 gap-3"><button onClick={locate} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-midnight-border px-4 py-4 font-semibold"><RefreshCw className="h-4 w-4" /> Check again</button><a href={`https://wa.me/?text=${encodeURIComponent("Check the flood-risk signal for your area: https://naijaclimaguard.vercel.app/my-area")}`} target="_blank" rel="noopener" className="flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-4 font-semibold text-white">Share</a></div>

            {!session ? <div className="rounded-2xl border border-radar/20 bg-radar/5 p-5 text-center"><p className="text-sm font-semibold">Want us to warn you automatically?</p><p className="mt-1 text-xs text-slate-500">Create a free account and choose the places you want us to watch.</p><Link href="/register" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-radar px-5 py-2.5 text-sm font-semibold text-white"><UserPlus className="h-4 w-4" /> Create free account</Link></div> : <Link href="/action" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-radar/20 bg-radar/5 px-4 py-4 font-semibold text-radar"><Megaphone className="h-4 w-4" /> Set my alerts</Link>}
            <Link href="/report" className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-midnight-border px-4 py-4 font-semibold"><Megaphone className="h-4 w-4 text-radar" /> Report flooding near me</Link>
            <p className="text-center text-[11px] text-slate-400">Decision support only. Always follow official emergency instructions and visible local conditions.</p>
          </div>
        )}
      </main>
    </div>
  );
}
