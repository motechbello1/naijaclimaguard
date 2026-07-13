"use client";

import Link from "next/link";
import { Shield, UserPlus, LogIn, MapPin, Bell, BarChart3, FileText, Code, ArrowRight, CheckCircle } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

const steps = [
  {
    icon: UserPlus,
    title: "1. Create Your Account",
    description: "Sign up for free in 30 seconds. No credit card required. You get 3 monitored locations, daily risk updates, and email alerts on the free plan.",
    action: { label: "Create Free Account", href: "/register" },
  },
  {
    icon: MapPin,
    title: "2. Add Your Locations",
    description: "Add the locations you want to monitor — your warehouse, farm, office, or any area of interest. Enter the name, state, and coordinates. The system begins tracking flood risk immediately.",
    action: null,
  },
  {
    icon: Bell,
    title: "3. Configure Alerts",
    description: "Set risk thresholds for each location. Choose how you want to be notified — email, SMS, or webhook. When the risk score crosses your threshold, you get alerted automatically.",
    action: null,
  },
  {
    icon: BarChart3,
    title: "4. Monitor Your Dashboard",
    description: "Your dashboard shows real-time risk scores for all your locations, 72-hour forecasts, contributing factors (rainfall, river discharge, soil saturation), and historical trends.",
    action: null,
  },
  {
    icon: FileText,
    title: "5. Download Risk Reports",
    description: "Generate downloadable risk reports for any location. These reports include risk scores, forecasts, methodology, and compliance information — ready for insurance assessments, loan applications, or regulatory filings.",
    action: null,
  },
  {
    icon: Code,
    title: "6. Integrate via API (Professional+)",
    description: "Professional and Enterprise users get full API access. Integrate flood risk intelligence directly into your own applications, dashboards, or automated workflows with a single REST call.",
    action: { label: "View API Docs", href: "/api-docs" },
  },
];

const plans = [
  { name: "Free", locations: "3", updates: "Daily", forecast: "7 days", api: "No", price: "₦0" },
  { name: "Professional", locations: "50", updates: "Hourly", forecast: "72 hours", api: "Yes (10K/mo)", price: "₦15,000/mo" },
  { name: "Enterprise", locations: "Unlimited", updates: "Real-time", forecast: "Custom", api: "Unlimited", price: "Contact us" },
];

export default function HowToUsePage() {
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
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="font-display text-4xl md:text-5xl font-bold">How to Use NaijaClimaGuard</h1>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              From sign-up to real-time flood intelligence in under 5 minutes. Here is everything you need to know.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-8 mb-20">
            {steps.map((step, i) => (
              <div key={i} className="glass-card rounded-2xl p-8">
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-radar/10 border border-radar/20">
                    <step.icon className="h-7 w-7 text-radar" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-xl font-bold">{step.title}</h2>
                    <p className="mt-2 text-slate-500 dark:text-slate-400 leading-relaxed">{step.description}</p>
                    {step.action && (
                      <Link href={step.action.href} className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-radar hover:underline">
                        {step.action.label} <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Plan comparison */}
          <div className="mb-20">
            <h2 className="font-display text-2xl font-bold text-center mb-8">Plan Comparison</h2>
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-midnight-border">
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-400">Feature</th>
                    {plans.map((p) => (
                      <th key={p.name} className="text-center p-4 text-xs uppercase tracking-wider text-slate-400">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Monitored Locations", key: "locations" },
                    { label: "Update Frequency", key: "updates" },
                    { label: "Forecast Window", key: "forecast" },
                    { label: "API Access", key: "api" },
                    { label: "Price", key: "price" },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-slate-100 dark:border-midnight-border/30 last:border-0">
                      <td className="p-4 font-medium">{row.label}</td>
                      {plans.map((p) => (
                        <td key={p.name} className="p-4 text-center text-slate-500 dark:text-slate-400">
                          {(p as any)[row.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-20">
            <h2 className="font-display text-2xl font-bold text-center mb-8">Common Questions</h2>
            <div className="space-y-4">
              {[
                { q: "How accurate is the flood prediction?", a: "Our model achieves a ROC-AUC score of 0.9928, validated against the 2022 Nigerian megaflood. It detected the Lokoja flood 48 hours before government agencies issued their advisory." },
                { q: "What data sources do you use?", a: "We fuse NASA GPM IMERG satellite rainfall data, ECMWF GloFAS river discharge measurements, and ERA5 soil moisture indices. Data is updated every 6 hours." },
                { q: "Is my data safe?", a: "We comply with the Nigeria Data Protection Act (NDPA) 2023. Zero personally identifiable information is stored in our prediction systems. All audit trails are hash-linked and tamper-proof." },
                { q: "Can I try it before paying?", a: "Yes. The Free plan gives you 3 monitored locations with daily updates and email alerts — no credit card required. Upgrade anytime." },
                { q: "How do I integrate the API?", a: "Professional and Enterprise users get API keys from their dashboard. A single REST call returns risk scores, forecasts, and contributing factors. We provide examples in Python, JavaScript, and cURL." },
              ].map((faq, i) => (
                <div key={i} className="glass-card rounded-xl p-6">
                  <h3 className="font-display text-base font-bold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-radar shrink-0" /> {faq.q}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 ml-6">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold mb-4">Ready to get started?</h2>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-radar px-8 py-4 text-base font-semibold text-white hover:bg-radar/90 shadow-xl shadow-radar/20 transition-all">
              Create Your Free Account <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
