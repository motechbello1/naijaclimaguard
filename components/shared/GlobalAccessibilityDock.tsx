"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Accessibility, X } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import { ReadAloudControl } from "./SpeechProvider";

const APP_SHELL_PREFIXES = [
  "/dashboard", "/my-area", "/action", "/evidence", "/report", "/outlook",
  "/intelligence", "/predict", "/prove", "/command", "/profile",
];

export default function GlobalAccessibilityDock() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (APP_SHELL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 z-[79] hidden max-w-[calc(100vw-5.5rem)] items-center gap-2 sm:flex">
        <LanguageSelector compact />
        <div className="rounded-lg border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-midnight-border dark:bg-midnight/90">
          <ReadAloudControl compact />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 left-4 z-[79] flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-radar shadow-lg backdrop-blur sm:hidden dark:border-midnight-border dark:bg-midnight"
        aria-label="Language and read-aloud settings"
      >
        <Accessibility className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-[140] sm:hidden" role="dialog" aria-modal="true" aria-label="Language and accessibility">
          <button className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileOpen(false)} aria-label="Close accessibility settings" />
          <section className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-midnight-border dark:bg-midnight">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-sm font-bold">Language & reading</h2><p className="mt-0.5 text-xs text-slate-500">Choose your page language or let the phone read the page.</p></div>
              <button onClick={() => setMobileOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid gap-3">
              <LanguageSelector />
              <div className="rounded-xl border border-slate-200 p-2 dark:border-midnight-border"><ReadAloudControl /></div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
