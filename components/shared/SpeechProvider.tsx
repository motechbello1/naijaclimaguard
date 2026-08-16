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
  voiceLabel: string;
  usingFallbackVoice: boolean;
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
  if (preferred.length) return preferred.slice(0, 6).join(". ").slice(0, 1800);

  const items = Array.from(main.querySelectorAll<HTMLElement>("h1, h2, h3, p, li"))
    .filter((el) => el.offsetParent !== null)
    .map((el) => el.innerText.trim())
    .filter((text) => text.length > 3);

  return items.slice(0, 8).join(". ").slice(0, 1800);
}

function scoreVoice(voice: SpeechSynthesisVoice, wanted: string) {
  const lang = voice.lang.toLowerCase();
  const wantedLower = wanted.toLowerCase();
  const family = wantedLower.split("-")[0];
  const name = voice.name.toLowerCase();
  let score = 0;
  if (lang === wantedLower) score += 100;
  if (lang.startsWith(`${family}-`)) score += 45;
  if (lang.endsWith("-ng")) score += 35;
  if (name.includes("nigeria") || name.includes("nigerian")) score += 30;
  if (voice.localService) score += 8;
  if (voice.default) score += 2;
  return score;
}

function chooseVoice(voices: SpeechSynthesisVoice[], wanted: string) {
  const ranked = [...voices]
    .map((voice) => ({ voice, score: scoreVoice(voice, wanted) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.voice || null;
}

export function SpeechProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [autoRead, setAutoReadState] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const available = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(available);
    setAutoReadState(window.localStorage.getItem(AUTO_READ_KEY) === "true");
    if (!available) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);

  const wanted = SPEECH_LANG[locale] || "en-NG";
  const selectedVoice = useMemo(() => chooseVoice(voices, wanted), [voices, wanted]);
  const usingFallbackVoice = Boolean(selectedVoice && selectedVoice.lang.toLowerCase() !== wanted.toLowerCase());
  const voiceLabel = selectedVoice ? `${selectedVoice.name} · ${selectedVoice.lang}` : wanted;

  const stop = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const speak = (text: string) => {
    if (!text.trim() || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\s+/g, " ").trim());
    utterance.lang = wanted;
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = locale === "pcm" ? 0.92 : 0.94;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, locale, autoRead, supported, selectedVoice]);

  const value = useMemo(() => ({ supported, speaking, autoRead, voiceLabel, usingFallbackVoice, setAutoRead, speak, stop }), [supported, speaking, autoRead, voiceLabel, usingFallbackVoice]);
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech() {
  const context = useContext(SpeechContext);
  if (!context) throw new Error("useSpeech must be used inside SpeechProvider");
  return context;
}

export function ReadAloudControl({ compact = false }: { compact?: boolean }) {
  const { supported, speaking, autoRead, voiceLabel, usingFallbackVoice, setAutoRead, speak, stop } = useSpeech();
  const { locale } = useLanguage();

  if (!supported) return null;

  const readLabel = locale === "pcm" ? "Read am" : locale === "ha" ? "Karanta" : locale === "yo" ? "Kà á" : locale === "ig" ? "Gụọ ya" : "Read aloud";
  const autoLabel = locale === "pcm" ? "Read page by itself" : locale === "ha" ? "Karanta shafi kai tsaye" : locale === "yo" ? "Kà ojúewé laifọwọyi" : locale === "ig" ? "Gụọ ibe na-akpaghị aka" : "Auto-read pages";
  const voiceNote = usingFallbackVoice
    ? (locale === "pcm" ? "Your phone no get the exact Nigerian voice, so we dey use the closest voice available." : "Your device does not expose the exact Nigerian voice, so the closest available voice is being used.")
    : (locale === "pcm" ? "Nigerian voice selected where your phone support am." : "Nigerian locale voice selected where your device supports it.");

  return (
    <div className={`${compact ? "" : "rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 dark:border-midnight-border dark:bg-midnight-light/80"}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => speaking ? stop() : speak(visiblePageSummary())}
          className="flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
      {!compact && <p className="mt-2 text-[10px] leading-4 text-slate-400" title={voiceLabel}>{voiceNote}</p>}
    </div>
  );
}
