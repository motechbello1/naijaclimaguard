"use client";

import Link from "next/link";
import { BadgeCheck, House, Languages, Moon, Radio, Sun, Volume2, Waves, ArrowUpRight } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import "@/app/floodpass.css";

export type UiLang = "en" | "pcm";

type FpContext = { lang: UiLang; setLang: (lang: UiLang) => void; night: boolean; say: (text: string) => void; tr: (key: string) => string };
type Active = "home" | "report" | "check" | "plans" | "help" | "partners";

const Ctx = createContext<FpContext | null>(null);

/** Short UI words. Messages people act on live in lib/floodpass/messages.ts. */
const UI: Record<UiLang, Record<string, string>> = {
  en: {
    hear: "Listen", night: "Night mode", day: "Day mode", home: "Home", report: "Report", check: "Check", plans: "Plans", help: "Help", partners: "For partners",
    promise: "Proof that turns a flood into help.",
    lead: "FloodPass shows official flood warnings and helps you report water. Reports that pass our checks become proof that others can check.",
    whatsapp: "Get warnings on WhatsApp", myStreet: "Check my area", waterHere: "Report water", checkCode: "Check a FloodPass code",
    free: "Warnings and proof are free. Always.",
  },
  pcm: {
    hear: "Hear am", night: "Night mode", day: "Day mode", home: "Home", report: "Report", check: "Check", plans: "Plans", help: "Help", partners: "For partners",
    promise: "Proof wey turn flood to help.",
    lead: "FloodPass dey show official flood warning and help you report water. If your report pass our checks, e go become proof wey people fit check.",
    whatsapp: "Collect warning for WhatsApp", myStreet: "Check my area", waterHere: "Report water", checkCode: "Check FloodPass code",
    free: "Warning and proof na free. Always.",
  },
};

export function useFp() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useFp must be used inside FpShell");
  return value;
}

function readStored(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function writeStored(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode: fine */ }
}

export function whatsappLink(text = "Hi") {
  const number = (process.env.NEXT_PUBLIC_FLOODPASS_WHATSAPP || "").replace(/[^0-9]/g, "");
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

const nav = [
  { key: "home", href: "/", icon: House },
  { key: "report", href: "/floodpass/report", icon: Radio },
  { key: "check", href: "/check", icon: BadgeCheck },
  { key: "plans", href: "/floodpass/plans", icon: Waves },
  { key: "help", href: "/floodpass/help", icon: Volume2 },
] as const;

export default function FpShell({ children, active }: { children: React.ReactNode; active?: Active }) {
  const [lang, setLangState] = useState<UiLang>("en");
  const [night, setNight] = useState(false);

  useEffect(() => {
    if (readStored("fp-lang") === "pcm") setLangState("pcm");
    if (readStored("fp-night") === "1") setNight(true);
  }, []);

  const setLang = useCallback((next: UiLang) => { setLangState(next); writeStored("fp-lang", next); }, []);
  const toggleNight = () => { setNight((value) => { writeStored("fp-night", value ? "0" : "1"); return !value; }); };

  const say = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-NG";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, []);

  const tr = useCallback((key: string) => UI[lang][key] ?? UI.en[key] ?? key, [lang]);

  return (
    <Ctx.Provider value={{ lang, setLang, night, say, tr }}>
      <div className={`fp-root${night ? " fp-night" : ""}`}>
        <a className="fp-skip" href="#fp-content">Skip to content</a>
        <header className="fp-header">
          <div className="fp-wrap fp-header-inner">
            <Link href="/" className="fp-brand" aria-label="FloodPass home">
              <FpMark size={42} />
              <span className="fp-brand-words"><strong>Flood<span>Pass</span></strong><small>BY NAIJACLIMAGUARD</small></span>
            </Link>
            <nav aria-label="FloodPass main navigation" className="fp-desktop-nav">
              {nav.map((item) => (
                <Link key={item.key} href={item.href} className="fp-nav-link" aria-current={active === item.key ? "page" : undefined}>{tr(item.key)}</Link>
              ))}
            </nav>
            <div className="fp-header-controls">
              <button className="fp-control" onClick={() => setLang(lang === "en" ? "pcm" : "en")} aria-label={lang === "en" ? "Switch to Pidgin" : "Switch to English"} title={lang === "en" ? "Switch to Pidgin" : "Switch to English"}>
                <Languages size={17} aria-hidden="true" /><span>{lang === "en" ? "Pidgin" : "English"}</span>
              </button>
              <button className="fp-control fp-theme-control" onClick={toggleNight} aria-label={night ? "Switch to day mode" : "Switch to night mode"} aria-pressed={night} title={night ? "Day mode" : "Night mode"}>
                {night ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              </button>
              <Link href="/floodpass/report" className="fp-header-report">Report water <ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </header>
        <main id="fp-content" className={`fp-wrap fp-main${active === "home" ? " fp-main-home" : ""}`}>{children}</main>
        <footer className="fp-footer">
          <div className="fp-wrap fp-footer-inner">
            <div><div className="fp-footer-lockup"><FpMark size={34} /><strong>FloodPass</strong></div><p>By NaijaClimaGuard.<br />{tr("free")}</p></div>
            <div className="fp-footer-links"><Link href="/floodpass/help">Flood guidance</Link><Link href="/partners">{tr("partners")}</Link><Link href="/floodpass/coverage">Coverage</Link></div>
            <p className="fp-footer-note">Official warnings come from NiMet, NIHSA and NEMA. No warning does not mean no flood risk. In an emergency call 112.</p>
          </div>
        </footer>
        <nav aria-label="FloodPass mobile navigation" className="fp-mobile-nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return <Link key={item.key} href={item.href} aria-current={active === item.key ? "page" : undefined}><Icon size={21} strokeWidth={active === item.key ? 2.4 : 1.9} aria-hidden="true" /><span>{tr(item.key)}</span></Link>;
          })}
        </nav>
      </div>
    </Ctx.Provider>
  );
}

export function FpMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true" className="fp-mark">
      <rect width="44" height="44" rx="12" fill="#102D48" />
      <path d="M8 19.5c4.9-5.8 9.4-7.5 14-4.4 4.8 3.2 8.1 3.8 14-1.9M8 26.2c5.1-5.4 9.3-7.3 14-4.2 4.8 3.2 8.1 3.9 14-1.9M8 32.4c5.1-5.5 9.3-7.2 14-4.1 4.8 3.2 8.1 3.8 14-1.9" stroke="#E6F3F4" strokeWidth="2.3" strokeLinecap="round" />
      <circle cx="22" cy="15.1" r="3.1" fill="#6DD6E5" />
    </svg>
  );
}

export function HearButton({ text }: { text: string }) {
  const { say, tr } = useFp();
  return (
    <button className="fp-listen" onClick={() => say(text)} aria-label={`${tr("hear")}: ${text.slice(0, 60)}`}>
      <Volume2 size={17} aria-hidden="true" />{tr("hear")}
    </button>
  );
}
