"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Database,
  FileCheck2,
  Languages,
  Network,
  RadioTower,
  ShieldCheck,
  Target,
  XCircle,
} from "lucide-react";
import PublicProductNav from "@/components/shared/PublicProductNav";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { PRODUCT_PROOF_COPY, type ProofRole } from "@/lib/i18n/product-proof";
import economicBaseline from "@/data/economic/national_economic_baseline_v1.json";

const FLOW_ICONS = [RadioTower, Boxes, ClipboardCheck, Languages, BadgeCheck];
const MOAT_ICONS = [Database, Network, Target, FileCheck2];
const STATUS_ICONS = [CheckCircle2, ShieldCheck, Database];
const FUNDING_AMOUNTS = ["£60,000", "£22,500", "£22,500", "£30,000", "£7,500", "£7,500"];

const formatUsdMillions = (value: number) => `$${(value / 1_000_000).toFixed(1)}m`;

export default function InvestorReadinessPage() {
  const { locale } = useLanguage();
  const copy = PRODUCT_PROOF_COPY[locale].investor;
  const [role, setRole] = useState<ProofRole>("household");
  const scenario = copy.scenarios[role];
  const flow = [
    copy.signalDetail,
    scenario.exposure,
    scenario.decision,
    scenario.delivery,
    scenario.proof,
  ];
  const statusItems = [
    { value: "LIVE", label: copy.liveProduct, note: copy.liveProductNote },
    { value: "4 / 5", label: copy.shadowEvidence, note: copy.shadowEvidenceNote },
    { value: "37", label: copy.nationalFactory, note: copy.nationalFactoryNote },
  ];
  const sensitivity = economicBaseline.avoided_loss_sensitivity.map((item) => ({
    label: `${item.avoidable_loss_percent}%`,
    value: formatUsdMillions(item.protected_value_usd_at_2022_median_damage),
  }));

  return (
    <main className="min-h-screen bg-white text-slate-950 dark:bg-midnight dark:text-white">
      <PublicProductNav />

      <section className="border-b border-slate-200 bg-[#f4f8f5] dark:border-midnight-border dark:bg-[#071812]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700 dark:text-radar">{copy.eyebrow}</p>
            <h1 className="mt-5 max-w-4xl font-display text-5xl font-black leading-[.96] tracking-[-.045em] sm:text-6xl lg:text-7xl">{copy.title}</h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">{copy.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/my-area" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-radar px-5 text-sm font-bold text-white">{copy.openProduct}<ArrowRight className="h-4 w-4" /></Link>
              <Link href="/dashboard" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold dark:border-white/20 dark:bg-white/5">{copy.openDashboard}</Link>
              <Link href="/model-evidence" className="inline-flex min-h-12 items-center gap-2 px-2 text-sm font-bold text-emerald-800 dark:text-radar">{copy.inspectEvidence}</Link>
            </div>
          </div>

          <aside className="border border-emerald-950/15 bg-[#072319] text-white shadow-[10px_10px_0_0_#b7f34a] dark:border-white/10 dark:shadow-[10px_10px_0_0_#34d399]">
            <div className="border-b border-white/10 p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-radar">{copy.readinessLabel}</p>
              <h2 className="mt-3 font-display text-2xl font-black sm:text-3xl">{copy.readinessTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">{copy.readinessBody}</p>
            </div>
            <div className="grid sm:grid-cols-3 lg:grid-cols-1">
              {statusItems.map((item, index) => {
                const Icon = STATUS_ICONS[index];
                return (
                  <div key={item.label} className={`grid grid-cols-[auto_1fr_auto] gap-3 p-5 ${index ? "border-t border-white/10 sm:border-l sm:border-t-0 lg:border-l-0 lg:border-t" : ""}`}>
                    <Icon className="mt-0.5 h-4 w-4 text-radar" />
                    <div><p className="text-xs font-black uppercase tracking-wider text-white/70">{item.label}</p><p className="mt-1 text-xs leading-5 text-white/50">{item.note}</p></div>
                    <span className="font-display text-xl font-black text-radar">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-slate-200 py-16 dark:border-midnight-border sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700 dark:text-radar">{copy.demoEyebrow}</p>
              <h2 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl">{copy.demoTitle}</h2>
            </div>
            <div>
              <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">{copy.demoBody}</p>
              <p className="mt-3 border-l-2 border-amber-500 pl-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.demoNotice}</p>
            </div>
          </div>

          <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 dark:border-midnight-border dark:bg-midnight-light/30">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-midnight-border sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <p className="text-xs font-black uppercase tracking-[.14em] text-slate-500">{copy.roleLabel}</p>
              <div className="grid grid-cols-2 gap-2 sm:flex" role="group" aria-label={copy.roleLabel}>
                {(Object.keys(copy.roles) as ProofRole[]).map((item) => (
                  <button key={item} type="button" onClick={() => setRole(item)} aria-pressed={role === item} className={`min-h-10 rounded-lg px-4 text-xs font-bold transition-colors ${role === item ? "bg-slate-950 text-white dark:bg-radar dark:text-slate-950" : "border border-slate-200 bg-white text-slate-600 hover:border-radar/50 dark:border-midnight-border dark:bg-midnight dark:text-slate-300"}`}>
                    {copy.roles[item]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-5">
              {flow.map((text, index) => {
                const Icon = FLOW_ICONS[index];
                const label = Object.values(copy.fields)[index];
                return (
                  <article key={label} className={`relative min-h-48 p-5 sm:p-6 ${index ? "border-t border-slate-200 dark:border-midnight-border lg:border-l lg:border-t-0" : ""}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-radar/10 text-radar"><Icon className="h-4 w-4" /></span>
                      <span className="font-mono text-[10px] text-slate-400">0{index + 1}</span>
                    </div>
                    <h3 className="mt-5 text-xs font-black uppercase tracking-[.14em] text-slate-500">{label}</h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100">{text}</p>
                    {index < flow.length - 1 ? <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 rounded-full bg-white text-radar dark:bg-midnight lg:block" /> : null}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-950 py-16 text-white dark:border-midnight-border sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-radar">{copy.moatEyebrow}</p>
              <h2 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl">{copy.moatTitle}</h2>
              <p className="mt-5 text-base leading-7 text-white/60">{copy.moatBody}</p>
            </div>
            <div className="grid border border-white/10 sm:grid-cols-2">
              {copy.moatItems.map((item, index) => {
                const Icon = MOAT_ICONS[index];
                return (
                  <article key={item.title} className={`p-5 sm:p-6 ${index % 2 ? "sm:border-l sm:border-white/10" : ""} ${index > 1 ? "border-t border-white/10" : index ? "border-t border-white/10 sm:border-t-0" : ""}`}>
                    <Icon className="h-5 w-5 text-radar" />
                    <h3 className="mt-4 font-display text-lg font-black">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/55">{item.body}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="mt-12 grid overflow-hidden border border-white/10 lg:grid-cols-2">
            <div className="p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[.15em] text-white/35">{copy.forecastQuestion}</p>
              <p className="mt-4 font-display text-2xl font-black text-white/70">{copy.forecastAnswer}</p>
            </div>
            <div className="border-t border-white/10 bg-radar/10 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <p className="text-xs font-black uppercase tracking-[.15em] text-radar">{copy.networkQuestion}</p>
              <p className="mt-4 font-display text-2xl font-black">{copy.networkAnswer}</p>
            </div>
          </div>
          <div className="mt-6 max-w-4xl">
            <h3 className="font-display text-2xl font-black">{copy.comparisonTitle}</h3>
            <p className="mt-3 text-sm leading-7 text-white/60">{copy.comparisonBody}</p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 py-16 dark:border-midnight-border sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-radar/10 text-radar"><CircleDollarSign className="h-5 w-5" /></div>
            <h2 className="mt-5 font-display text-3xl font-black sm:text-4xl">{copy.economicsTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{copy.economicsBody}</p>
            <dl className="mt-7 border-y border-slate-200 dark:border-midnight-border">
              <div className="grid grid-cols-[1fr_auto] gap-4 py-4"><dt className="text-sm text-slate-500">{copy.damageReference}</dt><dd className="font-display text-2xl font-black">$6.68bn</dd></div>
              <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-slate-200 py-4 dark:border-midnight-border"><dt className="text-sm text-slate-500">{copy.populationReference}</dt><dd className="font-display text-2xl font-black">237.5m</dd></div>
            </dl>
            <p className="mt-6 text-xs font-black uppercase tracking-[.15em] text-slate-500">{copy.sensitivity}</p>
            <div className="mt-3 grid grid-cols-4 border border-slate-200 dark:border-midnight-border">
              {sensitivity.map((item, index) => <div key={item.label} className={`p-3 text-center sm:p-4 ${index ? "border-l border-slate-200 dark:border-midnight-border" : ""}`}><p className="text-xs font-bold text-slate-400">{item.label}</p><p className="mt-1 font-display text-base font-black sm:text-xl">{item.value}</p></div>)}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">{copy.sensitivityNote}</p>
          </div>

          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-radar/10 text-radar"><Banknote className="h-5 w-5" /></div>
            <h2 className="mt-5 font-display text-3xl font-black sm:text-4xl">{copy.fundingTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{copy.fundingBody}</p>
            <div className="mt-7 border border-slate-200 dark:border-midnight-border">
              {copy.fundingLabels.map((label, index) => (
                <div key={label} className={`grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 text-sm sm:px-5 ${index ? "border-t border-slate-200 dark:border-midnight-border" : ""}`}>
                  <span className="font-semibold">{label}</span><span className="font-mono font-bold text-emerald-700 dark:text-radar">{FUNDING_AMOUNTS[index]}</span>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t-2 border-slate-950 bg-slate-50 px-4 py-4 text-sm dark:border-white dark:bg-white/5 sm:px-5"><span className="font-black">TOTAL</span><span className="font-mono text-lg font-black">£150,000</span></div>
            </div>
            <div className="mt-4 border-l-4 border-radar bg-radar/5 p-4 text-sm leading-6"><strong>{copy.output}:</strong> {copy.readinessBody}</div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h2 className="font-display text-4xl font-black tracking-tight sm:text-5xl">{copy.boundaryTitle}</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">{copy.boundaryBody}</p>
          </div>
          <div className="mt-9 grid border border-slate-200 dark:border-midnight-border lg:grid-cols-2">
            <div className="p-6 sm:p-8">
              <h3 className="flex items-center gap-2 font-display text-xl font-black"><CheckCircle2 className="h-5 w-5 text-radar" />{copy.claimedNow}</h3>
              <ul className="mt-5 space-y-4">{copy.claimedList.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-radar" />{item}</li>)}</ul>
            </div>
            <div className="border-t border-slate-200 p-6 dark:border-midnight-border lg:border-l lg:border-t-0 sm:p-8">
              <h3 className="flex items-center gap-2 font-display text-xl font-black"><XCircle className="h-5 w-5 text-crimson" />{copy.notClaimed}</h3>
              <ul className="mt-5 space-y-4">{copy.blockedList.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300"><XCircle className="mt-1 h-4 w-4 shrink-0 text-crimson" />{item}</li>)}</ul>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/institutional-pilot" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-radar px-5 text-sm font-bold text-white">{PRODUCT_PROOF_COPY[locale].nav.pilot}<ArrowRight className="h-4 w-4" /></Link>
            <Link href="/model-evidence" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold dark:border-white/20">{copy.inspectEvidence}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
