"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

const AUTO_READ_KEY = "naijaclimaguard:auto-read";

const SPEECH_LANG: Record<string, string> = {
  en: "en-NG",
  pcm: "en-NG",
  ha: "ha-NG",
  yo: "yo-NG",
  ig: "ig-NG",
};

type SpeechContextValue = {
  supported: boolean;
  speaking: boolean;
  autoRead: boolean;
  setAutoRead: (value: boolean) => void;
  speak: (text: string) => void;
  stop: () => void;
};

const SpeechContext = createContext<SpeechContextValue | null>(null);

function visiblePageSummary() {
  const main = document.querySelector("main");
  if (!main) return "";

  const preferred = Array.from(main.querySelectorAll<HTMLElement>("[data-read-aloud]"))
    .filter((el) => el.offsetParent !== null)
    .map((el) => el.innerText.trim())
    .filter(Boolean);
  if (preferred.length) return preferred.slice(0, 4).join(". ");

  const items = Array.from(main.querySelectorAll<HTMLElement>("h1, h2, p"))
    .filter((el) => el.offsetParent !== null)
    .map((el) => el.innerText.trim())
    .filter((text) => text.length > 3);

  return items.slice(0, 5).join(". ").slice(0, 1500);
}

export function SpeechProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [autoRead, setAutoReadState] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    setAutoReadState(window.localStorage.getItem(AUTO_READ_KEY) === "true");
  }, []);

  const stop = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const speak = (text: string) => {
    if (!text.trim() || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\s+/g, " ").trim());
    const wanted = SPEECH_LANG[locale] || "en-NG";
    utterance.lang = wanted;
    const voices = window.speechSynthesis.getVoices();
    const exact = voices.find((voice) => voice.lang.toLowerCase() === wanted.toLowerCase());
    const sameFamily = voices.find((voice) => voice.lang.toLowerCase().startsWith(wanted.split("-")[0].toLowerCase()));
    if (exact || sameFamily) utterance.voice = exact || sameFamily || null;
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const setAutoRead = (value: boolean) => {
    setAutoReadState(value);
    window.localStorage.setItem(AUTO_READ_KEY, String(value));
    if (!value) stop();
  };

  useEffect(() => {
    if (!autoRead || !supported) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const summary = visiblePageSummary();
      if (summary) speak(summary);
    }, 700);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // speak intentionally uses the latest locale and speech engine state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, locale, autoRead, supported]);

  const value = useMemo(() => ({ supported, speaking, autoRead, setAutoRead, speak, stop }), [supported, speaking, autoRead]);
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech() {
  const context = useContext(SpeechContext);
  if (!context) throw new Error("useSpeech must be used inside SpeechProvider");
  return context;
}

export function ReadAloudControl({ compact = false }: { compact?: boolean }) {
  const { supported, speaking, autoRead, setAutoRead, speak, stop } = useSpeech();
  const { locale } = useLanguage();

  if (!supported) return null;

  const readLabel = locale === "pcm" ? "Read am" : locale === "ha" ? "Karanta" : locale === "yo" ? "Kà á" : locale === "ig" ? "Gụọ ya" : "Read aloud";
  const autoLabel = locale === "pcm" ? "Read page by itself" : locale === "ha" ? "Karanta shafi kai tsaye" : locale === "yo" ? "Kà ojúewé laifọwọyi" : locale === "ig" ? "Gụọ ibe na-akpaghị aka" : "Auto-read pages";

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "rounded-xl border border-slate-200 bg-white/80 px-2 py-1.5 dark:border-midnight-border dark:bg-midnight-light/80"}`}>
      <button
        type="button"
        onClick={() => speaking ? stop() : speak(visiblePageSummary())}
        className="flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label={speaking ? "Stop reading" : readLabel}
      >
        {speaking ? <VolumeX className="h-4 w-4 text-radar" /> : <Volume2 className="h-4 w-4 text-radar" />}
        {!compact && <span>{speaking ? "Stop" : readLabel}</span>}
      </button>
      {!compact && (
        <label className="flex cursor-pointer items-center gap-2 border-l border-slate-200 pl-2 text-[11px] text-slate-500 dark:border-midnight-border dark:text-slate-400">
          <input type="checkbox" checked={autoRead} onChange={(e) => setAutoRead(e.target.checked)} className="accent-emerald-500" />
          <span>{autoLabel}</span>
        </label>
      )}
    </div>
  );
}
