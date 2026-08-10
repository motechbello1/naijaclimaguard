import Link from "next/link";
import { WifiOff, ShieldAlert, ArrowRight } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cloud p-5 text-slate-900 dark:bg-midnight dark:text-slate-100">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl dark:border-midnight-border dark:bg-midnight-light">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-radar/10 text-radar"><WifiOff className="h-7 w-7" /></div>
        <h1 className="mt-5 font-display text-2xl font-bold">You are offline</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">Live risk checks and current official-advisory data need a network connection. We will not show an old risk score as if it were current.</p>
        <Link href="/emergency-pack" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-radar px-5 font-semibold text-white">Open cached emergency pack <ArrowRight className="h-4 w-4" /></Link>
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50 p-3 text-left text-xs leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-100"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />Follow visible local conditions and official instructions you receive directly. Do not wait for connectivity if flooding is already dangerous.</div>
      </div>
    </main>
  );
}
