"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Heart,
  Landmark,
  LogIn,
  MapPin,
  Play,
  Radio,
  Shield,
  Sprout,
  UserPlus,
  Waves,
} from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";
import {
  NIGERIA_ADMIN_AREAS,
  NIGERIA_STATE_COUNT,
  RIVERINE_WATCH_V1_PILOT,
} from "@/lib/nigeria-geography";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1741110539426-fce3268c3c0d?auto=format&fit=crop&fm=jpg&q=82&w=2400";

const journeys = [
  { icon: Heart, title: "My family", text: "Save the places and people you care about and receive plain-language risk context and actions." },
  { icon: Sprout, title: "My farm", text: "Track changing rainfall and flood conditions around farms and turn warnings into preparation steps." },
  { icon: Building2, title: "My business", text: "Understand exposed assets, likely disruption and the value of acting before loss happens." },
  { icon: Landmark, title: "My community", text: "Give communities and decision-makers a shared view of risk, action and evidence." },
];

export default function LandingPage() {
  const [selectedState, setSelectedState] = useState("Kogi");
  const [saved, setSaved] = useState(false);

  const selected = useMemo(
    () => NIGERIA_ADMIN_AREAS.find((item) => item.name === selectedState) || NIGERIA_ADMIN_AREAS[0],
    [selectedState]
  );
  const pilot = RIVERINE_WATCH_V1_PILOT.find((item) => item.state === selected.name);

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-slate-950 dark:bg-midnight dark:text-slate-100">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#071713]/90 text-white backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10"><Waves className="h-4 w-4" /></div>
            <span className="font-display text-base font-black tracking-tight sm:text-lg">NaijaClimaGuard</span>
          </Link>

          <div className="hidden items-center gap-6 xl:flex">
            <a href="#my-area" className="text-sm text-white/70 hover:text-white">Check my area</a>
            <Link href="/impact" className="text-sm text-white/70 hover:text-white">Economic Impact</Link>
            <Link href="/action-center" className="text-sm text-white/70 hover:text-white">Action OS</Link>
            <Link href="/evidence" className="text-sm text-white/70 hover:text-white">Evidence</Link>
            <Link href="/api-docs" className="text-sm text-white/70 hover:text-white">API</Link>
            <Link href="/pitch" className="text-sm text-white/70 hover:text-white">Pitch Mode</Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm"><LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Log in</span></Link>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[#d9ff57] px-3 py-2 text-xs font-black text-[#071713] sm:px-4 sm:text-sm"><UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">Create account</span><span className="sm:hidden">Join</span></Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[96vh] overflow-hidden bg-[#071713] text-white">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="People gathered by homes during a flood" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06130f]/95 via-[#06130f]/65 to-[#06130f]/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06130f] via-transparent to-[#06130f]/25" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[96vh] max-w-7xl items-end px-4 pb-14 pt-28 sm:px-6 sm:pb-20 lg:px-8">
          <div className="grid w-full gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
            <div className="max-w-4xl animate-slide-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur-md">
                <Radio className="h-3.5 w-3.5 text-[#d9ff57]" /> National climate-risk action platform
              </div>
              <h1 className="max-w-4xl font-display text-5xl font-black leading-[0.94] tracking-[-0.045em] sm:text-6xl md:text-7xl lg:text-[6.1rem]">Is the place you love ready for the next flood?</h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">NaijaClimaGuard connects flood intelligence to people, places, economic exposure and practical action across Nigeria.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#my-area" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#d9ff57] px-6 py-3.5 font-black text-[#071713]">Check my state <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></a>
                <Link href="/pitch" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 font-bold backdrop-blur-md"><Play className="h-4 w-4 fill-current" /> Investor story</Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-white/65">
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">{NIGERIA_STATE_COUNT} states</span>
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">Federal Capital Territory</span>
                <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">6 geopolitical zones</span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-black/30 p-5 backdrop-blur-xl sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d9ff57]">Start with your own place</p>
              <label className="mt-5 block text-xs font-semibold text-white/60">State or FCT</label>
              <select value={selectedState} onChange={(e) => { setSelectedState(e.target.value); setSaved(false); }} className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-base font-bold text-white outline-none">
                {NIGERIA_ADMIN_AREAS.map((item) => <option key={item.name} value={item.name} className="text-slate-950">{item.name} — {item.capital}</option>)}
              </select>
              <div className="mt-5 flex items-start justify-between gap-4 rounded-2xl bg-white/10 p-4">
                <div><p className="text-sm text-white/55">Selected area</p><p className="mt-1 text-2xl font-black">{selected.name}</p><p className="mt-1 text-xs text-white/55">Capital: {selected.capital} · {selected.zone}</p></div>
                <MapPin className="mt-1 h-5 w-5" />
              </div>
              <div className="mt-4 rounded-2xl border border-white/15 p-4 text-sm leading-6 text-white/70">
                {pilot ? <><strong className="text-white">Riverine Watch v1 pilot available at {pilot.location}.</strong> National platform coverage and pilot-model evidence are shown separately.</> : <>This state is part of the national platform experience. <strong className="text-white">Riverine Watch v1 is not yet validated here</strong>, so the interface will not pretend it is.</>}
              </div>
              <button onClick={() => setSaved(!saved)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-3 text-sm font-black hover:bg-white/10">{saved ? <CheckCircle2 className="h-4 w-4 text-[#d9ff57]" /> : <Heart className="h-4 w-4" />}{saved ? `${selected.name} saved` : `Save ${selected.name}`}</button>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/login" className="rounded-full bg-white px-4 py-3 text-center text-sm font-black text-[#071713]">Log in</Link>
                <Link href="/register" className="rounded-full bg-[#d9ff57] px-4 py-3 text-center text-sm font-black text-[#071713]">Register</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 right-5 z-20 text-[10px] text-white/45">Flood photograph: Iqro Rinaldi / Unsplash</div>
      </section>

      <section id="my-area" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-radar">Nigeria-wide experience</span>
              <h2 className="mt-4 font-display text-4xl font-black leading-tight tracking-tight sm:text-5xl">One product. Different lives to protect.</h2>
              <p className="mt-5 text-slate-600 dark:text-slate-400">The product should feel useful whether you are protecting a household, farm, business, road network or entire state.</p>
              <div className="mt-7 rounded-[1.5rem] bg-[#071713] p-5 text-white"><p className="text-3xl font-black">36 + FCT</p><p className="mt-2 text-sm text-white/60">Every Nigerian first-level administrative area is represented in the product geography registry.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {journeys.map((item) => <div key={item.title} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d9ff57] text-[#071713]"><item.icon className="h-5 w-5" /></div><h3 className="mt-7 text-2xl font-black">{item.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.text}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#071713] py-20 text-white sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8">
          <div><span className="rounded-full bg-[#d9ff57] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#071713]">Investor story</span><h2 className="mt-5 font-display text-4xl font-black leading-tight sm:text-6xl">Pitch directly from the product.</h2><p className="mt-5 max-w-xl text-white/65">The final film will explain the problem, technology, economic value, national impact, revenue model and evidence without leaving the website.</p><Link href="/pitch" className="mt-7 inline-flex items-center gap-2 font-black text-[#d9ff57]">Enter Pitch Mode <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="relative aspect-video overflow-hidden rounded-[2rem] border border-white/15 bg-[#102820] shadow-2xl"><div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(217,255,87,.18),transparent_40%),linear-gradient(135deg,#13382e,#071713)]" /><div className="absolute inset-0 flex flex-col items-center justify-center text-center"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#d9ff57] text-[#071713]"><Play className="ml-1 h-7 w-7 fill-current" /></div><p className="mt-5 text-lg font-black">NaijaClimaGuard: The Investor Film</p><p className="mt-1 text-sm text-white/45">Video placeholder</p></div></div>
        </div>
      </section>

      <section className="py-20 sm:py-28"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="rounded-[2.5rem] bg-[#d9ff57] p-8 text-[#071713] sm:p-12"><div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><div><p className="text-xs font-black uppercase tracking-[0.2em]">From forecast to economic action</p><h2 className="mt-4 max-w-3xl font-display text-4xl font-black leading-tight sm:text-6xl">Risk is useful only when it changes a decision.</h2><p className="mt-5 max-w-2xl text-[#163129]/75">Economic exposure, intervention cost, avoidable loss and action value live beside the forecast, not in a separate pitch deck.</p></div><Link href="/impact" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#071713] px-6 py-3.5 font-black text-white">Open Economic Impact <ArrowRight className="h-4 w-4" /></Link></div></div></div></section>

      <section className="border-y border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-950"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="grid gap-8 lg:grid-cols-2"><div><div className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-radar"><Shield className="h-4 w-4" /> Coverage is stated honestly</div><h2 className="mt-4 font-display text-4xl font-black">National platform. Pilot model evidence where it is actually validated.</h2></div><div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-400"><p><strong className="text-slate-900 dark:text-white">Platform geography:</strong> all 36 states and the FCT.</p><p><strong className="text-slate-900 dark:text-white">Riverine Watch v1:</strong> Lokoja, Kogi and Makurdi, Benue pilot locations only.</p><p><strong className="text-slate-900 dark:text-white">Rule:</strong> unsupported areas never inherit a model probability from a pilot location.</p></div></div></div></section>

      <section className="py-20 text-center"><div className="mx-auto max-w-3xl px-4"><h2 className="font-display text-4xl font-black sm:text-6xl">Know earlier. Act smarter. Protect what matters.</h2><p className="mt-5 text-slate-600 dark:text-slate-400">Create an account to save places, receive personalized context and use the full decision platform.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/register" className="rounded-full bg-[#071713] px-7 py-3.5 font-black text-white dark:bg-radar dark:text-slate-950">Create account</Link><Link href="/login" className="rounded-full border border-slate-300 px-7 py-3.5 font-black dark:border-slate-700">Log in</Link></div></div></section>

      <footer className="bg-[#071713] py-10 text-white"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><div><p className="font-black">NaijaClimaGuard</p><p className="mt-1 text-xs text-white/45">Climate intelligence → economic action.</p></div><div className="flex flex-wrap gap-5 text-sm text-white/55"><Link href="/login">Log in</Link><Link href="/register">Register</Link><Link href="/dashboard">Dashboard</Link><Link href="/action-center">Action OS</Link><Link href="/evidence">Evidence</Link><Link href="/api-docs">API</Link></div></div></footer>
    </main>
  );
}
