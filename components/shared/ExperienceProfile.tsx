"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Building2, House, Landmark, Sprout } from "lucide-react";

export type ExperienceRole = "HOUSEHOLD" | "FARMER" | "BUSINESS" | "AGENCY";

type ExperienceContextValue = {
  role: ExperienceRole;
  setRole: (role: ExperienceRole) => void;
  hydrated: boolean;
};

const STORAGE_KEY = "naijaclimaguard.action-role";
const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export const EXPERIENCE_LABELS: Record<ExperienceRole, string> = {
  HOUSEHOLD: "Home & Family",
  FARMER: "Farmer",
  BUSINESS: "Business",
  AGENCY: "Agency",
};

const EXPERIENCE_ICONS = {
  HOUSEHOLD: House,
  FARMER: Sprout,
  BUSINESS: Building2,
  AGENCY: Landmark,
};

export function ExperienceProfileProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<ExperienceRole>("HOUSEHOLD");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ExperienceRole | null;
    const initial = stored && stored in EXPERIENCE_LABELS ? stored : "HOUSEHOLD";
    setRoleState(initial);
    document.documentElement.dataset.experienceRole = initial.toLowerCase();
    setHydrated(true);
  }, []);

  const setRole = (next: ExperienceRole) => {
    setRoleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.dataset.experienceRole = next.toLowerCase();
    window.dispatchEvent(new CustomEvent("naijaclimaguard:role-change", { detail: next }));
  };

  useEffect(() => {
    const sync = (event: Event) => {
      const next = (event as CustomEvent<ExperienceRole>).detail;
      if (next && next in EXPERIENCE_LABELS) {
        setRoleState(next);
        document.documentElement.dataset.experienceRole = next.toLowerCase();
      }
    };
    window.addEventListener("naijaclimaguard:role-change", sync);
    return () => window.removeEventListener("naijaclimaguard:role-change", sync);
  }, []);

  const value = useMemo(() => ({ role, setRole, hydrated }), [role, hydrated]);
  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperienceProfile() {
  const value = useContext(ExperienceContext);
  if (!value) throw new Error("useExperienceProfile must be used inside ExperienceProfileProvider");
  return value;
}

export function ExperienceRoleControl() {
  const { role, setRole } = useExperienceProfile();
  const Icon = EXPERIENCE_ICONS[role];

  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-2.5 py-2 text-xs dark:border-midnight-border dark:bg-midnight-light/70">
      <Icon className="h-4 w-4 text-radar" />
      <span className="hidden lg:inline text-slate-400">View as</span>
      <select
        value={role}
        onChange={(event) => setRole(event.target.value as ExperienceRole)}
        className="bg-transparent font-semibold text-slate-700 outline-none dark:text-slate-200"
        aria-label="Choose dashboard user type"
      >
        {(Object.keys(EXPERIENCE_LABELS) as ExperienceRole[]).map((item) => (
          <option key={item} value={item}>{EXPERIENCE_LABELS[item]}</option>
        ))}
      </select>
    </label>
  );
}
