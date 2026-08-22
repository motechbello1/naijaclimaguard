"use client";

import AppShell from "@/components/shared/AppShell";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { translatePlatformText } from "@/lib/i18n/translate-platform";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CloudRain,
  HeartPulse,
  History,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Umbrella,
} from "lucide-react";
import { useMemo, useState } from "react";

type Severity = "LOW" | "WATCH" | "ELEVATED" | "HIGH";
type HazardKind = "flood" | "heat" | "storm" | "dry_stress";

type HazardSignal = {
  kind: HazardKind;
  score: number;
  severity: Severity;
  title: string;
  when: string;
  starts_at: string | null;
  affects: string[];
  actions: string[];
  evidence: Record<string, number | string | null>;
};

type TomorrowResponse = {
  location: { name: string | null; latitude: number; longitude: number };
  status: "CLEAR" | "DEVELOPING";
  primary_hazard: HazardSignal | null;
  hazards: HazardSignal[];
  generated_at: string;
  source_status: { core_weather: "LIVE"; ecmwf_detail: "LIVE" | "UNAVAILABLE_OPTIONAL" };
  official_safety_state?: { active: boolean; headline: string | null; instruction: string | null };
  meta: { core_source: string; public_warning_authority: boolean };
};

type Place = { name: string; latitude: number; longitude: number };

const QUICK_PLACES: Place[] = [
  { name: "Abuja", latitude: 9.0765, longitude: 7.3986 },
  { name: "Lokoja", latitude: 7.8023, longitude: 6.7333 },
  { name: "Makurdi", latitude: 7.7322, longitude: 8.5391 },
  { name: "Yenagoa", latitude: 4.9247, longitude: 6.2642 },
  { name: "Onitsha", latitude: 6.1407, longitude: 6.7869 },
];

function levelLabel(severity?: Severity) {
  if (severity === "HIGH") return "Act";
  if (severity === "ELEVATED") return "Prepare";
  if (severity === "WATCH") return "Watch";
  return "Clear";
}

function levelClasses(severity?: Severity) {
  if (severity === "HIGH") return "border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-200";
  if (severity === "ELEVATED") return "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-200";
  if (severity === "WATCH") return "border-yellow-500/20 bg-yellow-500/10 text-yellow-800 dark:text-yellow-100";
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
}

function heroCopy(primary: HazardSignal | null) {
  if (!primary || primary.severity === "LOW") return ["Tomorrow looks okay around this place.", "Nothing serious is showing right now. Check again if your plans or conditions change."];
  if (primary.severity === "HIGH") return ["Something could seriously affect your plans.", `${primary.title}. The strongest signal is ${primary.when}.`];
  return ["Something could disrupt your tomorrow.", `${primary.title}. The strongest signal is ${primary.when}.`];
}

function consequence(kind: "safety" | "money" | "time", hazard: HazardSignal | null) {
  if (!hazard || hazard.severity === "LOW") {
    if (kind === "safety") return "No special protection action is showing from the current forecast.";
    if (kind === "money") return "No meaningful weather-related exposure is showing from the current signal.";
    return "No major movement disruption is showing from the current signal.";
  }
  if (kind === "safety") return hazard.affects.length ? `Watch ${hazard.affects.slice(0, 2).join(" and ")}.` : "Check the people and places you depend on.";
  if (kind === "money") return "Exposure may exist, but there is not enough personal data for a trustworthy naira estimate yet. NaijaClimaGuard will not invent one.";
  return hazard.kind === "flood" || hazard.kind === "storm"
    ? `Your normal movement could be affected ${hazard.when}. Check your route before leaving.`
    : `Plan around the strongest conditions ${hazard.when}.`;
}

function snapshot(data: TomorrowResponse) {
  return JSON.stringify({
    status: data.status,
    kind: data.primary_hazard?.kind ?? null,
    severity: data.primary_hazard?.severity ?? "LOW",
    scoreBand: data.primary_hazard ? Math.floor(data.primary_hazard.score / 10) * 10 : 0,
    when: data.primary_hazard?.when ?? null,
  });
}

