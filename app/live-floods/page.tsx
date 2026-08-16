"use client";

import AppShell from "@/components/shared/AppShell";
import NationalNowcast from "@/components/live/NationalNowcast";
import IncidentLearningLoop from "@/components/live/IncidentLearningLoop";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Clock3, ExternalLink, Newspaper, RefreshCw, Search, ShieldAlert, Waves } from "lucide-react";

type FeedItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  state: string;
  areas: string[];
  status: "REPORTED" | "WARNING" | "WATCH" | "UNVERIFIED";
  severity: number;
};

type FeedData = {
  generatedAt: string;
  items: FeedItem[];
  stateSummary: Array<{ state: string; count: number; highestSeverity: number; latestAt: string }>;
  sourceHealth: Array<{ source: string; ok: boolean }>;
  notice?: string;
};

const statusClass: Record<string, string> = {
  REPORTED: "border-crimson/30 bg-crimson/10 text-crimson",
  WARNING: "border-amber/30 bg-amber/10 text-amber",
  WATCH: "border-radar/30 bg-radar/10 text-radar",
  UNVERIFIED: "border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800",
};

function ageLabel(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function LiveFloodsPage() {
  const [data, setData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/live-floods?limit=150", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load live flood reports");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load live flood reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const states = useMemo(() => {
    const found = new Set((data?.items || []).map((item) => item.state));
    return ["ALL", ...Array.from(found).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.items || []).filter((item) => {
      if (stateFilter !== "ALL" && item.state !== stateFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (needle && !`${item.title} ${item.source} ${item.state} ${item.areas.join(" ")}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [data, query, stateFilter, statusFilter]);

  const last24h = (data?.items || []).filter((item) => Date.now() - new Date(item.publishedAt).getTime() <= 86_400_000);
  const reported = last24h.filter((item) => item.status === "REPORTED");
  const affectedStates = new Set(last24h.filter((item) => item.state !== "Nigeria / location unparsed").map((item) => item.state));
  const liveSources = (data?.sourceHealth || []).filter((source) => source.ok).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-radar"><Activity className="h-4 w-4" /> Nationwide incident fusion</div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Live Flood Intelligence</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">NaijaClimaGuard continuously scans flood reports and warnings from Nigerian and global news discovery feeds. This layer tells us what is being reported now across all states, instead of waiting for someone to manually search the news.</p>
          </div>
          <button onClick={() => load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-radar/40 dark:border-midnight-border dark:bg-midnight-light"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh now</button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Newspaper} label="Reports found · 24h" value={last24h.length} detail="External flood reports and warnings" />
          <Metric icon={ShieldAlert} label="Reported flooding · 24h" value={reported.length} detail="Headlines describing flooding already occurring" danger={reported.length > 0} />
          <Metric icon={Waves} label="States/FCT mentioned · 24h" value={affectedStates.size} detail="Automatically extracted from report text" />
          <Metric icon={Activity} label="Discovery sources online" value={`${liveSources}/${data?.sourceHealth?.length || 0}`} detail="Feed refreshes automatically every minute" />
        </div>

        <section className="rounded-2xl border border-amber/20 bg-amber/5 p-4 sm:p-5">
          <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber" /><div><h2 className="text-sm font-bold">News is a confirmation sensor, not the first warning</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">If Vanguard, Guardian, Daily Trust or another outlet reports that cars are already floating, the incident layer records that immediately. Earlier warning belongs to rainfall nowcasting, antecedent wetness, official alerts and geolocated citizen reports. We keep those evidence types separate so a headline is never mistaken for a model forecast.</p></div></div>
        </section>

        <NationalNowcast />
        <IncidentLearningLoop />

        {data?.stateSummary?.length ? (
          <section>
            <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">What is being reported around Nigeria</h2><span className="text-xs text-slate-400">Newest reports first</span></div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {data.stateSummary.slice(0, 16).map((row) => <button key={row.state} onClick={() => setStateFilter(row.state)} className={`shrink-0 rounded-xl border px-3 py-2 text-left transition ${stateFilter === row.state ? "border-radar bg-radar/10" : "border-slate-200 bg-white hover:border-radar/30 dark:border-midnight-border dark:bg-midnight-light"}`}><p className="text-xs font-bold">{row.state}</p><p className="mt-0.5 text-[11px] text-slate-500">{row.count} report{row.count === 1 ? "" : "s"}</p></button>)}
            </div>
          </section>
        ) : null}

        <section className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_170px]">
            <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Maitama, Lokoja, Lagos, source..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-radar dark:border-midnight-border dark:bg-midnight" /></label>
            <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-radar dark:border-midnight-border dark:bg-midnight">{states.map((state) => <option key={state} value={state}>{state === "ALL" ? "All states + FCT" : state}</option>)}</select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-radar dark:border-midnight-border dark:bg-midnight"><option value="ALL">All report types</option><option value="REPORTED">Flood reported</option><option value="WARNING">Warnings</option><option value="WATCH">Weather watch</option></select>
          </div>
        </section>

        {error ? <div className="rounded-xl border border-crimson/20 bg-crimson/5 p-4 text-sm text-crimson">{error}</div> : null}

        <section className="space-y-3">
          {loading && !data ? <div className="glass-card rounded-2xl p-10 text-center text-sm text-slate-500">Scanning live sources…</div> : null}
          {!loading && filtered.length === 0 ? <div className="glass-card rounded-2xl p-10 text-center text-sm text-slate-500">No flood reports match these filters right now.</div> : null}
          {filtered.map((item) => (
            <article key={item.id} className="glass-card rounded-2xl p-4 transition hover:border-radar/30 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass[item.status]}`}>{item.status === "REPORTED" ? "Flood reported" : item.status}</span><span className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:border-midnight-border">{item.state}</span>{item.areas.slice(0, 2).map((area) => <span key={area} className="text-[11px] text-slate-400">{area}</span>)}</div>
                  <h3 className="text-base font-bold leading-6 sm:text-lg">{item.title}</h3>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"><span className="font-semibold">{item.source}</span><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {ageLabel(item.publishedAt)}</span><span>{new Date(item.publishedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span></div>
                </div>
                <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-radar hover:border-radar/40 dark:border-midnight-border">Read source <ExternalLink className="h-3.5 w-3.5" /></a>
              </div>
            </article>
          ))}
        </section>

        <footer className="rounded-2xl border border-slate-200 p-4 text-xs leading-5 text-slate-500 dark:border-midnight-border">Last scan: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString("en-NG") : "not available"}. External reporting can be late or wrong, so NaijaClimaGuard keeps source, time and wording visible instead of silently converting news into ground truth. Precise road closures require geolocated evidence; corroborated, named neighbourhoods can create broad route caution zones but not automatic road-closure claims.</footer>
      </div>
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value, detail, danger = false }: { icon: any; label: string; value: string | number; detail: string; danger?: boolean }) {
  return <div className={`glass-card rounded-2xl p-4 ${danger ? "border-crimson/20 bg-crimson/[0.03]" : ""}`}><div className="flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p><Icon className={`h-4 w-4 ${danger ? "text-crimson" : "text-radar"}`} /></div><p className={`mt-3 font-mono text-3xl font-bold ${danger ? "text-crimson" : ""}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}
