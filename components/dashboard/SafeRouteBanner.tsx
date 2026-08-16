"use client";

import Link from "next/link";
import { ArrowRight, Navigation, ShieldCheck } from "lucide-react";

export default function SafeRouteBanner() {
  return (
    <Link href="/safe-route" className="group flex flex-col gap-3 rounded-2xl border border-amber/20 bg-gradient-to-r from-amber/[0.08] via-transparent to-transparent p-4 transition hover:border-amber/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber/10 text-amber"><Navigation className="h-5 w-5" /></div>
        <div><div className="flex flex-wrap items-center gap-2"><p className="font-display text-sm font-bold">Flood-aware route planner</p><span className="rounded-full border border-amber/20 bg-amber/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber">beta</span></div><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Compare driving alternatives against recent verified geotagged flood reports before you set out.</p></div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-amber"><ShieldCheck className="h-4 w-4" /> Check a route <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
    </Link>
  );
}
