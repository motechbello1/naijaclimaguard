"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Crown, LocateFixed, MapPin, Plus, RefreshCw, Trash2, Zap } from "lucide-react";
import ActionCard from "@/components/action/ActionCard";
import SimpleDashboardSummary from "@/components/dashboard/SimpleDashboardSummary";
import { useExperienceProfile } from "@/components/shared/ExperienceProfile";
import { useExplanationMode } from "@/components/shared/ExplanationMode";
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
  BUSINESS: { title: "Business Risk Overview", subtitle: "See which saved site needs attention and what continuity action to take." },
  AGENCY: { title: "Operations Overview", subtitle: "Prioritise monitored locations, actions and evidence from one operational view." },
} as const;

const plainRiskLabel = (level: string) => {
  const value = level.toUpperCase();
  if (value.includes("CRITICAL")) return "ACT NOW";
  if (value.includes("HIGH")) return "HIGH RISK";
  if (value.includes("MODERATE")) return "GET READY";
  return "LOW RISK";
};

export default function AdaptiveDashboard(props: Props) {
  const { role } = useExperienceProfile();
  const { mode } = useExplanationMode();
  const copy = ROLE_TITLES[role];
  const scored = Object.values(props.risks).filter((risk): risk is LiveRisk => typeof risk === "object");
  const peak = scored.length ? Math.max(...scored.map((risk) => risk.score)) : null;

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => props.setNewLoc((current) => ({
        ...current,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
      })),
    );
  };

  return (
    <div className="space-y-6">
      {props.paymentStatus === "success" && (
        <div className="flex items-center gap-2 rounded-xl border border-radar/30 bg-radar/5 p-4 text-sm animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-radar" /> Payment successful — your plan has been upgraded.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-radar">{role === "HOUSEHOLD" ? "Home & family" : role.toLowerCase()}</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{copy.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        {mode !== "simple" && (
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${PLAN_COLORS[props.plan] ?? PLAN_COLORS.FREE}`}>
            <Crown className="h-3 w-3" /> {props.plan}
          </span>
        )}
      </div>

      {mode === "simple" ? (
        <SimpleDashboardSummary role={role} locations={props.locations} risks={props.risks} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="glass-card rounded-xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Highest saved-location index</p>
            <p className="mt-1 font-mono text-xl font-bold" style={peak !== null ? { color: getRiskLevel(peak).color } : {}}>{peak !== null ? `${peak}/100` : "—"}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Protected assets</p>
            <p className="mt-1 font-mono text-xl font-bold">{props.locations.length} <span className="text-xs text-slate-500">/ {props.limit}</span></p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Current risk engine</p>
            <p className="mt-1 font-mono text-sm font-bold text-cyan">Derived-v2 · Open-Meteo</p>
          </div>
          <Link href="/action" className="glass-card rounded-xl p-4 transition-all hover:border-radar/30">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Alerts</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-sm font-bold text-radar"><Zap className="h-3.5 w-3.5" /> Manage rules →</p>
          </Link>
        </div>
      )}

      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{mode === "simple" ? "Places I care about" : "Your assets — live risk and action"}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {mode === "simple" ? "You do not need to understand weather numbers. Open a place and follow the action steps." : "Asset type changes the action plan, never the underlying flood score."}
            </p>
          </div>
          <button onClick={() => props.setShowAdd(!props.showAdd)} className="flex items-center gap-1.5 rounded-lg border border-radar/40 px-3 py-2 text-sm font-semibold text-radar transition-all hover:bg-radar/5">
            <Plus className="h-4 w-4" /> {mode === "simple" ? "Add a place" : "Add asset location"}
          </button>
        </div>

        {props.showAdd && (
          <div className="mb-5 rounded-xl border border-slate-100 p-4 dark:border-midnight-border animate-slide-down">
            {mode === "simple" ? (
              <>
                <p className="mb-3 text-sm font-semibold">Add a place you want NaijaClimaGuard to watch</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input placeholder="Place name, e.g. My Farm" value={props.newLoc.name} onChange={(e) => props.setNewLoc((p) => ({ ...p, name: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-base focus:border-radar focus:outline-none dark:border-midnight-border dark:bg-midnight-light" />
                  <input placeholder="State, e.g. Kogi" value={props.newLoc.state} onChange={(e) => props.setNewLoc((p) => ({ ...p, state: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-base focus:border-radar focus:outline-none dark:border-midnight-border dark:bg-midnight-light" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={useMyLocation} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-midnight-border"><LocateFixed className="h-4 w-4 text-radar" /> Use where I am now</button>
                  <button onClick={() => props.addLocation()} disabled={!props.newLoc.name || !props.newLoc.state || !props.newLoc.latitude || !props.newLoc.longitude} className="rounded-lg bg-radar px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Save this place</button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Your browser will ask permission before sharing your location.</p>
              </>
            ) : (
              <>
                <p className="mb-2 text-xs text-slate-500">Quick add a location:</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {PRESETS.map((preset) => <button key={preset.name} onClick={() => props.addLocation(preset)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold transition-all hover:border-radar/40 dark:border-midnight-border">{preset.name} · {preset.state}</button>)}
                </div>
                <div className="grid gap-2 sm:grid-cols-5">
                  {(["name", "state", "latitude", "longitude"] as const).map((field) => <input key={field} placeholder={field} value={props.newLoc[field]} onChange={(e) => props.setNewLoc((p) => ({ ...p, [field]: e.target.value }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-radar focus:outline-none dark:border-midnight-border dark:bg-midnight-light" />)}
                  <button onClick={() => props.addLocation()} className="rounded-lg bg-radar px-3 py-2 text-sm font-semibold text-white">Save</button>
                </div>
              </>
            )}
            {props.addErr && <p className="mt-2 text-xs text-crimson">{props.addErr}</p>}
          </div>
        )}

        {props.locations.length === 0 ? (
          <p className="py-10 text-center text-base text-slate-500">Add your first place above. We will watch the risk and tell you what to do.</p>
        ) : (
          <div className="space-y-5">
            {props.locations.map((loc) => {
              const risk = props.risks[loc.id];
              return (
                <div id={`location-${loc.id}`} key={loc.id} className="scroll-mt-6 space-y-3 rounded-2xl border border-slate-100 p-4 dark:border-midnight-border">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-base font-semibold">{loc.name}</p>
                        <p className="text-sm text-slate-500">{loc.state}{mode !== "simple" ? ` · ${loc.latitude.toFixed(3)}, ${loc.longitude.toFixed(3)}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {risk === "loading" || risk === undefined ? (
                        <span className="text-sm text-slate-400">Checking…</span>
                      ) : risk === "error" ? (
                        <button onClick={() => props.fetchRisk(loc)} className="flex items-center gap-1 text-sm text-slate-500"><AlertTriangle className="h-4 w-4" /> Try again</button>
                      ) : mode === "simple" ? (
                        <span className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-bold dark:border-midnight-border">{plainRiskLabel(risk.level)}</span>
                      ) : (
                        <div className="text-right">
                          <p className="font-mono text-lg font-bold" style={{ color: getRiskLevel(risk.score).color }}>{risk.score}</p>
                          <p className="font-mono text-[10px] uppercase" style={{ color: getRiskLevel(risk.score).color }}>{risk.level}</p>
                        </div>
                      )}
                      {mode !== "simple" && <button onClick={() => props.fetchRisk(loc)} title="Refresh" className="rounded-lg border border-slate-200 p-2 text-slate-400 dark:border-midnight-border"><RefreshCw className="h-3.5 w-3.5" /></button>}
                      <button onClick={() => props.deleteLocation(loc.id)} title="Remove" className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-crimson dark:border-midnight-border"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>

                  {typeof risk === "object" && <ActionCard score={risk.score} level={risk.level} locationId={loc.id} locationName={loc.name} model={risk.model} />}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 border-l-2 border-slate-200 pl-3 text-[11px] leading-relaxed text-slate-500 dark:border-midnight-border">
          {mode === "simple"
            ? "NaijaClimaGuard helps you decide what to do. Always follow official emergency instructions and verified local responders."
            : "Live scores currently use the disclosed derived-v2 Open-Meteo risk engine. Asset profiles and Action Cards change guidance, not the model score. Model v5 remains separate until validation is complete."}
        </p>
      </div>
    </div>
  );
}
