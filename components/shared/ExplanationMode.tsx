"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BookOpen, Gauge, SlidersHorizontal } from "lucide-react";

export type ExplanationMode = "simple" | "standard" | "technical";

type ExplainableText = {
  simple: React.ReactNode;
  standard: React.ReactNode;
  technical: React.ReactNode;
};

type ExplanationContextValue = {
  mode: ExplanationMode;
  setMode: (mode: ExplanationMode) => void;
};

const STORAGE_KEY = "naijaclimaguard:explanation-mode";
const MODES: ExplanationMode[] = ["simple", "standard", "technical"];

const ExplanationContext = createContext<ExplanationContextValue | null>(null);

export function ExplanationModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ExplanationMode>("standard");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && MODES.includes(stored as ExplanationMode)) {
      setModeState(stored as ExplanationMode);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.dataset.explanationMode = mode;
  }, [mode]);

  const value = useMemo(
    () => ({ mode, setMode: setModeState }),
    [mode]
  );

  return <ExplanationContext.Provider value={value}>{children}</ExplanationContext.Provider>;
}

export function useExplanationMode() {
  const context = useContext(ExplanationContext);
  if (!context) throw new Error("useExplanationMode must be used inside ExplanationModeProvider");
  return context;
}

export function Explain({ simple, standard, technical }: ExplainableText) {
  const { mode } = useExplanationMode();
  return <>{mode === "simple" ? simple : mode === "technical" ? technical : standard}</>;
}

const MODE_COPY: Record<ExplanationMode, { label: string; description: string }> = {
  simple: {
    label: "Simple",
    description: "Everyday words and the action that matters most.",
  },
  standard: {
    label: "Standard",
    description: "Clear operational detail without unnecessary jargon.",
  },
  technical: {
    label: "Technical",
    description: "Model, data-source and audit details for specialists.",
  },
};

export function ExplanationModeControl() {
  const { mode, setMode } = useExplanationMode();
  const index = MODES.indexOf(mode);

  return (
    <div className="hidden sm:flex items-center gap-3 rounded-xl border border-slate-200 dark:border-midnight-border bg-white/70 dark:bg-midnight-light/70 px-3 py-2" aria-label="Explanation detail level">
      <SlidersHorizontal className="h-4 w-4 text-radar shrink-0" />
      <div className="min-w-[150px]">
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Explanation</span>
          <span className="text-xs font-semibold text-radar">{MODE_COPY[mode].label}</span>
        </div>
        <input
          aria-label="Explanation detail: Simple, Standard, or Technical"
          aria-valuetext={MODE_COPY[mode].label}
          type="range"
          min={0}
          max={2}
          step={1}
          value={index}
          onChange={(event) => setMode(MODES[Number(event.target.value)])}
          className="w-full accent-emerald-500 cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-slate-400 leading-none mt-0.5" aria-hidden="true">
          <span>Simple</span><span>Standard</span><span>Technical</span>
        </div>
      </div>
    </div>
  );
}

type PageGuide = {
  simple: string;
  standard: string;
  technical: string;
};

const GUIDES: Array<{ match: (path: string) => boolean; guide: PageGuide }> = [
  {
    match: (p) => p === "/my-area",
    guide: {
      simple: "See the flood-risk level for a place you care about and what you should pay attention to.",
      standard: "Check the current location risk score, recent rainfall and the factors pushing risk up or down.",
      technical: "Inspect the canonical derived-v2 risk output, rainfall accumulations, burst-intensity signal and antecedent-wetness contribution for this location.",
    },
  },
  {
    match: (p) => p === "/dashboard",
    guide: {
      simple: "See your important places in one view and quickly spot where attention may be needed.",
      standard: "Review saved locations, current risk conditions and recent monitoring activity from one overview.",
      technical: "Review account-level monitoring state and location outputs generated from the platform's canonical live risk endpoint.",
    },
  },
  {
    match: (p) => p === "/intelligence",
    guide: {
      simple: "See why the system thinks flood risk is rising or falling.",
      standard: "Explore the weather and hydrology signals behind the current risk assessment.",
      technical: "Inspect source attribution, feature-level context and model metadata used to explain the current decision-support signal.",
    },
  },
  {
    match: (p) => p === "/predict",
    guide: {
      simple: "Choose a place and check its current flood-risk signal.",
      standard: "Evaluate a location using the live risk engine and review the factors behind the score.",
      technical: "Query the canonical risk endpoint for a coordinate and inspect score components, model attribution and raw weather context.",
    },
  },
  {
    match: (p) => p === "/outlook",
    guide: {
      simple: "See weather conditions that could make flooding more likely in the coming weeks.",
      standard: "Review longer-range rainfall and climate context for planning; this is not a precise flood prediction.",
      technical: "Review longer-horizon contextual indicators separately from the live derived-v2 score and from prospectively validated flood-warning claims.",
    },
  },
  {
    match: (p) => p === "/action",
    guide: {
      simple: "Choose when you want an alert and how the system should contact you.",
      standard: "Create and manage alert rules that react when your saved location crosses a chosen risk threshold.",
      technical: "Configure threshold rules evaluated against the same canonical derived-v2 engine used by the public risk API, with delivery state recorded separately.",
    },
  },
  {
    match: (p) => p === "/prove",
    guide: {
      simple: "See what evidence supports the system, what has been tested, and what has not been proven yet.",
      standard: "Review validation evidence, documented flood cases and the limits placed on performance claims.",
      technical: "Inspect chronological validation, event-level evidence, calibration diagnostics, frozen model generations and prospective acceptance rules.",
    },
  },
  {
    match: (p) => p === "/report",
    guide: {
      simple: "Tell the system what flooding you can actually see on the ground.",
      standard: "Submit a local flood observation that can support situation awareness and later verification.",
      technical: "Submit geolocated observational evidence as a separate ground-report stream; user reports are not automatically treated as validated model labels.",
    },
  },
  {
    match: (p) => p === "/profile",
    guide: {
      simple: "Manage your account and subscription details.",
      standard: "Review your account identity, plan and settings.",
      technical: "Manage account-level configuration; model and validation settings are intentionally not editable from the user profile.",
    },
  },
];

export function PageExplanation({ pathname }: { pathname: string }) {
  const { mode } = useExplanationMode();
  const entry = GUIDES.find((item) => item.match(pathname));
  if (!entry) return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-radar/15 bg-radar/[0.04] px-4 py-3" role="note">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-radar/10">
        {mode === "technical" ? <Gauge className="h-4 w-4 text-radar" /> : <BookOpen className="h-4 w-4 text-radar" />}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">What this page means</p>
          <span className="text-[10px] uppercase tracking-wider text-radar font-semibold">{MODE_COPY[mode].label}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{entry.guide[mode]}</p>
      </div>
    </div>
  );
}
