"use client";

import Link from "next/link";
import { useState } from "react";
import { Shield, Send, Building2, Mail, Phone, CheckCircle, ArrowRight, FileCheck2 } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`NaijaClimaGuard inquiry — ${company || name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nOrganization: ${company}\n\n${message}\n\n---\nSent from NaijaClimaGuard Contact Form`
    );
    window.location.href = `mailto:baboruwa@gmail.com?subject=${subject}&body=${body}`;
    setSent(true);
  };

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
            <Link href="/model-evidence" className="hidden text-sm text-slate-500 dark:text-slate-400 hover:text-radar transition-colors sm:inline">Model Evidence</Link>
            <Link href="/login" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-4 py-1.5 mb-6">
              <Building2 className="h-3.5 w-3.5 text-radar" />
              <span className="text-xs font-medium text-radar">Institutional & enterprise</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">Work with NaijaClimaGuard</h1>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-3xl mx-auto">
              For agencies, banks, insurers, telcos and other institutions, the recommended starting point is a controlled pilot with agreed locations, workflows, evidence and success criteria.
            </p>
          </div>

          <div className="mb-10 rounded-2xl border border-radar/25 bg-radar/[0.04] p-6 sm:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-radar">Recommended path</p>
                <h2 className="mt-2 font-display text-2xl font-bold">Start an institutional pilot</h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Define what your organization needs to prove, run the platform beside the existing process, measure usefulness and false-warning burden, and decide what should be integrated or promoted next. Riverine Watch v1 remains scoped to Lokoja and Makurdi; its 80% historical event-detection result is not attached to unsupported locations.
                </p>
              </div>
              <Link href="/institutional-pilot" className="inline-flex items-center justify-center gap-2 rounded-xl bg-radar px-5 py-3 text-sm font-semibold text-white">
                View pilot <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            <div className="glass-card rounded-2xl p-8">
              {sent ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-radar mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold mb-2">Email client opened</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Complete sending the message in your email application. For a structured pilot request that is saved directly in the platform, use the institutional pilot form.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <Link href="/institutional-pilot#apply" className="text-sm font-semibold text-radar hover:underline">Open pilot form</Link>
                    <button onClick={() => setSent(false)} className="text-sm text-slate-500 hover:text-radar">Send another email</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="font-display text-lg font-bold mb-2">General inquiry</h2>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Your Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Work Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" placeholder="you@organization.org" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Company / Organization</label>
                    <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="input" placeholder="Organization name" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Message</label>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required className="input resize-y" placeholder="Tell us about your use case or question." />
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-radar py-3 text-sm font-semibold text-white hover:bg-radar/90 shadow-lg shadow-radar/20 transition-all flex items-center justify-center gap-2">
                    <Send className="h-4 w-4" /> Open Email
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-display text-base font-bold mb-4">Institutional work can include</h3>
                <div className="space-y-3">
                  {[
                    "Pilot scoping around selected locations and users",
                    "Current risk API and dashboard workflow evaluation",
                    "Riverine Watch v1 shadow evaluation where scientifically supported",
                    "Institutional reports and evidence review",
                    "API and data integration planning",
                    "Last-mile delivery integration planning with verified channels",
                    "Technical onboarding and operational handover planning",
                    "Pilot close-out with measured gaps and promotion recommendations",
                  ].map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-radar shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-radar" />
                  <h3 className="font-display text-base font-bold">Evidence before sales claims</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Riverine Watch v1 detected 4 of 5 eligible historical flood-onset events in retrospective testing for Lokoja and Makurdi. That is 80% historical event detection, not 80% accuracy and not national validation.
                </p>
                <Link href="/model-evidence" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-radar hover:underline">Open the evidence pack <ArrowRight className="h-4 w-4" /></Link>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-display text-base font-bold mb-3">Other ways to reach us</h3>
                <div className="space-y-3">
                  <a href="mailto:baboruwa@gmail.com" className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 hover:text-radar transition-colors">
                    <Mail className="h-4 w-4" /> baboruwa@gmail.com
                  </a>
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <Phone className="h-4 w-4" /> Phone contact available during pilot scoping
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}