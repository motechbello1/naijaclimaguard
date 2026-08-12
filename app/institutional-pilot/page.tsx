"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  FileCheck2,
  Landmark,
  Loader2,
  MessageSquareText,
  Network,
  RadioTower,
  Send,
  Shield,
  ShieldCheck,
} from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";
import RiverineWatchEvidence from "@/components/shared/RiverineWatchEvidence";

type FormState = "idle" | "sending" | "success" | "error";

const tracks = [
  {
    icon: Landmark,
    title: "Government & emergency agencies",
    text: "Run NaijaClimaGuard beside existing warning and response workflows. Review location risk, Riverine Watch shadow signals where supported, action records, reports and evidence without asking the agency to replace its statutory warning process.",
    examples: ["Shadow early-warning support", "Command and action workflow", "Evidence and after-action review"],
  },
  {
    icon: Building2,
    title: "Banks, insurers & reinsurers",
    text: "Test location-based flood-risk context against a selected portfolio or operational footprint before any wider integration. The pilot can evaluate API fit, reporting usefulness and decision thresholds without claiming underwriting automation.",
    examples: ["Portfolio location screening", "API and reporting evaluation", "Risk-context workflow testing"],
  },
  {
    icon: RadioTower,
    title: "Telcos & delivery partners",
    text: "Design and test the last-mile delivery layer around approved warning content. Delivery channels are only treated as live when they are actually integrated, enabled and verified; the pilot does not pretend an unconnected SMS, voice or USSD channel already exists.",
    examples: ["Delivery integration planning", "Message and language workflow", "Receipt and acknowledgement evidence"],
  },
];

const successCriteria = [
  "Source coverage and freshness are visible instead of silently substituted.",
  "Institution users can understand what the risk signal means and what action it supports.",
  "Riverine Watch false-warning burden and event detection are reviewed in the supported scope.",
  "Alert delivery and acknowledgement can be measured where a real delivery channel is integrated.",
  "Reports and evidence records are useful enough for incident review, audit or operational handover.",
  "The institution can identify what must change before any broader operational promotion.",
];

