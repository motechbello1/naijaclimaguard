"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Headphones, Square } from "lucide-react";
import { usePathname } from "next/navigation";
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
  checking: boolean;
  speaking: boolean;
  loading: boolean;
  activeTarget: string | null;
  error: string | null;
  provider: string | null;
  autoRead: boolean;
  setAutoRead: (value: boolean) => void;
  speak: (text: string, targetId?: string) => Promise<void>;
  speakTarget: (targetId: string) => Promise<void>;
  stop: () => void;
};

const SpeechContext = createContext<SpeechContextValue | null>(null);

function visiblePageSummary() {
  const main = document.querySelector("main");
  if (!main) return "";

  const preferred = Array.from(main.querySelectorAll<HTMLElement>("[data-read-aloud]"))
    .filter((element) => element.offsetParent !== null)
    .map((element) => element.innerText.trim())
    .filter(Boolean);
  if (preferred.length) return preferred.slice(0, 6).join(". ").slice(0, 2200);

  return Array.from(main.querySelectorAll<HTMLElement>("h1, h2, h3, p, li"))
    .filter((element) => element.offsetParent !== null)
    .map((element) => element.innerText.trim())
    .filter((text) => text.length > 3)
    .slice(0, 8)
    .join(". ")
    .slice(0, 2200);
}

function cleanReadableText(root: HTMLElement) {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("button,select,input,textarea,[aria-hidden='true'],[data-ncg-skip-read='true']").forEach((el) => el.remove());
  return (clone.innerText || clone.textContent || "")
    .replace(/\s+/g, " ")
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .trim()
    .slice(0, 2200);
}

function chunkForSpeech(text: string, limit = 270) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]?/g)?.map((item) => item.trim()).filter(Boolean) || [clean];
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const sentence of sentences) {
    if (sentence.length <= limit) {
      const candidate = current ? `${current} ${sentence}` : sentence;
      if (candidate.length <= limit) current = candidate;
      else { flush(); current = sentence; }
      continue;
    }

    flush();
    const words = sentence.split(/\s+/);
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= limit) current = candidate;
      else { flush(); current = word.slice(0, limit); }
    }
    flush();
  }
  flush();
  return chunks;
}

const unavailableByLocale: Record<string, string> = {
  en: "Voice is temporarily unavailable. Please try again shortly.",
  pcm: "Voice no dey available now. Abeg try again small time.",
  ha: "Murya ba ta samuwa a yanzu. Ka sake gwadawa nan ba da jimawa ba.",
  yo: "Ohùn kò sí ní àkókò yìí. Jọ̀wọ́ tún gbìyànjú láìpẹ́.",
  ig: "Olu adịghị ugbu a. Biko nwaa ọzọ n'oge na-adịghị anya.",
};

const playErrorByLocale: Record<string, string> = {
  en: "The audio could not play. Please try again.",
  pcm: "Audio no play. Abeg try again.",
  ha: "Ba a iya kunna muryar ba. Ka sake gwadawa.",
  yo: "A kò lè mu ohùn náà ṣiṣẹ́. Jọ̀wọ́ tún gbìyànjú.",
  ig: "A pụghị ịkpọ olu ahụ. Biko nwaa ọzọ.",
};

