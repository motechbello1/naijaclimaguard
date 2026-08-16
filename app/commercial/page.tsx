"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/shared/AppShell";
import {
  ArrowRight, BadgeCheck, Building2, Check, CircleDollarSign, Code2,
  CreditCard, Loader2, Radio, ShieldCheck, Sparkles, UsersRound,
} from "lucide-react";

const PRODUCTS = [
  {
    code: "family_plus_annual",
    title: "Family Plus",
    price: "₦12,000",
    cadence: "/ year",
    note: "For households and diaspora families protecting several places.",
    icon: UsersRound,
    features: ["Up to 10 protected locations", "Family-ready safety workflow", "Richer evidence history", "Priority delivery options"],
    cta: "Buy Family Plus",
  },
  {
    code: "business_starter_annual",
    title: "Business Starter",
    price: "₦120,000",
    cadence: "/ year",
    note: "For SMEs and operators that need a real organisation workspace.",
    icon: Building2,
    features: ["25 monitored locations", "5-seat workspace allowance", "Portfolio monitoring", "Evidence and operational exports"],
    cta: "Start Business",
  },
  {
    code: "api_10000",
    title: "API Starter",
    price: "₦50,000",
    cadence: " prepaid",
    note: "For teams testing NaijaClimaGuard inside another product.",
    icon: Code2,
    features: ["10,000 API credits", "Persistent credit balance", "No expiry logic hidden in checkout", "Upgrade to larger packs anytime"],
    cta: "Buy 10,000 credits",
  },
  {
    code: "api_100000",
    title: "API Growth",
    price: "₦350,000",
    cadence: " prepaid",
    note: "For production pilots and higher-volume integrations.",
    icon: Sparkles,
    features: ["100,000 API credits", "Lower effective unit cost", "Persistent usage wallet", "Enterprise route when scale grows"],
    cta: "Buy 100,000 credits",
  },
];

type Account = {
  user: { name?: string | null; email: string; plan: string };
  wallet: { balance: number; purchased: number; used: number };
  workspaces: Array<{ id: string; name: string; plan: string; seatLimit: number; locationLimit: number }>;
  orders: Array<{ id: string; productCode: string; status: string; amountKobo: number; createdAt: string }>;
};

