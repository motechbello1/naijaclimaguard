"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Zap, Shield, Activity, Satellite, Brain, Bell, Check, Code, Copy, Sprout, Landmark, Building2, Clock3, MapPin } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";
import RiverineWatchEvidence from "@/components/shared/RiverineWatchEvidence";
import { PRICING, API_EXAMPLE } from "@/lib/data";

export default function LandingPage() {
  const [apiTab, setApiTab] = useState<"request" | "response">("request");
  const [copied, setCopied] = useState(false);

  return (
    <main className="min-h-screen">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-200 dark:border-midnight-border bg-white/80 dark:bg-midnight/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-radar/10 border border-radar/20">
              <Shield className="h-4 w-4 text-radar" />
            </div>
            <span className="font-display text-lg font-bold">NaijaClima<span className="text-radar">Guard</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#validation" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Model Evidence</a>
            <a href="#api" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">API</a>
            <a href="#pricing" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</a>
            <Link href="/how-to-use" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">How to Use</Link>
            <Link href="/about" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">About</Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="rounded-lg bg-radar px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]" style={{ boxShadow: "0 1px 4px rgba(16, 185, 129, 0.15)" }}>
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[90vh] flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-radar/[0.04] dark:bg-radar/[0.03] bg-emerald-100/40 blur-[140px]" />
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan/[0.03] dark:bg-cyan/[0.03] bg-sky-100/30 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-4 py-1.5 mb-8">
            <Zap className="h-3.5 w-3.5 text-radar" />
            <span className="text-xs font-medium text-radar">Nigeria-focused flood-risk decision support</span>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
            <span>Understand flood risk</span><br />
            <span className="text-radar">before decisions are made.</span>
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed">
            NaijaClimaGuard combines a live public risk engine with Riverine Watch v1, a separate 14-day shadow model that uses NASA rainfall history and operational GloFAS river forecasts to identify elevated flood-onset conditions in Lokoja and Makurdi.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="group flex items-center gap-2 rounded-lg bg-radar px-7 py-3.5 text-base font-semibold text-white transition-all duration-200 ease-out hover:brightness-110 active:scale-[0.98]" style={{ boxShadow: "0 2px 8px rgba(16, 185, 129, 0.18)" }}>
              Start Free <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link href="#validation" className="rounded-lg border border-slate-200 dark:border-midnight-border px-7 py-3.5 text-base font-medium hover:border-radar/40 transition-all duration-200">
              See Model Evidence
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 dark:border-midnight-border bg-slate-50/50 dark:bg-midnight-light/50">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Activity, value: "80%", unit: "4/5 events", label: "Historical Event Detection" },
              { icon: Clock3, value: "14", unit: "days", label: "Riverine Watch Horizon" },
              { icon: MapPin, value: "2", unit: "pilot locations", label: "Lokoja + Makurdi" },
              { icon: Shield, value: "Live", unit: "derived-v2", label: "Current Public Risk Engine" },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-radar/10 border border-radar/20">
                  <m.icon className="h-5 w-5 text-radar" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-display font-bold">{m.value}</span>
                    <span className="text-xs text-slate-400">{m.unit}</span>
                  </div>
                  <p className="text-xs text-slate-400">{m.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="validation" className="py-24 scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-4 py-1.5 mb-5">
              <Brain className="h-3.5 w-3.5 text-radar" />
              <span className="text-xs font-medium text-radar">Frozen model evidence</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">Riverine Watch v1</h2>
            <p className="mt-4 max-w-3xl mx-auto text-slate-500 dark:text-slate-400 text-lg">
              Our current riverine pilot model is no longer an undefined “model under validation.” Its function, scope and retrospective result are stated explicitly below.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <RiverineWatchEvidence />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3 max-w-5xl mx-auto">
            <div className="glass-card rounded-xl p-5">
              <Satellite className="h-5 w-5 text-radar" />
              <h3 className="mt-3 font-display font-bold">Rainfall history</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Uses the 30 complete NASA GPM IMERG Early rainfall days strictly before the model issue date.</p>
            </div>
            <div className="glass-card rounded-xl p-5">
              <Activity className="h-5 w-5 text-radar" />
              <h3 className="mt-3 font-display font-bold">River trajectory</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Uses matching Copernicus CEMS GloFAS operational control-forecast discharge at +24, +48 and +72 hours.</p>
            </div>
            <div className="glass-card rounded-xl p-5">
              <Bell className="h-5 w-5 text-radar" />
              <h3 className="mt-3 font-display font-bold">Decision output</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Returns NORMAL, MONITOR or WATCH for a 14-day flood-onset horizon. WATCH begins at the frozen 0.70 threshold.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-50 dark:bg-midnight-light/30">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">How it works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 stagger">
            {[
              { icon: Satellite, step: "01", title: "Monitor", heading: "Current Public Risk", desc: "The current general risk API remains the disclosed derived-v2 decision-support engine. It monitors connected live weather inputs and keeps official advisories as a separate safety overlay." },
              { icon: Brain, step: "02", title: "Watch", heading: "Riverine Watch v1", desc: "For Lokoja and Makurdi, the shadow model combines prior NASA rainfall with GloFAS river-discharge forecasts to look for elevated flood-onset conditions within the next 14 days." },
              { icon: Bell, step: "03", title: "Act", heading: "Decision Support", desc: "The dashboard, Action OS, alerts, reports and evidence tools turn risk information into clear actions while preserving official-warning precedence and source provenance." },
            ].map((s) => (
              <div key={s.step} className="glass-card rounded-2xl p-8 hover:border-radar/30 transition-all duration-200">
                <span className="font-mono text-xs text-slate-400">{s.step}</span>
                <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-xl bg-radar/10 border border-radar/20">
                  <s.icon className="h-7 w-7 text-radar" />
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-radar">{s.title}</p>
                <h3 className="mt-2 font-display text-xl font-bold">{s.heading}</h3>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">Built for decision-makers</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Shield, title: "Insurance & Reinsurance", desc: "Explore location-specific flood-risk signals for climate-risk assessment workflows." },
              { icon: Sprout, title: "Agribusiness & Farming", desc: "Monitor changing rainfall and flood-risk conditions around crop and field locations." },
              { icon: Landmark, title: "Government & Emergency Agencies", desc: "Augment early-warning workflows with location-specific, auditable risk signals, action tools and integration-ready APIs." },
              { icon: Building2, title: "Infrastructure & Lending", desc: "Support physical climate-risk screening for assets, projects, and lending decisions." },
            ].map((uc) => (
              <div key={uc.title} className="glass-card rounded-2xl p-8 hover:border-radar/20 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-radar/10 border border-radar/20">
                    <uc.icon className="h-6 w-6 text-radar" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">{uc.title}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{uc.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="api" className="py-24 bg-slate-50 dark:bg-midnight-light/30">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-4 py-1.5 mb-6">
                <Code className="h-3.5 w-3.5 text-radar" />
                <span className="text-xs font-medium text-radar">Developer-First</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">One API call.<br /><span className="text-radar">Auditable risk context.</span></h2>
              <p className="mt-4 text-slate-500 dark:text-slate-400 text-lg">The current REST endpoint returns a location-specific derived-v2 risk score, contributing factors, recent rainfall intensity, source attribution, official-warning safety context and model metadata.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight overflow-hidden shadow-xl dark:shadow-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-midnight-border px-4">
                <div className="flex">
                  {(["request", "response"] as const).map((t) => (
                    <button key={t} onClick={() => setApiTab(t)} className={`px-4 py-3 text-xs font-mono font-medium border-b-2 transition-colors ${apiTab === t ? "text-radar border-radar" : "text-slate-400 border-transparent"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                  ))}
                </div>
                <button onClick={() => { navigator.clipboard.writeText(apiTab === "request" ? API_EXAMPLE.request : API_EXAMPLE.response); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-radar transition-colors">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="p-6 overflow-x-auto text-sm font-mono leading-relaxed text-slate-600 dark:text-slate-400">
                <code>{apiTab === "request" ? API_EXAMPLE.request : API_EXAMPLE.response}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">Simple, transparent pricing</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING.map((tier) => (
              <div key={tier.name} className={`relative rounded-2xl p-8 flex flex-col ${tier.highlighted ? "glass-card border-2 !border-radar/40 shadow-2xl shadow-radar/10" : "glass-card"}`}>
                {tier.highlighted && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-radar text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</div>}
                <h3 className="font-display text-lg font-bold">{tier.name}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tier.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">{tier.price}</span>
                  {tier.period && <span className="text-sm text-slate-400">{tier.period}</span>}
                </div>
                <ul className="mt-8 space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3"><Check className="h-4 w-4 shrink-0 text-radar mt-0.5" /><span className="text-sm">{f}</span></li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    if (tier.name === "Explorer") {
                      window.location.href = "/register";
                    } else if (tier.name === "Professional") {
                      window.location.href = "/login?next=%2Fprofile%3Fupgrade%3Dprofessional";
                    } else {
                      window.location.href = "/contact";
                    }
                  }}
                  className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98] ${tier.highlighted ? "bg-radar text-white hover:brightness-110" : "border border-slate-200 dark:border-midnight-border hover:border-radar/40"}`}
                  style={tier.highlighted ? { boxShadow: "0 2px 8px rgba(16, 185, 129, 0.18)" } : {}}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-midnight-border py-12">
        <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} NaijaClimaGuard · Built by Bello Muhammad Mustapha</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/about" className="text-xs text-slate-400 hover:text-radar transition-colors">About</Link>
            <Link href="/how-to-use" className="text-xs text-slate-400 hover:text-radar transition-colors">How to Use</Link>
            <Link href="/contact" className="text-xs text-slate-400 hover:text-radar transition-colors">Contact Sales</Link>
            <span className="text-xs text-slate-400">Public risk: derived-v2 · Riverine Watch v1 shadow: NASA IMERG + GloFAS · Lokoja + Makurdi</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
