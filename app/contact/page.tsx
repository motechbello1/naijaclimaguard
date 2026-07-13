"use client";

import Link from "next/link";
import { useState } from "react";
import { Shield, Send, Building2, Mail, Phone, Loader2, CheckCircle } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Enterprise Plan Inquiry — ${company || name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nCompany: ${company}\n\n${message}\n\n---\nSent from NaijaClimaGuard Contact Form`
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
            <Link href="/login" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-4 py-1.5 mb-6">
              <Building2 className="h-3.5 w-3.5 text-radar" />
              <span className="text-xs font-medium text-radar">Enterprise Plan</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">Contact Sales</h1>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Need unlimited locations, real-time streaming, custom models, dedicated SLA, or on-premise deployment? Let&apos;s build a plan that fits your organization.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Contact form */}
            <div className="glass-card rounded-2xl p-8">
              {sent ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-radar mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold mb-2">Email client opened!</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Complete sending the email in your mail app. We typically respond within 24 hours.
                  </p>
                  <button onClick={() => setSent(false)} className="mt-4 text-sm text-radar hover:underline">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="font-display text-lg font-bold mb-2">Tell us about your needs</h2>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Your Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none transition-colors" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Work Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none transition-colors" placeholder="you@company.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Company / Organization</label>
                    <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none transition-colors" placeholder="Organization name" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">What do you need?</label>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required className="w-full rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight px-4 py-3 text-sm focus:border-radar focus:outline-none transition-colors resize-none" placeholder="Tell us about your use case, number of locations, integration needs, etc." />
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-radar py-3 text-sm font-semibold text-white hover:bg-radar/90 shadow-lg shadow-radar/20 transition-all flex items-center justify-center gap-2">
                    <Send className="h-4 w-4" /> Send Inquiry
                  </button>
                </form>
              )}
            </div>

            {/* Enterprise features */}
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-display text-base font-bold mb-4">Enterprise includes everything in Professional, plus:</h3>
                <div className="space-y-3">
                  {[
                    "Unlimited monitored locations",
                    "Real-time streaming risk updates",
                    "Custom ML models for your specific geography",
                    "Unlimited API access with no rate limits",
                    "Dedicated SLA with guaranteed uptime",
                    "Custom integrations with your existing systems",
                    "Audit-ready compliance reports",
                    "On-premise deployment option",
                    "Dedicated account manager",
                    "Priority support with 4-hour response time",
                  ].map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-radar shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-display text-base font-bold mb-3">Other ways to reach us</h3>
                <div className="space-y-3">
                  <a href="mailto:baboruwa@gmail.com" className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 hover:text-radar transition-colors">
                    <Mail className="h-4 w-4" /> baboruwa@gmail.com
                  </a>
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <Phone className="h-4 w-4" /> Available on request
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