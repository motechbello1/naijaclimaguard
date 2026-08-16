"use client";

import AppShell from "@/components/shared/AppShell";
import Link from "next/link";
import {
  BadgeCheck, Banknote, Building2, CircleDollarSign, Code2, Handshake,
  Landmark, Network, Radio, ShieldCheck, Store, UsersRound,
} from "lucide-react";

const CHANNELS = [
  { stage: "NOW", title: "Family & Community Premium", buyer: "Households and diaspora families", money: "Monthly or annual subscription", detail: "More saved places, family circles, priority WhatsApp/voice alerts, shared emergency plans and richer history.", icon: UsersRound },
  { stage: "NOW", title: "Business Portfolio Plans", buyer: "SMEs, chains, logistics and asset owners", money: "Per-location + seat subscription", detail: "Multi-site monitoring, staff alerts, evidence exports, operational dashboards and portfolio risk views.", icon: Building2 },
  { stage: "NOW", title: "Government / Agency Command", buyer: "Federal, state and local institutions", money: "Annual platform licence + implementation", detail: "Command workflows, institutional dashboards, reporting, integrations, training and support without pretending to replace official authority.", icon: Landmark },
  { stage: "NOW", title: "Climate Risk API", buyer: "Fintech, insurtech, agritech, proptech, logistics", money: "Usage-based API credits + enterprise minimum", detail: "Exact-location risk, alerts, evidence and exposure endpoints embedded into third-party products.", icon: Code2 },
  { stage: "NEXT", title: "Bank & Lender Climate Screening", buyer: "Banks, MFIs, cooperatives and agricultural lenders", money: "Per-screening fee + portfolio subscription", detail: "Add climate exposure context to property, SME and agricultural credit workflows. Decision support, not automated credit denial.", icon: Banknote },
  { stage: "NEXT", title: "Insurance Portfolio Intelligence", buyer: "Insurers, brokers and reinsurers", money: "Portfolio licence + API usage", detail: "Exposure monitoring, event evidence and trigger support for underwriting and claims operations. Insurance decisions remain with licensed insurers.", icon: ShieldCheck },
  { stage: "NEXT", title: "Sponsored Public Warning Coverage", buyer: "Telcos, banks, FMCGs, foundations and CSR programmes", money: "Coverage sponsorship", detail: "A sponsor pays to keep citizen alerts, language voice access or community coverage free in a defined area, with transparent sponsor labelling.", icon: Radio },
  { stage: "NEXT", title: "White-label Climate Safety", buyer: "Banks, insurers, telcos, estates and platforms", money: "Setup fee + annual licence + usage", detail: "NaijaClimaGuard capability inside another organisation's customer app while the risk and evidence engine remains centrally maintained.", icon: BadgeCheck },
  { stage: "LATER", title: "Resilience Marketplace", buyer: "Users who need verified mitigation services", money: "Marketplace commission / provider subscription", detail: "Connect demand for drainage, inspections, logistics, mapping and resilience work to verified providers. Payments and provider quality require strong controls.", icon: Store },
  { stage: "LATER", title: "Verified Climate Evidence Packs", buyer: "Businesses, insurers, lenders, property operators", money: "Per certified report / enterprise bundle", detail: "Time-stamped risk, source, action and incident evidence exported for operational records, compliance or claim support.", icon: CircleDollarSign },
  { stage: "LATER", title: "Resilience Network & Training", buyer: "Communities, institutions and implementation partners", money: "Training, certification and partner programme fees", detail: "Train local operators to verify reports, run preparedness drills and support deployments, creating a practical jobs layer around the platform.", icon: Network },
  { stage: "LATER", title: "Integration & Outcome Partnerships", buyer: "Infrastructure programmes and development partners", money: "Implementation + outcome-based contracts where appropriate", detail: "Charge for integration, monitoring and verified delivery rather than claiming revenue simply because a forecast exists.", icon: Handshake },
];

const STAGES = [
  { key: "NOW", title: "Sell with what already exists", note: "Revenue paths that rely mostly on capabilities already in the platform." },
  { key: "NEXT", title: "Add institutional depth", note: "High-value products that need contracts, governance and stronger portfolio data." },
  { key: "LATER", title: "Build the climate-resilience economy", note: "Marketplace, verification and implementation layers that expand both revenue and Nigerian economic activity." },
];

