"use client";

import Link from "next/link";
import { Activity, Shield, Target, Users, Satellite, Brain, Globe, ArrowRight, CheckCircle } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";
import RiverineWatchEvidence from "@/components/shared/RiverineWatchEvidence";

export default function AboutPage() {
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="rounded-lg bg-radar px-4 py-2 text-sm font-semibold text-white hover:bg-radar/90 transition-all shadow-lg shadow-radar/20">Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-4 py-1.5 mb-6">
              <Globe className="h-3.5 w-3.5 text-radar" />
              <span className="text-xs font-medium text-radar">About NaijaClimaGuard</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">Nigeria-Focused Flood-Risk Intelligence</h1>
            <p className="mt-6 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              NaijaClimaGuard is a software decision-support platform for turning weather, satellite, hydrological and official-warning signals into location-specific flood-risk information and action workflows.
            </p>
          </div>

          <RiverineWatchEvidence className="mb-10" />

          <div className="glass-card rounded-2xl p-8 mb-10">
            <h2 className="font-display text-2xl font-bold mb-4">The Problem</h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Nigeria experiences severe flooding across multiple river basins and cities. The practical challenge is not only seeing weather or river conditions, but turning available information into clear local action before and during a flood.
            </p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mt-4">
              Important flood drivers include rainfall accumulation, rainfall intensity, soil wetness, river discharge, upstream releases, local water levels and official emergency information. NaijaClimaGuard is designed to keep those evidence types visible and auditable instead of hiding them behind one unexplained score.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-8 mb-10">
            <h2 className="font-display text-2xl font-bold mb-4">Our Model and Product Layers</h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              The current public platform continues to use the disclosed <code className="font-mono">derived-v2</code> risk engine for general live location monitoring. Riverine Watch v1 is a separate frozen shadow model for Lokoja and Makurdi. Its job is to identify whether rainfall history and operational river-discharge forecasts indicate an elevated riverine flood-onset WATCH condition within the next 14 days.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 mt-8">
              {[
                { icon: Activity, title: "Public live risk", desc: "derived-v2 remains the general live decision-support score and is not rewritten by Riverine Watch." },
                { icon: Brain, title: "Riverine Watch v1", desc: "NASA IMERG Early rainfall + GloFAS +24/+48/+72h discharge; NORMAL, MONITOR or WATCH for Lokoja and Makurdi." },
                { icon: Target, title: "Evidence boundary", desc: "80% means 4/5 eligible historical onset events detected retrospectively. It is not 80% accuracy or national validation." },
              ].map((item) => (
                <div key={item.title} className="text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-radar/10 border border-radar/20 mx-auto mb-3">
                    <item.icon className="h-6 w-6 text-radar" />
                  </div>
                  <h3 className="font-display text-sm font-bold">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-8 mb-10 border-2 border-radar/20">
            <h2 className="font-display text-2xl font-bold mb-4 text-radar">What Riverine Watch v1 does</h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              For each supported location, the model uses the 30 complete NASA GPM IMERG Early rainfall days before the model issue date and the matching Copernicus CEMS GloFAS operational control-forecast discharge at +24, +48 and +72 hours. Those inputs are transformed into rainfall-load, wet-day and river-trajectory features and scored by the frozen model.
            </p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mt-4">
              The output is NORMAL, MONITOR or WATCH. The frozen WATCH threshold is 0.70. A WATCH means the model sees elevated conditions consistent with flood onset within the 14-day horizon. It is a decision-support signal, not an evacuation order, and official warnings or visible flooding always take priority.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-8 mb-10">
            <h2 className="font-display text-2xl font-bold mb-6">Who We Serve</h2>
            <div className="space-y-4">
              {[
                { title: "Insurance & Reinsurance Companies", desc: "Use location-specific flood-risk indicators as one input to physical climate-risk assessment workflows." },
                { title: "Agribusiness & Farmers", desc: "Monitor rainfall and flood-risk conditions around fields, storage, and operating locations." },
                { title: "Government & Emergency Agencies", desc: "Augment existing early-warning workflows with auditable location risk signals, dashboards, action tools and integration-ready APIs." },
                { title: "Infrastructure Lenders & Banks", desc: "Support physical climate-risk screening for assets, projects, and lending decisions." },
                { title: "International Development Organizations", desc: "Use transparent risk data and reproducible situation reporting in resilience and preparedness programmes." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-radar shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold">{item.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-8 mb-10">
            <h2 className="font-display text-2xl font-bold mb-4">Built By</h2>
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-radar/10 border border-radar/20">
                <Users className="h-8 w-8 text-radar" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">Bello Muhammad Mustapha</h3>
                <p className="text-sm text-radar font-medium">ML Engineer & AI/ML Instructor</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  NaijaClimaGuard is being developed with an explicit focus on auditable evidence, Nigerian operating conditions, last-mile decision support and institutional integration.
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-4 mb-16">
            {[
              { icon: Target, value: "80%", label: "Historical Event Detection" },
              { icon: Satellite, value: "14d", label: "Riverine Watch Horizon" },
              { icon: Brain, value: "2", label: "Supported Pilot Locations" },
              { icon: Activity, value: "Live", label: "derived-v2 Public Risk" },
            ].map((m) => (
              <div key={m.label} className="glass-card rounded-xl p-5 text-center">
                <m.icon className="h-5 w-5 text-radar mx-auto mb-2" />
                <p className="text-2xl font-display font-bold">{m.value}</p>
                <p className="text-xs text-slate-400 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <h2 className="font-display text-2xl font-bold mb-4">Monitor what matters.</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Start checking current flood-risk conditions for your locations and follow Riverine Watch evidence where supported.</p>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-radar px-8 py-4 text-base font-semibold text-white hover:bg-radar/90 shadow-xl shadow-radar/20 transition-all">
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
