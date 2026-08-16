"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Crown, LocateFixed, MapPin, Plus, RefreshCw, ShieldAlert, Trash2, Zap } from "lucide-react";
import ActionCard from "@/components/action/ActionCard";
import SimpleDashboardSummary from "@/components/dashboard/SimpleDashboardSummary";
import MultiSourceIntelligencePanel from "@/components/dashboard/MultiSourceIntelligencePanel";
import { useExperienceProfile } from "@/components/shared/ExperienceProfile";
import { useExplanationMode } from "@/components/shared/ExplanationMode";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { translatePlatformText } from "@/lib/i18n/translate-platform";
import { NIGERIA_ADMIN_AREAS } from "@/lib/nigeria-geography";
import { getRiskLevel } from "@/lib/data";

export interface LocationData {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  alerts?: any[];
}

export interface LiveRisk {
  score: number;
  level: string;
  model: string;
  safety?: {
    active: boolean;
    level: string;
    headline: string | null;
    instruction: string;
    authority?: string;
    sourceName?: string;
    observedAt?: string;
  };
}

interface Props {
  userName?: string | null;
  paymentStatus: string | null;
  locations: LocationData[];
  risks: Record<string, LiveRisk | "loading" | "error">;
  limit: number;
  plan: string;
  showAdd: boolean;
  setShowAdd: (value: boolean) => void;
  newLoc: { name: string; state: string; latitude: string; longitude: string };
  setNewLoc: React.Dispatch<React.SetStateAction<{ name: string; state: string; latitude: string; longitude: string }>>;
  addErr: string;
  addLocation: (preset?: { name: string; state: string; latitude: number; longitude: number }) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  fetchRisk: (location: LocationData) => Promise<void>;
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  PROFESSIONAL: "bg-radar/10 text-radar",
  ENTERPRISE: "bg-amber/10 text-amber",
};

const PRESETS = [
  { name: "Lokoja", state: "Kogi", latitude: 7.8023, longitude: 6.7333 },
  { name: "Makurdi", state: "Benue", latitude: 7.7322, longitude: 8.5391 },
  { name: "Onitsha", state: "Anambra", latitude: 6.1407, longitude: 6.7869 },
  { name: "Yenagoa", state: "Bayelsa", latitude: 4.9247, longitude: 6.2642 },
];

const ROLE_TITLES = {
  HOUSEHOLD: { title: "My Safety", subtitle: "See if a place you care about needs attention and what to do next." },
  FARMER: { title: "My Farm Risk", subtitle: "Protect your farm, livestock, produce and access routes before flooding becomes dangerous." },
  BUSINESS: { title: "Business Risk Overview", subtitle: "See which assets and operations need attention, what sources support the decision, and what continuity action to take." },
  AGENCY: { title: "Operations Overview", subtitle: "Prioritise monitored locations, intelligence sources, warnings, actions and evidence from one operational view." },
} as const;

const plainRiskLabel = (level: string) => {
  const value = level.toUpperCase();
  if (value.includes("CRITICAL")) return "ACT NOW";
  if (value.includes("HIGH")) return "HIGH RISK";
  if (value.includes("MODERATE")) return "GET READY";
  return "LOW RISK";
};

