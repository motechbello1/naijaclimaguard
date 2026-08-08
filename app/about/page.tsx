"use client";

import Link from "next/link";
import { Shield, Target, Users, Satellite, Brain, Globe, Award, ArrowRight, CheckCircle } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function AboutPage() {
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="rounded-lg bg-radar px-4 py-2 text-sm font-semibold text-white hover:bg-radar/90 transition-all shadow-lg shadow-radar/20">Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        <div className="mx-auto max-w-4xl px-4 py-16">
          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-4 py-1.5 mb-6">
              <Globe className="h-3.5 w-3.5 text-radar" />
              <span className="text-xs font-medium text-radar">About NaijaClimaGuard</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">Nigeria-Focused Flood-Risk Intelligence</h1>
            <p className="mt-6 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              NaijaClimaGuard is a software decision-support platform for turning weather, satellite, and hydrological signals into location-specific flood-risk information for Nigerian users and institutions.
            </p>
          </div>

          {/* The Problem */}
          <div className="glass-card rounded-2xl p-8 mb-10">
            <h2 className="font-display text-2xl font-bold mb-4">The Problem</h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Nigeria experiences severe flooding across multiple river basins and cities. The 2022 floods displaced millions of people over the course of the disaster, caused hundreds of deaths, damaged infrastructure and agriculture, and demonstrated the cost of turning national-scale information into local action too slowly.
            </p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mt-4">
              Many flood drivers are observable or forecastable: rainfall accumulation, rainfall intensity, soil wetness, river discharge, upstream releases, and local water levels. The practical challenge is combining those signals into information that can be inspected, distributed, and acted on at the location level.
            </p>
          </div>

          {/* Our Solution */}
          <div className="glass-card rounded-2xl p-8 mb-10">
            <h2 className="font-display text-2xl font-bold mb-4">Our Solution</h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              The current public platform provides a live, disclosed risk score from Open-Meteo precipitation, hourly rainfall intensity, and evapotranspiration context. In parallel, Validation v2 is evaluating an XGBoost fusion model using first-class NASA GPM IMERG rainfall, Copernicus/ECMWF GloFAS river discharge, ERA5-Land surface-state variables, and independently documented Nigerian flood events.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 mt-8">
              {[
                { icon: Satellite, title: "Live Monitoring", desc: "Current public risk API: Open-Meteo rainfall, hourly intensity, and ET₀ context with disclosed model attribution" },
                { icon: Brain, title: "Validation v2", desc: "NASA GPM IMERG + Copernicus/ECMWF GloFAS + ERA5-Land fused for independent XGBoost evaluation" },
                { icon: Target, title: "Evidence Standard", desc: "Independent flood-event labels, chronological holdout, event-level detection, and archived forecast replay before lead-time claims" },
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

          {/* The Lokoja Case */}
          <div className="glass-card rounded-2xl p-8 mb-10 border-2 border-radar/20">
            <h2 className="font-display text-2xl font-bold mb-4 text-radar">Case Study: Lokoja 2022 — Under Revalidation</h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              An earlier version of this site claimed NaijaClimaGuard detected the Lokoja flood on October 5 and preceded a government advisory by 48 hours. That claim has been withdrawn because public records show flooding and official response activity were already underway before that timeline.
            </p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mt-4">
              Validation v2 is rebuilding Lokoja using documented flood onset, Nigerian hydrological observations, NASA rainfall, and archived operational GloFAS forecasts. NiHSA&apos;s 2023 Annual Flood Outlook reports the 2022 Lokoja maximum discharge at about 25,424 m³/s on October 6. A specific T−72, T−48, or T−24 warning claim will only be published if the archived replay supports it.
            </p>
          </div>

          {/* Who We Serve */}
          <div className="glass-card rounded-2xl p-8 mb-10">
            <h2 className="font-display text-2xl font-bold mb-6">Who We Serve</h2>
            <div className="space-y-4">
              {[
                { title: "Insurance & Reinsurance Companies", desc: "Use location-specific flood-risk indicators as one input to physical climate-risk assessment workflows." },
                { title: "Agribusiness & Farmers", desc: "Monitor rainfall and flood-risk conditions around fields, storage, and operating locations." },
                { title: "Government & Emergency Agencies", desc: "Augment existing early-warning workflows with auditable location risk signals, dashboards, and integration-ready APIs." },
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

          {/* Built By */}
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
                  NaijaClimaGuard was built by Bello Muhammad Mustapha, a machine-learning practitioner and AI/ML instructor with experience developing applied AI systems and training hundreds of learners and professionals. The project is being developed with an explicit focus on auditable evidence, Nigerian operating conditions, and institutional integration.
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="grid sm:grid-cols-4 gap-4 mb-16">
            {[
              { icon: Activity, value: "Live", label: "Public Risk API" },
              { icon: Satellite, value: "3", label: "Validation Data Families" },
              { icon: Target, value: "v2", label: "Independent Validation" },
              { icon: Globe, value: "Nigeria", label: "Deployment Focus" },
            ].map((m) => (
              <div key={m.label} className="glass-card rounded-xl p-5 text-center">
                <m.icon className="h-5 w-5 text-radar mx-auto mb-2" />
                <p className="text-2xl font-display font-bold">{m.value}</p>
                <p className="text-xs text-slate-400 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold mb-4">Monitor what matters.</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Start checking current flood-risk conditions for your locations.</p>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-radar px-8 py-4 text-base font-semibold text-white hover:bg-radar/90 shadow-xl shadow-radar/20 transition-all">
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
