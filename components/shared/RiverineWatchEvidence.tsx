import Link from "next/link";
import { Brain, Clock3, Database, MapPin, ShieldCheck } from "lucide-react";

type RiverineWatchEvidenceProps = {
  compact?: boolean;
  className?: string;
};

export const RIVERINE_WATCH_PUBLIC_EVIDENCE = {
  model: "Riverine Watch v1",
  eventDetection: "80%",
  eventCount: "4 of 5",
  horizon: "14 days",
  locations: "Lokoja + Makurdi",
  threshold: "0.70",
  status: "Shadow / pilot",
} as const;

export default function RiverineWatchEvidence({
  compact = false,
  className = "",
}: RiverineWatchEvidenceProps) {
  return (
    <section
      aria-label="Riverine Watch v1 model evidence"
      className={`rounded-2xl border border-radar/20 bg-radar/[0.04] p-5 sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-radar/20 bg-radar/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-radar">
              <Brain className="h-3.5 w-3.5" /> Riverine Watch v1
            </span>
            <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-medium text-slate-500 dark:border-midnight-border dark:bg-midnight-light/70 dark:text-slate-400">
              Shadow model · not autonomous public warning
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
            <div>
              <p className="font-display text-5xl font-bold tracking-tight text-radar sm:text-6xl">80%</p>
              <p className="mt-1 text-sm font-semibold">Historical event detection</p>
            </div>
            <p className="max-w-2xl pb-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Detected <strong className="text-slate-800 dark:text-slate-200">4 of 5 eligible historical flood-onset events</strong> in retrospective testing for Lokoja and Makurdi.
            </p>
          </div>

          {!compact && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-midnight-border dark:bg-midnight/40">
                <Clock3 className="h-4 w-4 text-radar" />
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">What it does</p>
                <p className="mt-1 text-sm font-semibold">14-day riverine flood-onset WATCH</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-midnight-border dark:bg-midnight/40">
                <Database className="h-4 w-4 text-radar" />
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">What it reads</p>
                <p className="mt-1 text-sm font-semibold">NASA rainfall + GloFAS +24/+48/+72h discharge</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-midnight-border dark:bg-midnight/40">
                <MapPin className="h-4 w-4 text-radar" />
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">Current scope</p>
                <p className="mt-1 text-sm font-semibold">Lokoja + Makurdi · WATCH threshold 0.70</p>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <strong>Important:</strong> 80% is an event-detection result, not “80% accuracy,” not a national performance claim, and not prospective public-warning validation. The current public risk API remains the separate <code className="font-mono">derived-v2</code> decision-support engine. Official warnings and visible flooding take priority.
          </p>
        </div>

        {!compact && (
          <Link
            href="/model-evidence"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-radar/20 bg-white/70 px-4 py-3 text-sm font-semibold text-radar transition-colors hover:bg-radar/10 dark:bg-midnight-light/70"
          >
            <ShieldCheck className="h-4 w-4" /> Open evidence pack
          </Link>
        )}
      </div>
    </section>
  );
}
