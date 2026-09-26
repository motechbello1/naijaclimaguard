"use client";

import Link from "next/link";
import { useState } from "react";
import FpShell from "@/components/floodpass/FpShell";
import { planByCode } from "@/lib/floodpass/billing/plans";

function Body({ code, addressCheckCode }: { code: string; addressCheckCode?: string | null }) {
  const plan = planByCode(code);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!plan || plan.status !== "live") {
    return (
      <div className="fp-inner-page fp-stack">
        <h1 className="fp-h1">Plan not found</h1>
        <Link className="fp-btn fp-btn-ghost" href="/floodpass/plans">See all plans</Link>
      </div>
    );
  }

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/floodpass/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: code, email, phone, addressCheckCode }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.url) { setBusy(false); setError(json.error ?? "We could not start the payment."); return; }
    window.location.href = json.url;
  }

  return (
    <form className="fp-inner-page fp-stack" style={{ gap: 20, maxWidth: 680 }} onSubmit={pay}>
      <div className="fp-page-intro">
        <p className="fp-overline">FLOODPASS / OPTIONAL EXTRA</p>
        <h1 className="fp-h1">{plan.name}</h1>
        <p style={{ fontWeight: 800, fontSize: 22 }}>{plan.priceLabel}</p>
      </div>
      <ul style={{ margin: 0, paddingLeft: 22 }}>{plan.gets.map((g) => <li key={g}>{g}</li>)}</ul>
      <label>
        <span className="fp-label">Phone number that gets the extras</span>
        <input className="fp-field" inputMode="tel" autoComplete="tel" placeholder="08031234567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <span className="fp-small fp-muted">Use the number you use for FloodPass on WhatsApp, SMS or USSD.</span>
      </label>
      <label>
        <span className="fp-label">Email for your receipt</span>
        <input className="fp-field" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      {error ? <p role="alert" className="fp-status fp-status-amber" style={{ margin: 0 }}>{error}</p> : null}
      <button className="fp-btn fp-btn-primary" type="submit" disabled={busy}>{busy ? "Opening Paystack..." : `Pay ${plan.priceLabel.split(" (")[0]}`}</button>
      <p className="fp-muted fp-small" style={{ margin: 0 }}>You pay on Paystack by card, bank transfer or USSD. FloodPass never sees your card. Warnings and proof stay free whatever you choose.</p>
    </form>
  );
}

export default function CheckoutScreen({ code, addressCheckCode }: { code: string; addressCheckCode?: string | null }) {
  return <FpShell active="plans"><Body code={code} addressCheckCode={addressCheckCode} /></FpShell>;
}