export default function MyTomorrowPage() {
  const { locale } = useLanguage();
  const tr = (text: string) => translatePlatformText(locale, text);
  const [place, setPlace] = useState<Place | null>(null);
  const [data, setData] = useState<TomorrowResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [changeMessage, setChangeMessage] = useState("This is your first check for this place.");

  const primary = data?.primary_hazard ?? null;
  const [hero, heroSub] = heroCopy(primary);
  const protectList = useMemo(() => primary?.severity !== "LOW" ? (primary?.affects || []).slice(0, 3) : [], [primary]);
  const topAction = primary?.actions?.[0] || "No special action is needed from the current forecast. Check again if conditions change.";

  async function check(nextPlace: Place) {
    setPlace(nextPlace);
    setLoading(true);
    setError("");
    setEvidenceOpen(false);
    try {
      const query = new URLSearchParams({ latitude: String(nextPlace.latitude), longitude: String(nextPlace.longitude), name: nextPlace.name });
      const response = await fetch(`/api/v1/my-tomorrow?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Could not load your tomorrow.");
      const next = payload as TomorrowResponse;
      setData(next);

      const key = `ncg.my-tomorrow.${nextPlace.latitude.toFixed(2)}.${nextPlace.longitude.toFixed(2)}`;
      const previous = window.localStorage.getItem(key);
      const current = snapshot(next);
      setChangeMessage(!previous ? "This is your first check for this place." : previous === current ? "Nothing meaningful has changed since your last check." : "Something changed since your last check. Review the timing and action below.");
      window.localStorage.setItem(key, current);
    } catch (cause) {
      setData(null);
      setError(cause instanceof Error ? cause.message : "Could not load your tomorrow.");
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setError("Location is not available in this browser. Choose a place below instead.");
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        check({ name: "Your current location", latitude: coords.latitude, longitude: coords.longitude });
      },
      () => { setLocating(false); setError("We could not use your location. Choose a place below instead."); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  return (
    <AppShell>
      <div className="ncg-motion-stack space-y-5 pb-4" key={locale}>
        <section className="ncg-water-panel relative overflow-hidden rounded-[2.25rem] px-5 py-6 sm:px-8 sm:py-8" data-read-aloud>
          <div className="relative z-10 max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0d1f19]/10 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-emerald-800 dark:border-white/10 dark:bg-white/[.07] dark:text-[#d9ff57]"><Sparkles className="h-3.5 w-3.5" /> {tr("My Tomorrow")}</span>
            <h1 className="mt-5 max-w-4xl font-display text-[2.45rem] font-black leading-[.94] tracking-[-.055em] sm:text-6xl">{tr("NaijaClimaGuard tells you what tomorrow could take from you before it gets the chance.")}</h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 dark:text-white/62">{tr("What is coming. When. What it could affect. What to protect. What to do before it becomes your problem.")}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={useMyLocation} disabled={locating} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#071713] px-5 text-sm font-black text-white dark:bg-[#d9ff57] dark:text-[#071713]">
                {locating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} {tr(locating ? "Finding you..." : "Check where I am")}
              </button>
              {QUICK_PLACES.map((item) => <button key={item.name} onClick={() => check(item)} className={`min-h-11 rounded-full border px-4 text-sm font-bold ${place?.name === item.name ? "border-[#071713] bg-white dark:border-[#d9ff57] dark:bg-white/[.08]" : "border-black/10 bg-white/55 text-[#315045] dark:border-white/10 dark:bg-white/[.04] dark:text-white/65"}`}>{item.name}</button>)}
            </div>
          </div>
        </section>

        {!data && !loading && (
          <section className="rounded-[2rem] border border-black/7 bg-white/72 p-6 dark:border-white/10 dark:bg-white/[.045]">
            <p className="text-[11px] font-black uppercase tracking-[.18em] text-emerald-800 dark:text-[#d9ff57]">{tr("Start here")}</p>
            <h2 className="mt-2 font-display text-2xl font-black tracking-[-.035em]">{tr("Check where you are, or choose a place you care about.")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/55">{tr("You do not need an account to see the first answer.")}</p>
          </section>
        )}

        {error && <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-800 dark:text-rose-100">{tr(error)}</div>}
        {loading && <section className="rounded-[2rem] border border-black/7 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[.045]"><div className="flex items-center gap-3 text-sm font-bold"><RefreshCw className="h-5 w-5 animate-spin text-emerald-700 dark:text-[#d9ff57]" /> {tr("Checking what tomorrow means for this place...")}</div></section>}

        {!loading && data && (
          <>
            <section className="rounded-[2.1rem] border border-black/7 bg-white/78 p-5 shadow-[0_18px_55px_rgba(5,25,20,.08)] dark:border-white/10 dark:bg-white/[.055] sm:p-7" data-read-aloud>
              <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2"><span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.18em] text-emerald-800 dark:text-[#d9ff57]"><MapPin className="h-4 w-4" /> {place?.name}</span><span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] ${levelClasses(primary?.severity)}`}>{tr(levelLabel(primary?.severity))}</span></div>
                  <h2 className="mt-3 font-display text-3xl font-black leading-tight tracking-[-.04em] sm:text-5xl">{tr(hero)}</h2>
                  <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600 dark:text-white/62">{tr(heroSub)}</p>
                </div>
                <div className="grid min-w-[220px] gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[1.15rem] bg-[#f3f4ee] px-4 py-3 dark:bg-black/15"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{tr("When")}</p><p className="mt-1 text-sm font-black">{tr(primary?.when || "No strong onset signal")}</p></div>
                  <div className="rounded-[1.15rem] bg-[#f3f4ee] px-4 py-3 dark:bg-black/15"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{tr("Confidence")}</p><p className="mt-1 text-sm font-black">{tr("Not calibrated yet")}</p><p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-white/45">{tr("V7 calibration must earn this number before we display one.")}</p></div>
                </div>
              </div>
              {data.official_safety_state?.active && <div className="mt-5 rounded-[1.3rem] border border-amber-500/20 bg-amber-500/10 p-4"><div className="flex gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-xs font-black uppercase tracking-[.16em]">{tr("Official advisory")}</p><p className="mt-1 text-sm font-bold">{tr(data.official_safety_state.headline || "An official advisory is active.")}</p>{data.official_safety_state.instruction && <p className="mt-1 text-sm leading-6">{tr(data.official_safety_state.instruction)}</p>}</div></div></div>}
            </section>

            <section className="grid gap-3 md:grid-cols-3">
              {[
                ["Safety", HeartPulse, consequence("safety", primary)],
                ["Money", Banknote, consequence("money", primary)],
                ["Time / Movement", Navigation, consequence("time", primary)],
              ].map(([label, Icon, copy]) => {
                const CardIcon = Icon as typeof HeartPulse;
                return <article key={String(label)} className="rounded-[1.8rem] border border-black/7 bg-white/72 p-5 dark:border-white/10 dark:bg-white/[.045]"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-800 dark:text-[#d9ff57]"><CardIcon className="h-5 w-5" /></div><p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{tr(String(label))}</p><p className="mt-2 text-base font-black leading-6">{tr(String(copy))}</p></article>;
              })}
            </section>

            <section className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-[1.9rem] bg-[#071713] p-5 text-white sm:p-6"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-[#d9ff57]"><ShieldCheck className="h-4 w-4" /> {tr("Protect")}</div>{protectList.length ? <div className="mt-4 space-y-2">{protectList.map((item) => <div key={item} className="flex gap-2 text-base font-bold"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#d9ff57]" />{tr(item)}</div>)}</div> : <p className="mt-4 text-base font-bold text-white/70">{tr("No special protection action is showing right now.")}</p>}<Link href="/dashboard" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#d9ff57]">{tr("Protect this place")} <ArrowRight className="h-4 w-4" /></Link></article>
              <article className="rounded-[1.9rem] bg-[#d9ff57] p-5 text-[#071713] sm:p-6"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em]"><Clock3 className="h-4 w-4" /> {tr("Do this")}</div><p className="mt-4 font-display text-2xl font-black leading-tight tracking-[-.035em]">{tr(topAction)}</p>{(primary?.kind === "flood" || primary?.kind === "storm") && <Link href="/safe-route" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#071713] px-4 py-2.5 text-sm font-black text-white"><Route className="h-4 w-4" /> {tr("Check my route")}</Link>}</article>
            </section>

            <section className="rounded-[1.8rem] border border-black/7 bg-white/68 p-5 dark:border-white/10 dark:bg-white/[.04]"><div className="flex gap-3"><History className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800 dark:text-[#d9ff57]" /><div className="flex-1"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{tr("What changed since your last check")}</p><p className="mt-2 text-base font-black">{tr(changeMessage)}</p><p className="mt-1 text-xs text-slate-500 dark:text-white/45">{tr("The answer changes as the forecast changes.")}</p></div><button onClick={() => place && check(place)} aria-label={tr("Refresh")} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 dark:border-white/10"><RefreshCw className="h-4 w-4" /></button></div></section>

            <section className="overflow-hidden rounded-[1.8rem] border border-black/7 bg-white/68 dark:border-white/10 dark:bg-white/[.04]"><button onClick={() => setEvidenceOpen((value) => !value)} className="flex w-full items-center gap-3 p-5 text-left"><Umbrella className="h-5 w-5 text-emerald-800 dark:text-[#d9ff57]" /><div className="flex-1"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{tr("Trust")}</p><p className="mt-1 text-base font-black">{tr("Why we think this")}</p></div><ChevronDown className={`h-5 w-5 transition ${evidenceOpen ? "rotate-180" : ""}`} /></button>{evidenceOpen && <div className="border-t border-black/7 p-5 dark:border-white/8"><p className="text-sm font-bold">{data.meta.core_source} · ECMWF detail {data.source_status.ecmwf_detail === "LIVE" ? tr("live") : tr("optional")}</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/55">{primary ? `${primary.title}. Hazard score ${primary.score}/100. This score is not being presented as calibrated probability.` : tr("No elevated hazard signal is present.")}</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-white/45">{tr("This is decision support, not an official emergency warning. Fresh official instructions take precedence.")}</p>{primary && <div className="mt-3 flex flex-wrap gap-2">{Object.entries(primary.evidence).filter(([, value]) => value !== null).map(([key, value]) => <span key={key} className="rounded-full border border-black/7 px-3 py-1.5 text-[11px] font-bold dark:border-white/10">{key.replaceAll("_", " ")}: {String(value)}</span>)}</div>}</div>}</section>

            <section className="rounded-[1.8rem] border border-dashed border-emerald-800/20 bg-emerald-500/[.045] p-5 dark:border-[#d9ff57]/20 dark:bg-[#d9ff57]/[.035]"><div className="flex gap-3"><CloudRain className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800 dark:text-[#d9ff57]" /><div><p className="text-sm font-black">{tr("Next: prediction becomes proof.")}</p><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-white/55">{tr("After a risk window passes, one-tap outcome checks can confirm what actually happened and build the Nigerian climate-impact intelligence companies can pay to use.")}</p></div></div></section>
          </>
        )}
      </div>
    </AppShell>
  );
}