export default function RevenuePage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[36px] bg-[#071713] px-6 py-9 text-white sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border border-[#d9ff57]/25" />
          <div className="pointer-events-none absolute right-14 top-10 h-40 w-40 rounded-full border border-white/10" />
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#d9ff57]">Revenue Engine</p>
          <h1 className="mt-3 max-w-5xl font-display text-4xl font-black leading-[.96] tracking-[-.06em] sm:text-6xl">Do not sell a flood dashboard. Sell decisions, protection, evidence and distribution.</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-white/66 sm:text-base">NaijaClimaGuard should not depend on one government contract or one subscription. This page maps multiple revenue engines while keeping citizen safety useful even when the user is not the person paying.</p>
          <div className="mt-7 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#d9ff57] px-4 py-2 text-xs font-black text-[#071713]">B2C</span>
            <span className="rounded-full border border-white/14 bg-white/7 px-4 py-2 text-xs font-black">B2B</span>
            <span className="rounded-full border border-white/14 bg-white/7 px-4 py-2 text-xs font-black">B2G</span>
            <span className="rounded-full border border-white/14 bg-white/7 px-4 py-2 text-xs font-black">API</span>
            <span className="rounded-full border border-white/14 bg-white/7 px-4 py-2 text-xs font-black">Marketplace</span>
            <span className="rounded-full border border-white/14 bg-white/7 px-4 py-2 text-xs font-black">White-label</span>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[28px] bg-[#d9ff57] p-6 text-[#071713]"><p className="text-[10px] font-black uppercase tracking-[.18em]">Rule 01</p><h2 className="mt-3 text-2xl font-black tracking-[-.04em]">Keep core citizen safety accessible.</h2><p className="mt-3 text-sm leading-6 opacity-75">Premium should buy convenience, reach and depth, not hide basic safety guidance behind a paywall.</p></div>
          <div className="rounded-[28px] bg-[#e8f5ee] p-6 text-[#071713] dark:bg-[#10251c] dark:text-white"><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700 dark:text-[#d9ff57]">Rule 02</p><h2 className="mt-3 text-2xl font-black tracking-[-.04em]">Charge the party capturing economic value.</h2><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/60">Institutions pay when the product reduces operational friction, improves distribution or makes exposure easier to act on.</p></div>
          <div className="rounded-[28px] bg-[#fff3df] p-6 text-[#071713] dark:bg-[#2b2112] dark:text-white"><p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-700">Rule 03</p><h2 className="mt-3 text-2xl font-black tracking-[-.04em]">Do not invent revenue traction.</h2><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/60">These are productised revenue channels, not claims that contracts or customers already exist.</p></div>
        </section>

        {STAGES.map((stage) => (
          <section key={stage.key}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700 dark:text-[#d9ff57]">{stage.key}</p><h2 className="mt-1 text-3xl font-black tracking-[-.045em]">{stage.title}</h2><p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-white/45">{stage.note}</p></div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {CHANNELS.filter((channel) => channel.stage === stage.key).map((channel) => {
                const Icon = channel.icon;
                return <article key={channel.title} className="rounded-[28px] border border-black/7 bg-white/76 p-6 shadow-[0_10px_32px_rgba(20,45,35,.045)] dark:border-white/8 dark:bg-white/[.04]">
                  <div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#071713] text-[#d9ff57]"><Icon className="h-5 w-5" /></div><div className="min-w-0"><h3 className="text-xl font-black tracking-[-.035em]">{channel.title}</h3><p className="mt-1 text-xs font-bold uppercase tracking-[.08em] text-emerald-700 dark:text-[#d9ff57]">{channel.money}</p></div></div>
                  <p className="mt-5 text-xs font-black uppercase tracking-[.13em] text-slate-400">Who pays</p><p className="mt-1 text-sm font-bold">{channel.buyer}</p>
                  <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-white/50">{channel.detail}</p>
                </article>;
              })}
            </div>
          </section>
        ))}

        <section className="rounded-[34px] border border-black/7 bg-white/80 p-6 sm:p-8 dark:border-white/8 dark:bg-white/[.04]">
          <div className="grid gap-7 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700 dark:text-[#d9ff57]">Commercial flywheel</p><h2 className="mt-2 text-3xl font-black tracking-[-.045em]">Free public usefulness can create paid institutional value.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 dark:text-white/50">Citizen adoption creates better distribution and richer operational context. Institutions pay for scale, coordination, integrations, portfolio intelligence, evidence and service levels. Partners can sponsor public access. The marketplace later converts preparedness demand into local economic activity.</p></div>
            <div className="grid gap-2">
              {["Citizen adoption", "More protected places", "Institutional intelligence", "Paid integrations", "Sponsored coverage", "Verified action marketplace"].map((item, i) => <div key={item} className="flex items-center gap-3 rounded-full bg-[#f3f4ee] px-4 py-3 text-sm font-black dark:bg-white/[.05]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d9ff57] text-[11px] text-[#071713]">{i + 1}</span>{item}</div>)}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/impact" className="rounded-full bg-[#071713] px-5 py-3 text-sm font-black text-white">Open Economic Impact</Link>
          <Link href="/api-docs" className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black dark:border-white/10 dark:bg-white/[.05]">Open API</Link>
          <Link href="/pitch" className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black dark:border-white/10 dark:bg-white/[.05]">Open Pitch Mode</Link>
        </div>
      </div>
    </AppShell>
  );
}
