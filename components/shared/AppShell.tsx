"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  BarChart3, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck,
  Compass, FileCheck2, Home, LayoutDashboard, LogOut, Map, MapPin, Megaphone,
  Menu, Presentation, Radar, Settings2, ShieldAlert, Telescope,
  WalletCards, Waves, X, Zap,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import SatelliteStatus from "./SatelliteStatus";
import { ExplanationModeControl, ExplanationModeProvider, PageExplanation } from "./ExplanationMode";
import { ExperienceProfileProvider, ExperienceRoleControl, useExperienceProfile } from "./ExperienceProfile";
import { NationalAreaControl, useNationalArea } from "./NationalArea";
import { useLanguage } from "./LanguageProvider";
import LanguageSelector from "./LanguageSelector";
import { ReadAloudControl } from "./SpeechProvider";
import { translatePlatformText } from "@/lib/i18n/translate-platform";
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
  { href: "/tools", label: "All tools", icon: Compass },
  { href: "/impact", label: "Economic Impact", icon: CircleDollarSign },
  { href: "/revenue", label: "Revenue Engine", icon: WalletCards },
  { href: "/investor-readiness", label: "Investor + TRL 6", icon: ShieldAlert },
  { href: "/model-evidence", label: "Model Evidence", icon: FileCheck2 },
  { href: "/pitch", label: "Pitch Mode", icon: Presentation },
];