function hasDeviceSpeech() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function SpeechProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const [supported, setSupported] = useState(false);
  const [checking, setChecking] = useState(true);
  const [provider, setProvider] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRead, setAutoReadState] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const runRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAutoReadState(window.localStorage.getItem(AUTO_READ_KEY) === "true");
    let cancelled = false;
    const check = async () => {
      setChecking(true);
      try {
        const response = await fetch("/api/tts", { cache: "no-store" });
        const data = response.ok ? await response.json() : null;
        if (!cancelled) {
          const deviceAvailable = hasDeviceSpeech();
          setSupported(Boolean(data?.available) || deviceAvailable);
          setProvider(data?.provider || (deviceAvailable ? "device-speech" : null));
        }
      } catch {
        if (!cancelled) {
          const deviceAvailable = hasDeviceSpeech();
          setSupported(deviceAvailable);
          setProvider(deviceAvailable ? "device-speech" : null);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const unlockAudio = () => {
    if (typeof window === "undefined") return null;
    const AudioContextCtor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AudioContextCtor) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioContextCtor();
    const context = audioContextRef.current;
    if (context.state === "suspended") void context.resume();
    return context;
  };

  const clearCurrent = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already ended */ }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (hasDeviceSpeech()) window.speechSynthesis.cancel();
  };

  const stop = () => {
    runRef.current += 1;
    clearCurrent();
    setSpeaking(false);
    setLoading(false);
    setActiveTarget(null);
    setError(null);
  };

  const playBlob = async (blob: Blob, context: AudioContext, runId: number) => {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    if (runId !== runRef.current) return;
    await new Promise<void>((resolve, reject) => {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      sourceRef.current = source;
      source.onended = () => {
        if (sourceRef.current === source) sourceRef.current = null;
        try { source.disconnect(); } catch { /* no-op */ }
        resolve();
      };
      try {
        source.start(0);
        setLoading(false);
        setSpeaking(true);
      } catch (err) {
        reject(err);
      }
    });
  };

  const playDeviceChunk = async (text: string, runId: number) => {
    if (!hasDeviceSpeech() || runId !== runRef.current) throw new Error(playErrorByLocale[locale] || playErrorByLocale.en);
    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SPEECH_LANG[locale] || SPEECH_LANG.en;
      const baseLanguage = utterance.lang.toLowerCase().split("-")[0];
      const voices = window.speechSynthesis.getVoices();
      utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === utterance.lang.toLowerCase())
        || voices.find((voice) => voice.lang.toLowerCase().startsWith(baseLanguage))
        || null;
      utterance.rate = locale === "en" || locale === "pcm" ? 0.96 : 0.9;
      utterance.onstart = () => {
        setLoading(false);
        setSpeaking(true);
      };
      utterance.onend = () => resolve();
      utterance.onerror = (event) => event.error === "canceled" ? resolve() : reject(new Error(playErrorByLocale[locale] || playErrorByLocale.en));
      window.speechSynthesis.speak(utterance);
    });
  };

  const speak = async (text: string, targetId?: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean || !supported) return;

    // Called synchronously from the user's tap so iOS/Safari unlocks audio before
    // a slow neural generation request returns.
    const context = unlockAudio();
    if (!context && !hasDeviceSpeech()) {
      setError(playErrorByLocale[locale] || playErrorByLocale.en);
      return;
    }

    stop();
    const runId = runRef.current;
    setActiveTarget(targetId || "manual");
    setError(null);
    setSpeaking(false);
    setLoading(true);

    const chunks = chunkForSpeech(clean);
    try {
      for (let index = 0; index < chunks.length; index += 1) {
        if (runId !== runRef.current) return;
        try {
          if (!context) throw new Error("Neural audio context unavailable");
          setLoading(true);
          const controller = new AbortController();
          requestRef.current = controller;
          const response = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: chunks[index], locale }),
            signal: controller.signal,
          });
          requestRef.current = null;

          if (!response.ok) throw new Error(unavailableByLocale[locale] || unavailableByLocale.en);
          const blob = await response.blob();
          if (!blob.size) throw new Error(unavailableByLocale[locale] || unavailableByLocale.en);
          await playBlob(blob, context, runId);
        } catch (neuralError: any) {
          requestRef.current = null;
          if (neuralError?.name === "AbortError" || runId !== runRef.current) return;
          if (!hasDeviceSpeech()) throw neuralError;
          setProvider("device-speech-fallback");
          setError(null);
          await playDeviceChunk(chunks[index], runId);
        }
      }

      if (runId === runRef.current) {
        setSpeaking(false);
        setLoading(false);
        setActiveTarget(null);
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || runId !== runRef.current) return;
      setLoading(false);
      setSpeaking(false);
      setError(err?.message || unavailableByLocale[locale] || unavailableByLocale.en);
    }
  };

  const speakTarget = async (targetId: string) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    await speak(cleanReadableText(target), targetId);
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
      if (summary) void speak(summary, "page-summary");
    }, 700);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // The neural speech callback intentionally follows the active route and language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, locale, autoRead, supported]);

  useEffect(() => () => {
    runRef.current += 1;
    clearCurrent();
    if (audioContextRef.current) void audioContextRef.current.close();
  }, []);

  const value = {
    supported,
    checking,
    speaking,
    loading,
    activeTarget,
    error,
    provider,
    autoRead,
    setAutoRead,
    speak,
    speakTarget,
    stop,
  };

  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech() {
  const context = useContext(SpeechContext);
  if (!context) throw new Error("useSpeech must be used inside SpeechProvider");
  return context;
}

