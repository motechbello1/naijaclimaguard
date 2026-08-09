"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, MapPin, MessageCircle, RotateCcw, Send, ShieldAlert, X } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sourceClass?: string;
};

export default function FloodAssistant() {
  const { locale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const starters = useMemo(() => [
    locale === "pcm" ? "Wetin I suppose do if flood warning reach me?" : locale === "ha" ? "Me zan yi idan na samu gargadin ambaliya?" : locale === "yo" ? "Kí ni kí n ṣe tí mo bá gba ìkìlọ̀ ìkún omi?" : locale === "ig" ? "Gịnị ka m mee ma m nweta flood warning?" : "What should I do if I get a flood warning?",
    locale === "pcm" ? "How NaijaClimaGuard dey work?" : locale === "ha" ? "Ta yaya NaijaClimaGuard yake aiki?" : locale === "yo" ? "Báwo ni NaijaClimaGuard ṣe ń ṣiṣẹ́?" : locale === "ig" ? "Kedu ka NaijaClimaGuard si arụ ọrụ?" : "How does NaijaClimaGuard work?",
    locale === "pcm" ? "Tell me about Lokoja flood 2022" : locale === "ha" ? "Faɗa min game da ambaliyar Lokoja 2022" : locale === "yo" ? "Sọ fún mi nípa ìkún omi Lokoja 2022" : locale === "ig" ? "Gwa m gbasara idei mmiri Lokoja 2022" : "Tell me about the Lokoja 2022 flood",
  ], [locale]);

  const ask = async (message: string, coords?: { latitude: number; longitude: number }) => {
    const clean = message.trim();
    if (!clean || busy) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: clean };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, locale, ...coords }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        text: response.ok ? data.answer : (data.error || "Assistant unavailable."),
        sourceClass: data.sourceClass,
      }]);
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: "Assistant unavailable. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  const checkNearMe = () => {
    if (!navigator.geolocation) {
      ask(locale === "pcm" ? "Explain current risk near me" : "Explain my current risk");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy(false);
        ask(locale === "pcm" ? "Explain current risk near me" : locale === "ha" ? "Bayyana hadarin yanzu a wurina" : locale === "yo" ? "Ṣàlàyé ewu lọwọlọwọ níbi tí mo wà" : locale === "ig" ? "Kọwaa current risk n'ebe m nọ" : "Explain my current risk", {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setBusy(false);
        ask(locale === "pcm" ? "Explain current risk near me" : "Explain my current risk");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(input);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-full bg-radar px-4 py-3 font-semibold text-white shadow-xl transition hover:brightness-110 ${open ? "hidden" : ""}`}
        aria-label={t("assistant")}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">{t("assistant")}</span>
      </button>

      {open && (
        <section className="fixed bottom-4 right-4 z-[90] flex h-[min(680px,calc(100vh-2rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-midnight-border dark:bg-midnight">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-midnight-border">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-radar/10"><Bot className="h-5 w-5 text-radar" /></div>
              <div>
                <h2 className="text-sm font-bold">{t("assistant")}</h2>
                <p className="text-[11px] text-slate-500">{t("askAnything")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMessages([])} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title={t("newChat")}><RotateCcw className="h-4 w-4" /></button>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title={t("close")}><X className="h-4 w-4" /></button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-xl border border-radar/20 bg-radar/5 p-3 text-sm leading-relaxed">
                  {t("assistantDisclaimer")}
                </div>
                <button onClick={checkNearMe} disabled={busy} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 p-3 text-left text-sm font-semibold hover:border-radar/40 dark:border-midnight-border">
                  <MapPin className="h-4 w-4 text-radar" />
                  {locale === "pcm" ? "Check risk near me" : locale === "ha" ? "Duba hadari a wurina" : locale === "yo" ? "Ṣàyẹ̀wò ewu níbi tí mo wà" : locale === "ig" ? "Lelee risk n'ebe m nọ" : "Check risk near me"}
                </button>
                {starters.map((starter) => (
                  <button key={starter} onClick={() => ask(starter)} className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm hover:border-radar/40 dark:border-midnight-border">{starter}</button>
                ))}
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed whitespace-pre-line ${message.role === "user" ? "bg-radar text-white" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"}`}>
                  {message.text}
                  {message.role === "assistant" && message.sourceClass && (
                    <div className="mt-2 flex items-center gap-1.5 border-t border-slate-300/30 pt-2 text-[10px] uppercase tracking-wide opacity-70">
                      <ShieldAlert className="h-3 w-3" /> {message.sourceClass.replaceAll("-", " ")}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-slate-400">{t("loading")}</div>}
          </div>

          <form onSubmit={submit} className="border-t border-slate-200 p-3 dark:border-midnight-border">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t("assistantPlaceholder")}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-radar dark:border-midnight-border"
              />
              <button disabled={busy || !input.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-radar text-white disabled:opacity-40" aria-label={t("send")}>
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