const MOBILE_LINKS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/my-area", label: "My area", icon: MapPin },
  { href: "/action-center", label: "Act", icon: ClipboardCheck },
  { href: "/action", label: "Alerts", icon: Zap },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="group flex min-w-0 items-center gap-3 text-white" data-ncg-no-translate="true">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#d9ff57] text-[#071713] shadow-[0_10px_28px_rgba(217,255,87,.14)]">
        <Waves className="h-5 w-5" />
      </div>
      {!compact && <div className="min-w-0"><p className="truncate text-[15px] font-black tracking-[-0.03em]">NaijaClimaGuard</p><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/35">Climate action OS</p></div>}
    </Link>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { role } = useExperienceProfile();
  const { area } = useNationalArea();
  const { t, locale } = useLanguage();
  const tr = (source: string) => translatePlatformText(locale, source);
  const nav = NAV_BY_ROLE[role] || NAV_BY_ROLE.HOUSEHOLD;
  const userPlan = (session?.user as any)?.plan || "FREE";
  const userName = session?.user?.name || session?.user?.email || "User";
  const initial = userName.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [moreOpen]);

  useEffect(() => {
    const handlePopState = () => { if (!session) router.replace("/login"); };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [session, router]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.replace("/login");
  };

  const navLink = (item: { href: string; key: MessageKey; icon: any }) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const label = t(item.key);
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href} title={collapsed ? label : undefined} className={`group relative flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-sm font-semibold transition-all ${active ? "bg-white/[.11] text-white" : "text-white/70 hover:bg-white/[.06] hover:text-white"}`}>
        {active && <span className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-[#d9ff57]" />}
        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#d9ff57]" : "text-white/55 group-hover:text-white/80"}`} />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  return (
    <div className="ncg-app flex min-h-[100dvh] min-w-0 bg-[#f3f4ee] text-[#0d1f19] dark:bg-[#07110e] dark:text-slate-100" key={locale}>
      <aside className={`fixed inset-y-3 left-3 z-40 hidden overflow-hidden rounded-[28px] border border-white/10 bg-[#071713] text-white shadow-[0_24px_70px_rgba(5,25,20,.20)] transition-[width] duration-300 lg:flex lg:flex-col ${collapsed ? "w-[78px]" : "w-[272px]"}`}>
        <div className="pointer-events-none absolute -right-16 top-8 h-48 w-48 rounded-full bg-[#1f5f49]/30 blur-3xl" />
        <div className="relative flex h-[74px] items-center justify-between px-4"><Brand compact={collapsed} /><button onClick={() => setCollapsed((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[.05] text-white/55 hover:text-white" aria-label={collapsed ? tr("Expand navigation") : tr("Collapse navigation")}>{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button></div>

        {!collapsed && <div className="relative mx-3 rounded-[18px] border border-white/10 bg-white/[.055] p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-[#d9ff57]"><MapPin className="h-3.5 w-3.5" /> {tr("Working area")}</div><p className="mt-2 text-lg font-black tracking-tight">{area.name}</p><p className="mt-1 text-xs leading-5 text-white/55">{tr("National platform")} · 36 states + FCT</p></div>}

        <div className="relative flex-1 overflow-y-auto px-3 py-4">
          {!collapsed && <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[.18em] text-white/35">{tr("Workspace")}</p>}
          <nav className="space-y-1">{nav.map(navLink)}</nav>
          {!collapsed && <p className="px-3 pb-2 pt-6 text-[10px] font-black uppercase tracking-[.18em] text-white/35">{tr("Explore")}</p>}
          <nav className="space-y-1">{PRODUCT_LINKS.map((item) => { const active = pathname === item.href; const Icon = item.icon; return <Link key={item.href} href={item.href} className={`group flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-sm font-semibold ${active ? "bg-white/[.11] text-white" : "text-white/70 hover:bg-white/[.06] hover:text-white"}`}><Icon className={`h-[18px] w-[18px] ${active ? "text-[#d9ff57]" : "text-white/55"}`} />{!collapsed && <span>{tr(item.label)}</span>}</Link>; })}</nav>
        </div>

        <div className="relative m-3 rounded-[20px] border border-white/10 bg-[#0b211a] p-2">
          <Link href="/profile" className="flex items-center gap-3 rounded-[14px] p-2.5 hover:bg-white/[.05]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9ff57] text-sm font-black text-[#071713]">{initial}</div>{!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{userName}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.14em] text-white/45">{userPlan}</p></div>}</Link>
          {!collapsed && <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-xs font-semibold text-rose-200/80 hover:bg-rose-300/10 hover:text-rose-100"><LogOut className="h-4 w-4" /> {t("signOut")}</button>}
        </div>
      </aside>

      <div className={`min-w-0 flex-1 transition-[padding] duration-300 ${collapsed ? "lg:pl-[102px]" : "lg:pl-[296px]"}`}>
        <header className="sticky top-0 z-30 border-b border-[#0d1f19]/7 bg-[#f3f4ee]/94 backdrop-blur-xl dark:border-white/8 dark:bg-[#07110e]/94">
          <div className="mx-auto flex h-[68px] max-w-[1680px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 lg:hidden" data-ncg-no-translate="true"><div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#071713] text-[#d9ff57]"><Waves className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-[15px] font-black tracking-[-.03em]">NaijaClimaGuard</p><p className="truncate text-[10px] font-semibold text-slate-500 dark:text-white/48">{area.name}</p></div></div>
            <div className="hidden lg:block"><SatelliteStatus /></div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden xl:block"><NationalAreaControl compact /></div>
              <div className="hidden xl:block"><LanguageSelector compact /></div>
              <div className="hidden 2xl:block"><ExplanationModeControl /></div>
              <div className="hidden 2xl:block"><ExperienceRoleControl /></div>
              <ThemeToggle />
              <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#071713] text-xs font-black text-[#d9ff57] lg:hidden" aria-label={tr("Profile")}>{initial}</Link>
            </div>
          </div>
        </header>

        <main className="min-w-0 overflow-x-hidden px-4 pb-[calc(7.25rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-10 lg:pt-8">
          <div className="mx-auto w-full max-w-[1680px]"><PageExplanation pathname={pathname} />{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-[max(.65rem,env(safe-area-inset-bottom))] z-50 flex rounded-[22px] border border-white/10 bg-[#071713] p-1.5 shadow-[0_18px_50px_rgba(3,20,15,.34)] lg:hidden" aria-label="Primary navigation">
        {MOBILE_LINKS.map((item) => { const active = pathname === item.href || pathname.startsWith(`${item.href}/`); const Icon = item.icon; return <Link key={item.href} href={item.href} className={`flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[16px] px-1 text-[10px] font-black transition ${active ? "bg-[#d9ff57] text-[#071713]" : "text-white/90"}`}><Icon className="h-[18px] w-[18px] shrink-0" /><span className="max-w-full truncate">{tr(item.label)}</span></Link>; })}
        <button onClick={() => setMoreOpen(true)} className={`flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[16px] px-1 text-[10px] font-black ${moreOpen ? "bg-white/10 text-white" : "text-white/90"}`}><Menu className="h-[18px] w-[18px]" /><span className="max-w-full truncate">{tr("More")}</span></button>
      </nav>

      {moreOpen && <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label={tr("More navigation")}><button className="absolute inset-0 bg-[#03120d]/60 backdrop-blur-[3px]" onClick={() => setMoreOpen(false)} aria-label={tr("Close menu")} /><section className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[32px] bg-[#f7f7f2] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 text-[#0d1f19] shadow-2xl dark:bg-[#0b1814] dark:text-white"><div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/15" /><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-700 dark:text-[#d9ff57]">{tr("Your NaijaClimaGuard")}</p><p className="mt-1 text-2xl font-black tracking-tight">{tr("Everything else")}</p></div><button onClick={() => setMoreOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/70 dark:bg-white/8" aria-label={tr("Close")}><X className="h-4 w-4" /></button></div>
        <Link href="/tools" className="mt-5 flex items-center justify-between rounded-[20px] bg-[#071713] px-5 py-4 text-white"><div><p className="text-sm font-black">{tr("Find any tool")}</p><p className="mt-1 text-[11px] text-white/55">{tr("Search every feature in one place")}</p></div><Compass className="h-5 w-5 text-[#d9ff57]" /></Link>
        <div className="mt-4 grid grid-cols-2 gap-2">{nav.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="rounded-[18px] border border-black/7 bg-white p-4 shadow-[0_6px_24px_rgba(25,45,36,.05)] dark:border-white/8 dark:bg-white/[.04]"><Icon className="h-5 w-5 text-emerald-700 dark:text-[#d9ff57]" /><p className="mt-4 text-sm font-bold">{t(item.key)}</p></Link>; })}</div>
        <div className="mt-5 rounded-[22px] border border-black/7 bg-white p-4 dark:border-white/8 dark:bg-white/[.04]"><div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-emerald-700 dark:text-[#d9ff57]" /><p className="text-sm font-black">{tr("Preferences")}</p></div><div className="mt-4 grid gap-3"><NationalAreaControl /><LanguageSelector /><ExperienceRoleControl /><ExplanationModeControl /><ReadAloudControl /><div className="flex items-center justify-between rounded-[14px] bg-[#f3f4ee] p-3 dark:bg-black/20"><span className="text-xs font-semibold">{tr("Appearance")}</span><ThemeToggle /></div></div></div>
        <div className="mt-4 grid grid-cols-2 gap-2">{PRODUCT_LINKS.filter((item) => item.href !== "/tools").map((item) => <Link key={item.href} href={item.href} className="rounded-[18px] bg-[#071713] p-4 text-white"><item.icon className="h-5 w-5 text-[#d9ff57]" /><p className="mt-3 text-sm font-bold">{tr(item.label)}</p></Link>)}</div>
        <button onClick={handleLogout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"><LogOut className="h-4 w-4" /> {t("signOut")}</button>
      </section></div>}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <ExperienceProfileProvider><ExplanationModeProvider><AppShellInner>{children}</AppShellInner></ExplanationModeProvider></ExperienceProfileProvider>;
}
