"use client";

import Link from "next/link";
import {
  ArrowRight, Check, Database, Gauge, Radar, Satellite, ShieldAlert, X,
} from "lucide-react";
import PublicExperienceNav from "@/components/shared/PublicExperienceNav";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { PRODUCT_PROOF_COPY } from "@/lib/i18n/product-proof";

const METRIC_VALUES = ["5", "4 / 5 · 80%", "26.7%", "1.83", "0.176 / 0.837", "10 Aug 2026"];

export default function ModelEvidencePage() {
  const { locale } = useLanguage();
  const copy = PRODUCT_PROOF_COPY[locale].evidence;
  const metrics = [
    [copy.eligibleEvents, METRIC_VALUES[0], copy.eligibleEventsMeaning],
    [copy.detectedEvents, METRIC_VALUES[1], copy.detectedEventsMeaning],
    [copy.precision, METRIC_VALUES[2], copy.precisionMeaning],
    [copy.falseAlerts, METRIC_VALUES[3], copy.falseAlertsMeaning],
    [copy.ranking, METRIC_VALUES[4], copy.rankingMeaning],
    [copy.sourceReplay, METRIC_VALUES[5], copy.sourceReplayMeaning],
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#0d1f19] dark:bg-[#07110e] dark:text-white">
      <PublicExperienceNav />

      <section className="relative overflow-hidden bg-[#071713] px-4 pb-16 pt-36 text-white sm:px-6 sm:pb-24 lg:px-8">
        <div className="pointer-events-none absolute -right-32 top-12 h-[34rem] w-[34rem] rounded-full border border-white/8" />
        <div className="pointer-events-none absolute -right-16 top-28 h-[26rem] w-[26rem] rounded-full border border-[#d9ff57]/14" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_.55fr] lg:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.22em] text-[#d9ff57]">{copy.eyebrow}</p><h1 className="mt-6 max-w-5xl font-display text-5xl font-black leading-[.94] tracking-[-.05em] sm:text-7xl lg:text-[6.4rem]">{copy.title}</h1><p className="mt-7 max-w-3xl text-base leading-8 text-white/65 sm:text-lg">{copy.lead}</p></div>
          <aside className="border-l-4 border-[#d9ff57] bg-white/6 p-6"><p className="font-display text-2xl font-black text-[#d9ff57]">{copy.status}</p><p className="mt-3 text-sm leading-6 text-white/62">{copy.statusBody}</p></aside>
        </div>
      </section>

      <section className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <article className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16"><div className="flex items-center justify-between gap-4"><Gauge className="h-7 w-7 text-emerald-700 dark:text-[#d9ff57]" /><span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:bg-[#d9ff57] dark:text-[#071713]">LIVE PRODUCT</span></div><h2 className="mt-9 font-display text-4xl font-black">{copy.publicEngine}</h2><p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-white/58">{copy.publicEngineBody}</p><Link href="/my-area" className="mt-8 inline-flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-[#d9ff57]">Open derived-v2 product<ArrowRight className="h-4 w-4" /></Link></article>
          <article className="border-t border-black/10 bg-[#e8eee8] px-4 py-12 dark:border-white/10 dark:bg-white/4 sm:px-6 lg:border-l lg:border-t-0 lg:px-8 lg:py-16"><div className="flex items-center justify-between gap-4"><Radar className="h-7 w-7 text-amber-600" /><span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">SHADOW MODEL</span></div><h2 className="mt-9 font-display text-4xl font-black">{copy.shadowEngine}</h2><p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-white/58">{copy.shadowEngineBody}</p><p className="mt-8 font-mono text-sm font-black">WATCH ≥ 0.70 · 14 DAYS · LOKOJA + MAKURDI</p></article>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700 dark:text-[#d9ff57]">Frozen record</p><h2 className="mt-5 font-display text-4xl font-black leading-tight sm:text-6xl">{copy.metricsTitle}</h2></div><p className="max-w-3xl text-base leading-8 text-slate-600 dark:text-white/58">{copy.metricsBody}</p></div>
          <div className="mt-12 overflow-x-auto border-y border-black/12 dark:border-white/12"><table className="w-full min-w-[760px] border-collapse text-left"><thead><tr className="bg-[#071713] text-white"><th className="px-5 py-4 text-xs font-black uppercase tracking-[.16em]">{copy.metric}</th><th className="px-5 py-4 text-xs font-black uppercase tracking-[.16em]">{copy.result}</th><th className="px-5 py-4 text-xs font-black uppercase tracking-[.16em]">{copy.meaning}</th></tr></thead><tbody>{metrics.map(([label,value,meaning],index) => <tr key={label} className={index ? "border-t border-black/10 dark:border-white/10" : ""}><td className="px-5 py-5 text-sm font-black">{label}</td><td className="whitespace-nowrap px-5 py-5 font-mono text-sm font-black text-emerald-700 dark:text-[#d9ff57]">{value}</td><td className="px-5 py-5 text-sm leading-6 text-slate-600 dark:text-white/58">{meaning}</td></tr>)}</tbody></table></div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="border-t-2 border-black pt-5 dark:border-white"><Satellite className="h-5 w-5" /><p className="mt-5 text-sm font-black">NASA IMERG Early</p><p className="mt-2 text-xs text-slate-500">30 complete prior rainfall days</p></div><div className="border-t-2 border-black pt-5 dark:border-white"><Database className="h-5 w-5" /><p className="mt-5 text-sm font-black">GloFAS operational</p><p className="mt-2 text-xs text-slate-500">+24 / +48 / +72 hour discharge</p></div><div className="border-t-2 border-black pt-5 dark:border-white"><ShieldAlert className="h-5 w-5" /><p className="mt-5 text-sm font-black">Fail-safe policy</p><p className="mt-2 text-xs text-slate-500">Source delay cannot silently become a warning</p></div></div>
        </div>
      </section>

      <section className="bg-[#d9ff57] py-20 text-[#071713] sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><p className="text-xs font-black uppercase tracking-[.2em]">{copy.claimsTitle}</p><h2 className="mt-5 max-w-4xl font-display text-4xl font-black leading-tight sm:text-6xl">{copy.claimsBody}</h2><div className="mt-12 grid border-y-2 border-[#071713] lg:grid-cols-2"><article className="py-8 lg:pr-10"><h3 className="font-display text-3xl font-black">{copy.supported}</h3><ul className="mt-7 space-y-5">{copy.supportedClaims.map(claim => <li key={claim} className="flex gap-3 text-sm font-bold leading-6"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#071713] text-white"><Check className="h-3 w-3" /></span>{claim}</li>)}</ul></article><article className="border-t border-[#071713]/25 py-8 lg:border-l lg:border-t-0 lg:pl-10"><h3 className="font-display text-3xl font-black">{copy.blocked}</h3><ul className="mt-7 space-y-5">{copy.blockedClaims.map(claim => <li key={claim} className="flex gap-3 text-sm font-bold leading-6"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#071713]/35"><X className="h-3 w-3" /></span>{claim}</li>)}</ul></article></div></div>
      </section>

      <section className="bg-[#071713] py-20 text-white sm:py-28"><div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[.7fr_1.3fr] lg:px-8"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#d9ff57]">TRL 6 field path</p><h2 className="mt-5 font-display text-4xl font-black leading-tight sm:text-6xl">{copy.nextTitle}</h2><p className="mt-6 text-sm leading-7 text-white/58">{copy.nextBody}</p></div><div className="border-y border-white/15">{copy.steps.map((step,index) => <article key={step.title} className={`grid grid-cols-[auto_1fr] gap-5 py-6 ${index ? "border-t border-white/10" : ""}`}><span className="font-mono text-sm font-black text-[#d9ff57]">0{index+1}</span><div><h3 className="font-display text-xl font-black">{step.title}</h3><p className="mt-2 text-sm leading-6 text-white/55">{step.body}</p></div></article>)}</div></div><div className="mx-auto mt-12 flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:px-6 lg:px-8"><Link href="/dashboard" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#d9ff57] px-6 text-sm font-black text-[#071713]">{copy.openDashboard}<ArrowRight className="h-4 w-4" /></Link><Link href="/investor-readiness" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-sm font-black">Open Investor + TRL 6 room<ArrowRight className="h-4 w-4" /></Link></div></section>
    </main>
  );
}
