"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, ArrowRight, Building2, Calculator, CircleDollarSign, Landmark, MapPin, ShieldAlert, Sprout, Users, Waves } from "lucide-react";
import { NationalAreaControl, useNationalArea } from "@/components/shared/NationalArea";

const PILOT_SCENARIOS = {
  Kogi: { location: "Lokoja", households: 12400, businesses: 1430, farmland: 8300, roads: 7, exposure: 4.8, intervention: 82, avoidable: 1.1 },
  Benue: { location: "Makurdi", households: 9800, businesses: 1120, farmland: 10500, roads: 5, exposure: 3.9, intervention: 68, avoidable: 0.84 },
} as const;

export default function ImpactPage() {
  const { area } = useNationalArea();
  const data = PILOT_SCENARIOS[area.name as keyof typeof PILOT_SCENARIOS];
  const roi = useMemo(() => data ? (data.avoidable * 1000) / data.intervention : null, [data]);

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-slate-950 dark:bg-midnight dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold"><ArrowLeft className="h-4 w-4" /> NaijaClimaGuard</Link>
          <div className="flex flex-wrap items-center gap-2"><NationalAreaControl compact /><span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-black uppercase tracking-wider text-amber-900">Scenario mode</span></div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-radar"><Calculator className="h-4 w-4" /> Economic Impact Engine</div>
            <h1 className="mt-4 max-w-4xl font-display text-5xl font-black leading-[.98] tracking-tight sm:text-6xl">Turn flood risk into an economic decision.</h1>
            <p className="mt-5 max-w-2xl text-slate-600 dark:text-slate-400">The platform is national across 36 states plus the FCT. Economic estimates are not automatically national: a state only receives numbers when the necessary exposure and action-cost assumptions exist and are labelled.</p>
          </div>
          <div className="rounded-[2rem] bg-[#071713] p-6 text-white">
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#d9ff57]">Selected working area</p>
            <p className="mt-3 text-3xl font-black">{area.name}</p>
            <p className="mt-2 text-sm text-white/55">{area.zone} · capital: {area.capital}</p>
            <p className="mt-4 text-xs leading-5 text-white/45">Riverine Watch v1 evidence remains limited to Lokoja and Makurdi. National platform coverage must not be confused with pilot-model coverage.</p>
          </div>
        </div>

        {!data ? (
          <div className="mt-12 rounded-[2.5rem] border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 sm:p-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#071713] text-[#d9ff57]"><MapPin className="h-6 w-6" /></div>
            <h2 className="mt-6 max-w-3xl text-3xl font-black tracking-tight">No economic-loss number is published for {area.name} yet.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">That is deliberate. NaijaClimaGuard will not copy Lokoja or Makurdi assumptions into {area.name}. The national product can monitor exact saved locations, but state economic exposure requires its own population, asset, agriculture, infrastructure and vulnerability inputs before a number is defensible.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <Status title="Platform access" value="Available" />
              <Status title="Exact-location risk" value="Available via saved coordinates" />
              <Status title="Economic exposure estimate" value="Awaiting validated inputs" />
            </div>
            <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#071713] px-5 py-3 text-sm font-black text-white dark:bg-radar dark:text-slate-950">Monitor a place in {area.name} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <>
            <div className="mt-12 rounded-2xl border border-amber/20 bg-amber/5 p-4 text-sm text-slate-600 dark:text-slate-300"><strong>{data.location}, {area.name} pilot scenario.</strong> These values demonstrate the economic-decision structure; they are not operational loss estimates or validated public claims.</div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric icon={Users} label="Households exposed" value={data.households.toLocaleString()} note="Scenario" />
              <Metric icon={Building2} label="Businesses exposed" value={data.businesses.toLocaleString()} note="Scenario" />
              <Metric icon={Sprout} label="Farmland exposed" value={`${data.farmland.toLocaleString()} ha`} note="Scenario" />
              <Metric icon={Landmark} label="Road links at risk" value={String(data.roads)} note="Scenario" />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-[2rem] bg-[#071713] p-7 text-white lg:col-span-2">
                <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-white/45">Economic exposure</p><p className="mt-2 text-5xl font-black">₦{data.exposure.toFixed(1)}bn</p></div><CircleDollarSign className="h-12 w-12 text-[#d9ff57]" /></div>
                <div className="mt-8 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/10 p-5"><p className="text-sm text-white/55">Early-action package</p><p className="mt-1 text-3xl font-black">₦{data.intervention}m</p></div><div className="rounded-2xl bg-[#d9ff57] p-5 text-[#071713]"><p className="text-sm text-[#071713]/60">Potentially avoidable loss</p><p className="mt-1 text-3xl font-black">₦{data.avoidable.toFixed(2)}bn</p></div></div>
              </div>
              <div className="rounded-[2rem] border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700 dark:text-radar">Intervention value</p><p className="mt-3 text-6xl font-black tracking-tight">{roi?.toFixed(1)}×</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Scenario benefit-to-cost ratio. Production values require auditable assumptions and provenance.</p></div>
            </div>
          </>
        )}

        <div className="mt-10 grid gap-4 lg:grid-cols-3"><ActionCard icon={ShieldAlert} title="Act before impact" text="Convert warning evidence into prioritized interventions, owners, budgets and deadlines." /><ActionCard icon={MapPin} title="See where value sits" text="Rank communities, roads, farms and assets only when their local exposure inputs are available." /><ActionCard icon={Waves} title="Verify what happened" text="Compare forecast, intervention and observed outcome so future decisions become more defensible." /></div>

        <div className="mt-12 flex flex-col gap-3 rounded-[2rem] bg-[#d9ff57] p-7 text-[#071713] sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xl font-black">National product. Local evidence.</p><p className="mt-1 text-sm text-[#071713]/65">No scenario number becomes a public claim until its data and assumptions are auditable.</p></div><Link href="/pitch" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#071713] px-5 py-3 text-sm font-black text-white">Open Pitch Mode <ArrowRight className="h-4 w-4" /></Link></div>
      </section>
    </main>
  );
}

function Status({ title, value }: { title: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-xs font-bold text-slate-400">{title}</p><p className="mt-2 text-sm font-black">{value}</p></div>; }
function Metric({ icon: Icon, label, value, note }: { icon: typeof Users; label: string; value: string; note: string }) { return <div className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-radar/10 dark:text-radar"><Icon className="h-5 w-5" /></div><p className="mt-7 text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{value}</p><p className="mt-3 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900">{note}</p></div>; }
function ActionCard({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) { return <div className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><Icon className="h-6 w-6 text-emerald-700 dark:text-radar" /><h2 className="mt-5 text-xl font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{text}</p></div>; }