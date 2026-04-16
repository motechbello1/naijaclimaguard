"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Zap, Shield, Activity, Clock, Users, Award, Satellite, Brain, Bell, Check, Code, Copy, Sprout, Landmark, Building2 } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { LOKOJA_TIMELINE, PRICING, API_EXAMPLE } from "@/lib/data";

export default function LandingPage() {
  const [apiTab, setApiTab] = useState<"request" | "response">("request");
  const [copied, setCopied] = useState(false);

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-200 dark:border-midnight-border bg-white/80 dark:bg-midnight/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-radar/10 border border-radar/20">
              <Shield className="h-4 w-4 text-radar" />
            </div>
            <span className="font-display text-lg font-bold">NaijaClima<span className="text-radar">Guard</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#validation" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Validation</a>
            <a href="#api" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">API</a>
            <a href="#pricing" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</a>
            <Link href="/how-to-use" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">How to Use</Link>
            <Link href="/about" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">About</Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="rounded-lg bg-radar px-4 py-2 text-sm font-semibold text-white hover:bg-radar/90 transition-all shadow-lg shadow-radar/20">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-radar/5 dark:bg-radar/5 bg-emerald-100/50 blur-[120px]" />
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan/5 dark:bg-cyan/5 bg-sky-100/50 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-4 py-1.5 mb-8">
            <Zap className="h-3.5 w-3.5 text-radar" />
            <span className="text-xs font-medium text-radar">Validated against the 2022 Nigerian Megaflood</span>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
            <span>Predict floods</span><br />
            <span className="dark:text-gradient-green text-gradient-blue">before they happen.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed">
            Africa&apos;s first physical risk intelligence API. We fuse NASA satellite rainfall and GloFAS river discharge to deliver 48-hour advance flood warnings with 99.28% accuracy.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="group flex items-center gap-2 rounded-xl bg-radar px-7 py-3.5 text-base font-semibold text-white hover:bg-radar/90 transition-all shadow-xl shadow-radar/20">
              Start Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="#validation" className="rounded-xl border border-slate-200 dark:border-midnight-border px-7 py-3.5 text-base font-medium hover:border-radar/40 transition-all">
              See the Proof
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="border-y border-slate-200 dark:border-midnight-border bg-slate-50/50 dark:bg-midnight-light/50">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Activity, value: "0.9928", unit: "ROC-AUC", label: "Model Accuracy" },
              { icon: Clock, value: "48", unit: "Hours", label: "Advance Warning" },
              { icon: Users, value: "1.4M", unit: "People", label: "Validated Coverage" },
              { icon: Award, value: "TRL-5", unit: "Certified", label: "Technology Readiness" },
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

      {/* Lokoja Validation */}
      <section id="validation" className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">We saw the megaflood coming.</h2>
            <p className="mt-4 max-w-2xl mx-auto text-slate-500 dark:text-slate-400 text-lg">48 hours before government advisories.</p>
          </div>
          <div className="max-w-3xl mx-auto">
            {LOKOJA_TIMELINE.map((item, i) => (
              <div key={i} className="flex gap-6 pb-10 last:pb-0 relative">
                {i < LOKOJA_TIMELINE.length - 1 && <div className="absolute left-[19px] top-10 bottom-0 w-px border-l-2 border-dashed border-slate-200 dark:border-midnight-border" />}
                <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.type === "disaster" ? "bg-crimson/10 text-crimson" : item.type === "government" ? "bg-amber/10 text-amber" : "bg-radar/10 text-radar"}`}>
                  <span className="text-xs font-bold">{item.score}</span>
                </div>
                <div className="glass-card rounded-xl p-5 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono font-medium text-slate-400">{item.date}</span>
                    {item.type === "prediction" && <span className="text-[10px] font-bold uppercase tracking-wider bg-radar/10 text-radar px-2 py-0.5 rounded-full">Our Prediction</span>}
                    {item.type === "government" && <span className="text-[10px] font-bold uppercase tracking-wider bg-amber/10 text-amber px-2 py-0.5 rounded-full">48hrs Later</span>}
                  </div>
                  <h3 className="text-base font-semibold">{item.event}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-16 max-w-3xl mx-auto glass-card rounded-xl p-8 text-center">
            <p className="text-2xl font-display font-bold">48-hour head start. 1.4 million lives at stake.</p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">If our API had been integrated into emergency response, evacuation could have begun two full days earlier.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-slate-50 dark:bg-midnight-light/30">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">How it works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Satellite, step: "01", title: "Ingest", heading: "Satellite & Hydrological Data", desc: "NASA GPM IMERG rainfall + GloFAS river discharge + ERA5 soil moisture — fused every 6 hours." },
              { icon: Brain, step: "02", title: "Predict", heading: "ML Fusion Model", desc: "Ensemble gradient-boosted model generates 72-hour flood risk scores. ROC-AUC 0.9928." },
              { icon: Bell, step: "03", title: "Alert", heading: "Multi-Channel Delivery", desc: "REST API, dashboard, SMS, email, webhook, and PDF reports. Integrate into your existing systems." },
            ].map((s) => (
              <div key={s.step} className="glass-card rounded-2xl p-8 hover:border-radar/30 transition-all">
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

      {/* Use Cases */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">Built for decision-makers</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Shield, title: "Insurance & Reinsurance", desc: "Price climate risk into policies with location-specific flood scores." },
              { icon: Sprout, title: "Agribusiness & Farming", desc: "Protect crop investments with advance flood warnings and planting intelligence." },
              { icon: Landmark, title: "Government & NEMA", desc: "Augment early warning systems with AI-powered 48-hour advance predictions." },
              { icon: Building2, title: "Infrastructure & Lending", desc: "Assess physical climate risk for investment portfolios and loan decisions." },
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

      {/* API Preview */}
      <section id="api" className="py-24 bg-slate-50 dark:bg-midnight-light/30">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-4 py-1.5 mb-6">
                <Code className="h-3.5 w-3.5 text-radar" />
                <span className="text-xs font-medium text-radar">Developer-First</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">One API call.<br /><span className="dark:text-gradient-green text-gradient-blue">Complete risk intelligence.</span></h2>
              <p className="mt-4 text-slate-500 dark:text-slate-400 text-lg">Location-specific flood risk scores, 72-hour forecasts, and model confidence in a single REST call.</p>
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

      {/* Pricing */}
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
                <Link
                  href="/register"
                  className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${tier.highlighted ? "bg-radar text-white hover:bg-radar/90 shadow-lg shadow-radar/20" : "border border-slate-200 dark:border-midnight-border hover:border-radar/40"}`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-midnight-border py-12">
        <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} NaijaClimaGuard · Built by Bello Muhammad Mustapha</p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-xs text-slate-400 hover:text-radar transition-colors">About</Link>
            <Link href="/how-to-use" className="text-xs text-slate-400 hover:text-radar transition-colors">How to Use</Link>
            <span className="text-xs text-slate-400">Data: NASA GPM IMERG · ECMWF GloFAS · USGS</span>
          </div>
        </div>
      </footer>
    </main>
  );
}