export default function AdaptiveDashboard(props: Props) {
  const { role, setRole } = useExperienceProfile();
  const { mode } = useExplanationMode();
  const { locale } = useLanguage();
  const tr = (source: string) => translatePlatformText(locale, source);
  const copy = ROLE_TITLES[role];
  const scored = Object.values(props.risks).filter((risk): risk is LiveRisk => typeof risk === "object");
  const peak = scored.length ? Math.max(...scored.map((risk) => risk.score)) : null;

  useEffect(() => {
    if (props.plan !== "ENTERPRISE") return;
    const stored = window.localStorage.getItem("naijaclimaguard.action-role");
    if (!stored) setRole("BUSINESS");
  }, [props.plan, setRole]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => props.setNewLoc((current) => ({
      ...current,
      latitude: position.coords.latitude.toFixed(6),
      longitude: position.coords.longitude.toFixed(6),
    })));
  };

  return (
    <div className="space-y-6" key={locale}>
      {props.paymentStatus === "success" && (
        <div className="flex items-center gap-2 rounded-2xl border border-radar/20 bg-radar/5 p-4 text-sm animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-radar" /> {tr("Payment successful — your plan has been upgraded.")}
        </div>
      )}

      {mode !== "simple" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-radar">{role === "HOUSEHOLD" ? tr("Home & family") : role.toLowerCase()}</p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{tr(copy.title)}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{tr(copy.subtitle)}</p>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${PLAN_COLORS[props.plan] ?? PLAN_COLORS.FREE}`}>
            <Crown className="h-3 w-3" /> {props.plan}
          </span>
        </div>
      )}

      {(role === "BUSINESS" || role === "AGENCY") && mode !== "simple" && <MultiSourceIntelligencePanel technical={mode === "technical"} />}

      {mode === "simple" ? (
        <SimpleDashboardSummary role={role} locations={props.locations} risks={props.risks} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="glass-card p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{tr("Highest saved-location index")}</p>
            <p className="mt-1 font-mono text-xl font-bold" style={peak !== null ? { color: getRiskLevel(peak).color } : {}}>{peak !== null ? `${peak}/100` : "—"}</p>
          </div>
          <div className="glass-card p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{tr("Protected assets")}</p>
            <p className="mt-1 font-mono text-xl font-bold">{props.locations.length} <span className="text-xs text-slate-500">/ {props.limit}</span></p>
          </div>
          <div className="glass-card p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{tr("Current risk engine")}</p>
            <p className="mt-1 font-mono text-sm font-bold text-cyan" data-ncg-no-translate="true">Derived-v2 · Open-Meteo</p>
          </div>
          <Link href="/action" className="glass-card p-4 transition-all hover:border-radar/30">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{tr("Alerts")}</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-sm font-bold text-radar"><Zap className="h-3.5 w-3.5" /> {tr("Manage rules →")}</p>
          </Link>
        </div>
      )}

      <section className={mode === "simple" ? "pt-1" : "glass-card p-4 sm:p-6"}>
        <div className={`flex flex-wrap items-end justify-between gap-3 ${mode === "simple" ? "mb-5 border-b border-[#0d1f19]/10 pb-4 dark:border-white/10" : "mb-4"}`}>
          <div>
            <h2 className={`${mode === "simple" ? "font-display text-2xl font-black" : "text-base font-semibold"}`}>
              {mode === "simple" ? tr("Places that matter to you") : role === "BUSINESS" || role === "AGENCY" ? tr("Monitored assets — live risk and action") : tr("Your assets — live risk and action")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "simple" ? tr("Open a place to see what is happening and what you should do.") : tr("Asset type changes the action plan, never the underlying flood score.")}
            </p>
          </div>
          <button onClick={() => props.setShowAdd(!props.showAdd)} className={`${mode === "simple" ? "rounded-full bg-[#071713] px-4 py-2.5 font-bold text-white dark:bg-[#d9ff57] dark:text-[#071713]" : "rounded-lg border border-radar/40 px-3 py-2 font-semibold text-radar"} flex items-center gap-1.5 text-sm`}>
            <Plus className="h-4 w-4" /> {mode === "simple" ? tr("Add place") : tr("Add asset location")}
          </button>
        </div>

        {props.showAdd && (
          <div className={`${mode === "simple" ? "ncg-water-panel rounded-[2rem]" : "rounded-xl border border-slate-100 dark:border-midnight-border"} mb-6 p-4 sm:p-5 animate-slide-down`}>
            {mode === "simple" ? (
              <div className="relative z-10">
                <p className="mb-4 text-sm font-bold">{tr("Add a place you want NaijaClimaGuard to watch")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input placeholder={tr("Place name, e.g. My Farm")} value={props.newLoc.name} onChange={(e) => props.setNewLoc((p) => ({ ...p, name: e.target.value }))} className="rounded-2xl border border-[#0d1f19]/10 bg-white px-4 py-3.5 text-base outline-none dark:border-white/10 dark:bg-[#0b1814]" />
                  <select value={props.newLoc.state} onChange={(e) => props.setNewLoc((p) => ({ ...p, state: e.target.value }))} className="rounded-2xl border border-[#0d1f19]/10 bg-white px-4 py-3.5 text-base outline-none dark:border-white/10 dark:bg-[#0b1814]">
                    {NIGERIA_ADMIN_AREAS.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                  </select>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={useMyLocation} className="flex items-center gap-2 rounded-full border border-[#0d1f19]/12 bg-white px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/5"><LocateFixed className="h-4 w-4 text-radar" /> {tr("Use where I am now")}</button>
                  <button onClick={() => props.addLocation()} disabled={!props.newLoc.name || !props.newLoc.state || !props.newLoc.latitude || !props.newLoc.longitude} className="rounded-full bg-[#071713] px-5 py-3 text-sm font-black text-white disabled:opacity-40 dark:bg-[#d9ff57] dark:text-[#071713]">{tr("Save this place")}</button>
                </div>
                <p className="mt-3 text-xs text-slate-500">{tr("Your browser will ask permission before sharing your location.")}</p>
              </div>
            ) : (
              <>
                <p className="mb-2 text-xs text-slate-500">{tr("Quick add a location:")}</p>
                <div className="mb-4 flex flex-wrap gap-2">{PRESETS.map((preset) => <button key={preset.name} onClick={() => props.addLocation(preset)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold transition-all hover:border-radar/40 dark:border-midnight-border">{preset.name} · {preset.state}</button>)}</div>
                <div className="grid gap-2 sm:grid-cols-5">
                  {(["name", "state", "latitude", "longitude"] as const).map((field) => <input key={field} placeholder={field} value={props.newLoc[field]} onChange={(e) => props.setNewLoc((p) => ({ ...p, [field]: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-radar focus:outline-none dark:border-midnight-border dark:bg-midnight-light" />)}
                  <button onClick={() => props.addLocation()} className="rounded-lg bg-radar px-3 py-2 text-sm font-semibold text-white">{tr("Save")}</button>
                </div>
              </>
            )}
            {props.addErr && <p className="relative z-10 mt-3 text-xs text-crimson">{props.addErr}</p>}
          </div>
        )}

        {props.locations.length === 0 ? (
          <p className="py-10 text-center text-base text-slate-500">{tr("Add your first place above. We will watch the risk and tell you what to do.")}</p>
        ) : (
          <div className={mode === "simple" ? "divide-y divide-[#0d1f19]/10 dark:divide-white/10" : "space-y-5"}>
            {props.locations.map((loc) => {
              const risk = props.risks[loc.id];
              const official = typeof risk === "object" && risk.safety?.active ? risk.safety : null;
              return (
                <article id={`location-${loc.id}`} key={loc.id} className={mode === "simple" ? "scroll-mt-6 py-6 first:pt-1" : "scroll-mt-6 space-y-3 rounded-2xl border border-slate-100 p-4 dark:border-midnight-border"}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${mode === "simple" ? "bg-[#071713] text-[#d9ff57]" : "bg-slate-100 text-slate-400 dark:bg-white/5"}`}><MapPin className="h-5 w-5" /></div>
                      <div className="min-w-0"><p className={`${mode === "simple" ? "text-lg font-black" : "text-base font-semibold"}`}>{loc.name}</p><p className="text-sm text-slate-500">{loc.state}{mode !== "simple" ? ` · ${loc.latitude.toFixed(3)}, ${loc.longitude.toFixed(3)}` : ""}</p></div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {risk === "loading" || risk === undefined ? <span className="text-xs font-semibold text-slate-400">{tr("Checking…")}</span> : risk === "error" ? <button onClick={() => props.fetchRisk(loc)} className="flex items-center gap-1 text-xs font-semibold text-slate-500"><AlertTriangle className="h-4 w-4" /> {tr("Try again")}</button> : mode === "simple" ? <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ${official ? "bg-rose-100 text-rose-800" : risk.score >= 60 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{official ? tr("OFFICIAL WARNING") : tr(plainRiskLabel(risk.level))}</span> : <div className="text-right"><p className="font-mono text-lg font-bold" style={{ color: getRiskLevel(risk.score).color }}>{risk.score}</p><p className="font-mono text-[10px] uppercase" style={{ color: getRiskLevel(risk.score).color }}>{risk.level}</p></div>}
                      {mode !== "simple" && <button onClick={() => props.fetchRisk(loc)} title={tr("Refresh")} className="rounded-lg border border-slate-200 p-2 text-slate-400 dark:border-midnight-border"><RefreshCw className="h-3.5 w-3.5" /></button>}
                      <button onClick={() => props.deleteLocation(loc.id)} title={tr("Remove")} className={`${mode === "simple" ? "opacity-45 hover:opacity-100" : "rounded-lg border border-slate-200 p-2 text-slate-400 dark:border-midnight-border"} text-slate-400 hover:text-crimson`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>

                  {official && (
                    <div className="mt-4 rounded-2xl border-l-4 border-crimson bg-crimson/5 px-4 py-3">
                      <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-crimson" /><div><p className="font-bold text-crimson">{official.headline ?? tr("OFFICIAL ADVISORY ACTIVE")}</p><p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{official.instruction}</p>{mode !== "simple" && <p className="mt-2 text-xs text-slate-500">Authority: {official.authority ?? "authorised source"}{official.observedAt ? ` · issued ${new Date(official.observedAt).toLocaleString()}` : ""}</p>}</div></div>
                    </div>
                  )}

                  {typeof risk === "object" && <div className="mt-4"><ActionCard score={risk.score} level={risk.level} locationId={loc.id} locationName={loc.name} model={risk.model} /></div>}
                </article>
              );
            })}
          </div>
        )}

        {mode !== "simple" && <p className="mt-4 border-l-2 border-slate-200 pl-3 text-[11px] leading-relaxed text-slate-500 dark:border-midnight-border">Live scores currently use the disclosed derived-v2 Open-Meteo risk engine. Official advisories are a separate safety overlay and never rewrite the model score. Model v5 remains separate until validation is complete.</p>}
      </section>
    </div>
  );
}
