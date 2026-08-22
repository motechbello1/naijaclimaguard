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
import { useEffect, useMemo, useState } from "react";

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
  headline: string;
  primary_hazard: HazardSignal | null;
  hazards: HazardSignal[];
  next_7_days: { highest_risk_day: string | null; highest_risk_score: number };
  source_status: {
    core_weather: "LIVE";
    ecmwf_detail: "LIVE" | "UNAVAILABLE_OPTIONAL";
    approval_or_api_key_required: false;
  };
  generated_at: string;
  limitations: string[];
  official_safety_state?: {
    active: boolean;
    level: string;
    headline: string | null;
    instruction: string | null;
  };
  product_answer: {
    what_is_coming: string;
    when: string;
    how_serious: Severity | "LOW";
    what_it_could_affect: string[];
    what_to_do: string[];
  };
  meta: {
    engine: string;
    public_warning_authority: boolean;
    core_source: string;
    optional_detail_source: string;
    source_access: string;
  };
};

type Place = { name: string; latitude: number; longitude: number };

const QUICK_PLACES: Place[] = [
  { name: "Abuja", latitude: 9.0765, longitude: 7.3986 },
  { name: "Lokoja", latitude: 7.8023, longitude: 6.7333 },
  { name: "Makurdi", latitude: 7.7322, longitude: 8.5391 },
  { name: "Yenagoa", latitude: 4.9247, longitude: 6.2642 },
  { name: "Onitsha", latitude: 6.1407, longitude: 6.7869 },
];

function levelLabel(severity: Severity | undefined) {
  if (severity === "HIGH") return "Act";
  if (severity === "ELEVATED") return "Prepare";
  if (severity === "WATCH") return "Watch";
  return "Clear";
}

function levelClasses(severity: Severity | undefined) {
  if (severity === "HIGH") return "border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-200";
  if (severity === "ELEVATED") return "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-200";
  if (severity === "WATCH") return "border-yellow-500/20 bg-yellow-500/10 text-yellow-800 dark:text-yellow-100";
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
}

function riskCopy(data: TomorrowResponse) {
  const primary = data.primary_hazard;
  if (!primary || primary.severity === "LOW") {
    return {
      hero: "Tomorrow looks okay around you.",
      sub: "Nothing serious is showing right now. We will tell you if that changes.",
    };
  }
  if (primary.severity === "HIGH") {
    return {
      hero: "Something could seriously affect your plans.",
      sub: `${primary.title}. The strongest signal is ${primary.when}.`,
    };
  }
  return {
    hero: "Something could disrupt your tomorrow.",
    sub: `${primary.title}. The strongest signal is ${primary.when}.`,
  };
}

function consequenceCopy(kind: "safety" | "money" | "time", hazard: HazardSignal | null) {
  if (!hazard || hazard.severity === "LOW") {
    if (kind === "safety") return "No special protection action is showing from the current forecast.";
    if (kind === "money") return "No meaningful weather-related exposure is showing from the current signal.";
    return "No major movement disruption is showing from the current signal.";
  }

  if (kind === "safety") {
    return hazard.affects.length
      ? `Watch ${hazard.affects.slice(0, 2).join(" and ")}.`
      : "Check the people and places you depend on before conditions worsen.";
  }
  if (kind === "money") {
    return "Possible exposure is visible, but there is not enough personal data yet for a trustworthy naira estimate. NaijaClimaGuard will not invent one.";
  }
  return hazard.kind === "flood" || hazard.kind === "storm"
    ? `Your normal movement could be affected ${hazard.when}. Check your route before leaving.`
    : `Plan around the strongest conditions ${hazard.when}.`;
}

function formatCheckedAt(value: string | undefined) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function stableSnapshot(data: TomorrowResponse) {
  const primary = data.primary_hazard;
  return JSON.stringify({
    status: data.status,
    kind: primary?.kind ?? null,
    severity: primary?.severity ?? "LOW",
    scoreBand: primary ? Math.floor(primary.score / 10) * 10 : 0,
    when: primary?.when ?? null,
  });
}

