"use client";

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  FileCheck2,
  Gauge,
  MapPin,
  Satellite,
  Shield,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";
import RiverineWatchEvidence from "@/components/shared/RiverineWatchEvidence";

const metrics = [
  { label: "Eligible onset events", value: "5", detail: "Lokoja + Makurdi retrospective scope" },
  { label: "Events detected", value: "4", detail: "80% event-detection rate" },
  { label: "PR-AUC", value: "0.176", detail: "Pooled issue-row ranking metric" },
  { label: "ROC-AUC", value: "0.837", detail: "Pooled issue-row discrimination" },
  { label: "Alert precision", value: "26.7%", detail: "Deduplicated warning episodes" },
  { label: "False alerts", value: "1.83", detail: "Episodes per supported location-year" },
];

const supportedClaims = [
  "Detected 4 of 5 eligible historical flood-onset events in retrospective testing for Lokoja and Makurdi.",
  "Uses a frozen 14-day flood-onset WATCH horizon.",
  "Uses 30 complete prior NASA IMERG Early rainfall days and matching GloFAS +24/+48/+72-hour discharge forecasts.",
  "Returns NORMAL, MONITOR or WATCH with a frozen WATCH threshold of 0.70.",
  "Has scored a genuine preserved operational NASA + GloFAS source bundle deterministically.",
];

const unsupportedClaims = [
  "80% accuracy.",
  "80% national flood-prediction accuracy.",
  "Prospectively validated public-warning performance.",
  "Validated for every location in Nigeria.",
  "Authorized autonomous evacuation or public-warning decisions.",
  "Riverine Watch v1 has replaced the derived-v2 public risk engine.",
];

export default function ModelEvidencePage() {
  return (
    <main className="min-h-screen">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-xl dark:border-midnight-border dark:bg-midnight/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-radar/20 bg-radar/10">
              <Shield className="h-4 w-4 text-radar" />
            </div>
            <span className="font-display text-lg font-bold">NaijaClima<span className="text-radar">Guard</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-radar dark:text-slate-400">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        <section className="border-b border-slate-200 bg-slate-50/50 py-14 dark:border-midnight-border dark:bg-midnight-light/20 sm:py-20">
          <div className="mx-auto max-w-5xl px-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-4 py-1.5 text-xs font-semibold text-radar">
              <FileCheck2 className="h-3.5 w-3.5" /> Frozen evidence pack · 12 August 2026
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">Riverine Watch v1 Evidence</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
              The public record of what the model does, what the 80% result means, how the model is allowed to operate, and which claims are not supported.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-radar/20 bg-radar/5 px-3 py-1.5 font-semibold text-radar">Status: shadow candidate</span>
              <span className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-500 dark:border-midnight-border dark:text-slate-400">Public replacement: not authorized</span>
              <span className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-500 dark:border-midnight-border dark:text-slate-400">Autonomous warning: not authorized</span>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:py-14">
          <RiverineWatchEvidence />

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="glass-card rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{metric.label}</p>
                <p className="mt-2 font-display text-3xl font-bold text-radar">{metric.value}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{metric.detail}</p>
              </div>
            ))}
          </section>

          <section className="glass-card rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-radar/10"><Activity className="h-5 w-5 text-radar" /></div>
              <div>
                <h2 className="font-display text-2xl font-bold">What the model actually does</h2>
                <p className="mt-3 leading-relaxed text-slate-500 dark:text-slate-400">
                  Riverine Watch v1 looks for an elevated riverine flood-onset condition within the next 14 days in Lokoja or Makurdi. It does not try to predict every type of flood in every Nigerian location.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-midnight-border">
                <Satellite className="h-5 w-5 text-radar" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">Rainfall</p>
                <p className="mt-1 text-sm font-semibold">30 complete prior NASA IMERG Early days</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-midnight-border">
                <Database className="h-5 w-5 text-radar" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">River forecast</p>
                <p className="mt-1 text-sm font-semibold">GloFAS operational discharge at +24/+48/+72h</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-midnight-border">
                <Gauge className="h-5 w-5 text-radar" />
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">Decision</p>
                <p className="mt-1 text-sm font-semibold">NORMAL, MONITOR or WATCH · WATCH ≥ 0.70</p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="glass-card rounded-2xl p-6 sm:p-7">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold"><CheckCircle2 className="h-5 w-5 text-radar" /> Claims we can defend</h2>
              <div className="mt-5 space-y-3">
                {supportedClaims.map((claim) => (
                  <div key={claim} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-radar" /><span>{claim}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6 sm:p-7">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold"><XCircle className="h-5 w-5 text-crimson" /> Claims we do not make</h2>
              <div className="mt-5 space-y-3">
                {unsupportedClaims.map((claim) => (
                  <div key={claim} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-crimson" /><span>{claim}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="glass-card rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-radar" />
              <h2 className="font-display text-2xl font-bold">Real operational-source replay</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              After the model was frozen, the scorer was run against a genuine preserved NASA + GloFAS source bundle for the 10 August 2026 issue date. This proves the frozen model can score real source-compatible inputs. It is not counted as prospective validation because the replay happened after the source issue date.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-5 dark:border-midnight-border">
                <div className="flex items-center justify-between gap-3"><span className="font-semibold">Lokoja</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-midnight-light">NORMAL</span></div>
                <p className="mt-3 font-display text-3xl font-bold">4.08%</p>
                <p className="mt-1 text-xs text-slate-400">Replay probability</p>
              </div>
              <div className="rounded-xl border border-radar/25 bg-radar/[0.03] p-5">
                <div className="flex items-center justify-between gap-3"><span className="font-semibold">Makurdi</span><span className="rounded-full bg-radar/10 px-3 py-1 text-xs font-bold text-radar">WATCH</span></div>
                <p className="mt-3 font-display text-3xl font-bold text-radar">85.03%</p>
                <p className="mt-1 text-xs text-slate-400">Replay probability</p>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-2xl p-6 sm:p-8">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><ShieldAlert className="h-5 w-5 text-amber" /> Source freshness and fail-safe behavior</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              The model does not silently replace unavailable river data with an unrelated source. Fresh GloFAS data is preferred. A one-day-old issue can be used as a bounded fallback. A two-day-old issue is backfill-only and cannot emit a new WATCH episode. Anything older produces SOURCE_DELAYED and no new model issue.
            </p>
          </section>

          <section className="rounded-2xl border border-radar/25 bg-radar/[0.04] p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold">What comes next scientifically</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              The historical number is now frozen. The next proof is prospective evidence. Each real forecast issue must preserve its source date, source age, model probability, state and WATCH episode decision. Once enough outcomes accumulate, the retrospective 80% headline can be supplemented or replaced by a true live performance number.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/how-to-use#riverine-watch-v1" className="inline-flex items-center gap-2 rounded-xl bg-radar px-4 py-2.5 text-sm font-semibold text-white">How the model works <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/about" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-midnight-border">About the platform <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-5 text-xs leading-relaxed text-slate-500 dark:border-midnight-border dark:text-slate-400">
            <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Scope reminder:</strong> the 80% result belongs to Riverine Watch v1 in Lokoja and Makurdi only. The general live public risk score is still the separate derived-v2 decision-support engine. Official emergency instructions and visible flooding always take priority.</p></div>
          </section>
        </div>
      </div>
    </main>
  );
}
