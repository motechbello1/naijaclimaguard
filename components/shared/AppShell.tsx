"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Shield, LayoutDashboard, Map, Zap, BarChart3,
  LogOut, ChevronLeft, ChevronRight, User, Radar, Home, Megaphone, Telescope, FileCheck2, ShieldAlert,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import SatelliteStatus from "./SatelliteStatus";
import { ExplanationModeControl, ExplanationModeProvider, PageExplanation } from "./ExplanationMode";
import { ExperienceProfileProvider, ExperienceRoleControl, useExperienceProfile } from "./ExperienceProfile";
import { useLanguage } from "./LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";

const NAV_BY_ROLE: Record<string, Array<{ href: string; key: MessageKey; icon: any }>> = {
  HOUSEHOLD: [
    { href: "/my-area", key: "myArea", icon: Home },
    { href: "/dashboard", key: "mySafety", icon: LayoutDashboard },
    { href: "/action", key: "myAlerts", icon: Zap },
    { href: "/evidence", key: "myHistory", icon: FileCheck2 },
    { href: "/report", key: "reportFlood", icon: Megaphone },
  ],
  FARMER: [
    { href: "/dashboard", key: "myFarmRisk", icon: LayoutDashboard },
    { href: "/action", key: "farmAlerts", icon: Zap },
    { href: "/outlook", key: "rainOutlook", icon: Telescope },
    { href: "/evidence", key: "farmHistory", icon: FileCheck2 },
    { href: "/report", key: "reportFlood", icon: Megaphone },
  ],
  BUSINESS: [
    { href: "/dashboard", key: "riskOverview", icon: LayoutDashboard },
    { href: "/action", key: "alertsActions", icon: Zap },
    { href: "/intelligence", key: "riskIntelligence", icon: Radar },
    { href: "/evidence", key: "operationalEvidence", icon: FileCheck2 },
  ],
  AGENCY: [
    { href: "/dashboard", key: "operations", icon: LayoutDashboard },
    { href: "/command", key: "commandQueue", icon: ShieldAlert },
    { href: "/intelligence", key: "intelligence", icon: Radar },
    { href: "/predict", key: "locationAnalysis", icon: Map },
    { href: "/outlook", key: "outlook", icon: Telescope },
    { href: "/action", key: "alertRules", icon: Zap },
    { href: "/report", key: "fieldReports", icon: Megaphone },
    { href: "/evidence", key: "operationalEvidence", icon: FileCheck2 },
    { href: "/prove", key: "modelEvidence", icon: BarChart3 },
  ],
};

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
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

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.replace("/login");
    window.history.pushState(null, "", "/login");
  };

  const userPlan = (session?.user as any)?.plan || "FREE";
  const userName = session?.user?.name || session?.user?.email || "User";

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`flex flex-col border-r border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light shrink-0 overflow-hidden transition-all duration-[350ms] ease-silk ${collapsed ? "w-[68px]" : "w-[240px]"}`}>
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-midnight-border">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-radar/10 border border-radar/20"><Shield className="h-4 w-4 text-radar" /></div>{!collapsed && <span className="font-display text-sm font-bold whitespace-nowrap">NaijaClima<span className="text-radar">Guard</span></span>}</Link>
          <button onClick={() => setCollapsed(!collapsed)} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}</button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname === item.href;
            const label = t(item.key);
            return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${active ? "bg-radar/10 text-radar border border-radar/20" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"}`} title={collapsed ? label : undefined}><item.icon className="h-[18px] w-[18px] shrink-0" />{!collapsed && <span>{label}</span>}</Link>;
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100 dark:border-midnight-border space-y-1">
          <Link href="/profile" className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${pathname === "/profile" ? "bg-radar/10 text-radar border border-radar/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"}`}><User className="h-[18px] w-[18px] shrink-0" />{!collapsed && <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{userName}</p><p className="text-[10px] text-slate-400 uppercase">{userPlan}</p></div>}</Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-crimson hover:bg-crimson/5"><LogOut className="h-[18px] w-[18px] shrink-0" />{!collapsed && <span>{t("signOut")}</span>}</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-6 py-2 border-b border-slate-200 dark:border-midnight-border bg-white/80 dark:bg-midnight/80 backdrop-blur-xl"><div className="min-w-0"><SatelliteStatus /></div><div className="flex items-center gap-2 shrink-0"><ExperienceRoleControl /><ExplanationModeControl /><ThemeToggle /></div></header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><PageExplanation pathname={pathname} />{children}</main>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <ExperienceProfileProvider><ExplanationModeProvider><AppShellInner>{children}</AppShellInner></ExplanationModeProvider></ExperienceProfileProvider>;
}