function MyTomorrowContent() {
  const { locale } = useLanguage();
  const tr = (source: string) => translatePlatformText(locale, source);
  const [place, setPlace] = useState<Place | null>(null);
  const [data, setData] = useState<TomorrowResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [changeMessage, setChangeMessage] = useState("This is your first check for this place.");

  const primary = data?.primary_hazard ?? null;
  const hero = data ? riskCopy(data) : null;

  const loadPlace = async (nextPlace: Place) => {
    setPlace(nextPlace);
    setLoading(true);
    setError("");
    setEvidenceOpen(false);
    try {
      const query = new URLSearchParams({
        latitude: String(nextPlace.latitude),
        longitude: String(nextPlace.longitude),
        name: nextPlace.name,
      });
      const response = await fetch(`/api/v1/my-tomorrow?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Could not load your tomorrow.");
      const next = payload as TomorrowResponse;
      setData(next);

      const key = `ncg.my-tomorrow.${nextPlace.latitude.toFixed(2)}.${nextPlace.longitude.toFixed(2)}`;
      const previous = window.localStorage.getItem(key);
      const current = stableSnapshot(next);
      if (!previous) {
        setChangeMessage("This is your first check for this place.");
      } else if (previous === current) {
        setChangeMessage("Nothing meaningful has changed since your last check.");
      } else {
        setChangeMessage("Something changed since your last check. Review the latest timing and action below.");
      }
      window.localStorage.setItem(key, current);
    } catch (cause) {
      setData(null);
      setError(cause instanceof Error ? cause.message : "Could not load your tomorrow.");
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser. Choose a place below instead.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        loadPlace({
          name: "Your current location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setLocating(false);
        setError("We could not use your location. Choose a place below instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    // Give the first screen immediate value without triggering a browser permission prompt.
    if (!place && !data) loadPlace(QUICK_PLACES[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const protectList = useMemo(() => {
    if (!primary || primary.severity === "LOW") return [];
    return primary.affects.slice(0, 3);
  }, [primary]);

  const topAction = primary?.actions?.[0] || "No special action is needed from the current forecast. Check again if your plans change.";

  return (
    <AppShell>
      <div className="ncg-motion-stack space-y-5 pb-4" key={locale}>
        <section className="ncg-water-panel relative overflow-hidden rounded-[2.25rem] px-5 py-6 sm:px-8 sm:py-8" data-read-aloud>
          <div className="relative z-10 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0d1f19]/10 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-emerald-800 dark:border-white/10 dark:bg-white/[.07] dark:text-[#d9ff57]">
                <Sparkles className="h-3.5 w-3.5" /> {tr("My Tomorrow")}
              </span>
              {data && (
                <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] ${levelClasses(primary?.severity)}`}>
                  {tr(levelLabel(primary?.severity))}
                </span>
              )}
            </div>

            <h1 className="mt-5 max-w-4xl font-display text-[2.45rem] font-black leading-[.94] tracking-[-.055em] sm:text-6xl">
              {tr("NaijaClimaGuard tells you what tomorrow could take from you before it gets the chance.")}
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 dark:text-white/62">
              {tr("What is coming. When. What it could affect. What to protect. What to do before it becomes your problem.")}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={useMyLocation}
                disabled={locating}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#071713] px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60 dark:bg-[#d9ff57] dark:text-[#071713]"
              >
                {locating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                {tr(locating ? "Finding you..." : "Check where I am")}
              </button>
              {QUICK_PLACES.map((item) => (
                <button
                  key={item.name}
                  onClick={() => loadPlace(item)}
                  className={`min-h-11 rounded-full border px-4 text-sm font-bold transition ${place?.name === item.name ? "border-[#071713] bg-white text-[#071713] dark:border-[#d9ff57] dark:bg-white/[.08] dark:text-white" : "border-[#0d1f19]/10 bg-white/55 text-[#315045] hover:bg-white dark:border-white/10 dark:bg-white/[.04] dark:text-white/65 dark:hover:bg-white/[.08]"}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-800 dark:text-rose-100">
            {tr(error)}
          </div>
        )}

        {loading && (
          <section className="rounded-[2rem] border border-black/7 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[.045]">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-white/65">
              <RefreshCw className="h-5 w-5 animate-spin text-emerald-700 dark:text-[#d9ff57]" />
              {tr("Checking what tomorrow means for this place...")}
            </div>
          </section>
        )}

        {!loading && data && hero && (
          <>
            <section className="rounded-[2.1rem] border border-black/7 bg-white/78 p-5 shadow-[0_18px_55px_rgba(5,25,20,.08)] dark:border-white/10 dark:bg-white/[.055] sm:p-7" data-read-aloud>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.18em] text-emerald-800 dark:text-[#d9ff57]">
                    <MapPin className="h-4 w-4" /> {place?.name || tr("This place")}
                  </div>
                  <h2 className="mt-3 font-display text-3xl font-black leading-tight tracking-[-.04em] sm:text-5xl">{tr(hero.hero)}</h2>
                  <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600 dark:text-white/62">{tr(hero.sub)}</p>
                </div>
                <div className="grid min-w-[210px] grid-cols-2 gap-2 lg:grid-cols-1">
                  <div className="rounded-[1.15rem] border border-black/7 bg-[#f3f4ee] px-4 py-3 dark:border-white/8 dark:bg-black/15">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{tr("When")}</p>
                    <p className="mt-1 text-sm font-black">{tr(primary?.when || "No strong onset signal")}</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-black/7 bg-[#f3f4ee] px-4 py-3 dark:border-white/8 dark:bg-black/15">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{tr("Confidence")}</p>
                    <p className="mt-1 text-sm font-black">{primary ? `${Math.min(95, Math.max(55, Math.round(55 + primary.score * 0.4)))}% signal confidence` : tr("Low-risk signal")}</p>
                  </div>
                </div>
              </div>

              {data.official_safety_state?.active && (
                <div className="mt-5 rounded-[1.3rem] border border-amber-500/20 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-200" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-[.16em] text-amber-800 dark:text-amber-100">{tr("Official advisory")}</p>
                      <p className="mt-1 text-sm font-bold">{tr(data.official_safety_state.headline || "An official advisory is active for this area.")}</p>
                      {data.official_safety_state.instruction && <p className="mt-1 text-sm leading-6 text-amber-900/75 dark:text-amber-100/75">{tr(data.official_safety_state.instruction)}</p>}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="grid gap-3 md:grid-cols-3">
              <article className="rounded-[1.8rem] border border-black/7 bg-white/72 p-5 dark:border-white/10 dark:bg-white/[.045]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-800 dark:text-[#d9ff57]"><HeartPulse className="h-5 w-5" /></div>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{tr("Safety")}</p>
                <p className="mt-2 text-base font-black leading-6">{tr(consequenceCopy("safety", primary))}</p>
              </article>
              <article className="rounded-[1.8rem] border border-black/7 bg-white/72 p-5 dark:border-white/10 dark:bg-white/[.045]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-200"><Banknote className="h-5 w-5" /></div>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{tr("Money")}</p>
                <p className="mt-2 text-base font-black leading-6">{tr(consequenceCopy("money", primary))}</p>
              </article>
              <article className="rounded-[1.8rem] border border-black/7 bg-white/72 p-5 dark:border-white/10 dark:bg-white/[.045]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-800 dark:text-sky-200"><Navigation className="h-5 w-5" /></div>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{tr("Time / Movement")}</p>
                <p className="mt-2 text-base font-black leading-6">{tr(consequenceCopy("time", primary))}</p>
              </article>
            </section>

            <section className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-[1.9rem] border border-black/7 bg-[#071713] p-5 text-white dark:border-white/10 sm:p-6">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-[#d9ff57]"><ShieldCheck className="h-4 w-4" /> {tr("Protect")}</div>
                {protectList.length ? (
                  <div className="mt-4 space-y-2">
                    {protectList.map((item) => <div key={item} className="flex items-start gap-2 text-base font-bold"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#d9ff57]" />{tr(item)}</div>)}
                  </div>
                ) : (
                  <p className="mt-4 text-base font-bold text-white/75">{tr("No special protection action is showing right now.")}</p>
                )}
                <Link href="/dashboard" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#d9ff57]">{tr("Protect this place") } <ArrowRight className="h-4 w-4" /></Link>
              </article>

              <article className="rounded-[1.9rem] border border-[#d9ff57]/35 bg-[#d9ff57] p-5 text-[#071713] sm:p-6">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em]"><Clock3 className="h-4 w-4" /> {tr(primary?.severity === "LOW" || !primary ? "Do this" : "Do this before conditions worsen")}</div>
                <p className="mt-4 font-display text-2xl font-black leading-tight tracking-[-.035em]">{tr(topAction)}</p>
                {(primary?.kind === "flood" || primary?.kind === "storm") && (
                  <Link href="/safe-route" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#071713] px-4 py-2.5 text-sm font-black text-white"><Route className="h-4 w-4" /> {tr("Check my route")}</Link>
                )}
              </article>
            </section>

            <section className="rounded-[1.8rem] border border-black/7 bg-white/68 p-5 dark:border-white/10 dark:bg-white/[.04]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[.045] text-emerald-800 dark:bg-white/[.06] dark:text-[#d9ff57]"><History className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{tr("What changed since your last check")}</p>
                  <p className="mt-2 text-base font-black">{tr(changeMessage)}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-white/45">{tr("Last checked")} {formatCheckedAt(data.generated_at)} · {tr("Data changes as forecasts change")}</p>
                </div>
                <button onClick={() => place && loadPlace(place)} aria-label={tr("Refresh")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/8 bg-white/70 hover:bg-white dark:border-white/10 dark:bg-white/[.04] dark:hover:bg-white/[.08]"><RefreshCw className="h-4 w-4" /></button>
              </div>
            </section>

            <section className="overflow-hidden rounded-[1.8rem] border border-black/7 bg-white/68 dark:border-white/10 dark:bg-white/[.04]">
              <button onClick={() => setEvidenceOpen((value) => !value)} className="flex w-full items-center gap-3 p-5 text-left">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[.045] text-emerald-800 dark:bg-white/[.06] dark:text-[#d9ff57]"><Umbrella className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{tr("Trust")}</p><p className="mt-1 text-base font-black">{tr("Why we think this")}</p></div>
                <ChevronDown className={`h-5 w-5 transition ${evidenceOpen ? "rotate-180" : ""}`} />
              </button>
              {evidenceOpen && (
                <div className="border-t border-black/7 px-5 pb-5 pt-4 dark:border-white/8">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1.2rem] bg-[#f3f4ee] p-4 dark:bg-black/15"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{tr("Sources")}</p><p className="mt-2 text-sm font-bold">{data.meta.core_source}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/45">ECMWF detail: {data.source_status.ecmwf_detail === "LIVE" ? tr("live") : tr("optional source unavailable")}</p></div>
                    <div className="rounded-[1.2rem] bg-[#f3f4ee] p-4 dark:bg-black/15"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{tr("Evidence")}</p><p className="mt-2 text-sm font-bold">{primary ? `${primary.title} · score ${primary.score}/100` : tr("No elevated hazard signal")}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/45">{tr("This is decision support, not an official emergency warning. Official instructions take precedence.")}</p></div>
                  </div>
                  {primary && Object.keys(primary.evidence || {}).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(primary.evidence).filter(([, value]) => value !== null).map(([key, value]) => (
                        <span key={key} className="rounded-full border border-black/7 bg-white px-3 py-1.5 text-[11px] font-bold dark:border-white/10 dark:bg-white/[.05]">{key.replaceAll("_", " ")}: {String(value)}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-[1.8rem] border border-dashed border-emerald-800/20 bg-emerald-500/[.045] p-5 dark:border-[#d9ff57]/20 dark:bg-[#d9ff57]/[.035]">
              <div className="flex items-start gap-3">
                <CloudRain className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800 dark:text-[#d9ff57]" />
                <div><p className="text-sm font-black">{tr("After the risk window passes, My Tomorrow will turn prediction into proof.")}</p><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-white/55">{tr("One tap: Did this road flood? Was your journey delayed? Did the advice help? That outcome improves your history and, after quality checks, improves NaijaClimaGuard's Nigerian climate-impact intelligence.")}</p></div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function MyTomorrowPage() {
  return <MyTomorrowContent />;
}
