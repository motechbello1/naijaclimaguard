"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  Megaphone,
  Menu,
  Presentation,
  Radar,
  Settings2,
  ShieldAlert,
  Telescope,
  User,
  Waves,
  X,
  Zap,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import SatelliteStatus from "./SatelliteStatus";
import { ExplanationModeControl, ExplanationModeProvider, PageExplanation } from "./ExplanationMode";
import { ExperienceProfileProvider, ExperienceRoleControl, useExperienceProfile } from "./ExperienceProfile";
import { useLanguage } from "./LanguageProvider";
import LanguageSelector from "./LanguageSelector";
import { ReadAloudControl } from "./SpeechProvider";
import type { MessageKey } from "@/lib/i18n/messages";

const NAV_BY_ROLE: Record<string, Array<{ href: string; key: MessageKey; icon: any }>> = {
  HOUSEHOLD: [
    { href: "/my-area", key: "myArea", icon: Home },
    { href: "/dashboard", key: "mySafety", icon: LayoutDashboard },
    { href: "/action-center", key: "whatToDoNow", icon: ClipboardCheck },
    { href: "/action", key: "myAlerts", icon: Zap },
    { href: "/evidence", key: "myHistory", icon: FileCheck2 },
    { href: "/report", key: "reportFlood", icon: Megaphone },
  ],
  FARMER: [
    { href: "/dashboard", key: "myFarmRisk", icon: LayoutDashboard },
    { href: "/action-center", key: "whatToDoNow", icon: ClipboardCheck },
    { href: "/action", key: "farmAlerts", icon: Zap },
    { href: "/outlook", key: "rainOutlook", icon: Telescope },
    { href: "/evidence", key: "farmHistory", icon: FileCheck2 },
    { href: "/report", key: "reportFlood", icon: Megaphone },
  ],
  BUSINESS: [
    { href: "/dashboard", key: "riskOverview", icon: LayoutDashboard },
    { href: "/action-center", key: "whatToDoNow", icon: ClipboardCheck },
    { href: "/action", key: "alertsActions", icon: Zap },
    { href: "/intelligence", key: "riskIntelligence", icon: Radar },
    { href: "/evidence", key: "operationalEvidence", icon: FileCheck2 },
  ],
  AGENCY: [
    { href: "/dashboard", key: "operations", icon: LayoutDashboard },
    { href: "/command", key: "commandQueue", icon: ShieldAlert },
    { href: "/action-center", key: "whatToDoNow", icon: ClipboardCheck },
    { href: "/intelligence", key: "intelligence", icon: Radar },
    { href: "/predict", key: "locationAnalysis", icon: Map },
    { href: "/outlook", key: "outlook", icon: Telescope },
    { href: "/action", key: "alertRules", icon: Zap },
    { href: "/report", key: "fieldReports", icon: Megaphone },
    { href: "/evidence", key: "operationalEvidence", icon: FileCheck2 },
    { href: "/prove", key: "modelEvidence", icon: BarChart3 },
  ],
};

const PRODUCT_LINKS = [
  { href: "/impact", label: "Economic Impact", icon: CircleDollarSign },
  { href: "/pitch", label: "Pitch Mode", icon: Presentation },
];

