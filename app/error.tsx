"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, Home, RefreshCw, Waves } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("NaijaClimaGuard route error", error); }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f3f4ee] p-5 text-[#0d1f19] dark:bg-[#07110e] dark:text-white">
      <section className="w-full max-w-xl overflow-hidden rounded-[30px] border border-black/7 bg-white shadow-[0_24px_80px_rgba(12,40,30,.10)] dark:border-white/8 dark:bg-[#0d1f19]">
        <div className="bg-[#071713] p-7 text-white"><div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#d9ff57] text-[#071713]"><Waves className="h-5 w-5" /></div><h1 className="mt-8 text-3xl font-black tracking-[-.04em] text-white">This page did not load properly.</h1><p className="mt-3 max-w-md text-sm leading-6 text-white/58">Your account and saved places are still safe. You can retry this screen or return to your dashboard.</p></div>
        <div className="grid gap-3 p-5 sm:grid-cols-3"><button onClick={reset} className="flex items-center justify-center gap-2 rounded-[16px] bg-[#d9ff57] px-4 py-3 text-sm font-black text-[#071713]"><RefreshCw className="h-4 w-4" /> Retry</button><button onClick={() => history.back()} className="flex items-center justify-center gap-2 rounded-[16px] border border-black/8 px-4 py-3 text-sm font-bold dark:border-white/10"><ArrowLeft className="h-4 w-4" /> Go back</button><Link href="/dashboard" className="flex items-center justify-center gap-2 rounded-[16px] bg-[#071713] px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-[#071713]"><Home className="h-4 w-4" /> Dashboard</Link></div>
      </section>
    </main>
  );
}
