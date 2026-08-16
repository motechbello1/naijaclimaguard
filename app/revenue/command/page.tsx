"use client";

import AppShell from "@/components/shared/AppShell";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight, BadgeDollarSign, Banknote, Building2, CalendarClock,
  CheckCircle2, CircleDollarSign, Clock3, CreditCard, Gauge, Loader2,
  RefreshCw, ShieldAlert, ShoppingCart, Target, TrendingUp, UsersRound, WalletCards,
} from "lucide-react";

type DashboardData = any;

const STAGES = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST", "ON_HOLD"];

function money(value = 0) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

function compact(value = 0) {
  return new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function dateText(value?: string | Date | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function Metric({ label, value, note, icon: Icon, lime = false }: any) {
  return (
    <div className={`relative overflow-hidden rounded-[28px] p-5 sm:p-6 ${lime ? "bg-[#d9ff57] text-[#071713]" : "border border-black/7 bg-white/80 dark:border-white/8 dark:bg-white/[.045]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] opacity-55">{label}</p><p className="mt-3 text-3xl font-black tracking-[-.055em] sm:text-4xl">{value}</p></div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${lime ? "bg-[#071713] text-[#d9ff57]" : "bg-[#071713] text-[#d9ff57]"}`}><Icon className="h-5 w-5" /></div>
      </div>
      <p className="mt-4 text-xs font-semibold leading-5 opacity-60">{note}</p>
    </div>
  );
}

function RevenueBars({ points }: { points: Array<{ date: string; revenueNgn: number }> }) {
  const max = Math.max(1, ...points.map((point) => point.revenueNgn));
  return (
    <div className="mt-6 flex h-44 items-end gap-[3px] sm:gap-1" aria-label="30 day collected revenue chart">
      {points.map((point, index) => {
        const height = Math.max(point.revenueNgn ? 8 : 2, Math.round((point.revenueNgn / max) * 100));
        return <div key={point.date} className="group relative flex h-full min-w-0 flex-1 items-end">
          <div className="w-full rounded-t-[6px] bg-[#2d765d] transition group-hover:bg-[#d9ff57]" style={{ height: `${height}%` }} />
          {point.revenueNgn > 0 && <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-[#071713] px-3 py-1.5 text-[10px] font-black text-white shadow-xl group-hover:block">{money(point.revenueNgn)}</div>}
          {(index === 0 || index === points.length - 1 || index === Math.floor(points.length / 2)) && <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-slate-400">{point.date.slice(5)}</span>}
        </div>;
      })}
    </div>
  );
}

export default function RevenueCommandPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isFounder = (session?.user as any)?.role === "FOUNDER";
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/revenue", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Revenue command could not load.");
      setData(payload);
      const next: Record<string, any> = {};
      for (const lead of payload.leads || []) next[lead.id] = { ...lead, nextActionAt: lead.nextActionAt ? String(lead.nextActionAt).slice(0, 10) : "" };
      setDrafts(next);
    } catch (err: any) {
      setError(err?.message || "Revenue command could not load.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?mode=founder&callbackUrl=/admin");
      return;
    }
    if (status === "authenticated" && isFounder) load();
    if (status === "authenticated" && !isFounder) setLoading(false);
  }, [isFounder, load, router, status]);

  const saveLead = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setSaving(id);
    try {
      const response = await fetch("/api/admin/revenue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          stage: draft.stage,
          estimatedValueNgn: draft.estimatedValueNgn,
          nextAction: draft.nextAction,
          nextActionAt: draft.nextActionAt,
          lostReason: draft.lostReason,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Lead could not be updated.");
      await load();
    } catch (err: any) { setError(err?.message || "Lead could not be updated."); }
    finally { setSaving(null); }
  };

  const bestProduct = useMemo(() => data?.productBreakdown?.[0], [data]);

  if (status === "loading") {
    return <AppShell><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div></AppShell>;
  }

  if (status === "authenticated" && !isFounder) {
    return <AppShell><section className="mx-auto max-w-2xl rounded-[30px] border border-amber-300/50 bg-amber-50 p-8 text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/8 dark:text-amber-100"><ShieldAlert className="h-8 w-8" /><h1 className="mt-5 text-3xl font-black">Founder sign-in required</h1><p className="mt-3 text-sm font-semibold leading-7">This account is a user or enterprise workspace. Founder Command requires the separate founder username and password.</p><button onClick={() => router.push("/login?mode=founder&callbackUrl=/admin")} className="mt-6 rounded-full bg-[#071713] px-5 py-3 text-sm font-black text-white dark:bg-[#d9ff57] dark:text-[#071713]">Use founder access</button></section></AppShell>;
  }

  return (
    <AppShell>
      <div className="space-y-7">
        <section className="relative overflow-hidden rounded-[38px] bg-[#061612] px-6 py-8 text-white sm:px-10 sm:py-11">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border border-[#d9ff57]/30" />
          <div className="pointer-events-none absolute right-20 top-12 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-[#d9ff57]"><Gauge className="h-4 w-4" /> Founder Revenue Command</div>
              <h1 className="mt-4 font-display text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">Know where the money is coming from. Know what must close next.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/58">Cash collected, recurring run-rate, checkout conversion, API sales, renewals and enterprise pipeline are separated so one number never pretends to be another.</p>
            </div>
            <button onClick={load} disabled={loading} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[.07] px-5 text-sm font-black text-white"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
          </div>
        </section>

        {error && <div className="rounded-[22px] border border-rose-300/40 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700 dark:bg-rose-950/20 dark:text-rose-200">{error}</div>}

        {loading && !data ? <div className="flex min-h-[45vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : data && <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Cash collected" value={money(data.metrics.cashCollectedNgn)} note={`${money(data.metrics.cash30Ngn)} collected in the last 30 days.`} icon={Banknote} lime />
            <Metric label="Annual run-rate" value={money(data.metrics.arrRunRateNgn)} note={`${money(data.metrics.mrrEquivalentNgn)} monthly equivalent from active annual paid plans only.`} icon={TrendingUp} />
            <Metric label="Open pipeline" value={money(data.metrics.openPipelineNgn)} note={`${data.metrics.openLeads} open leads. Unpriced leads contribute ₦0 until you set a value.`} icon={Target} />
            <Metric label="Checkout conversion" value={`${data.metrics.checkoutConversionPct}%`} note={`${data.metrics.paidOrders} paid from ${data.metrics.checkoutAttempts} attempts · ${data.metrics.abandonedCheckouts} abandoned.`} icon={ShoppingCart} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.45fr_.55fr]">
            <div className="rounded-[32px] border border-black/7 bg-white/80 p-6 sm:p-8 dark:border-white/8 dark:bg-white/[.04]">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700 dark:text-[#d9ff57]">Collected revenue</p><h2 className="mt-1 text-3xl font-black tracking-[-.045em]">Last 30 days</h2></div><p className="text-sm font-black">{money(data.metrics.cash30Ngn)}</p></div>
              <RevenueBars points={data.revenueTrend30d} />
            </div>
            <div className="rounded-[32px] bg-[#e8f5ee] p-6 text-[#071713] dark:bg-[#10251c] dark:text-white">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700 dark:text-[#d9ff57]">What is selling</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-.045em]">{bestProduct ? bestProduct.productCode.replaceAll("_", " ") : "No paid product yet"}</h2>
              <p className="mt-3 text-sm leading-6 opacity-60">{bestProduct ? `${bestProduct.orders} paid orders · ${money(bestProduct.revenueNgn)} collected.` : "The first paid transaction will establish the leading channel."}</p>
              <div className="mt-6 space-y-3">{(data.productBreakdown || []).slice(0, 5).map((item: any) => <div key={item.productCode} className="border-t border-black/8 pt-3 dark:border-white/8"><div className="flex justify-between gap-3 text-sm font-black"><span className="truncate">{item.productCode.replaceAll("_", " ")}</span><span>{money(item.revenueNgn)}</span></div><p className="mt-1 text-xs opacity-50">{item.orders} orders</p></div>)}</div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="API revenue" value={money(data.metrics.apiRevenueNgn)} note={`${compact(data.metrics.apiCreditsPurchased)} credits purchased · ${compact(data.metrics.apiCreditsOutstanding)} still outstanding.`} icon={WalletCards} />
            <Metric label="Plan revenue" value={money(data.metrics.planRevenueNgn)} note={`${data.metrics.paidCustomers} distinct paying customers across recorded checkout products.`} icon={BadgeDollarSign} />
            <Metric label="Active workspaces" value={String(data.metrics.activeWorkspaces)} note="Business and institutional workspaces currently active in the commercial database." icon={Building2} />
            <Metric label="Follow-ups overdue" value={String(data.metrics.overdueFollowUps)} note="Open commercial leads whose next-action date has already passed." icon={Clock3} />
          </section>

          <section className="rounded-[34px] border border-black/7 bg-white/80 p-5 sm:p-8 dark:border-white/8 dark:bg-white/[.04]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700 dark:text-[#d9ff57]">Enterprise pipeline</p><h2 className="mt-1 text-3xl font-black tracking-[-.045em]">Move opportunities, not just cards.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-white/48">Assign a real estimated contract value and the next action. Unpriced opportunities stay outside pipeline value rather than inflating the forecast.</p></div><div className="rounded-full bg-[#071713] px-4 py-2 text-xs font-black text-white">{money(data.metrics.openPipelineNgn)} open</div></div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{data.leadStages.map((stage: any) => <div key={stage.stage} className="rounded-[20px] bg-[#f3f4ee] p-4 dark:bg-white/[.05]"><p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{stage.stage.replaceAll("_", " ")}</p><p className="mt-2 text-2xl font-black">{stage.count}</p><p className="mt-1 text-[11px] font-bold text-emerald-700 dark:text-[#d9ff57]">{money(stage.valueNgn)}</p></div>)}</div>

            <div className="mt-7 space-y-3">{data.leads.length === 0 ? <div className="rounded-[24px] border border-dashed border-black/10 p-7 text-sm text-slate-500 dark:border-white/10">No institutional leads have arrived yet.</div> : data.leads.map((lead: any) => {
              const draft = drafts[lead.id] || lead;
              return <article key={lead.id} className="rounded-[26px] border border-black/7 bg-[#fbfcf8] p-5 dark:border-white/8 dark:bg-white/[.025]">
                <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
                  <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black tracking-[-.03em]">{lead.organization}</h3><span className="rounded-full bg-[#d9ff57] px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[#071713]">{lead.source}</span></div><p className="mt-1 text-sm font-bold text-slate-500">{lead.name} · {lead.email}</p><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/52">{lead.objective}</p><p className="mt-3 text-[10px] font-black uppercase tracking-[.13em] text-slate-400">Created {dateText(lead.createdAt)}</p></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-black text-slate-500">Stage<select value={draft.stage} onChange={(e) => setDrafts((old) => ({ ...old, [lead.id]: { ...draft, stage: e.target.value } }))} className="mt-1.5 min-h-11 w-full rounded-[14px] border border-black/10 bg-white px-3 font-bold text-[#071713] dark:border-white/10">{STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
                    <label className="text-xs font-black text-slate-500">Estimated value (₦)<input type="number" min="0" value={draft.estimatedValueNgn || ""} onChange={(e) => setDrafts((old) => ({ ...old, [lead.id]: { ...draft, estimatedValueNgn: e.target.value } }))} className="mt-1.5 min-h-11 w-full rounded-[14px] border border-black/10 bg-white px-3 font-bold text-[#071713] dark:border-white/10" placeholder="0" /></label>
                    <label className="text-xs font-black text-slate-500">Next action<input value={draft.nextAction || ""} onChange={(e) => setDrafts((old) => ({ ...old, [lead.id]: { ...draft, nextAction: e.target.value } }))} className="mt-1.5 min-h-11 w-full rounded-[14px] border border-black/10 bg-white px-3 font-semibold text-[#071713] dark:border-white/10" placeholder="Send proposal, call procurement…" /></label>
                    <label className="text-xs font-black text-slate-500">Follow-up date<input type="date" value={draft.nextActionAt || ""} onChange={(e) => setDrafts((old) => ({ ...old, [lead.id]: { ...draft, nextActionAt: e.target.value } }))} className="mt-1.5 min-h-11 w-full rounded-[14px] border border-black/10 bg-white px-3 font-bold text-[#071713] dark:border-white/10" /></label>
                    {draft.stage === "CLOSED_LOST" && <label className="text-xs font-black text-slate-500 sm:col-span-2">Why it was lost<input value={draft.lostReason || ""} onChange={(e) => setDrafts((old) => ({ ...old, [lead.id]: { ...draft, lostReason: e.target.value } }))} className="mt-1.5 min-h-11 w-full rounded-[14px] border border-black/10 bg-white px-3 font-semibold text-[#071713] dark:border-white/10" placeholder="Budget, timing, competitor, no response…" /></label>}
                    <button onClick={() => saveLead(lead.id)} disabled={saving === lead.id} className="min-h-11 rounded-full bg-[#071713] px-4 text-sm font-black text-white sm:col-span-2">{saving === lead.id ? "Saving…" : "Save opportunity"}</button>
                  </div>
                </div>
              </article>;
            })}</div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[32px] border border-black/7 bg-white/80 p-6 dark:border-white/8 dark:bg-white/[.04]">
              <div className="flex items-center gap-3"><CalendarClock className="h-5 w-5 text-emerald-700 dark:text-[#d9ff57]" /><h2 className="text-2xl font-black">Upcoming renewals</h2></div>
              <p className="mt-2 text-sm text-slate-500 dark:text-white/48">Derived from the latest active annual paid plan per customer.</p>
              <div className="mt-5 space-y-2">{data.renewals.length === 0 ? <p className="text-sm text-slate-400">No renewal dates yet.</p> : data.renewals.map((item: any) => <div key={item.orderId} className="flex items-center justify-between gap-4 rounded-[18px] bg-[#f3f4ee] px-4 py-3 dark:bg-white/[.05]"><div className="min-w-0"><p className="truncate text-sm font-black">{item.customer}</p><p className="mt-0.5 text-[11px] text-slate-500">{item.productCode.replaceAll("_", " ")} · {dateText(item.dueAt)}</p></div><p className="shrink-0 text-sm font-black">{money(item.amountNgn)}</p></div>)}</div>
            </div>

            <div className="rounded-[32px] border border-black/7 bg-white/80 p-6 dark:border-white/8 dark:bg-white/[.04]">
              <div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-emerald-700 dark:text-[#d9ff57]" /><h2 className="text-2xl font-black">Recent checkout activity</h2></div>
              <p className="mt-2 text-sm text-slate-500 dark:text-white/48">Paid and unpaid attempts stay visible so funnel problems do not disappear.</p>
              <div className="mt-5 space-y-2">{data.recentOrders.slice(0, 10).map((order: any) => <div key={order.id} className="flex items-center gap-3 border-b border-black/6 py-3 last:border-0 dark:border-white/7"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${order.status === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{order.status === "PAID" ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{order.customer}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{order.productCode.replaceAll("_", " ")} · {dateText(order.createdAt)}</p></div><div className="text-right"><p className="text-sm font-black">{money(order.amountNgn)}</p><p className="text-[9px] font-black uppercase tracking-[.1em] text-slate-400">{order.status}</p></div></div>)}</div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[28px] bg-[#071713] p-6 text-white"><UsersRound className="h-5 w-5 text-[#d9ff57]" /><p className="mt-5 text-[10px] font-black uppercase tracking-[.16em] text-white/40">Paying customers</p><p className="mt-2 text-4xl font-black">{data.metrics.paidCustomers}</p></div>
            <div className="rounded-[28px] bg-[#d9ff57] p-6 text-[#071713]"><CircleDollarSign className="h-5 w-5" /><p className="mt-5 text-[10px] font-black uppercase tracking-[.16em] opacity-50">Closed-won pipeline value</p><p className="mt-2 text-4xl font-black">{money(data.metrics.wonPipelineNgn)}</p></div>
            <div className="rounded-[28px] bg-[#fff3df] p-6 text-[#071713] dark:bg-[#2b2112] dark:text-white"><ArrowUpRight className="h-5 w-5 text-amber-700" /><p className="mt-5 text-[10px] font-black uppercase tracking-[.16em] opacity-50">API credits used</p><p className="mt-2 text-4xl font-black">{compact(data.metrics.apiCreditsUsed)}</p></div>
          </section>
        </>}
      </div>
    </AppShell>
  );
}
