"use client";

import { usePathname } from "next/navigation";
import LanguageSelector from "./LanguageSelector";
import { ReadAloudControl } from "./SpeechProvider";

const APP_SHELL_PREFIXES = [
  "/dashboard", "/my-area", "/action", "/evidence", "/report", "/outlook",
  "/intelligence", "/predict", "/prove", "/command", "/profile",
];

export default function GlobalAccessibilityDock() {
  const pathname = usePathname();
  if (APP_SHELL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[79] flex max-w-[calc(100vw-5.5rem)] items-center gap-2">
      <LanguageSelector compact />
      <div className="rounded-lg border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-midnight-border dark:bg-midnight/90">
        <ReadAloudControl compact />
      </div>
    </div>
  );
}
