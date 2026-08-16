"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, MapPin, MessageCircle, RotateCcw, Send, ShieldAlert, X } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string; sourceClass?: string; suggestions?: string[] };

export default function FloodAssistant() {
  const { locale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    if (window.innerWidth < 640) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 60);
    return () => window.clearTimeout(timer);
  }, [messages, busy, open]);

  const starters = useMemo(() => [
    locale === "pcm" ? "Wetin be flood?" : locale === "ha" ? "Menene ambaliya?" : locale === "yo" ? "Kí ni ìkún omi?" : locale === "ig" ? "Gịnị bụ idei mmiri?" : "What is a flood?",
    locale === "pcm" ? "Wetin I suppose do if flood warning reach me?" : locale === "ha" ? "Me zan yi idan na samu gargadin ambaliya?" : locale === "yo" ? "Kí ni kí n ṣe tí mo bá gba ìkìlọ̀ ìkún omi?" : locale === "ig" ? "Gịnị ka m mee ma m nweta flood warning?" : "What should I do if I get a flood warning?",
    locale === "pcm" ? "How NaijaClimaGuard dey work?" : locale === "ha" ? "Ta yaya NaijaClimaGuard yake aiki?" : locale === "yo" ? "Báwo ni NaijaClimaGuard ṣe ń ṣiṣẹ́?" : locale === "ig" ? "Kedu ka NaijaClimaGuard si arụ ọrụ?" : "How does NaijaClimaGuard work?",
  ], [locale]);

  const ask = async (message: string, coords?: { latitude: number; longitude: number }) => {
    const clean = message.trim();
    if (!clean || busy) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: clean }]);
    setInput(""); setBusy(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: clean, locale, ...coords }) });
      const data = await response.json();
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: response.ok ? data.answer : (data.error || "Assistant unavailable."), sourceClass: data.sourceClass, suggestions: Array.isArray(data.suggestions) ? data.suggestions.slice(0, 3) : undefined }]);
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: "Assistant unavailable. Please try again." }]);
    } finally { setBusy(false); }
  };

  const checkNearMe = () => {
    if (!navigator.geolocation) { ask(locale === "pcm" ? "Explain current risk near me" : "Explain my current risk"); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition((position) => { setBusy(false); ask(locale === "pcm" ? "Explain current risk near me" : locale === "ha" ? "Bayyana hadarin yanzu a wurina" : locale === "yo" ? "Ṣàlàyé ewu lọwọlọwọ níbi tí mo wà" : locale === "ig" ? "Kọwaa current risk n'ebe m nọ" : "Explain my current risk", { latitude: position.coords.latitude, longitude: position.coords.longitude }); }, () => { setBusy(false); ask(locale === "pcm" ? "Explain current risk near me" : "Explain my current risk"); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  };

  const submit = (event: FormEvent) => { event.preventDefault(); ask(input); };
  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;

  return (
    <>
      <button onClick={() => setOpen(true)} className={`fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] right-4 z-[70] flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-[#071713] text-[#d9ff57] shadow-[0_12px_32px_rgba(3,24,18,.22)] transition hover:-translate-y-0.5 sm:bottom-5 sm:right-5 sm:h-auto sm:w-auto sm:min-h-12 sm:gap-2 sm:rounded-full sm:bg-radar sm:px-4 sm:py-3 sm:text-white ${open ? "hidden" : ""}`} aria-label={t("assistant")}>
        <MessageCircle className="h-5 w-5" /><span className="hidden sm:inline">{t("assistant")}</span>
      </button>

      {open && <><button aria-label={t("close")} onClick={() => setOpen(false)} className="fixed inset-0 z-[88] hidden bg-slate-950/35 backdrop-blur-[1px] sm:block" /><section className="fixed inset-0 z-[90] flex h-[100dvh] flex-col overflow-hidden bg-white shadow-2xl dark:bg-midnight sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[min(680px,calc(100dvh-2rem))] sm:w-[min(420px,calc(100vw-2rem))] sm:rounded-[24px] sm:border sm:border-slate-200 dark:sm:border-midnight-border">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2.5 pt-[max(0.65rem,env(safe-area-inset-top))] dark:border-midnight-border sm:px-4 sm:pt-3"><div className="flex min-w-0 items-center gap-2.5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#071713] text-[#d9ff57]"><Bot className="h-5 w-5" /></div><div className="min-w-0"><h2 className="truncate text-sm font-bold">{t("assistant")}</h2><p className="truncate text-[11px] text-slate-500">{t("askAnything")}</p></div></div><div className="flex shrink-0 items-center gap-0.5"><button onClick={() => setMessages([])} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title={t("newChat")}><RotateCcw className="h-4 w-4" /></button><button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title={t("close")}><X className="h-4 w-4" /></button></div></header>
        <div className="shrink-0 border-b border-slate-200 bg-[#eff8f3] px-3 py-2 text-[11px] leading-4 text-slate-600 dark:border-midnight-border dark:bg-[#0e241b] dark:text-slate-300 sm:px-4">{locale === "pcm" ? "Official warning and flood wey you see for ground get priority over chatbot advice." : locale === "ha" ? "Gargadin hukuma da ambaliyar da kake gani sun fi shawarar chatbot muhimmanci." : locale === "yo" ? "Ìkìlọ̀ ìjọba àti ìkún omi tí o rí ló ga ju ìmọ̀ràn chatbot lọ." : locale === "ig" ? "Official warning na flood ị na-ahụ dị mkpa karịa chatbot advice." : "Official warnings and visible local flooding take priority over chatbot advice."}</div>
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">{messages.length === 0 && <div className="space-y-2.5"><button onClick={checkNearMe} disabled={busy} className="flex min-h-11 w-full items-center gap-2 rounded-[16px] border border-radar/20 bg-radar/5 p-3 text-left text-sm font-semibold hover:border-radar/40"><MapPin className="h-4 w-4 shrink-0 text-radar" /><span>{locale === "pcm" ? "Check risk near me" : locale === "ha" ? "Duba hadari a wurina" : locale === "yo" ? "Ṣàyẹ̀wò ewu níbi tí mo wà" : locale === "ig" ? "Lelee risk n'ebe m nọ" : "Check risk near me"}</span></button>{starters.map((starter) => <button key={starter} onClick={() => ask(starter)} className="min-h-11 w-full rounded-[16px] border border-slate-200 p-3 text-left text-sm hover:border-radar/40 dark:border-midnight-border">{starter}</button>)}</div>}
          {messages.map((message) => <div key={message.id} className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}><div className={`max-w-[86%] break-words rounded-[18px] px-3.5 py-2.5 text-[15px] leading-6 whitespace-pre-line sm:max-w-[88%] sm:text-sm ${message.role === "user" ? "bg-radar text-white" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"}`}>{message.text}</div>{message.role === "assistant" && message.sourceClass && <div className="mt-1.5 flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-slate-400"><ShieldAlert className="h-3 w-3" /> {message.sourceClass}</div>}{message.role === "assistant" && message.id === lastAssistantId && message.suggestions?.length ? <div className="mt-2 flex max-w-full flex-wrap gap-1.5">{message.suggestions.map((suggestion) => <button key={suggestion} onClick={() => ask(suggestion)} disabled={busy} className="rounded-full border border-slate-200 px-2.5 py-1.5 text-left text-[11px] leading-4 text-slate-600 hover:border-radar/40 hover:text-radar dark:border-midnight-border dark:text-slate-300">{suggestion}</button>)}</div> : null}</div>)}
          {busy && <div className="px-1 text-xs text-slate-400">{t("loading")}</div>}<div ref={bottomRef} /></div>
        <form onSubmit={submit} className="shrink-0 border-t border-slate-200 bg-white p-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] dark:border-midnight-border dark:bg-midnight sm:p-3"><div className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder={t("assistantPlaceholder")} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-base outline-none focus:border-radar dark:border-midnight-border sm:text-sm" /><button disabled={busy || !input.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-radar text-white disabled:opacity-40" aria-label={t("send")}><Send className="h-4 w-4" /></button></div></form>
      </section></>}
    </>
  );
}
