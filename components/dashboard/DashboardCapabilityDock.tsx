"use client";

import Link from "next/link";
import {
  Activity, ArrowUpRight, BellRing, Building2, ClipboardCheck, Compass, FileCheck2,
  Landmark, Map, Navigation, Radar, Route, ShieldAlert, Telescope, Waves,
} from "lucide-react";
import { useExperienceProfile } from "@/components/shared/ExperienceProfile";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { translatePlatformText } from "@/lib/i18n/translate-platform";

const COMMON = [
  { href: "/live-floods", label: "Live Flood Intelligence", note: "774-LGA scout, national nowcast, live reports and incident learning.", icon: Activity, accent: "lime" },
  { href: "/safe-route", label: "Safe Route", note: "Check lower-exposure driving options against current flood evidence.", icon: Navigation, accent: "water" },
  { href: "/action-center", label: "What to do now", note: "Turn current risk into clear practical actions.", icon: ClipboardCheck, accent: "sand" },
];

const BY_ROLE: Record<string, Array<{ href: string; label: string; note: string; icon: any; accent?: string }>> = {
  HOUSEHOLD: [
    { href: "/action", label: "Warnings & alerts", note: "Choose when and how the platform should warn you.", icon: BellRing },
    { href: "/evidence", label: "My flood history", note: "Review saved evidence, warnings and decisions.", icon: FileCheck2 },
    { href: "/report", label: "Report flooding", note: "Send a local flood observation into the intelligence layer.", icon: Waves },
  ],
  FARMER: [
    { href: "/outlook", label: "Rain outlook", note: "See rainfall conditions that can affect farms and access routes.", icon: Telescope },
    { href: "/action", label: "Farm alerts", note: "Set warnings for the places and assets you protect.", icon: BellRing },
    { href: "/evidence", label: "Farm history", note: "Review past risk, warnings and supporting evidence.", icon: FileCheck2 },
  ],
  BUSINESS: [
    { href: "/intelligence", label: "Risk Intelligence", note: "Open the deeper operational and multi-source risk view.", icon: Radar },
    { href: "/impact", label: "Economic Impact", note: "Translate flood exposure into business and asset consequences.", icon: Building2 },
    { href: "/evidence", label: "Operational evidence", note: "Review the evidence trail behind risk and action decisions.", icon: FileCheck2 },
  ],
  AGENCY: [
    { href: "/command", label: "Command Queue", note: "Move priority intelligence into an operational response workflow.", icon: ShieldAlert },
    { href: "/intelligence", label: "Risk Intelligence", note: "Open multi-source operational intelligence and context.", icon: Radar },
    { href: "/predict", label: "Location Analysis", note: "Run exact-coordinate flood-risk analysis for a specific place.", icon: Map },
  ],
};

const ACCENTS: Record<string, string> = {
  lime: "from-[#d9ff57]/28 to-[#d9ff57]/5 dark:from-[#d9ff57]/16 dark:to-transparent",
  water: "from-emerald-300/24 to-cyan-200/10 dark:from-emerald-400/12 dark:to-transparent",
  sand: "from-amber-200/30 to-orange-100/10 dark:from-amber-300/10 dark:to-transparent",
};

export default function DashboardCapabilityDock() {
  const { role } = useExperienceProfile();
  const { locale } = useLanguage();
  const tr = (value: string) => translatePlatformText(locale, value);
  const cards = [...COMMON, ...(BY_ROLE[role] || BY_ROLE.HOUSEHOLD)];

  return (
    <section className="ncg-capability-dock" aria-label={tr("Platform capabilities")}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-700 dark:text-[#d9ff57]"><Compass className="h-4 w-4" /> {tr("Built into your workspace")}</div>
          <h2 className="mt-2 font-display text-2xl font-black tracking-[-.04em] sm:text-3xl">{tr("More of NaijaClimaGuard, without leaving your dashboard")}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/62">{tr("Open live national intelligence, safer travel, alerts, evidence and role-specific tools directly from here. You should never need a hidden URL to find a feature.")}</p>
        </div>
        <Link href="/tools" className="ncg-tool-link inline-flex shrink-0 items-center gap-2 rounded-full border border-[#0d1f19]/10 bg-white/75 px-4 py-2.5 text-xs font-black dark:border-white/10 dark:bg-white/[.06]">{tr("See every tool")} <ArrowUpRight className="h-4 w-4" /></Link>
      </div>

      <div className="ncg-capability-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`ncg-capability-card group relative overflow-hidden rounded-[24px] border border-[#0d1f19]/8 bg-gradient-to-br ${ACCENTS[item.accent || ""] || "from-white to-white/65 dark:from-white/[.055] dark:to-white/[.025]"} p-5 shadow-[0_10px_28px_rgba(7,23,19,.045)] dark:border-white/8`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071713] text-[#d9ff57] shadow-sm dark:bg-[#d9ff57] dark:text-[#071713]"><Icon className="h-5 w-5" /></div>
                <ArrowUpRight className="h-4 w-4 text-emerald-800/50 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 dark:text-white/40" />
              </div>
              <h3 className="mt-5 text-[17px] font-black tracking-[-.025em]">{tr(item.label)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/58">{tr(item.note)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
