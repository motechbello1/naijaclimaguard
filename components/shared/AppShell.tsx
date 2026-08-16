"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Shield, LayoutDashboard, Map, Zap, BarChart3,
  LogOut, ChevronDown, ChevronLeft, ChevronRight, User, Radar, Home, Megaphone, Telescope, FileCheck2, ShieldAlert,
  Menu, X, Settings2, ClipboardCheck, Network,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import SatelliteStatus from "./SatelliteStatus";
import { ExplanationModeControl, ExplanationModeProvider, PageExplanation } from "./ExplanationMode";
import { ExperienceProfileProvider, ExperienceRoleControl, useExperienceProfile } from "./ExperienceProfile";
import { useLanguage } from "./LanguageProvider";
import LanguageSelector from "./LanguageSelector";
import { ReadAloudControl } from "./SpeechProvider";
import type { MessageKey } from "@/lib/i18n/messages";

type NavItem = {
  href: string;
  key?: MessageKey;
  labels?: Record<string, string>;
  icon: any;
};

const DECISION_NETWORK_LABELS: Record<string, string> = {
  en: "Decision Network",
  pcm: "Flood Decision Network",
  ha: "Cibiyar Shawarar Ambaliya",
  yo: "Nẹ́tíwọ́ọ̀kì Ìpinnu Ìkún Omi",
  ig: "Netwọk Mkpebi Idei Mmiri",
};

