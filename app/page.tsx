"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Heart,
  Landmark,
  MapPin,
  Play,
  Radio,
  Shield,
  Sparkles,
  Sprout,
  Users,
  Waves,
} from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1741110539426-fce3268c3c0d?auto=format&fit=crop&fm=jpg&q=82&w=2400";

const journeys = [
  { icon: Heart, title: "My family", text: "Save the places and people you care about, then see what changing flood conditions mean in plain language." },
  { icon: Sprout, title: "My farm", text: "Track rainfall and river risk around farms and turn warnings into practical preparation steps." },
  { icon: Building2, title: "My business", text: "Understand exposed assets, likely disruption and the cost of waiting versus acting early." },
  { icon: Landmark, title: "My community", text: "Give decision-makers a shared picture of risk, economic exposure, actions and verified evidence." },
];

const retained = [
  "Live public risk engine",
  "Riverine Watch v1 shadow evidence",
  "Action OS and Action Center",
  "Alerts and citizen reporting",
  "Evidence ledger and validation",
  "Reports and API access",
  "Authentication and profiles",
  "Simple-to-technical explanation modes",
];

export default function LandingPage() {
  const [area, setArea] = useState("Lokoja");
  const [saved, setSaved] = useState(false);

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-slate-950 dark:bg-midnight dark:text-slate-100">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#071713]/80 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <Waves className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-black tracking-tight">NaijaClimaGuard</span>
          </Link>
          <div className="hidden items-center gap-7 lg:flex">
            <a href="#my-area" className="text-sm text-white/70 transition hover:text-white">My Area</a>
            <Link href="/impact" className="text-sm text-white/70 transition hover:text-white">Economic Impact</Link>
            <Link href="/action-center" className="text-sm text-white/70 transition hover:text-white">Action OS</Link>
            <Link href="/evidence" className="text-sm text-white/70 transition hover:text-white">Evidence</Link>
            <Link href="/api-docs" className="text-sm text-white/70 transition hover:text-white">API</Link>
            <Link href="/pitch" className="text-sm text-white/70 transition hover:text-white">Pitch Mode</Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link href="/login" className="hidden text-sm text-white/75 sm:block">Sign in</Link>
            <Link href="/register" className="rounded-full bg-[#d9ff57] px-4 py-2 text-sm font-bold text-[#071713] transition hover:scale-[1.02]">Protect my place</Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[96vh] overflow-hidden bg-[#071713] text-white">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="People gathered by homes during a flood" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06130f]/95 via-[#06130f]/62 to-[#06130f]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06130f] via-transparent to-[#06130f]/25" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[96vh] max-w-7xl items-end px-4 pb-14 pt-28 sm:px-6 sm:pb-20 lg:px-8">
          <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div className="max-w-4xl animate-slide-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur-md">
                <Radio className="h-3.5 w-3.5 text-[#d9ff57]" /> Nigeria&apos;s climate-risk action platform
              </div>
              <h1 className="max-w-4xl font-display text-5xl font-black leading-[0.94] tracking-[-0.045em] sm:text-6xl md:text-7xl lg:text-[6.4rem]">
                Is the place you love ready for the next flood?
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
                NaijaClimaGuard turns flood intelligence into something personal: what could happen, who and what may be exposed, what you can do now, and how early action can reduce loss.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#my-area" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#d9ff57] px-6 py-3.5 font-bold text-[#071713] transition hover:scale-[1.02]">
                  Check my area <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </a>
                <Link href="/pitch" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 font-semibold backdrop-blur-md transition hover:bg-white/15">
                  <Play className="h-4 w-4 fill-current" /> Open investor story
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-black/25 p-5 backdrop-blur-xl sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d9ff57]">Your place, not just a probability</p>
              <div className="mt-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/55">Saved location</p>
                  <p className="mt-1 text-2xl font-black">{area}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10"><MapPin className="h-5 w-5" /></div>
              </div>
              <div className="mt-5 rounded-2xl bg-white/10 p-4">
                <p className="text-sm font-bold">Your area can be watched continuously.</p>
                <p className="mt-1 text-sm leading-6 text-white/65">Save home, family, farm or business locations. NaijaClimaGuard can then translate changing risk into clear actions for those places.</p>
              </div>
              <button onClick={() => setSaved(!saved)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-3 text-sm font-bold transition hover:bg-white/10">
                {saved ? <CheckCircle2 className="h-4 w-4 text-[#d9ff57]" /> : <Heart className="h-4 w-4" />}
                {saved ? `${area} saved` : `Save ${area}`}
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 right-5 z-20 text-[10px] text-white/45">Flood photograph: Iqro Rinaldi / Unsplash</div>
      </section>

      <section id="my-area" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-radar">Start with what matters to you</span>
              <h2 className="mt-4 font-display text-4xl font-black leading-tight tracking-tight sm:text-5xl">Your flood intelligence should feel personal.</h2>
              <p className="mt-5 max-w-xl text-slate-600 dark:text-slate-400">Choose a place. The platform can grow from a national warning system into a daily climate companion around homes, farms, roads, businesses and communities.</p>
              <div className="mt-7 flex gap-2 rounded-full border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                {["Lokoja", "Makurdi"].map((name) => (
                  <button key={name} onClick={() => { setArea(name); setSaved(false); }} className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition ${area === name ? "bg-[#071713] text-white dark:bg-radar dark:text-slate-950" : "text-slate-500"}`}>{name}</button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {journeys.map((item) => (
                <div key={item.title} className="group rounded-[2rem] border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d9ff57] text-[#071713]"><item.icon className="h-5 w-5" /></div>
                  <h3 className="mt-8 text-2xl font-black">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.text}</p>
                  <div className="mt-7 flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-radar">Explore <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#071713] py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#d9ff57] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#071713]"><Play className="h-3.5 w-3.5 fill-current" /> Investor story</div>
              <h2 className="mt-5 font-display text-4xl font-black leading-tight sm:text-6xl">Pitch the innovation directly from the product.</h2>
              <p className="mt-5 max-w-xl text-white/65">This is the permanent home for your investor film: the problem, the warning gap, the technology, the economic value, the Nigerian impact and the commercial opportunity.</p>
              <Link href="/pitch" className="mt-7 inline-flex items-center gap-2 font-bold text-[#d9ff57]">Enter full Pitch Mode <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="group relative aspect-video overflow-hidden rounded-[2rem] border border-white/15 bg-[#102820] shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(217,255,87,.18),transparent_40%),linear-gradient(135deg,#13382e,#071713)]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <button aria-label="Video placeholder" className="flex h-20 w-20 items-center justify-center rounded-full bg-[#d9ff57] text-[#071713] shadow-2xl transition group-hover:scale-110"><Play className="ml-1 h-7 w-7 fill-current" /></button>
                <p className="mt-5 text-lg font-black">NaijaClimaGuard: The Investor Film</p>
                <p className="mt-1 text-sm text-white/45">Video placeholder ready for your final pitch film</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2.5rem] bg-[#d9ff57] p-7 text-[#071713] sm:p-10 lg:p-14">
            <div className="grid gap-10 lg:grid-cols-[1fr_.85fr] lg:items-end">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.2em]">From warning to economic decision</span>
                <h2 className="mt-4 max-w-3xl font-display text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">What will happen is only the first question.</h2>
                <p className="mt-5 max-w-2xl text-[#163129]/75">The Economic Impact Engine is being built to connect flood risk to people, farms, businesses, infrastructure, economic exposure, action options and the value of acting before loss happens.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["People exposed", "Businesses exposed", "₦ exposure", "Action value"].map((label, i) => (
                  <div key={label} className="rounded-2xl bg-[#071713] p-5 text-white">
                    <p className="text-2xl font-black">{["People", "Assets", "Loss", "ROI"][i]}</p>
                    <p className="mt-1 text-xs text-white/55">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <Link href="/impact" className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#071713] px-6 py-3.5 font-bold text-white">Open Economic Impact Engine <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-radar"><Shield className="h-4 w-4" /> Nothing important was thrown away</div>
              <h2 className="mt-4 font-display text-4xl font-black tracking-tight">The old capability becomes the engine under the new experience.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {retained.map((feature) => <div key={feature} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold dark:bg-slate-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{feature}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#071713] text-[#d9ff57]"><Sparkles className="h-6 w-6" /></div>
          <h2 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-black tracking-tight sm:text-6xl">Know earlier. Act smarter. Protect what matters.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-slate-600 dark:text-slate-400">Citizens get a human experience. Institutions get decision intelligence. Investors can see the complete product story without leaving the platform.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="rounded-full bg-[#071713] px-6 py-3.5 font-bold text-white dark:bg-radar dark:text-slate-950">Start with my area</Link>
            <Link href="/pitch" className="rounded-full border border-slate-300 px-6 py-3.5 font-bold dark:border-slate-700">Open Pitch Mode</Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#071713] py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div><p className="font-black">NaijaClimaGuard</p><p className="mt-1 text-xs text-white/45">Climate intelligence → economic action.</p></div>
          <div className="flex flex-wrap gap-5 text-sm text-white/55"><Link href="/dashboard">Dashboard</Link><Link href="/action-center">Action OS</Link><Link href="/evidence">Evidence</Link><Link href="/api-docs">API</Link><Link href="/about">About</Link></div>
        </div>
      </footer>
    </main>
  );
}