export default function CommercialPage() {
  const params = useSearchParams();
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [leadState, setLeadState] = useState<"idle" | "sending" | "sent">("idle");
  const [workspaceName, setWorkspaceName] = useState("");
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  const paymentNotice = useMemo(() => {
    if (params.get("payment") === "success") return "Payment verified. Your entitlement has been added to this account.";
    if (params.get("payment") === "failed") return "Payment was not completed or could not be verified. No entitlement was granted.";
    return "";
  }, [params]);

  const loadAccount = async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/commercial/account", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setAccount(data);
        if (data.workspaces?.[0]?.name) setWorkspaceName(data.workspaces[0].name);
      } else setAccount(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { loadAccount(); }, []);

  const checkout = async (productCode: string) => {
    setBuying(productCode); setMessage("");
    try {
      const response = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Checkout could not start.");
        return;
      }
      window.location.assign(data.authorization_url);
    } catch {
      setMessage("Checkout could not start. Please try again.");
    } finally {
      setBuying(null);
    }
  };

  const saveWorkspace = async () => {
    if (!workspaceName.trim()) return;
    setSavingWorkspace(true); setMessage("");
    try {
      const response = await fetch("/api/commercial/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName, organizationType: "business" }),
      });
      const data = await response.json();
      if (!response.ok) setMessage(data.error || "Workspace could not be updated.");
      else { setMessage("Organisation workspace updated."); await loadAccount(); }
    } finally { setSavingWorkspace(false); }
  };

  const sendLead = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLeadState("sending"); setMessage("");
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/institutional-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, consent: true, source: "commercial-console" }),
    });
    const data = await response.json();
    if (response.ok) {
      setLeadState("sent");
      setMessage(`Request received. Reference ${data.reference}.`);
      event.currentTarget.reset();
    } else {
      setLeadState("idle");
      setMessage(data.error || "Request could not be sent.");
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[36px] bg-[#071713] px-6 py-9 text-white sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-[#d9ff57]/25" />
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#d9ff57]">Commercial Console</p>
          <h1 className="mt-3 max-w-4xl font-display text-4xl font-black leading-[.98] tracking-[-.055em] sm:text-6xl">Choose what you need. Pay for it. See the entitlement on your account.</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">Citizen safety remains useful for free. Paid products add scale, coordination, API volume and institutional capability.</p>
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-[#d9ff57] px-4 py-2 text-[#071713]">Paystack checkout</span>
            <span className="rounded-full border border-white/12 bg-white/[.06] px-4 py-2">Persistent entitlements</span>
            <span className="rounded-full border border-white/12 bg-white/[.06] px-4 py-2">Enterprise by contract</span>
          </div>
        </section>

        {(paymentNotice || message) && <div className="rounded-[20px] border border-black/7 bg-white px-5 py-4 text-sm font-bold dark:border-white/8 dark:bg-white/[.05]">{message || paymentNotice}</div>}

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[26px] bg-white p-5 dark:bg-white/[.05]"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Current plan</p><p className="mt-2 text-2xl font-black">{checking ? "Checking…" : account?.user.plan || "Sign in"}</p></div>
          <div className="rounded-[26px] bg-[#d9ff57] p-5 text-[#071713]"><p className="text-[10px] font-black uppercase tracking-[.16em] opacity-60">API credit balance</p><p className="mt-2 text-3xl font-black">{checking ? "…" : (account?.wallet.balance || 0).toLocaleString()}</p></div>
          <div className="rounded-[26px] bg-[#e8f5ee] p-5 text-[#071713] dark:bg-[#10251c] dark:text-white"><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700 dark:text-[#d9ff57]">Organisation workspace</p><p className="mt-2 text-2xl font-black">{checking ? "Checking…" : account?.workspaces?.[0]?.name || "Not active"}</p></div>
        </section>

        <section>
          <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700 dark:text-[#d9ff57]">Buy online</p><h2 className="mt-1 text-3xl font-black tracking-[-.045em]">Products with immediate checkout</h2></div>
          <div className="grid gap-3 xl:grid-cols-4 sm:grid-cols-2">
            {PRODUCTS.map((product) => {
              const Icon = product.icon;
              return <article key={product.code} className="flex min-h-[420px] flex-col rounded-[30px] border border-black/7 bg-white/80 p-6 dark:border-white/8 dark:bg-white/[.04]">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#071713] text-[#d9ff57]"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-5 text-2xl font-black tracking-[-.04em]">{product.title}</h3>
                <div className="mt-2"><span className="text-3xl font-black">{product.price}</span><span className="ml-1 text-xs font-bold text-slate-400">{product.cadence}</span></div>
                <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-white/48">{product.note}</p>
                <div className="mt-5 space-y-2">{product.features.map((feature) => <div key={feature} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-[#d9ff57]" />{feature}</div>)}</div>
                <button onClick={() => checkout(product.code)} disabled={Boolean(buying)} className="mt-auto flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#071713] px-4 text-sm font-black text-white disabled:opacity-50">
                  {buying === product.code ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}{product.cta}
                </button>
              </article>;
            })}
          </div>
        </section>

        {(account?.user.plan === "BUSINESS_STARTER" || account?.user.plan === "ENTERPRISE") && <section className="rounded-[30px] border border-black/7 bg-white/80 p-6 dark:border-white/8 dark:bg-white/[.04]">
          <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-emerald-700 dark:text-[#d9ff57]" /><h2 className="text-2xl font-black">Organisation workspace</h2></div>
          <p className="mt-2 text-sm text-slate-500 dark:text-white/48">Name the workspace your staff and portfolio will operate under.</p>
          <div className="mt-5 flex max-w-2xl flex-col gap-3 sm:flex-row"><input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Organisation name" className="min-h-12 flex-1 rounded-full border border-black/10 bg-white px-5 outline-none dark:border-white/10 dark:bg-white/[.05]" /><button onClick={saveWorkspace} disabled={savingWorkspace} className="rounded-full bg-[#d9ff57] px-5 py-3 text-sm font-black text-[#071713]">{savingWorkspace ? "Saving…" : "Save workspace"}</button></div>
          {account.workspaces?.[0] && <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-[#f3f4ee] px-3 py-2 dark:bg-white/[.06]">{account.workspaces[0].seatLimit} seats</span><span className="rounded-full bg-[#f3f4ee] px-3 py-2 dark:bg-white/[.06]">{account.workspaces[0].locationLimit} locations</span><span className="rounded-full bg-[#f3f4ee] px-3 py-2 dark:bg-white/[.06]">{account.workspaces[0].plan}</span></div>}
        </section>}

        <section className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-[30px] bg-[#071713] p-6 text-white"><Radio className="h-6 w-6 text-[#d9ff57]" /><h3 className="mt-5 text-2xl font-black">Sponsor public coverage</h3><p className="mt-3 text-sm leading-6 text-white/55">Fund a defined community, ward, LGA or campaign so citizens receive safety access without being the payer.</p><p className="mt-5 text-xs font-black uppercase tracking-[.14em] text-[#d9ff57]">Quoted deployment</p></div>
          <div className="rounded-[30px] bg-[#e8f5ee] p-6 text-[#071713] dark:bg-[#10251c] dark:text-white"><ShieldCheck className="h-6 w-6 text-emerald-700 dark:text-[#d9ff57]" /><h3 className="mt-5 text-2xl font-black">Enterprise & government</h3><p className="mt-3 text-sm leading-6 opacity-60">Command operations, larger portfolios, integrations, service levels, implementation and training stay contract-managed.</p><p className="mt-5 text-xs font-black uppercase tracking-[.14em] text-emerald-700 dark:text-[#d9ff57]">Annual licence + implementation</p></div>
          <div className="rounded-[30px] bg-[#fff3df] p-6 text-[#071713] dark:bg-[#2b2112] dark:text-white"><CircleDollarSign className="h-6 w-6 text-amber-700" /><h3 className="mt-5 text-2xl font-black">Custom API volume</h3><p className="mt-3 text-sm leading-6 opacity-60">For workloads beyond prepaid packs, negotiate volume, support, integration and data-governance terms.</p><p className="mt-5 text-xs font-black uppercase tracking-[.14em] text-amber-700">Volume contract</p></div>
        </section>

        <section className="rounded-[34px] border border-black/7 bg-white/80 p-6 sm:p-8 dark:border-white/8 dark:bg-white/[.04]">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700 dark:text-[#d9ff57]">Talk to commercial</p><h2 className="mt-2 text-3xl font-black tracking-[-.045em]">Need sponsorship, enterprise or a custom rollout?</h2><p className="mt-4 text-sm leading-7 text-slate-500 dark:text-white/50">Send the scope here. It is saved directly into the institutional pipeline with the product interest attached.</p></div>
            <form onSubmit={sendLead} className="grid gap-3 sm:grid-cols-2">
              <input name="name" required placeholder="Your name" className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 dark:border-white/10 dark:bg-white/[.04]" />
              <input name="email" required type="email" placeholder="Work email" className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 dark:border-white/10 dark:bg-white/[.04]" />
              <input name="organization" required placeholder="Organisation" className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 dark:border-white/10 dark:bg-white/[.04]" />
              <select name="organizationType" defaultValue="government" className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 dark:border-white/10 dark:bg-[#0b1814]"><option value="government">Government</option><option value="bank-insurer">Bank / insurer</option><option value="telecom">Telecom</option><option value="agribusiness-infrastructure">Agribusiness / infrastructure</option><option value="ngo-research">NGO / research</option><option value="other">Other</option></select>
              <select name="productInterest" defaultValue="enterprise" className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 sm:col-span-2 dark:border-white/10 dark:bg-[#0b1814]"><option value="enterprise">Enterprise / government</option><option value="sponsored-coverage">Sponsored public coverage</option><option value="custom-api">Custom API volume</option><option value="white-label">White-label deployment</option><option value="insurance-banking">Bank / insurance intelligence</option></select>
              <input name="locations" placeholder="Locations or coverage area" className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 sm:col-span-2 dark:border-white/10 dark:bg-white/[.04]" />
              <textarea name="objective" required minLength={20} rows={5} placeholder="What are you trying to achieve?" className="rounded-2xl border border-black/10 bg-white p-4 sm:col-span-2 dark:border-white/10 dark:bg-white/[.04]" />
              <textarea name="integrationNeeds" rows={3} placeholder="Systems, API, reporting or delivery integrations you need" className="rounded-2xl border border-black/10 bg-white p-4 sm:col-span-2 dark:border-white/10 dark:bg-white/[.04]" />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />
              <button disabled={leadState === "sending"} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#071713] px-5 text-sm font-black text-white sm:col-span-2">{leadState === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : leadState === "sent" ? <BadgeCheck className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}{leadState === "sent" ? "Request received" : "Send commercial request"}</button>
            </form>
          </div>
        </section>

        {account?.orders?.length ? <section><h2 className="text-2xl font-black">Recent purchases</h2><div className="mt-3 overflow-hidden rounded-[26px] border border-black/7 bg-white/80 dark:border-white/8 dark:bg-white/[.04]">{account.orders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-black/6 px-5 py-4 last:border-0 dark:border-white/7"><div><p className="text-sm font-black">{order.productCode.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p></div><div className="text-right"><p className="text-sm font-black">₦{(order.amountKobo / 100).toLocaleString()}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[.12em] text-emerald-700 dark:text-[#d9ff57]">{order.status}</p></div></div>)}</div></section> : null}
      </div>
    </AppShell>
  );
}
