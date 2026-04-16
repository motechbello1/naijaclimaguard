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
            <h1 className="font-display text-4xl md:text-5xl font-bold">Africa&apos;s First Physical Risk Intelligence API</h1>
            <p className="mt-6 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              NaijaClimaGuard uses artificial intelligence and satellite data to predict catastrophic flooding in Nigeria — giving communities, businesses, and governments the advance warning they need to protect lives and assets.
            </p>
          </div>

          {/* The Problem */}
          <div className="glass-card rounded-2xl p-8 mb-10">
            <h2 className="font-display text-2xl font-bold mb-4">The Problem</h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Nigeria faces devastating floods every year. In October 2022, the worst flooding in a decade displaced over 1.4 million people across Kogi, Anambra, Bayelsa, and Delta states. Hundreds died. Billions of naira in crops, infrastructure, and livelihoods were destroyed.
            </p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mt-4">
              The tragedy is that these floods are predictable. Satellite data shows rainfall patterns days in advance. River discharge measurements signal rising water levels. Soil moisture data indicates when the ground can no longer absorb water. But this data exists in silos — NASA, ECMWF, USGS — inaccessible to the people who need it most.
            </p>
          </div>

          {/* Our Solution */}
          <div className="glass-card rounded-2xl p-8 mb-10">
            <h2 className="font-display text-2xl font-bold mb-4">Our Solution</h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              NaijaClimaGuard fuses multiple satellite and hydrological data sources into a single AI model that generates flood risk scores for any location in Nigeria, up to 72 hours in advance. We deliver these predictions via an API, interactive dashboard, email alerts, and SMS — making life-saving intelligence accessible to anyone.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 mt-8">
              {[
                { icon: Satellite, title: "Satellite Data", desc: "NASA GPM IMERG rainfall, ECMWF GloFAS river discharge, ERA5 soil moisture" },
                { icon: Brain, title: "AI Prediction", desc: "XGBoost ensemble model trained on 20+ years of Nigerian flood data" },
                { icon: Target, title: "Validated Results", desc: "ROC-AUC 0.9928 — detected the 2022 Lokoja flood 48 hours early" },
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

          {/* The Lokoja Proof */}
          <div className="glass-card rounded-2xl p-8 mb-10 border-2 border-radar/20">
            <h2 className="font-display text-2xl font-bold mb-4 text-radar">The Proof: Lokoja 2022</h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Our model was validated against the October 2022 Nigerian megaflood — the country&apos;s worst flooding event in over a decade. NaijaClimaGuard flagged Kogi State at extreme risk on October 5th. The government&apos;s NEMA issued its advisory on October 7th — 48 hours later. The floods hit on October 9th.
            </p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mt-4">
              Those 48 hours are the difference between evacuation and catastrophe. Between saving assets and losing everything. That is what NaijaClimaGuard delivers.
            </p>
          </div>

          {/* Who We Serve */}
          <div className="glass-card rounded-2xl p-8 mb-10">
            <h2 className="font-display text-2xl font-bold mb-6">Who We Serve</h2>
            <div className="space-y-4">
              {[
                { title: "Insurance & Reinsurance Companies", desc: "Price climate risk into policies with location-specific flood probability scores." },
                { title: "Agribusiness & Farmers", desc: "Protect crop investments with advance flood warnings and planting intelligence." },
                { title: "Government & Emergency Agencies", desc: "Augment NEMA early warning systems with AI-powered 48-hour advance predictions." },
                { title: "Infrastructure Lenders & Banks", desc: "Assess physical climate risk for loan portfolios and project financing decisions." },
                { title: "International Development Organizations", desc: "Generate impact-ready reports for FCDO, USAID, World Bank, and donor compliance." },
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
                  NaijaClimaGuard was built by Bello Muhammad Mustapha, an ML Engineer at Nigeria&apos;s National Centre for Artificial Intelligence and Robotics (NCAIR). With expertise in Python, TensorFlow, PyTorch, and applied AI, Bello has trained over 500 professionals in machine learning and developed multiple AI-powered systems for healthcare, climate resilience, and telecommunications.
                </p>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="grid sm:grid-cols-4 gap-4 mb-16">
            {[
              { icon: Award, value: "0.9928", label: "ROC-AUC Score" },
              { icon: Target, value: "TRL-5", label: "Technology Readiness" },
              { icon: Users, value: "500+", label: "Professionals Trained" },
              { icon: Globe, value: "36+1", label: "States + FCT Covered" },
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
            <h2 className="font-display text-2xl font-bold mb-4">Protect what matters.</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Start monitoring flood risk for your locations today — free.</p>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-radar px-8 py-4 text-base font-semibold text-white hover:bg-radar/90 shadow-xl shadow-radar/20 transition-all">
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
