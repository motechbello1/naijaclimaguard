"use client";

import Link from "next/link";
import { useState } from "react";
import FpShell, { HearButton, useFp } from "@/components/floodpass/FpShell";
import { ArrowRight, ArrowUpRight, Check, LockKeyhole } from "lucide-react";

function PlansBody() {
  const [joined, setJoined] = useState<string | null>(null);
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const text = "Flood guidance and reporting are free. Optional paid services will be offered only when their delivery is ready. Paying will never move an official warning ahead of anyone else.";

  async function join(event: React.FormEvent) {
    event.preventDefault();
    const value = contact.trim();
    if (!value) return;
    const body = value.includes("@") ? { plan: "family_plus_monthly", email: value } : { plan: "family_plus_monthly", phone: value };
    setBusy(true);
    try {
      const response = await fetch("/api/floodpass/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json().catch(() => ({}));
      setJoined(response.ok ? "You are on the list. We will tell you when membership is ready. No payment was taken." : json.error ?? "Could not save. Try again.");
    } catch { setJoined("Could not connect. Try again shortly."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fp-inner-page ncg-offers">
      <div className="fp-page-intro"><p className="fp-overline">MEMBERSHIP / THE MODEL</p><h1 className="fp-h1">Public safety first.<br />Useful extras when ready.</h1><p>{text}</p><HearButton text={text} /></div>
      <div className="ncg-offer-grid">
        <section className="ncg-offer ncg-offer-free"><span className="ncg-kicker">01 / FOR EVERY PERSON</span><div className="ncg-offer-title"><h2>Open access</h2><strong>₦0</strong></div><p>Use the place check, read available context, report water and check a FloodPass record.</p><ul><li><Check size={17} /> No account to report water</li><li><Check size={17} /> Official warnings take priority</li><li><Check size={17} /> The limits of the evidence stay visible</li></ul><Link href="/#today">Check your area <ArrowUpRight size={17} /></Link></section>
        <section className="ncg-offer ncg-offer-family"><span className="ncg-kicker">02 / FAMILY MEMBERSHIP · IN DEVELOPMENT</span><div className="ncg-offer-title"><h2>Family Watch</h2><strong>Planned ₦500/mo</strong></div><p>We are testing whether watching more places, family check-ins and an optional night call make a real difference. These features are not on sale yet.</p><ul><li><Check size={17} /> Follow several places in one view</li><li><Check size={17} /> Share a check-in with chosen people</li><li><Check size={17} /> Delivery must be reliable before launch</li></ul><form onSubmit={join}><label htmlFor="ncg-family-contact">Tell me when it is ready</label><div><input id="ncg-family-contact" className="fp-field" placeholder="Phone or email" value={contact} onChange={(e) => setContact(e.target.value)} required /><button type="submit" disabled={busy}>{busy ? "Saving…" : "Join waitlist"}<ArrowRight size={16} /></button></div>{joined ? <small role="status">{joined}</small> : <small>No payment now. We use this contact only for the launch update.</small>}</form></section>
      </div>
      <section className="ncg-pilot-promo"><div><span className="ncg-kicker">03 / FOR ORGANISATIONS</span><h2>Evidence that can inform a decision.</h2><p>Response teams, lenders and insurers can discuss a scoped pilot: code checks, evidence access and an auditable review workflow. Commercial terms are agreed around a real use case and measured results.</p></div><Link href="/partners">Explore a pilot <ArrowUpRight size={18} /></Link></section>
      <p className="ncg-offers-note"><LockKeyhole size={17} /> FloodPass is evidence, not a promise of aid, compensation or insurance. Insurance cover needs a licensed provider.</p>
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