function Logo({ compact = false, mobile = false }: { compact?: boolean; mobile?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5 overflow-hidden text-white">
      <div className={`${mobile ? "h-8 w-8" : "h-9 w-9"} flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10`}>
        <Waves className={`${mobile ? "h-4 w-4" : "h-[18px] w-[18px]"} text-[#d9ff57]`} />
      </div>
      {!compact && <span className={`${mobile ? "text-xs" : "text-sm"} truncate whitespace-nowrap font-display font-black tracking-tight`}>NaijaClimaGuard</span>}
    </Link>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { role } = useExperienceProfile();
  const { t } = useLanguage();
  const nav = NAV_BY_ROLE[role] || NAV_BY_ROLE.HOUSEHOLD;

  useEffect(() => {
    const handlePopState = () => { if (!session) router.replace("/login"); };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [session, router]);

  useEffect(() => {
    setMobileOpen(false);
    setShowPreferences(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.replace("/login");
    window.history.pushState(null, "", "/login");
  };

  const userPlan = (session?.user as any)?.plan || "FREE";
  const userName = session?.user?.name || session?.user?.email || "User";

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className="space-y-1">
      {(mobile || !collapsed) && <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Your workspace</p>}
      {nav.map((item) => {
        const active = pathname === item.href;
        const label = t(item.key);
        return (
          <Link key={item.href} href={item.href} onClick={() => mobile && setMobileOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${active ? "bg-[#d9ff57] text-[#071713] shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"}`} title={!mobile && collapsed ? label : undefined}>
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {(mobile || !collapsed) && <span className="min-w-0 truncate">{label}</span>}
          </Link>
        );
      })}
      {(mobile || !collapsed) && <p className="px-3 pb-2 pt-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Product</p>}
      {PRODUCT_LINKS.map((item) => {
        const active = pathname === item.href;
        return <Link key={item.href} href={item.href} onClick={() => mobile && setMobileOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${active ? "bg-[#d9ff57] text-[#071713]" : "text-white/70 hover:bg-white/10 hover:text-white"}`} title={!mobile && collapsed ? item.label : undefined}><item.icon className="h-[18px] w-[18px] shrink-0" />{(mobile || !collapsed) && <span className="truncate">{item.label}</span>}</Link>;
      })}
    </nav>
  );

  return (
    <div className="flex h-[100dvh] min-w-0 overflow-hidden bg-[#f7f7f2] dark:bg-midnight">
      <aside className={`hidden lg:flex flex-col shrink-0 overflow-hidden bg-[#071713] text-white transition-all duration-[350ms] ${collapsed ? "w-[72px]" : "w-[252px]"}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4"><Logo compact={collapsed} /><button onClick={() => setCollapsed(!collapsed)} className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button></div>
        {!collapsed && <div className="mx-3 mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d9ff57]">National platform</p><p className="mt-1 text-xs leading-5 text-white/55">36 states + FCT. Model evidence is labelled separately by location.</p></div>}
        <div className="flex-1 overflow-y-auto px-3 py-4"><NavLinks /></div>
        <div className="space-y-1 border-t border-white/10 px-3 py-4">
          <Link href="/profile" className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${pathname === "/profile" ? "bg-[#d9ff57] text-[#071713]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><User className="h-[18px] w-[18px] shrink-0" />{!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{userName}</p><p className={`text-[10px] uppercase ${pathname === "/profile" ? "text-[#071713]/55" : "text-white/35"}`}>{userPlan}</p></div>}</Link>
          <button onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-400/10"><LogOut className="h-[18px] w-[18px] shrink-0" />{!collapsed && <span>{t("signOut")}</span>}</button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[120] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,330px)] flex-col overflow-hidden bg-[#071713] text-white shadow-2xl">
            <div className="flex min-h-16 items-center justify-between border-b border-white/10 px-4"><Logo mobile /><button onClick={() => setMobileOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10" aria-label="Close navigation"><X className="h-4 w-4" /></button></div>
            <div className="mx-3 mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d9ff57]">National platform</p><p className="mt-1 text-xs text-white/55">36 states + FCT</p></div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3"><NavLinks mobile />
              <div className="mt-4 overflow-hidden rounded-xl border border-white/10"><button type="button" onClick={() => setShowPreferences((value) => !value)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-semibold"><span className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-[#d9ff57]" /> Preferences</span><ChevronDown className={`h-4 w-4 text-white/45 transition-transform ${showPreferences ? "rotate-180" : ""}`} /></button>{showPreferences && <div className="space-y-3 border-t border-white/10 bg-white/[0.04] p-3 text-slate-900 dark:text-slate-100"><ExperienceRoleControl /><ExplanationModeControl /><LanguageSelector /><ReadAloudControl /><div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 dark:bg-slate-900"><span className="text-xs font-semibold text-slate-500">Appearance</span><ThemeToggle /></div></div>}</div>
            </div>
            <div className="space-y-1 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"><Link onClick={() => setMobileOpen(false)} href="/profile" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/75 hover:bg-white/10"><User className="h-4 w-4" /><div className="min-w-0"><p className="truncate font-semibold">{userName}</p><p className="text-[10px] uppercase text-white/35">{userPlan}</p></div></Link><button onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-400/10"><LogOut className="h-4 w-4" />{t("signOut")}</button></div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-14 shrink-0 items-center border-b border-slate-200/80 bg-[#f7f7f2]/95 px-3 backdrop-blur-xl dark:border-midnight-border dark:bg-midnight/95 sm:px-4 lg:h-16 lg:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:hidden"><button onClick={() => setMobileOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#071713] text-white" aria-label="Open navigation"><Menu className="h-4 w-4" /></button><span className="font-display text-sm font-black text-[#071713] dark:text-white">NaijaClimaGuard</span></div>
          <div className="hidden min-w-0 lg:block"><SatelliteStatus /></div>
          <div className="ml-auto hidden items-center gap-2 lg:flex"><Link href="/impact" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#071713] shadow-sm hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white">Economic Impact</Link><ExperienceRoleControl /><ExplanationModeControl /><LanguageSelector compact /><ReadAloudControl compact /><ThemeToggle /></div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 pb-[max(5rem,env(safe-area-inset-bottom))] sm:p-5 sm:pb-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]"><PageExplanation pathname={pathname} />{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <ExperienceProfileProvider><ExplanationModeProvider><AppShellInner>{children}</AppShellInner></ExplanationModeProvider></ExperienceProfileProvider>;
}
