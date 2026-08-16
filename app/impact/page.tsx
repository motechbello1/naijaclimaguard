"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Calculator, CircleDollarSign, Landmark, MapPin, ShieldAlert, Sprout, Users, Waves } from "lucide-react";

const locations = {
  Lokoja: { households: 12400, businesses: 1430, farmland: 8300, roads: 7, exposure: 4.8, intervention: 82, avoidable: 1.1 },
  Makurdi: { households: 9800, businesses: 1120, farmland: 10500, roads: 5, exposure: 3.9, intervention: 68, avoidable: 0.84 },
};

export default function ImpactPage() {
  const [location, setLocation] = useState<keyof typeof locations>("Lokoja");
  const data = locations[location];
  const roi = useMemo(() => (data.avoidable * 1000) / data.intervention, [data]);

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-slate-950 dark:bg-midnight dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold"><ArrowLeft className="h-4 w-4" /> NaijaClimaGuard</Link>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-900">Scenario mode</span>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-radar"><Calculator className="h-4 w-4" /> Economic Impact Engine</div>
            <h1 className="mt-4 max-w-4xl font-display text-5xl font-black leading-[.98] tracking-tight sm:text-6xl">Turn flood risk into an economic decision.</h1>
            <p className="mt-5 max-w-2xl text-slate-600 dark:text-slate-400">This prototype shows the decision structure we are building: exposure, intervention cost and potentially avoidable loss. The figures below are clearly marked scenarios and are not yet validated operational estimates.</p>
          </div>
          <div className="rounded-[2rem] bg-[#071713] p-6 text-white">
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#d9ff57]">Choose pilot location</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(Object.keys(locations) as Array<keyof typeof locations>).map((name) => (
                <button key={name} onClick={() => setLocation(name)} className={`rounded-full px-4 py-3 text-sm font-black transition ${location === name ? "bg-[#d9ff57] text-[#071713]" : "bg-white/10 text-white"}`}>{name}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Users} label="Households exposed" value={data.households.toLocaleString()} note="Scenario" />
          <Metric icon={Building2} label="Businesses exposed" value={data.businesses.toLocaleString()} note="Scenario" />
          <Metric icon={Sprout} label="Farmland exposed" value={`${data.farmland.toLocaleString()} ha`} note="Scenario" />
          <Metric icon={Landmark} label="Road links at risk" value={String(data.roads)} note="Scenario" />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[2rem] bg-[#071713] p-7 text-white lg:col-span-2">
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-white/45">Economic exposure</p><p className="mt-2 text-5xl font-black">₦{data.exposure.toFixed(1)}bn</p></div><CircleDollarSign className="h-12 w-12 text-[#d9ff57]" /></div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-5"><p className="text-sm text-white/55">Early-action package</p><p className="mt-1 text-3xl font-black">₦{data.intervention}m</p></div>
              <div className="rounded-2xl bg-[#d9ff57] p-5 text-[#071713]"><p className="text-sm text-[#071713]/60">Potentially avoidable loss</p><p className="mt-1 text-3xl font-black">₦{data.avoidable.toFixed(2)}bn</p></div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700 dark:text-radar">Intervention value</p>
            <p className="mt-3 text-6xl font-black tracking-tight">{roi.toFixed(1)}×</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Scenario benefit-to-cost ratio. The production engine will expose all assumptions and source provenance behind this number.</p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <ActionCard icon={ShieldAlert} title="Act before impact" text="Convert the warning into prioritized interventions, owners, budgets and deadlines." />
          <ActionCard icon={MapPin} title="See where value sits" text="Rank communities, roads, farms and assets by risk and likely economic consequence." />
          <ActionCard icon={Waves} title="Verify what happened" text="Compare forecast, intervention and observed outcome so future decisions become more defensible." />
        </div>

        <div className="mt-12 flex flex-col gap-3 rounded-[2rem] bg-[#d9ff57] p-7 text-[#071713] sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xl font-black">Next: connect validated exposure datasets and action economics.</p><p className="mt-1 text-sm text-[#071713]/65">No scenario number becomes a public claim until its data and assumptions are auditable.</p></div>
          <Link href="/pitch" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#071713] px-5 py-3 text-sm font-black text-white">Open Pitch Mode <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: typeof Users; label: string; value: string; note: string }) {
  return <div className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-radar/10 dark:text-radar"><Icon className="h-5 w-5" /></div><p className="mt-7 text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{value}</p><p className="mt-3 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900">{note}</p></div>;
}

function ActionCard({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return <div className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><Icon className="h-6 w-6 text-emerald-700 dark:text-radar" /><h2 className="mt-5 text-xl font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{text}</p></div>;
}
