import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, ShieldCheck, Target, TriangleAlert } from "lucide-react";
import AppShell from "@/components/shared/AppShell";

const metrics = [
  { icon: Target, value: "4 / 5", label: "Eligible onset events detected", note: "Retrospective; Lokoja and Makurdi only" },
  { icon: CheckCircle2, value: "26.7%", label: "Alert-episode precision", note: "About one in four WATCH episodes matched an event window" },
  { icon: TriangleAlert, value: "1.83", label: "False alert episodes", note: "Per supported location-year in the frozen replay" },
  { icon: Database, value: "0.176 / 0.837", label: "PR-AUC / ROC-AUC", note: "Both shown so class imbalance is not hidden" },
];

export default function ValidationPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[2rem] bg-[#071713] p-6 text-white sm:p-9" data-read-aloud>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#d9ff57]">Frozen evidence · Riverine Watch v1</p>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-black leading-tight text-white sm:text-6xl">Historical evidence, without the old headline claims.</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">This record covers a frozen 14-day riverine WATCH candidate tested retrospectively in Lokoja and Makurdi. It is not nationwide accuracy, not prospective validation and not authority to issue autonomous public warnings.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/model-evidence" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#d9ff57] px-5 text-sm font-black text-[#071713]">Open the evidence pack <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/institutional-pilot" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-black text-white">Review the field-pilot gate</Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Frozen retrospective metrics">
          {metrics.map((metric) => (
            <article key={metric.label} className="glass-card p-5">
              <metric.icon className="h-5 w-5 text-emerald-700 dark:text-[#d9ff57]" />
              <p className="mt-6 font-display text-3xl font-black">{metric.value}</p>
              <h2 className="mt-2 text-sm font-black">{metric.label}</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{metric.note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="glass-card p-6 sm:p-8" data-read-aloud>
            <ShieldCheck className="h-6 w-6 text-emerald-700 dark:text-[#d9ff57]" />
            <h2 className="mt-6 font-display text-3xl font-black">What the replay supports</h2>
            <ul className="mt-6 space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <li>Four of five eligible historical onset events crossed the frozen WATCH threshold.</li>
              <li>The model uses a preserved NASA IMERG rainfall and GloFAS operational-discharge bundle.</li>
              <li>The same preserved inputs produce deterministic results after the issue date.</li>
            </ul>
          </article>
          <article className="glass-card border-amber-300/60 p-6 sm:p-8" data-read-aloud>
            <TriangleAlert className="h-6 w-6 text-amber-600" />
            <h2 className="mt-6 font-display text-3xl font-black">What remains blocked</h2>
            <ul className="mt-6 space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <li>No nationwide accuracy or “99.28% accurate” claim.</li>
              <li>No “48 hours before government” or guaranteed lead-time claim.</li>
              <li>No TRL 6 achievement claim before a signed relevant-environment demonstration and independent review.</li>
            </ul>
          </article>
        </section>

        <p className="rounded-2xl border border-amber-300/70 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">Never use a low score to ignore an official warning or visible local flooding.</p>
      </div>
    </AppShell>
  );
}
