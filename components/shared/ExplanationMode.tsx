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

type PageGuide = Record<ExplanationMode, string>;

const STORAGE_KEY = "naijaclimaguard:explanation-mode";
const MODES: ExplanationMode[] = ["simple", "standard", "technical"];
const ExplanationContext = createContext<ExplanationContextValue | null>(null);

const MODE_LABELS: Record<ExplanationMode, string> = {
  simple: "Simple",
  standard: "Standard",
  technical: "Technical",
};

const GUIDES: Record<string, PageGuide> = {
  "/my-area": {
    simple: "See the flood-risk level for a place you care about and what you should pay attention to.",
    standard: "Check the current location risk score, recent rainfall and the factors pushing risk up or down.",
    technical: "Inspect the canonical derived-v2 risk output, rainfall accumulations, burst-intensity signal and antecedent-wetness contribution for this location.",
  },
  "/dashboard": {
    simple: "See your important places in one view and quickly spot where attention may be needed.",
    standard: "Review saved locations, current risk conditions and recent monitoring activity from one overview.",
    technical: "Review account-level monitoring state and location outputs generated from the platform's canonical live risk endpoint.",
  },
  "/intelligence": {
    simple: "See why the system thinks flood risk is rising or falling.",
    standard: "Explore the weather and hydrology signals behind the current risk assessment.",
    technical: "Inspect source attribution, feature-level context and model metadata used to explain the current decision-support signal.",
  },
  "/predict": {
    simple: "Choose a place and check its current flood-risk signal.",
    standard: "Evaluate a location using the live risk engine and review the factors behind the score.",
    technical: "Query the canonical risk endpoint for a coordinate and inspect score components, model attribution and raw weather context.",
  },
  "/outlook": {
    simple: "See weather conditions that could make flooding more likely in the coming weeks.",
    standard: "Review longer-range rainfall and climate context for planning; this is not a precise flood prediction.",
    technical: "Review longer-horizon contextual indicators separately from the live derived-v2 score and from prospectively validated flood-warning claims.",
  },
  "/action": {
    simple: "Choose when you want an alert and how the system should contact you.",
    standard: "Create and manage alert rules that react when your saved location crosses a chosen risk threshold.",
    technical: "Configure threshold rules evaluated against the same canonical derived-v2 engine used by the public risk API, with delivery state recorded separately.",
  },
  "/prove": {
    simple: "See what evidence supports the system, what has been tested, and what has not been proven yet.",
    standard: "Review validation evidence, documented flood cases and the limits placed on performance claims.",
    technical: "Inspect chronological validation, event-level evidence, calibration diagnostics, frozen model generations and prospective acceptance rules.",
  },
  "/report": {
    simple: "Tell the system what flooding you can actually see on the ground.",
    standard: "Submit a local flood observation that can support situation awareness and later verification.",
    technical: "Submit geolocated observational evidence as a separate ground-report stream; user reports are not automatically treated as validated model labels.",
  },
  "/profile": {
    simple: "Manage your account and subscription details.",
    standard: "Review your account identity, plan and settings.",
    technical: "Manage account-level configuration; model and validation settings are intentionally not editable from the user profile.",
  },
};

export function ExplanationModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ExplanationMode>("simple");

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

  const value = useMemo(() => ({ mode, setMode: setModeState }), [mode]);
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

export function ExplanationModeControl() {
  const { mode, setMode } = useExplanationMode();
  const index = MODES.indexOf(mode);

  return (
    <div
      className="flex items-center gap-2 sm:gap-3 rounded-xl border border-slate-200 dark:border-midnight-border bg-white/70 dark:bg-midnight-light/70 px-2 sm:px-3 py-2"
      aria-label="Explanation detail level"
      title="Choose how much technical detail you want to see"
    >
      <SlidersHorizontal className="hidden sm:block h-4 w-4 text-radar shrink-0" />
      <div className="w-[118px] sm:w-[160px]">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider text-slate-400">Detail</span>
          <span className="text-[11px] sm:text-xs font-semibold text-radar">{MODE_LABELS[mode]}</span>
        </div>
        <input
          aria-label="Detail level: Simple, Standard, or Technical"
          aria-valuetext={MODE_LABELS[mode]}
          type="range"
          min={0}
          max={2}
          step={1}
          value={index}
          onChange={(event) => setMode(MODES[Number(event.target.value)])}
          className="w-full accent-emerald-500 cursor-pointer"
        />
        <div className="flex justify-between text-[8px] sm:text-[9px] text-slate-400 leading-none mt-0.5" aria-hidden="true">
          <span>Simple</span><span>More</span><span>Technical</span>
        </div>
      </div>
    </div>
  );
}

export function PageExplanation({ pathname }: { pathname: string }) {
  const { mode } = useExplanationMode();
  const guide = GUIDES[pathname];
  if (!guide || mode === "simple") return null;

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-radar/15 bg-radar/[0.04] px-4 py-3" role="note">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-radar/10">
        {mode === "technical" ? <Gauge className="h-4 w-4 text-radar" /> : <BookOpen className="h-4 w-4 text-radar" />}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">About this page</p>
          <span className="text-[10px] uppercase tracking-wider text-radar font-semibold">{MODE_LABELS[mode]}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{guide[mode]}</p>
      </div>
    </div>
  );
}