export function ReadAloudControl({ compact = false }: { compact?: boolean }) {
  const { supported, checking, speaking, loading, error, autoRead, setAutoRead, speak, stop } = useSpeech();
  const { locale } = useLanguage();

  if (checking) return null;

  const label = locale === "pcm" ? "Listen to section"
    : locale === "ha" ? "Saurari sashe"
    : locale === "yo" ? "Gbọ́ apá kan"
    : locale === "ig" ? "Gee akụkụ"
    : "Listen to a section";
  const hint = locale === "pcm" ? "Use the headphone button beside the part wey you want hear."
    : locale === "ha" ? "Yi amfani da maɓallin lasifika kusa da sashen da kake son ji."
    : locale === "yo" ? "Lo bọ́tìnì agbekọ́rí lẹ́gbẹ̀ẹ́ apá tí o fẹ́ gbọ́."
    : locale === "ig" ? "Jiri bọtịnụ ekweisi n'akụkụ ebe ịchọrọ ịnụ."
    : "Use the headphone button beside the part you want to hear.";
  const unavailable = unavailableByLocale[locale] || unavailableByLocale.en;
  const autoLabel = locale === "pcm" ? "Read page by itself"
    : locale === "ha" ? "Karanta shafi kai tsaye"
    : locale === "yo" ? "Kà ojúewé laifọwọyi"
    : locale === "ig" ? "Gụọ ibe na-akpaghị aka"
    : "Auto-read pages";
  const pageLabel = locale === "pcm" ? "Read this page"
    : locale === "ha" ? "Karanta wannan shafin"
    : locale === "yo" ? "Ka ojúewé yìí"
    : locale === "ig" ? "Gụọ ibe a"
    : "Read this page";

  const togglePageSpeech = () => {
    if (speaking || loading) {
      stop();
      return;
    }
    const summary = visiblePageSummary();
    if (summary) void speak(summary, "page-summary");
  };

  if (compact) {
    if (!supported) return null;
    return (
      <button type="button" onClick={togglePageSpeech} className="flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200" title={speaking || loading ? "Stop audio" : pageLabel} aria-label={speaking || loading ? "Stop audio" : pageLabel} aria-pressed={speaking || loading}>
        {speaking || loading ? <Square className="h-3.5 w-3.5 fill-current text-radar" /> : <Headphones className="h-4 w-4 text-radar" />}
      </button>
    );
  }

  return (
    <div className="rounded-[16px] border border-slate-200 bg-white/80 p-3 dark:border-midnight-border dark:bg-midnight-light/80">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
        <Headphones className="h-4 w-4 text-radar" />
        <span>{label}</span>
        {supported && <button type="button" onClick={togglePageSpeech} className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black text-slate-700 dark:border-white/15 dark:text-white" aria-pressed={speaking || loading}>{speaking || loading ? "Stop" : pageLabel}</button>}
      </div>
      <p className="mt-1.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{supported ? hint : unavailable}</p>
      {error && <p className="mt-2 text-[11px] font-semibold leading-4 text-red-600 dark:text-red-300" role="alert">{error}</p>}
      {supported && (
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 border-t border-slate-200 pt-3 text-[11px] text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span>{autoLabel}</span>
          <input type="checkbox" checked={autoRead} onChange={(event) => setAutoRead(event.target.checked)} className="accent-emerald-500" />
        </label>
      )}
    </div>
  );
}