const decisionNetworkItem: NavItem = { href: "/decision-network", labels: DECISION_NETWORK_LABELS, icon: Network };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  HOUSEHOLD: [
    { href: "/my-area", key: "myArea", icon: Home },
    { href: "/dashboard", key: "mySafety", icon: LayoutDashboard },
    decisionNetworkItem,
    { href: "/action-center", key: "whatToDoNow", icon: ClipboardCheck },
    { href: "/action", key: "myAlerts", icon: Zap },
    { href: "/evidence", key: "myHistory", icon: FileCheck2 },
    { href: "/report", key: "reportFlood", icon: Megaphone },
  ],
  FARMER: [
    { href: "/dashboard", key: "myFarmRisk", icon: LayoutDashboard },
    decisionNetworkItem,
    { href: "/action-center", key: "whatToDoNow", icon: ClipboardCheck },
    { href: "/action", key: "farmAlerts", icon: Zap },
    { href: "/outlook", key: "rainOutlook", icon: Telescope },
    { href: "/evidence", key: "farmHistory", icon: FileCheck2 },
    { href: "/report", key: "reportFlood", icon: Megaphone },
  ],
  BUSINESS: [
    { href: "/dashboard", key: "riskOverview", icon: LayoutDashboard },
    decisionNetworkItem,
    { href: "/action-center", key: "whatToDoNow", icon: ClipboardCheck },
    { href: "/action", key: "alertsActions", icon: Zap },
    { href: "/intelligence", key: "riskIntelligence", icon: Radar },
    { href: "/evidence", key: "operationalEvidence", icon: FileCheck2 },
  ],
  AGENCY: [
    { href: "/dashboard", key: "operations", icon: LayoutDashboard },
    { href: "/command", key: "commandQueue", icon: ShieldAlert },
    decisionNetworkItem,
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

function Logo({ compact = false, mobile = false }: { compact?: boolean; mobile?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2 overflow-hidden">
      <div className={`${mobile ? "h-7 w-7 rounded-lg" : "h-8 w-8 rounded-lg"} flex shrink-0 items-center justify-center border border-radar/20 bg-radar/10`}><Shield className={`${mobile ? "h-3.5 w-3.5" : "h-4 w-4"} text-radar`} /></div>
      {!compact && <span className={`${mobile ? "text-xs" : "text-sm"} truncate whitespace-nowrap font-display font-bold`}>NaijaClima<span className="text-radar">Guard</span></span>}
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
  const { t, locale } = useLanguage();
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
      {nav.map((item) => {
        const active = pathname === item.href;
        const label = item.labels?.[locale] || (item.key ? t(item.key) : item.href);
        return (
          <Link key={item.href} href={item.href} onClick={() => mobile && setMobileOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${active ? "border border-radar/20 bg-radar/10 text-radar" : "border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white"}`} title={!mobile && collapsed ? label : undefined}>
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {(mobile || !collapsed) && <span className="min-w-0 truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-[100dvh] min-w-0 overflow-hidden bg-cloud dark:bg-midnight">
      <aside className={`hidden lg:flex flex-col border-r border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light shrink-0 overflow-hidden transition-all duration-[350ms] ease-silk ${collapsed ? "w-[68px]" : "w-[240px]"}`}>
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-midnight-border"><Logo compact={collapsed} /><button onClick={() => setCollapsed(!collapsed)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}</button></div>
        <div className="flex-1 overflow-y-auto px-3 py-4"><NavLinks /></div>
        <div className="space-y-1 border-t border-slate-100 px-3 py-4 dark:border-midnight-border"><Link href="/profile" className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${pathname === "/profile" ? "border border-radar/20 bg-radar/10 text-radar" : "border border-transparent text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"}`}><User className="h-[18px] w-[18px] shrink-0" />{!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{userName}</p><p className="text-[10px] uppercase text-slate-400">{userPlan}</p></div>}</Link><button onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-crimson hover:bg-crimson/5"><LogOut className="h-[18px] w-[18px] shrink-0" />{!collapsed && <span>{t("signOut")}</span>}</button></div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[120] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl dark:border-midnight-border dark:bg-midnight">
            <div className="flex min-h-14 items-center justify-between border-b border-slate-100 px-3 dark:border-midnight-border"><Logo mobile /><button onClick={() => setMobileOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close navigation"><X className="h-4 w-4" /></button></div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              <NavLinks mobile />
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-midnight-border">
                <button type="button" onClick={() => setShowPreferences((value) => !value)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-semibold"><span className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-radar" /> Preferences</span><ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showPreferences ? "rotate-180" : ""}`} /></button>
                {showPreferences && <div className="space-y-3 border-t border-slate-200 p-3 dark:border-midnight-border"><ExperienceRoleControl /><ExplanationModeControl /><LanguageSelector /><ReadAloudControl /><div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-midnight-border"><span className="text-xs font-semibold text-slate-500">Appearance</span><ThemeToggle /></div></div>}
              </div>
            </div>
            <div className="space-y-1 border-t border-slate-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-midnight-border"><Link onClick={() => setMobileOpen(false)} href="/profile" className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50"><User className="h-4 w-4" /><div className="min-w-0"><p className="truncate font-semibold">{userName}</p><p className="text-[10px] uppercase text-slate-400">{userPlan}</p></div></Link><button onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-crimson hover:bg-crimson/5"><LogOut className="h-4 w-4" />{t("signOut")}</button></div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center border-b border-slate-200 bg-white/95 px-2.5 backdrop-blur-xl dark:border-midnight-border dark:bg-midnight/95 sm:h-14 sm:px-4 lg:h-16 lg:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:hidden"><button onClick={() => setMobileOpen(true)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Open navigation"><Menu className="h-4 w-4" /></button><Logo mobile /></div>
          <div className="hidden min-w-0 lg:block"><SatelliteStatus /></div>
          <div className="ml-auto hidden items-center gap-2 lg:flex"><ExperienceRoleControl /><ExplanationModeControl /><LanguageSelector compact /><ReadAloudControl compact /><ThemeToggle /></div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 pb-[max(5rem,env(safe-area-inset-bottom))] sm:p-5 sm:pb-6 lg:p-8"><PageExplanation pathname={pathname} />{children}</main>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <ExperienceProfileProvider><ExplanationModeProvider><AppShellInner>{children}</AppShellInner></ExplanationModeProvider></ExperienceProfileProvider>;
}
