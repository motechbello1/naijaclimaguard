"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useExperienceProfile, type ExperienceRole } from "@/components/shared/ExperienceProfile";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { translatePlatformText } from "@/lib/i18n/translate-platform";

const VIEWS: Record<ExperienceRole, { number: string; label: string; first: string; emphasis: string; description: string; action: string; href: string }> = {
  HOUSEHOLD: { number: "01", label: "HOME & FAMILY", first: "Know what is happening.", emphasis: "Protect who matters.", description: "Follow the places your family cares about, see the limits of each signal, and find a clear next step.", action: "See what to do now", href: "/action-center" },
  FARMER: { number: "02", label: "FARMER", first: "Read the rain.", emphasis: "Protect the season.", description: "Watch your farm and access routes, review rainfall context, and plan before water interrupts your work.", action: "Read the rain outlook", href: "/outlook" },
  BUSINESS: { number: "03", label: "BUSINESS", first: "See exposure.", emphasis: "Keep moving.", description: "Bring locations, warnings, actions and evidence together to support continuity decisions.", action: "Open risk intelligence", href: "/intelligence" },
  AGENCY: { number: "04", label: "AGENCY", first: "From signal.", emphasis: "To response.", description: "See what needs attention, move through the response queue, and keep the evidence attached to every decision.", action: "Open command queue", href: "/command" },
};

export default function DashboardHero({ areaName, areaZone }: { areaName: string; areaZone: string }) {
  const { role } = useExperienceProfile();
  const { locale } = useLanguage();
  const tr = (value: string) => translatePlatformText(locale, value);
  const view = VIEWS[role];
  return <section className="ncg-dashboard-hero" data-read-aloud aria-label={tr(`${view.label} workspace`)}>
    <div className="ncg-dashboard-hero-copy"><div className="ncg-dashboard-hero-index"><span>{view.number} / {tr(view.label)} WORKSPACE</span><span className="ncg-dashboard-signal" /> </div>
      <h1>{tr(view.first)}<br /><em>{tr(view.emphasis)}</em></h1><p>{tr(view.description)}</p>
      <Link href={view.href}>{tr(view.action)} <ArrowUpRight size={19} /></Link>
    </div>
    <div className="ncg-dashboard-hero-place"><span>YOUR WORKING AREA / {areaZone.toUpperCase()}</span><MapPin size={32} strokeWidth={1.3} /><div><strong>{areaName}</strong><p>Every risk result belongs to an exact saved coordinate. The working area does not imply a state wide forecast.</p></div><small>36 STATES + FCT / NIGERIA</small></div>
  </section>;
}