export default function InstitutionalPilotPage() {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");

    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      organization: form.get("organization"),
      organizationType: form.get("organizationType"),
      role: form.get("role"),
      locations: form.get("locations"),
      objective: form.get("objective"),
      integrationNeeds: form.get("integrationNeeds"),
      website: form.get("website"),
      consent: form.get("consent") === "on",
    };

    try {
      const response = await fetch("/api/institutional-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit pilot request.");
      setReference(data.reference || "RECEIVED");
      setState("success");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit pilot request.");
      setState("error");
    }
  }

  return (
    <main className="min-h-screen">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-xl dark:border-midnight-border dark:bg-midnight/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-radar/20 bg-radar/10">
              <Shield className="h-4 w-4 text-radar" />
            </div>
            <span className="font-display text-lg font-bold">NaijaClima<span className="text-radar">Guard</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/model-evidence" className="hidden text-sm text-slate-500 transition-colors hover:text-radar dark:text-slate-400 sm:inline">Model Evidence</Link>
            <Link href="/contact" className="text-sm text-slate-500 transition-colors hover:text-radar dark:text-slate-400">Contact</Link>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        <section className="border-b border-slate-200 bg-slate-50/50 py-16 dark:border-midnight-border dark:bg-midnight-light/20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-radar/20 bg-radar/5 px-4 py-1.5 text-xs font-semibold text-radar">
                  <ShieldCheck className="h-3.5 w-3.5" /> Institutional pilot
                </div>
                <h1 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  Test the system beside your existing workflow before replacing anything.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
                  NaijaClimaGuard&apos;s institutional pilot is designed for controlled operational testing. The objective is to prove where the platform adds useful decision time, clearer action, better evidence or easier integration while preserving official-warning authority and the model&apos;s published scientific boundaries.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="#apply" className="inline-flex items-center gap-2 rounded-xl bg-radar px-5 py-3 text-sm font-semibold text-white">
                    Apply for a pilot <ArrowRight className="h-4 w-4" />
                  </a>
                  <Link href="/model-evidence" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold dark:border-midnight-border">
                    Review model evidence <FileCheck2 className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-radar/20 bg-radar/[0.04] p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-radar">What is already real</p>
                <div className="mt-5 space-y-4">
                  {[
                    ["Live public risk", "derived-v2 decision-support engine"],
                    ["Riverine pilot", "Riverine Watch v1 · Lokoja + Makurdi"],
                    ["Historical evidence", "4/5 eligible onset events detected · 80%"],
                    ["Riverine horizon", "14-day WATCH · frozen threshold 0.70"],
                    ["Evidence status", "Shadow candidate · not production validated"],
                  ].map(([label, value]) => (
                    <div key={label} className="border-b border-slate-200/70 pb-4 last:border-0 last:pb-0 dark:border-midnight-border">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="mt-1 text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-10 max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-widest text-radar">Pilot tracks</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Different institutions need different proof.</h2>
              <p className="mt-3 text-slate-500 dark:text-slate-400">The pilot is scoped around the decision that the institution actually needs to make, not around forcing every organization into the same dashboard demo.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {tracks.map((track) => (
                <article key={track.title} className="glass-card rounded-2xl p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-radar/20 bg-radar/10">
                    <track.icon className="h-5 w-5 text-radar" />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold">{track.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{track.text}</p>
                  <div className="mt-5 space-y-2">
                    {track.examples.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-radar" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50/70 py-16 dark:bg-midnight-light/20 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="glass-card rounded-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <Network className="h-5 w-5 text-radar" />
                  <h2 className="font-display text-2xl font-bold">Suggested pilot sequence</h2>
                </div>
                <div className="mt-6 space-y-5">
                  {[
                    ["01", "Scope", "Agree locations, users, existing warning process, channels, decision points and what success means before the pilot starts."],
                    ["02", "Shadow", "Run NaijaClimaGuard beside the existing process. Preserve model outputs, source freshness, alerts, actions and evidence without granting autonomous authority."],
                    ["03", "Measure", "Review signal usefulness, false-warning burden, event detection where outcomes exist, delivery evidence, workflow speed and user understanding."],
                    ["04", "Decide", "Produce a pilot close-out: promote, extend, integrate a specific component, change scope, or stop. No result is hidden to manufacture a success story."],
                  ].map(([step, title, text]) => (
                    <div key={step} className="flex gap-4">
                      <span className="font-mono text-xs font-bold text-radar">{step}</span>
                      <div>
                        <h3 className="font-semibold">{title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-radar" />
                  <h2 className="font-display text-2xl font-bold">What we measure</h2>
                </div>
                <div className="mt-6 space-y-3">
                  {successCriteria.map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-sm leading-relaxed">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-radar" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4">
            <RiverineWatchEvidence />
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50/60 py-16 dark:border-midnight-border dark:bg-midnight-light/20 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="glass-card rounded-2xl p-6">
                <Database className="h-5 w-5 text-radar" />
                <h3 className="mt-3 font-display text-lg font-bold">Data boundary</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Riverine Watch uses its frozen NASA IMERG + operational GloFAS contract for supported locations. Missing river inputs are not silently replaced with unrelated data.</p>
              </div>
              <div className="glass-card rounded-2xl p-6">
                <ShieldCheck className="h-5 w-5 text-radar" />
                <h3 className="mt-3 font-display text-lg font-bold">Authority boundary</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">The platform is decision support. It does not replace statutory emergency authority, and a low platform score never overrides an official warning or visible flooding.</p>
              </div>
              <div className="glass-card rounded-2xl p-6">
                <MessageSquareText className="h-5 w-5 text-radar" />
                <h3 className="mt-3 font-display text-lg font-bold">Commercial boundary</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Institutional pricing is scoped after the locations, users, delivery channels, integration work and support requirements are known. We do not advertise a fictional universal enterprise package.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="apply" className="scroll-mt-24 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4">
            <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-radar">Pilot application</p>
                <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Tell us what you need to prove.</h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">This is a scoping request, not an automatic contract. We use the information only to understand the organization, locations, decision problem and integration needs required for a pilot conversation.</p>
                <div className="mt-6 rounded-2xl border border-radar/20 bg-radar/[0.04] p-5 text-sm leading-relaxed">
                  <strong>Current model scope:</strong> the 80% Riverine Watch result belongs only to retrospective testing in Lokoja and Makurdi. A pilot elsewhere can still evaluate the current derived-v2 risk workflow, but we will not attach the 80% number to unsupported locations.
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 sm:p-8">
                {state === "success" ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-radar" />
                    <h3 className="mt-4 font-display text-2xl font-bold">Pilot request recorded</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your request is in the NaijaClimaGuard institutional lead register.</p>
                    <p className="mt-4 font-mono text-sm font-semibold text-radar">Reference: {reference}</p>
                    <button onClick={() => setState("idle")} className="mt-6 text-sm font-semibold text-radar hover:underline">Submit another request</button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Your name"><input name="name" required maxLength={120} className="input" placeholder="Full name" /></Field>
                      <Field label="Work email"><input name="email" type="email" required maxLength={180} className="input" placeholder="you@organization.org" /></Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Organization"><input name="organization" required maxLength={180} className="input" placeholder="Organization name" /></Field>
                      <Field label="Organization type">
                        <select name="organizationType" required className="input" defaultValue="">
                          <option value="" disabled>Select type</option>
                          <option value="government">Government / emergency agency</option>
                          <option value="bank-insurer">Bank / insurer / reinsurer</option>
                          <option value="telecom">Telecom / delivery partner</option>
                          <option value="agribusiness-infrastructure">Agribusiness / infrastructure</option>
                          <option value="ngo-research">NGO / research</option>
                          <option value="other">Other</option>
                        </select>
                      </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Your role"><input name="role" maxLength={140} className="input" placeholder="e.g. Director, Risk Lead, Operations" /></Field>
                      <Field label="Pilot locations"><input name="locations" maxLength={500} className="input" placeholder="e.g. Lokoja, Makurdi, selected branches" /></Field>
                    </div>
                    <Field label="What decision or problem should the pilot prove?">
                      <textarea name="objective" required minLength={20} maxLength={3000} rows={5} className="input resize-y" placeholder="Describe the flood-risk decision, operational problem or evidence gap you want to test." />
                    </Field>
                    <Field label="Integration or delivery needs">
                      <textarea name="integrationNeeds" maxLength={2000} rows={4} className="input resize-y" placeholder="Optional: API, dashboard, reports, email, SMS/voice planning, existing systems, user roles, etc." />
                    </Field>
                    <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
                    <label className="flex items-start gap-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      <input name="consent" type="checkbox" required className="mt-1" />
                      <span>I agree that NaijaClimaGuard may store this scoping information and contact me about this institutional pilot request.</span>
                    </label>
                    {state === "error" && <div className="rounded-xl border border-crimson/20 bg-crimson/5 p-3 text-sm text-crimson">{error}</div>}
                    <button disabled={state === "sending"} className="flex w-full items-center justify-center gap-2 rounded-xl bg-radar py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
                      {state === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving request…</> : <><Send className="h-4 w-4" /> Submit pilot request</>}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
