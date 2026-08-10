"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, Flag, ShieldCheck, WifiOff } from "lucide-react";
import { EXPERIENCE_LABELS, useExperienceProfile } from "@/components/shared/ExperienceProfile";

export default function ActionOSBanner() {
  const { role } = useExperienceProfile();
  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl border border-radar/25 bg-gradient-to-r from-radar/10 via-white to-cyan-50 p-4 shadow-sm dark:via-midnight-light dark:to-cyan-950/10 sm:p-5">
      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-radar/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-radar text-white"><ClipboardCheck className="h-5 w-5" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2"><p className="font-display text-lg font-bold">Action OS</p><span className="rounded-full border border-radar/20 bg-white/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-radar dark:bg-midnight/70">{EXPERIENCE_LABELS[role]}</span></div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">Turn the current risk and any official warning into a role-specific action ladder, readiness checklist and shareable evidence-aware snapshot.</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500"><span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-radar" /> Same canonical risk score</span><span className="inline-flex items-center gap-1"><WifiOff className="h-3.5 w-3.5 text-radar" /> Offline emergency pack</span><span className="inline-flex items-center gap-1"><Flag className="h-3.5 w-3.5 text-violet-500" /> Simulation-only flood drill</span></div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2"><Link href="/drill" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-300 bg-white px-4 text-sm font-bold text-violet-700 transition hover:-translate-y-0.5 dark:bg-midnight-light dark:text-violet-300"><Flag className="h-4 w-4" /> Run a drill</Link><Link href="/action-center" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-radar px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">Open Action OS <ArrowRight className="h-4 w-4" /></Link></div>
      </div>
    </section>
  );
}
