"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCw, ShieldAlert, Siren } from "lucide-react";
import AppShell from "@/components/shared/AppShell";

interface CommandCase {
  observationId: string;
  source: string;
  provider: string;
  advisoryLevel: string;
  observedAt: string;
  receivedAt: string;
  location: {
    name?: string | null;
    state?: string | null;
    latitude: number;
    longitude: number;
  };
  qualityStatus: string;
  confidence?: number | null;
  command: {
    id?: string | null;
    status: string;
    priority: string;
    notes?: string | null;
    acknowledgedAt?: string | null;
    escalatedAt?: string | null;
    resolvedAt?: string | null;
    updatedAt: string;
  };
}

const statusLabel: Record<string, string> = {
  RECEIVED: "Needs acknowledgement",
  ACKNOWLEDGED: "Acknowledged",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
};

const statusClass: Record<string, string> = {
  RECEIVED: "text-amber border-amber/30 bg-amber/5",
  ACKNOWLEDGED: "text-cyan border-cyan/30 bg-cyan/5",
  ESCALATED: "text-crimson border-crimson/30 bg-crimson/5",
  RESOLVED: "text-radar border-radar/30 bg-radar/5",
};

function when(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function CommandPage() {
  const [cases, setCases] = useState<CommandCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/agency/command", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load command queue.");
      setCases(data.cases || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load command queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (item: CommandCase, action: "ACKNOWLEDGE" | "ESCALATE" | "RESOLVE") => {
    setBusy(`${item.observationId}:${action}`);
    setError("");
    try {
      const response = await fetch("/api/agency/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationId: item.observationId, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Command action failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Command action failed.");
    } finally {
      setBusy(null);
    }
  };

  const open = useMemo(() => cases.filter((item) => item.command.status !== "RESOLVED"), [cases]);
  const urgent = useMemo(() => open.filter((item) => item.command.priority === "CRITICAL" || item.command.status === "ESCALATED"), [open]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-radar">Agency operations</p>
            <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
              <ShieldAlert className="h-7 w-7 text-radar" /> Command Queue
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
              Track how authenticated official flood advisories are acknowledged, escalated and resolved. This queue never edits the original advisory and cannot manufacture an official warning.
            </p>
          </div>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-midnight-border">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Active official advisories</p>
            <p className="mt-1 text-2xl font-bold">{open.length}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Urgent / escalated</p>
            <p className="mt-1 text-2xl font-bold text-crimson">{urgent.length}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Resolved in current feed</p>
            <p className="mt-1 text-2xl font-bold text-radar">{cases.length - open.length}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/5 p-4 text-sm text-slate-600 dark:text-slate-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
            <div>
              <p className="font-semibold">Command queue unavailable</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-radar" /></div>
        ) : cases.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-radar" />
            <h2 className="mt-3 font-semibold">No fresh official advisories in the connected source store</h2>
            <p className="mt-2 text-sm text-slate-500">This is not interpreted as zero flood risk. Continue monitoring model, gauge, field and official channels.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map((item) => {
              const state = item.command.status;
              const isResolved = state === "RESOLVED";
              return (
                <article key={item.observationId} className="glass-card rounded-2xl p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Siren className="h-5 w-5 text-crimson" />
                        <h2 className="font-semibold">{item.advisoryLevel}</h2>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass[state] || "border-slate-200 text-slate-500"}`}>
                          {statusLabel[state] || state}
                        </span>
                        <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider dark:border-midnight-border">
                          {item.command.priority}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {item.location.name || "Mapped advisory area"}{item.location.state ? ` · ${item.location.state}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Authority/source: {item.source} · Provider: {item.provider}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p className="flex items-center justify-end gap-1"><Clock3 className="h-3.5 w-3.5" /> Issued {when(item.observedAt)}</p>
                      <p className="mt-1">Received {when(item.receivedAt)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-xl border border-slate-100 p-4 text-xs dark:border-midnight-border sm:grid-cols-3">
                    <div><p className="text-slate-400">Acknowledged</p><p className="mt-1 font-medium">{when(item.command.acknowledgedAt)}</p></div>
                    <div><p className="text-slate-400">Escalated</p><p className="mt-1 font-medium">{when(item.command.escalatedAt)}</p></div>
                    <div><p className="text-slate-400">Resolved</p><p className="mt-1 font-medium">{when(item.command.resolvedAt)}</p></div>
                  </div>

                  {!isResolved && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {state === "RECEIVED" && (
                        <button onClick={() => act(item, "ACKNOWLEDGE")} disabled={busy !== null} className="rounded-lg bg-radar px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                          {busy === `${item.observationId}:ACKNOWLEDGE` ? "Saving…" : "Acknowledge"}
                        </button>
                      )}
                      {state !== "ESCALATED" && (
                        <button onClick={() => act(item, "ESCALATE")} disabled={busy !== null} className="rounded-lg border border-crimson/30 px-4 py-2 text-sm font-semibold text-crimson disabled:opacity-40">
                          {busy === `${item.observationId}:ESCALATE` ? "Escalating…" : "Escalate"}
                        </button>
                      )}
                      <button onClick={() => act(item, "RESOLVE")} disabled={busy !== null} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-midnight-border disabled:opacity-40">
                        {busy === `${item.observationId}:RESOLVE` ? "Resolving…" : "Resolve"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 p-4 text-xs leading-relaxed text-slate-500 dark:border-midnight-border">
          Command actions are operational records, not edits to the issuing authority&apos;s advisory. Source observations remain immutable. Every acknowledgement, escalation and resolution attempts to append a separate audit event for later accountability review.
        </div>
      </div>
    </AppShell>
  );
}
