"use client";

import Link from "next/link";
import { Activity, ArrowRight, Newspaper } from "lucide-react";
import { useEffect, useState } from "react";

export default function LiveFloodBanner() {
  const [count, setCount] = useState<number | null>(null);
  const [states, setStates] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => fetch("/api/live-floods?limit=100", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!active || !data?.items) return;
        const recent = data.items.filter((item: any) => Date.now() - new Date(item.publishedAt).getTime() <= 86_400_000);
        setCount(recent.length);
        setStates(new Set(recent.filter((item: any) => item.state !== "Nigeria / location unparsed").map((item: any) => item.state)).size);
      })
      .catch(() => {});
    load();
    const timer = window.setInterval(load, 120_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return (
    <Link href="/live-floods" className="group flex flex-col gap-3 rounded-2xl border border-radar/20 bg-gradient-to-r from-radar/[0.08] via-transparent to-transparent p-4 transition hover:border-radar/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-radar/10 text-radar"><Activity className="h-5 w-5" /></div>
        <div><div className="flex flex-wrap items-center gap-2"><p className="font-display text-sm font-bold">Live Flood Intelligence</p><span className="inline-flex items-center gap-1 rounded-full border border-radar/20 bg-radar/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-radar"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-radar" /> auto-refresh</span></div><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Nationwide news-reported flooding and warnings are now discovered automatically. {count === null ? "Scanning sources…" : `${count} report${count === 1 ? "" : "s"} across ${states ?? 0} state/FCT location${states === 1 ? "" : "s"} in the last 24 hours.`}</p></div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-radar"><Newspaper className="h-4 w-4" /> Open live feed <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
    </Link>
  );
}
