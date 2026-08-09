"use client";

import Link from "next/link";
import { Shield, UserPlus, MapPin, Bell, BarChart3, FileText, Code, ArrowRight, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "1. Create your account",
    description: "Create an account and choose the experience that fits you, such as household, farmer, business or agency. The interface can be simplified or made more technical without changing the underlying risk evidence.",
    action: { label: "Create Free Account", href: "/register" },
  },
  {
    icon: MapPin,
    title: "2. Add the places you care about",
    description: "Save a home, farm, warehouse, office or other location. NaijaClimaGuard uses the coordinates to retrieve the current connected risk inputs and show location-specific decision support.",
    action: null,
  },
  {
    icon: Bell,
    title: "3. Set your alert preferences",
    description: "Choose a risk threshold and your preferred alert language. Email alert rules are part of the current product. Other delivery channels should only be treated as available when the account shows that the channel is enabled and verified.",
    action: null,
  },
  {
    icon: BarChart3,
    title: "4. Read the risk in the level you understand",
    description: "Use Simple, Standard or Technical explanations. The dashboard can show the current disclosed risk score, contributing weather context, role-specific actions and any connected official advisory without hiding one inside the other.",
    action: null,
  },
  {
    icon: FileText,
    title: "5. Keep evidence and reports",
    description: "Use the evidence and reporting tools to review warnings, actions, community reports and operational records. Downloadable reports support review and decision workflows, but they do not replace an insurer, regulator or emergency authority's own assessment.",
    action: null,
  },
  {
    icon: Code,
    title: "6. Integrate the risk API",
    description: "The REST risk endpoint returns location-specific risk context and model metadata. Commercial access, limits and integration terms should follow the entitlement shown for the account rather than an assumed plan allowance.",
    action: { label: "View API Docs", href: "/api-docs" },
  },
];

const plans = [
  { name: "Explorer", price: "Free", summary: "Saved locations, dashboard access, current risk monitoring and email alert rules." },
  { name: "Professional", price: "₦15,000/month", summary: "Expanded monitoring, dashboard risk views, REST API access, email alert rules, downloadable situation reports and historical views." },
  { name: "Enterprise", price: "Custom", summary: "Custom location requirements, integration planning, institutional reporting, deployment support, technical onboarding and workflow integrations." },
];

const faqs = [
  {
    q: "How accurate is the flood prediction?",
    a: "The public live score is currently the disclosed derived-v2 decision-support engine, not Model v5 and not a published percentage-accuracy claim. Model v5 is being evaluated separately with archived operational data and walk-forward scoring. Until its final evidence and freeze decision exist, it must not be presented as production validated.",
  },
  {
    q: "What data sources do you use?",
    a: "The current public risk path uses connected live weather inputs and keeps official advisories as a separate safety overlay when they are available in the intelligence store. NASA IMERG and Copernicus GloFAS are used in the independent validation work. GloFAS is modelled discharge, not a local physical river-gauge measurement.",
  },
  {
    q: "What should I trust during an emergency?",
    a: "Never use a low NaijaClimaGuard score to ignore an official warning or visible local flooding. Official emergency instructions and conditions you can actually see around you take priority over chatbot or model advice.",
  },
  {
    q: "Can the platform speak or use another language?",
    a: "Yes. The first production language set is English, Nigerian Pidgin, Hausa, Yoruba and Igbo. Platform language and preferred alert language are separate settings. Read-aloud is also available where the device browser provides a compatible speech voice.",
  },
  {
    q: "How do I use the assistant?",
    a: "Ask about floods, preparedness, alerts, reports, platform features, historical context or current risk. A live risk check requires a location. General flood education is kept separate from live platform data so an educational answer is not presented as an official warning.",
  },
];

export default function HowToUsePage() {
  return (
    <main className="min-h-screen">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-midnight-border dark:bg-midnight/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:h-16 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-radar/20 bg-radar/10">
              <Shield className="h-4 w-4 text-radar" />
            </div>
            <span className="truncate font-display text-sm font-bold sm:text-lg">NaijaClima<span className="text-radar">Guard</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:inline">Sign In</Link>
            <Link href="/register" className="rounded-lg bg-radar px-3 py-2 text-xs font-semibold text-white transition-all hover:brightness-110 sm:px-4 sm:text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="pt-14 sm:pt-16">
        <div className="mx-auto max-w-4xl px-3 py-10 sm:px-4 sm:py-16">
          <div className="mb-10 text-center sm:mb-16">
            <h1 className="font-display text-3xl font-bold sm:text-4xl md:text-5xl">How to Use NaijaClimaGuard</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
              Start with the simple view. Add technical detail only when you need it.
            </p>
          </div>

          <div className="mb-14 space-y-4 sm:mb-20 sm:space-y-6">
            {steps.map((step) => (
              <div key={step.title} className="glass-card rounded-2xl p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-radar/20 bg-radar/10 sm:h-14 sm:w-14">
                    <step.icon className="h-5 w-5 text-radar sm:h-7 sm:w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-bold sm:text-xl">{step.title}</h2>
                    <p className="mt-2 leading-relaxed text-slate-500 dark:text-slate-400">{step.description}</p>
                    {step.action && (
                      <Link href={step.action.href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-radar hover:underline">
                        {step.action.label} <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-14 sm:mb-20">
            <h2 className="mb-6 text-center font-display text-2xl font-bold sm:mb-8">Plan overview</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.name} className="glass-card rounded-2xl p-5">
                  <div className="flex items-baseline justify-between gap-3 md:block">
                    <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                    <p className="text-sm font-semibold text-radar md:mt-2">{plan.price}</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{plan.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-14 sm:mb-20">
            <h2 className="mb-6 text-center font-display text-2xl font-bold sm:mb-8">Common questions</h2>
            <div className="space-y-3 sm:space-y-4">
              {faqs.map((faq) => (
                <div key={faq.q} className="glass-card rounded-xl p-4 sm:p-6">
                  <h3 className="flex items-start gap-2 font-display text-base font-bold">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-radar" /> {faq.q}
                  </h3>
                  <p className="ml-6 mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <h2 className="mb-4 font-display text-2xl font-bold">Ready to get started?</h2>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-radar px-6 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 sm:px-8 sm:py-4 sm:text-base">
              Create Your Free Account <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
