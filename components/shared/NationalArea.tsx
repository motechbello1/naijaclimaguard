"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { NIGERIA_ADMIN_AREAS, type NigeriaAdministrativeArea } from "@/lib/nigeria-geography";

type NationalAreaContextValue = {
  area: NigeriaAdministrativeArea;
  setAreaName: (name: string) => void;
  hydrated: boolean;
};

const STORAGE_KEY = "naijaclimaguard.national-area";
const DEFAULT_AREA = NIGERIA_ADMIN_AREAS.find((item) => item.name === "Kogi") ?? NIGERIA_ADMIN_AREAS[0];
const NationalAreaContext = createContext<NationalAreaContextValue | null>(null);

export function NationalAreaProvider({ children }: { children: React.ReactNode }) {
  const [area, setArea] = useState<NigeriaAdministrativeArea>(DEFAULT_AREA);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const found = NIGERIA_ADMIN_AREAS.find((item) => item.name === stored);
    if (found) setArea(found);
    setHydrated(true);
  }, []);

  const setAreaName = (name: string) => {
    const found = NIGERIA_ADMIN_AREAS.find((item) => item.name === name);
    if (!found) return;
    setArea(found);
    window.localStorage.setItem(STORAGE_KEY, found.name);
    window.dispatchEvent(new CustomEvent("naijaclimaguard:national-area", { detail: found.name }));
  };

  useEffect(() => {
    const sync = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      const found = NIGERIA_ADMIN_AREAS.find((item) => item.name === name);
      if (found) setArea(found);
    };
    window.addEventListener("naijaclimaguard:national-area", sync);
    return () => window.removeEventListener("naijaclimaguard:national-area", sync);
  }, []);

  const value = useMemo(() => ({ area, setAreaName, hydrated }), [area, hydrated]);
  return <NationalAreaContext.Provider value={value}>{children}</NationalAreaContext.Provider>;
}

export function useNationalArea() {
  const value = useContext(NationalAreaContext);
  if (!value) throw new Error("useNationalArea must be used inside NationalAreaProvider");
  return value;
}

export function NationalAreaControl({ compact = false }: { compact?: boolean }) {
  const { area, setAreaName } = useNationalArea();
  return (
    <label className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-radar" />
      {!compact && <span className="hidden xl:inline font-semibold text-slate-400">Working area</span>}
      <select value={area.name} onChange={(event) => setAreaName(event.target.value)} className="max-w-[180px] bg-transparent font-black text-[#071713] outline-none dark:text-white" aria-label="Choose Nigerian state or FCT">
        {NIGERIA_ADMIN_AREAS.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
      </select>
    </label>
  );
}
