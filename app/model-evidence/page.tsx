"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileCheck2,
  Gauge,
  Radar,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import PublicProductNav from "@/components/shared/PublicProductNav";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { PRODUCT_PROOF_COPY } from "@/lib/i18n/product-proof";

const METRIC_VALUES = ["5", "4 / 5 · 80%", "26.7%", "1.83", "0.176 / 0.837", "10 Aug 2026"];
const STEP_ICONS = [Database, Radar, FileCheck2, CheckCircle2];

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
    <main className="min-h-screen bg-white text-slate-950 dark:bg-midnight dark:text-white">
      <PublicProductNav />

      <section className="border-b border-slate-200 bg-slate-50 dark:border-midnight-border dark:bg-midnight-light/25">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[1fr_.55fr] lg:items-end lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700 dark:text-radar">{copy.eyebrow}</p>
            <h1 className="mt-4 max-w-4xl font-display text-4xl font-black tracking-[-.035em] sm:text-5xl lg:text-6xl">{copy.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">{copy.lead}</p>
          </div>
          <div className="border-l-4 border-amber-500 bg-amber-50 p-5 dark:bg-amber-500/10">
            <p className="font-display text-xl font-black text-amber-900 dark:text-amber-200">{copy.status}</p>
            <p className="mt-2 text-sm leading-6 text-amber-900/70 dark:text-amber-100/70">{copy.statusBody}</p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 py-10 dark:border-midnight-border">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <article className="border border-slate-200 p-6 dark:border-midnight-border sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-radar/10 text-radar"><Gauge className="h-5 w-5" /></span>
              <span className="rounded-full bg-radar/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-radar">LIVE</span>
            </div>
            <h2 className="mt-5 font-display text-2xl font-black">{copy.publicEngine}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.publicEngineBody}</p>
            <Link href="/my-area" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-radar">derived-v2<ArrowRight className="h-4 w-4" /></Link>
          </article>
          <article className="border border-slate-200 p-6 dark:border-midnight-border sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><Radar className="h-5 w-5" /></span>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">SHADOW</span>
            </div>
            <h2 className="mt-5 font-display text-2xl font-black">{copy.shadowEngine}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.shadowEngineBody}</p>
            <p className="mt-6 font-mono text-sm font-bold">WATCH ≥ 0.70 · 14 DAYS · 2 LOCATIONS</p>
          </article>
        </div>
      </section>

      <section className="border-b border-slate-200 py-14 dark:border-midnight-border sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h2 className="font-display text-3xl font-black sm:text-4xl">{copy.metricsTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{copy.metricsBody}</p>
          </div>
          <div className="mt-8 overflow-x-auto border border-slate-200 dark:border-midnight-border">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="bg-slate-950 text-white">
                <tr><th className="px-5 py-4 text-xs font-black uppercase tracking-wider">{copy.metric}</th><th className="px-5 py-4 text-xs font-black uppercase tracking-wider">{copy.result}</th><th className="px-5 py-4 text-xs font-black uppercase tracking-wider">{copy.meaning}</th></tr>
              </thead>
              <tbody>
                {metrics.map(([label, value, meaning], index) => (
                  <tr key={label} className={index ? "border-t border-slate-200 dark:border-midnight-border" : ""}>
                    <td className="px-5 py-4 text-sm font-bold">{label}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-sm font-black text-emerald-700 dark:text-radar">{value}</td>
                    <td className="px-5 py-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-14 dark:border-midnight-border dark:bg-midnight-light/25 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h2 className="font-display text-3xl font-black sm:text-4xl">{copy.claimsTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{copy.claimsBody}</p>
          </div>
          <div className="mt-8 grid border border-slate-200 bg-white dark:border-midnight-border dark:bg-midnight lg:grid-cols-2">
            <article className="p-6 sm:p-8">
              <h3 className="flex items-center gap-2 font-display text-xl font-black"><CheckCircle2 className="h-5 w-5 text-radar" />{copy.supported}</h3>
              <ul className="mt-5 space-y-4">{copy.supportedClaims.map((claim) => <li key={claim} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-radar" />{claim}</li>)}</ul>
            </article>
            <article className="border-t border-slate-200 p-6 dark:border-midnight-border lg:border-l lg:border-t-0 sm:p-8">
              <h3 className="flex items-center gap-2 font-display text-xl font-black"><XCircle className="h-5 w-5 text-crimson" />{copy.blocked}</h3>
              <ul className="mt-5 space-y-4">{copy.blockedClaims.map((claim) => <li key={claim} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300"><XCircle className="mt-1 h-4 w-4 shrink-0 text-crimson" />{claim}</li>)}</ul>
            </article>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-radar/10 text-radar"><ShieldAlert className="h-5 w-5" /></div>
              <h2 className="mt-5 font-display text-3xl font-black sm:text-4xl">{copy.nextTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{copy.nextBody}</p>
            </div>
            <div className="border border-slate-200 dark:border-midnight-border">
              {copy.steps.map((step, index) => {
                const Icon = STEP_ICONS[index];
                return (
                  <article key={step.title} className={`grid grid-cols-[auto_1fr] gap-4 p-5 sm:p-6 ${index ? "border-t border-slate-200 dark:border-midnight-border" : ""}`}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-radar/10 text-radar"><Icon className="h-4 w-4" /></span>
                    <div><h3 className="font-display text-lg font-black">{step.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.body}</p></div>
                  </article>
                );
              })}
            </div>
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-radar px-5 text-sm font-bold text-white">{copy.openDashboard}<ArrowRight className="h-4 w-4" /></Link>
            <Link href="/institutional-pilot" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold dark:border-white/20">{copy.runPilot}<ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
