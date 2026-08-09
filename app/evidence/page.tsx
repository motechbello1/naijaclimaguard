"use client";

import AppShell from "@/components/shared/AppShell";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileCheck2, Loader2, ShieldCheck, AlertTriangle, BellRing } from "lucide-react";

interface EvidenceEvent {
  id: string;
  eventType: string;
  occurredAt: string;
  locationId?: string | null;
  riskScore?: number | null;
  riskLevel?: string | null;
  modelLabel?: string | null;
  assetType?: string | null;
  actionCode?: string | null;
  actionText?: string | null;
  channel?: string | null;
  deliveryState?: string | null;
  previousHash?: string | null;
  eventHash: string;
  metadata?: unknown;
}

function humanEvent(event: EvidenceEvent) {
  if (event.eventType === "WARNING_DELIVERED") return { icon: BellRing, title: "Warning delivered", text: event.channel ? `A warning was delivered by ${event.channel.toLowerCase()}.` : "A warning was delivered." };
  if (event.eventType === "WARNING_TRIGGERED") return { icon: AlertTriangle, title: "Warning level reached", text: "Your chosen warning level was reached for a monitored place." };
  if (event.eventType === "ACTION_ACKNOWLEDGED") return { icon: CheckCircle2, title: "Action marked done", text: event.actionText || "You marked a recommended safety action as done." };
  if (event.eventType === "WARNING_ACKNOWLEDGED") return { icon: ShieldCheck, title: "Warning acknowledged", text: "The warning was acknowledged." };
  if (event.eventType === "ACTION_RECOMMENDED") return { icon: FileCheck2, title: "Action recommended", text: event.actionText || "A protective action was recommended." };
  return { icon: Clock3, title: event.eventType.replaceAll("_", " ").toLowerCase(), text: "A safety-related event was recorded." };
}

export default function EvidencePage() {
  const [events, setEvents] = useState<EvidenceEvent[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");

  useEffect(() => {
    fetch("/api/evidence/events", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 503) { setState("unavailable"); return; }
        if (!res.ok) throw new Error(data.error || "Could not load evidence");
        setEvents(data.events ?? []); setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><FileCheck2 className="h-6 w-6 text-radar" /><span className="simple-only">My safety history</span><span className="standard-up">Warning & Action Evidence</span></h1>
          <p className="simple-only mt-1 text-sm text-slate-500">See warnings we recorded and actions you marked as done.</p>
          <p className="standard-up mt-1 text-sm text-slate-500">Append-only operational history for warning, delivery and action events.</p>
        </div>

        <div className="simple-only rounded-2xl border border-radar/20 bg-radar/5 p-5 text-sm leading-relaxed">
          This history helps you remember what happened. For organisations, the same records can support audits and incident reviews. A record here does not replace an official emergency-agency record.
        </div>

        {state === "loading" && <div className="flex items-center justify-center gap-3 py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading your history…</div>}
        {state === "unavailable" && <div className="rounded-2xl border border-amber/30 bg-amber/5 p-6"><h2 className="font-semibold">Evidence history is not active yet</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">The product code is ready, but the evidence database migration has not yet been applied to this environment. Alerts and local safety actions continue to work; we are not pretending the server ledger is active before it is.</p></div>}
        {state === "error" && <div className="rounded-2xl border border-crimson/20 bg-crimson/5 p-6 text-sm text-crimson">We could not load your evidence history right now.</div>}

        {state === "ready" && events.length === 0 && <div className="glass-card rounded-2xl p-8 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-radar" /><h2 className="mt-3 font-semibold">No recorded events yet</h2><p className="mt-1 text-sm text-slate-500">When warnings are triggered or you mark recommended actions as done, the operational history will appear here.</p></div>}

        {state === "ready" && events.length > 0 && (
          <div className="space-y-3">
            {events.map((event) => {
              const item = humanEvent(event);
              const Icon = item.icon;
              return (
                <article key={event.id} className="glass-card rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-radar/10"><Icon className="h-4 w-4 text-radar" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{item.title}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.text}</p></div><time className="text-xs text-slate-400">{new Date(event.occurredAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div>

                      <div className="standard-up mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        {event.riskLevel && <span className="rounded-full border border-slate-200 px-2 py-1 dark:border-midnight-border">risk: {event.riskLevel}</span>}
                        {typeof event.riskScore === "number" && <span className="rounded-full border border-slate-200 px-2 py-1 dark:border-midnight-border">score: {event.riskScore}</span>}
                        {event.assetType && <span className="rounded-full border border-slate-200 px-2 py-1 dark:border-midnight-border">asset: {event.assetType.replaceAll("_", " ").toLowerCase()}</span>}
                        {event.deliveryState && <span className="rounded-full border border-slate-200 px-2 py-1 dark:border-midnight-border">delivery: {event.deliveryState}</span>}
                      </div>

                      <div className="technical-only mt-4 rounded-xl bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-500 dark:bg-midnight-light">
                        <p>event_type={event.eventType}</p>
                        <p>model={event.modelLabel || "n/a"}</p>
                        <p className="break-all">event_hash={event.eventHash}</p>
                        <p className="break-all">previous_hash={event.previousHash || "GENESIS"}</p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
