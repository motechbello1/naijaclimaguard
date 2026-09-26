"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Mail } from "lucide-react";
import FpShell from "@/components/floodpass/FpShell";

type Status = "idle" | "sending" | "success" | "error";

function Body() {
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setStatus("sending"); setFeedback("");
    const payload = {
      name: fields.get("name"), email: fields.get("email"), organization: fields.get("organization"),
      organizationType: fields.get("organizationType"), locations: fields.get("locations"),
      objective: fields.get("objective"), website: fields.get("website"),
      consent: fields.get("consent") === "on", source: "floodpass-partner",
      productInterest: "FloodPass evidence pilot",
    };
    try {
      const response = await fetch("/api/institutional-leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "We could not save the request. Please try again.");
      setStatus("success"); setFeedback(`Request received. Reference ${result.reference ?? "RECEIVED"}. We will review the use case and contact you by email.`);
      form.reset();
    } catch (error) {
      setStatus("error"); setFeedback(error instanceof Error ? error.message : "We could not save the request. Please try again.");
    }
  }

  return <div className="ncg-inquiry">
    <Link className="ncg-inquiry-back" href="/partners"><ArrowLeft size={16} /> For organisations</Link>
    <div className="ncg-inquiry-grid">
      <section className="ncg-inquiry-intro"><span className="ncg-kicker">START A CONVERSATION / NO SALES THEATRE</span><h1>What decision can we help you <em>make better?</em></h1><p>Tell us the place, the workflow and what evidence would be useful. We will scope a measured pilot around one real decision before proposing wider use.</p><div><span><Check size={17} /> Defined geography and users</span><span><Check size={17} /> Source and uncertainty visible</span><span><Check size={17} /> Clear success and stop criteria</span></div><p className="ncg-inquiry-alt">Prefer email? <a href="mailto:baboruwa@gmail.com">baboruwa@gmail.com <ArrowUpRight size={14} /></a></p></section>
      <section className="ncg-inquiry-form"><div className="ncg-inquiry-form-head"><Mail size={22} /><span>THE PILOT REQUEST</span></div>{status === "success" ? <div className="ncg-inquiry-success" role="status"><Check size={27} /><h2>We have your request.</h2><p>{feedback}</p><Link href="/partners">Review the pilot approach <ArrowUpRight size={16} /></Link></div> : <form onSubmit={submit}>
        <div className="ncg-form-pair"><label>Your name<input name="name" required minLength={2} autoComplete="name" placeholder="Full name" /></label><label>Work email<input type="email" name="email" required autoComplete="email" placeholder="you@organisation.org" /></label></div>
        <div className="ncg-form-pair"><label>Organisation<input name="organization" required minLength={2} autoComplete="organization" placeholder="Organisation name" /></label><label>Type of organisation<select name="organizationType" required defaultValue=""><option value="" disabled>Choose one</option><option value="government">Government or response</option><option value="bank-insurer">Bank or insurer</option><option value="telecom">Telecom or delivery</option><option value="agribusiness-infrastructure">Agribusiness or infrastructure</option><option value="ngo-research">NGO or research</option><option value="other">Other</option></select></label></div>
        <label>Where would the pilot run? <span>(optional)</span><input name="locations" placeholder="City, state or region" /></label>
        <label>What decision or workflow needs better evidence?<textarea name="objective" required minLength={20} rows={5} placeholder="Describe the current process and what you need to learn in a pilot." /></label>
        <div className="ncg-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <label className="ncg-consent"><input type="checkbox" name="consent" required /><span>I agree to be contacted about this request. We will use these details to respond and scope the pilot.</span></label>
        {status === "error" ? <p className="ncg-form-error" role="alert">{feedback}</p> : null}
        <button type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending request…" : "Send pilot request"}<ArrowUpRight size={17} /></button><small>No fee or contract is created by this request.</small>
      </form>}</section>
    </div>
  </div>;
}

export default function PilotInquiryScreen() { return <FpShell active="partners"><Body /></FpShell>; }
