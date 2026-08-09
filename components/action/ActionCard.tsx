"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react";
import { ExplanationMode, getActionGuidance, UserRole } from "@/lib/action-guidance";

interface ActionCardProps {
  score: number;
  level: string;
  locationName: string;
  model?: string;
  threshold?: number;
  defaultRole?: UserRole;
}

const ROLE_LABELS: Record<UserRole, string> = {
  HOUSEHOLD: "Household",
  FARMER: "Farmer",
  BUSINESS: "Business",
  AGENCY: "Agency",
};

const MODE_LABELS: Record<ExplanationMode, string> = {
  simple: "Simple",
  detailed: "Detailed",
  technical: "Technical",
};

const ROLE_STORAGE_KEY = "naijaclimaguard.action-role";
const MODE_STORAGE_KEY = "naijaclimaguard.explanation-mode";

const isUserRole = (value: string | null): value is UserRole =>
  value !== null && Object.prototype.hasOwnProperty.call(ROLE_LABELS, value);

const isExplanationMode = (value: string | null): value is ExplanationMode =>
  value !== null && Object.prototype.hasOwnProperty.call(MODE_LABELS, value);

export default function ActionCard({
  score,
  level,
  locationName,
  model,
  threshold,
  defaultRole = "HOUSEHOLD",
}: ActionCardProps) {
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [mode, setMode] = useState<ExplanationMode>("simple");
  const [done, setDone] = useState<number[]>([]);

  useEffect(() => {
    const savedRole = window.localStorage.getItem(ROLE_STORAGE_KEY);
    const savedMode = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (isUserRole(savedRole)) setRole(savedRole);
    if (isExplanationMode(savedMode)) setMode(savedMode);
  }, []);

  const changeRole = (next: UserRole) => {
    setRole(next);
    setDone([]);
    window.localStorage.setItem(ROLE_STORAGE_KEY, next);
  };

  const changeMode = (next: ExplanationMode) => {
    setMode(next);
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
  };

  const guidance = useMemo(
    () => getActionGuidance({ score, level, role, locationName, model, threshold }),
    [score, level, role, locationName, model, threshold],
  );

  const explanation = guidance[mode];
  const urgencyClass = guidance.urgency === "act"
    ? "border-crimson/30 bg-crimson/5"
    : guidance.urgency === "prepare"
      ? "border-amber/30 bg-amber/5"
      : "border-radar/20 bg-radar/5";

  return (
    <section className={`rounded-2xl border p-5 ${urgencyClass}`} aria-label={`Recommended actions for ${locationName}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            {guidance.urgency === "act" ? <AlertTriangle className="h-5 w-5 text-crimson" /> : <ShieldCheck className="h-5 w-5 text-radar" />}
            <h3 className="font-display text-lg font-bold">{guidance.headline}</h3>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{explanation}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor={`role-${locationName}`}>User type</label>
          <select
            id={`role-${locationName}`}
            value={role}
            onChange={(e) => changeRole(e.target.value as UserRole)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold dark:border-midnight-border dark:bg-midnight-light"
          >
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Explanation level">
        {(Object.keys(MODE_LABELS) as ExplanationMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => changeMode(m)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${mode === m ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "border border-slate-200 text-slate-500 dark:border-midnight-border"}`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {guidance.actions.map((action, index) => {
          const complete = done.includes(index);
          return (
            <button
              key={`${role}-${index}`}
              type="button"
              onClick={() => setDone((current) => complete ? current.filter((x) => x !== index) : [...current, index])}
              className="flex w-full items-start gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-3 text-left transition-all hover:border-radar/30 dark:border-midnight-border dark:bg-midnight-light/60"
            >
              {complete ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-radar" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
              <span className={`text-sm leading-relaxed ${complete ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>{action}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        Your user type and explanation level are remembered on this device. Decision support only: follow instructions from authorised emergency agencies and verified local responders. Completing an item here records only your local checklist state; it does not confirm an official evacuation or response action.
      </p>
    </section>
  );
}
