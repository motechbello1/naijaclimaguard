"use client";

import Link from "next/link";
import { useState } from "react";
import FpShell, { HearButton, useFp } from "@/components/floodpass/FpShell";
import { PLANS } from "@/lib/floodpass/billing/plans";

function PlansBody() {
  const [joined, setJoined] = useState<string | null>(null);
  const [contact, setContact] = useState("");
  const text = "Warnings and proof are free forever. Paid plans are optional extras. Paying users never get warnings earlier than free users.";

  async function join(plan: string) {
    const value = contact.trim();
    const body = value.includes("@") ? { plan, email: value } : { plan, phone: value };
    const response = await fetch("/api/floodpass/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    setJoined(response.ok ? "You are on the list. We will tell you when it is ready." : json.error ?? "Could not save. Try again.");
  }

  return (
    <div className="fp-inner-page">
      <div className="fp-page-intro">
        <p className="fp-overline">SIMPLE, FAIR PRICING</p>
        <h1 className="fp-h1">The essentials are free.</h1>
        <p>{text}</p>
        <HearButton text={text} />
      </div>
      <div className="fp-plan-grid">
      <section className="fp-card fp-stack">
        <p className="fp-overline" style={{ color: "#abdce7" }}>FOR EVERYONE</p>
        <h2 className="fp-h2">Free, forever</h2>
        <p className="fp-plan-price" style={{ margin: 0 }}>₦0</p>
        <p style={{ margin: 0 }}>Warnings for your place, flood reports, FloodPass records, and Drain Heroes points. Use this website or another channel where it is available.</p>
      </section>
      {PLANS.filter((plan) => plan.code !== "family_plus_weekly").map((plan) => (
        <section key={plan.code} className="fp-card fp-stack">
          <h2 className="fp-h2">{plan.name}</h2>
          <p className="fp-plan-price" style={{ margin: 0 }}>{plan.priceLabel}{plan.code === "family_plus_monthly" ? " (or ₦150 a week)" : ""}</p>
          <p className="fp-muted" style={{ margin: 0 }}>For: {plan.who}</p>
          <ul style={{ margin: 0, paddingLeft: 22 }}>{plan.gets.map((g) => <li key={g}>{g}</li>)}</ul>
          {plan.status === "live" ? (
            plan.family === "ADDRESS"
              ? <Link className="fp-btn fp-btn-primary" href="/floodpass/address-check">Check an address</Link>
              : <div className="fp-row">
                  <Link className="fp-btn fp-btn-primary" style={{ flex: 1 }} href={`/floodpass/plans/${plan.code}`}>Choose {plan.name}</Link>
                  {plan.code === "family_plus_monthly" ? <Link className="fp-btn fp-btn-ghost" style={{ flex: 1 }} href="/floodpass/plans/family_plus_weekly">Pay weekly</Link> : null}
                </div>
          ) : (
            <div className="fp-stack">
              <p className="fp-small" style={{ margin: 0 }}>Coming soon. Cash cover is sold only by a licensed insurance company; we are choosing a partner.</p>
              <input className="fp-field" placeholder="Your phone or email" value={contact} onChange={(e) => setContact(e.target.value)} aria-label="Phone or email for the waiting list" />
              <button className="fp-btn fp-btn-ghost" onClick={() => join(plan.code)}>Tell me when it is ready</button>
              {joined ? <p className="fp-small" role="status" style={{ margin: 0 }}>{joined}</p> : null}
            </div>
          )}
        </section>
      ))}
      </div>
      <p className="fp-muted" style={{ margin: "25px 0 0", fontSize: 14 }}>Payments are handled by Paystack when checkout is enabled. Paid features start after a successful payment.</p>
    </div>
  );
}

const HELP = {
  before: ["Save the FloodPass WhatsApp number and share your location.", "Keep papers, phone and charger in a waterproof bag.", "Know your nearest high ground and the road to it.", "Clear the drain in front of your house before the rains."],
  during: ["Move people first, then valuables, to high ground.", "Never walk or drive through moving water. Knee-deep water can sweep a car away.", "Switch off electricity at the main switch if water is coming in and it is safe to do so.", "Send WATER or a photo to FloodPass so your neighbours are warned."],
  after: ["Keep your FloodPass code. Show it to your bank, insurer, landlord or a charity.", "Take photos of damage before you clean up.", "Do not drink flood water. Boil or treat water until the supply is safe.", "Watch for snakes and broken wires."],
};

function HelpBody() {
  const { lang } = useFp();
  return (
    <div className="fp-inner-page">
      <div className="fp-page-intro">
        <p className="fp-overline">FLOOD GUIDANCE / KEEP THIS CLOSE</p>
        <h1 className="fp-h1">{lang === "pcm" ? "Wetin to do" : "Know what to do."}</h1>
        <p>Short, practical steps for before, during and after a flood.</p>
      </div>
      <p className="fp-status fp-status-red" style={{ margin: "0 0 23px", fontWeight: 800 }}>In danger now? Move to higher ground. Call 112.</p>
      <div className="fp-help-grid">{(["before", "during", "after"] as const).map((part) => (
        <section key={part} className="fp-card fp-stack">
          <p className="fp-overline">{part === "before" ? "01 / PREPARE" : part === "during" ? "02 / ACT" : "03 / RECOVER"}</p>
          <h2 className="fp-h2">{part === "before" ? "Before a flood" : part === "during" ? "During a flood" : "After a flood"}</h2>
          <ul className="fp-prose-list">{HELP[part].map((line) => <li key={line}>{line}</li>)}</ul>
          <HearButton text={HELP[part].join(" ")} />
        </section>
      ))}</div>
      <p className="fp-muted" style={{ margin: "24px 0", fontSize: 14 }}>Official warnings come from NiMet, NIHSA and NEMA. Always follow them first.</p>
      <Link className="fp-btn fp-btn-ghost" style={{ maxWidth: 290 }} href="/live-floods">See flood news and reports</Link>
    </div>
  );
}

export function PlansScreen() { return <FpShell active="plans"><PlansBody /></FpShell>; }
export function HelpScreen() { return <FpShell active="help"><HelpBody /></FpShell>; }
