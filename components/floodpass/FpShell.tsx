"use client";

import Link from "next/link";
import { BadgeCheck, House, Languages, Moon, Radio, Sun, Volume2, LayoutDashboard, ChevronDown, LogOut, UserRound, UserPlus } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { APP_LANGUAGES, type AppLocale } from "@/lib/i18n/config";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { translatePlatformText } from "@/lib/i18n/translate-platform";
import "@/app/floodpass.css";
import "@/app/brand-v2.css";

export type UiLang = AppLocale;

type FpContext = { lang: UiLang; setLang: (lang: UiLang) => void; night: boolean; say: (text: string) => void; tr: (key: string) => string };
type Active = "home" | "report" | "check" | "plans" | "help" | "partners";

const Ctx = createContext<FpContext | null>(null);

/** Short UI words. Messages people act on live in lib/floodpass/messages.ts. */
const UI: Record<string, string> = {
    hear: "Listen", night: "Night mode", day: "Day mode", home: "Home", report: "Report", check: "Check", plans: "Plans", help: "Help", partners: "For partners",
    promise: "Know before. Act together. Prove after.",
    lead: "FloodPass shows official flood warnings and helps you report water. Reports that pass our checks become proof that others can check.",
    whatsapp: "Get warnings on WhatsApp", myStreet: "Check my area", waterHere: "Report water", checkCode: "Check a FloodPass code",
    free: "Warnings and proof are free. Always.",
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

const mobileNav = [
  { key: "home", href: "/", icon: House },
  { key: "report", href: "/floodpass/report", icon: Radio },
  { key: "check", href: "/check", icon: BadgeCheck },
  { key: "workspace", href: "/dashboard", icon: LayoutDashboard },
] as const;

const desktopNav = [
  { key: "home", href: "/", label: "Today" },
  { key: "report", href: "/floodpass/report", label: "Report water" },
  { key: "check", href: "/check", label: "Check a record" },
  { key: "partners", href: "/partners", label: "For organisations" },
] as const;

export default function FpShell({ children, active }: { children: React.ReactNode; active?: Active }) {
  const { locale: lang, setLocale: setLang } = useLanguage();
  const { status, data: session } = useSession();
  const router = useRouter();
  const [night, setNight] = useState(false);

  useEffect(() => {
    if (readStored("fp-night") === "1") setNight(true);
  }, []);

  const toggleNight = () => { setNight((value) => { writeStored("fp-night", value ? "0" : "1"); return !value; }); };

  const say = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(translatePlatformText(lang, text));
    utterance.lang = ({ en: "en-NG", pcm: "en-NG", ha: "ha-NG", yo: "yo-NG", ig: "ig-NG" } as const)[lang];
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, [lang]);

  const tr = useCallback((key: string) => translatePlatformText(lang, UI[key] ?? key), [lang]);
  const signedIn = status === "authenticated";
  const logout = async () => { await signOut({ redirect: false }); router.replace("/"); };

  return (
    <Ctx.Provider value={{ lang, setLang, night, say, tr }}>
      <div className={`fp-root${night ? " fp-night" : ""}`}>
        <a className="fp-skip" href="#fp-content">Skip to content</a>
        <header className="fp-header">
          <div className="fp-wrap fp-header-inner">
            <Link href="/" className="fp-brand" aria-label="NaijaClimaGuard home">
              <FpMark size={42} />
              <span className="fp-brand-words"><strong>NaijaClima<span>Guard</span></strong><small>FLOOD INTELLIGENCE / FLOODPASS</small></span>
            </Link>
            <nav aria-label="NaijaClimaGuard main navigation" className="fp-desktop-nav">
              {desktopNav.map((item) => (
                <Link key={item.key} href={item.href} className="fp-nav-link" aria-current={active === item.key ? "page" : undefined}>{item.label}</Link>
              ))}
              <Link href="/dashboard" className="fp-nav-link">Workspace</Link>
            </nav>
            <div className="fp-header-controls">
              <label className="fp-control fp-language-control">
                <Languages size={17} aria-hidden="true" />
                <select value={lang} onChange={(event) => setLang(event.target.value as AppLocale)} aria-label="Platform language">
                  {APP_LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.nativeLabel}</option>)}
                </select>
              </label>
              <button className="fp-control fp-theme-control" onClick={toggleNight} aria-label={night ? "Switch to day mode" : "Switch to night mode"} aria-pressed={night} title={night ? "Day mode" : "Night mode"}>
                {night ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              </button>
              <details className="fp-account-menu">
                <summary><UserRound size={17} aria-hidden="true" /><span>{signedIn ? tr("Account") : tr("Log in / sign up")}</span><ChevronDown size={14} aria-hidden="true" /></summary>
                <div className="fp-account-panel">
                  {signedIn && <p className="fp-account-person">{session?.user?.name || session?.user?.email}</p>}
                  {signedIn ? <><Link href="/dashboard"><LayoutDashboard size={17} /> {tr("My workspace")}</Link><Link href="/profile"><UserRound size={17} /> {tr("Profile and settings")}</Link><Link href="/register"><UserPlus size={17} /> {tr("Create another account")}</Link><button type="button" onClick={logout}><LogOut size={17} /> {tr("Sign out")}</button></> : <><Link href="/login?callbackUrl=%2Fdashboard"><UserRound size={17} /> {tr("Log in")}</Link><Link href="/register"><UserPlus size={17} /> {tr("Create free account")}</Link></>}
                </div>
              </details>
            </div>
          </div>
        </header>
        <main id="fp-content" className={`fp-wrap fp-main${active === "home" ? " fp-main-home" : ""}`}>{children}</main>
        <footer className="fp-footer">
          <div className="fp-wrap fp-footer-inner">
            <div><div className="fp-footer-lockup"><FpMark size={34} /><strong>NaijaClimaGuard</strong></div><p>Know before. Act together. Prove after.<br />FloodPass is our field evidence service.</p></div>
            <div className="fp-footer-links"><Link href="/dashboard">My workspace · family, farm, business, agency</Link>{signedIn ? <Link href="/profile">Profile and settings</Link> : <><Link href="/login">Log in</Link><Link href="/register">Create free account</Link></>}<Link href="/floodpass/help">Flood guidance</Link><Link href="/partners">For organisations</Link><Link href="/floodpass/coverage">Coverage and sources</Link><Link href="/floodpass/plans">Membership and pilots</Link></div>
            <p className="fp-footer-note">Public warnings and reporting are free. Official warnings take priority. No warning does not mean no flood risk. In an emergency call 112.</p>
          </div>
        </footer>
        <nav aria-label="NaijaClimaGuard mobile navigation" className="fp-mobile-nav">
          {mobileNav.map((item) => {
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
