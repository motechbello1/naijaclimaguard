"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import FpShell from "@/components/floodpass/FpShell";
import WarningsConsole from "@/components/floodpass/WarningsConsole";

type Payout = { id: string; hero: string; phone: string; points: number; amountNaira: number; status: string; error: string | null; createdAt: string };
type Money = {
  paymentsOn: boolean; plans: Array<{ plan: string; status: string; count: number }>; income30dNaira: number; payments30d: number;
  waitlist: Array<{ plan: string; count: number }>; billablePartnerChecks30d: number; paidAddressChecks: number; error?: string;
};

function Rewards() {
  const [rows, setRows] = useState<Payout[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/floodpass/rewards", { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) { setNote(json.error ?? "Could not load."); setRows([]); return; }
    setRows(json.payouts);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function decide(id: string, approve: boolean) {
    const response = await fetch("/api/floodpass/rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, approve }) });
    const json = await response.json().catch(() => ({}));
    setNote(response.ok ? `Done: ${json.status}` : json.error ?? "Failed.");
    await load();
  }
  return (
    <div className="fp-stack">
      <p style={{ margin: 0 }}>Drain Heroes ask for airtime with REWARD. Approving sends it at once through Africa&apos;s Talking. Check the drain photos first if anything looks odd.</p>
      {note ? <p role="status" className="fp-status fp-status-blue" style={{ margin: 0 }}>{note}</p> : null}
      {rows === null ? <p className="fp-muted">Loading...</p> : rows.length === 0 ? <p className="fp-muted" style={{ margin: 0 }}>No requests yet.</p> : (
        <ul className="fp-list">
          {rows.map((r) => (
            <li key={r.id} className="fp-card fp-stack">
              <div className="fp-row" style={{ justifyContent: "space-between" }}>
                <strong>{r.hero}: N{r.amountNaira} ({r.points} points)</strong>
                <span className="fp-chip">{r.status}</span>
              </div>
              <span className="fp-small fp-muted">{r.phone} · {new Date(r.createdAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}{r.error ? ` · ${r.error}` : ""}</span>
              {r.status === "REQUESTED" ? (
                <div className="fp-row">
                  <button className="fp-btn fp-btn-primary fp-btn-sm" onClick={() => decide(r.id, true)}>Approve and pay</button>
                  <button className="fp-btn fp-btn-ghost fp-btn-sm" onClick={() => decide(r.id, false)}>Reject</button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MoneyTab() {
  const [money, setMoney] = useState<Money | null>(null);
  const [setup, setSetup] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/floodpass/billing/summary", { cache: "no-store" }).then((r) => r.json()).then(setMoney).catch(() => setMoney(null));
  }, []);
  async function makePlans() {
    const response = await fetch("/api/floodpass/billing/setup", { method: "POST" });
    const json = await response.json().catch(() => ({}));
    setSetup(response.ok ? json.plans.map((p: { setting: string; code: string }) => `${p.setting}=${p.code}`).join("\n") : json.error ?? "Failed.");
  }
  if (!money) return <p className="fp-muted">Loading...</p>;
  if (money.error) return <p className="fp-status fp-status-amber" style={{ margin: 0 }}>{money.error}</p>;
  return (
    <div className="fp-stack">
      <div className="fp-grid-2">
        <div className="fp-card"><p style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>N{money.income30dNaira.toLocaleString()}</p><p className="fp-muted fp-small" style={{ margin: 0 }}>paid in 30 days ({money.payments30d})</p></div>
        <div className="fp-card"><p style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>{money.billablePartnerChecks30d}</p><p className="fp-muted fp-small" style={{ margin: 0 }}>partner checks in 30 days</p></div>
      </div>
      <dl className="fp-kv">
        <dt>Payments</dt><dd>{money.paymentsOn ? "switched on" : "off (add PAYSTACK_SECRET_KEY)"}</dd>
        {money.plans.map((p) => <Fragment key={`${p.plan}-${p.status}`}><dt>{p.plan}</dt><dd>{p.count} {p.status.toLowerCase()}</dd></Fragment>)}
        <dt>Address checks paid</dt><dd>{money.paidAddressChecks}</dd>
        {money.waitlist.map((w) => <Fragment key={`w-${w.plan}`}><dt>Waiting for {w.plan}</dt><dd>{w.count}</dd></Fragment>)}
      </dl>
      <button className="fp-btn fp-btn-ghost" onClick={makePlans}>Create repeating plans on Paystack</button>
      {setup ? <pre className="fp-card fp-small" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{setup}</pre> : null}
    </div>
  );
}

function DemoTab() {
  const [note, setNote] = useState<string | null>(null);
  async function load() {
    setNote("Loading...");
    const response = await fetch("/api/floodpass/admin/seed", { method: "POST" });
    const json = await response.json().catch(() => ({}));
    setNote(response.ok ? (json.skipped ? `Demo floods already loaded (${json.reports} reports).` : `Loaded ${json.reports} reports, FloodPasses: ${json.passes.join(", ") || "none"}.`) : json.error ?? "Failed.");
  }
  return (
    <div className="fp-stack">
      <p style={{ margin: 0 }}>Loads the 16 August 2026 Abuja floods, rebuilt from news reports. Every record is marked as a demo record rebuilt from news. Safe to press twice.</p>
      <button className="fp-btn fp-btn-primary" onClick={load}>Load demo floods</button>
      {note ? <p role="status" style={{ margin: 0 }}>{note}</p> : null}
      <Link className="fp-btn fp-btn-ghost" href="/floodpass/demo">Open the WhatsApp demo screen</Link>
      <Link className="fp-btn fp-btn-ghost" href="/partners">Partner keys and checks</Link>
    </div>
  );
}

const TABS = [
  { key: "warnings", label: "Warnings" },
  { key: "rewards", label: "Drain rewards" },
  { key: "money", label: "Plans and money" },
  { key: "demo", label: "Demo" },
] as const;

function Body() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("warnings");
  return (
    <div className="fp-inner-page fp-stack" style={{ gap: 20 }}>
      <div className="fp-page-intro">
        <p className="fp-overline">FLOODPASS / OPERATIONS</p>
        <h1 className="fp-h1">Founder desk.</h1>
        <p>Official warnings, drain rewards, plans and demo records in one place. <Link className="fp-link" href="/login?callbackUrl=/floodpass/founder">Log in</Link> for founder access.</p>
      </div>
      <div className="fp-tabs" role="tablist">
        {TABS.map((t) => <button key={t.key} role="tab" aria-selected={tab === t.key} className="fp-chip" onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>
      {tab === "warnings" ? <WarningsConsole /> : tab === "rewards" ? <Rewards /> : tab === "money" ? <MoneyTab /> : <DemoTab />}
    </div>
  );
}

export default function FounderScreen() {
  return <FpShell><Body /></FpShell>;
}
