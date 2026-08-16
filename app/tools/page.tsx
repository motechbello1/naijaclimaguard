"use client";

import AppShell from "@/components/shared/AppShell";
import { useLanguage } from "@/components/shared/LanguageProvider";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BellRing, Bot, BriefcaseBusiness, CircleDollarSign, ClipboardCheck, Code2,
  FileCheck2, Gauge, Landmark, Map, MapPin, Megaphone, Presentation,
  Radar, Search, ShieldAlert, ShoppingBag, Telescope, UserRound, Waves,
} from "lucide-react";

const GROUPS = [
  {
    title: "Protect people and places",
    subtitle: "The everyday tools most people need.",
    tools: [
      { href: "/dashboard", label: "Safety dashboard", note: "See which saved place needs attention first.", icon: Gauge },
      { href: "/my-area", label: "My Area", note: "Save and manage homes, farms, businesses and community places.", icon: MapPin },
      { href: "/action-center", label: "What to do now", note: "Turn current risk into clear actions for the place you are protecting.", icon: ClipboardCheck },
      { href: "/action", label: "Warnings and alerts", note: "Choose when and how NaijaClimaGuard should warn you.", icon: BellRing },
      { href: "/report", label: "Report flooding", note: "Send a local flood observation into the platform.", icon: Megaphone },
      { href: "/emergency-pack", label: "Emergency pack", note: "Keep practical preparedness information close at hand.", icon: ShieldAlert },
      { href: "/drill", label: "Preparedness drill", note: "Practice what to do before a real warning arrives.", icon: Waves },
    ],
  },
  {
    title: "Understand risk",
    subtitle: "Deeper intelligence when you need more than the simple view.",
    tools: [
      { href: "/predict", label: "Location analysis", note: "Run exact-coordinate analysis for a saved place.", icon: Map },
      { href: "/outlook", label: "Rain outlook", note: "Explore rainfall outlook and conditions affecting risk.", icon: Telescope },
      { href: "/intelligence", label: "Risk intelligence", note: "Explore operational risk signals and context.", icon: Radar },
      { href: "/evidence", label: "Evidence history", note: "Review evidence, actions and operational records.", icon: FileCheck2 },
      { href: "/prove", label: "Model evidence", note: "See validation and model evidence when technical detail matters.", icon: FileCheck2 },
    ],
  },
  {
    title: "Operate, buy and coordinate",
    subtitle: "For teams, institutions and customers using NaijaClimaGuard at scale.",
    tools: [
      { href: "/commercial", label: "Plans, API credits & enterprise", note: "Buy Family Plus, Business Starter or API credits, manage your workspace, or request a custom rollout.", icon: ShoppingBag },
      { href: "/command", label: "Command queue", note: "Coordinate operational priorities and follow-up.", icon: Landmark },
      { href: "/impact", label: "Economic Impact", note: "Connect flood risk to exposure, losses and intervention scenarios.", icon: CircleDollarSign },
      { href: "/api-docs", label: "Developer API", note: "Integrate NaijaClimaGuard into another product or workflow.", icon: Code2 },
      { href: "/revenue", label: "Revenue Engine", note: "See how the platform can earn across consumer, institutional and infrastructure layers.", icon: BriefcaseBusiness },
      { href: "/pitch", label: "Pitch Mode", note: "Present the problem, product, evidence and business model from the website.", icon: Presentation },
    ],
  },
  {
    title: "Account and assistance",
    subtitle: "Personal settings and help.",
    tools: [
      { href: "/profile", label: "Profile and preferences", note: "Manage language, delivery, account and experience settings.", icon: UserRound },
      { href: "/dashboard", label: "ClimaGuard Assistant", note: "Open the assistant from any supported page for product and flood guidance.", icon: Bot },
    ],
  },
];

export default function ToolsPage() {
  const { locale } = useLanguage();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => GROUPS.map((group) => ({
    ...group,
    tools: group.tools.filter((tool) => !q || `${tool.label} ${tool.note}`.toLowerCase().includes(q)),
  })).filter((group) => group.tools.length), [q]);

  const title = locale === "pcm" ? "Find anything for NaijaClimaGuard" : locale === "ha" ? "Nemo duk abin da kake buƙata" : locale === "yo" ? "Wá ohun gbogbo tí o nílò" : locale === "ig" ? "Chọta ihe ọ bụla ị chọrọ" : "Find anything in NaijaClimaGuard";
  const intro = locale === "pcm" ? "No feature suppose hide because design change. Search am or choose wetin you wan do." : "The redesign should never hide a capability. Search by what you want to do, or browse every tool in one place.";

  return (
    <AppShell>
      <div className="space-y-7">
        <section className="relative overflow-hidden rounded-[34px] bg-[#071713] px-6 py-8 text-white sm:px-9 sm:py-11">
          <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full border border-[#d9ff57]/25" />
          <div className="pointer-events-none absolute -right-8 top-2 h-48 w-48 rounded-full border border-white/10" />
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#d9ff57]">All tools</p>
          <h1 className="mt-3 max-w-4xl font-display text-4xl font-black leading-[.98] tracking-[-.055em] sm:text-6xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/66 sm:text-base">{intro}</p>
          <label className="mt-7 flex max-w-2xl items-center gap-3 rounded-full border border-white/14 bg-white/8 px-5 py-3.5">
            <Search className="h-5 w-5 shrink-0 text-[#d9ff57]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search alerts, plans, API credits, evidence, location analysis…" className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/35" />
          </label>
        </section>

        {filtered.map((group) => (
          <section key={group.title}>
            <div className="mb-3">
              <h2 className="text-2xl font-black tracking-[-.035em]">{group.title}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-white/45">{group.subtitle}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link key={tool.href + tool.label} href={tool.href} className="group min-h-[150px] rounded-[26px] border border-black/7 bg-white/75 p-5 shadow-[0_10px_30px_rgba(20,45,35,.045)] transition hover:-translate-y-0.5 hover:border-emerald-600/20 dark:border-white/8 dark:bg-white/[.04]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9ff57] text-[#071713]"><Icon className="h-5 w-5" /></div>
                    <h3 className="mt-5 text-lg font-black tracking-[-.025em]">{tool.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500 group-hover:text-slate-650 dark:text-white/46">{tool.note}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {filtered.length === 0 && <div className="rounded-[28px] border border-black/7 bg-white p-8 text-center dark:border-white/8 dark:bg-white/[.04]"><p className="font-black">No tool matched that search.</p><p className="mt-2 text-sm text-slate-500">Try a task such as alerts, plans, API, evidence, report, farm, or location.</p></div>}
      </div>
    </AppShell>
  );
}
