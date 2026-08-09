"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  History,
  RadioTower,
  ServerCrash,
  ShieldAlert,
} from "lucide-react";
import { INTELLIGENCE_SOURCES, SourceState, sourceStateLabel } from "@/lib/intelligence/source-registry";

const STATE_STYLE: Record<SourceState, { icon: typeof CheckCircle2; cls: string }> = {
  LIVE: { icon: CheckCircle2, cls: "text-radar" },
  VALIDATING: { icon: Activity, cls: "text-cyan" },
  ADAPTER_READY: { icon: RadioTower, cls: "text-amber" },
  NOT_CONNECTED: { icon: CircleDashed, cls: "text-slate-400" },
};

type PartnerHealth = "fresh" | "stale" | "suspect" | "missing";
interface PartnerSource {
  slug: string;
  provider: string;
  name: string;
  sourceKind: string;
  freshnessMinutes: number;
  health: PartnerHealth;
  ageMinutes: number | null;
  latest: null | {
    observedAt: string;
    receivedAt: string;
    qualityStatus: string;
    variable: string;
    unit: string;
    value: unknown;
  };
}

const HEALTH_STYLE: Record<PartnerHealth, string> = {
  fresh: "text-radar",
  stale: "text-amber",
  suspect: "text-crimson",
  missing: "text-slate-400",
};

export default function MultiSourceIntelligencePanel({ technical = false }: { technical?: boolean }) {
  const live = INTELLIGENCE_SOURCES.filter((source) => source.state === "LIVE").length;
  const validating = INTELLIGENCE_SOURCES.filter((source) => source.state === "VALIDATING").length;
  const ready = INTELLIGENCE_SOURCES.filter((source) => source.state === "ADAPTER_READY").length;
  const [partnerSources, setPartnerSources] = useState<PartnerSource[]>([]);
  const [partnerStoreState, setPartnerStoreState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/intelligence/health", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok || !data.operational) {
          setPartnerSources([]);
          setPartnerStoreState("unavailable");
          return;
        }
        setPartnerSources(Array.isArray(data.sources) ? data.sources : []);
        setPartnerStoreState("ready");
      })
      .catch(() => {
        if (!cancelled) setPartnerStoreState("unavailable");
      });
    return () => { cancelled = true; };
  }, []);

  const sourceAttention = useMemo(
    () => partnerSources.filter((source) => source.health !== "fresh").length,
    [partnerSources],
  );
  const freshPartners = partnerSources.filter((source) => source.health === "fresh").length;

  const readiness = partnerStoreState === "loading"
    ? { label: "CHECKING SYSTEM", cls: "border-slate-200 bg-slate-50 text-slate-600 dark:border-midnight-border dark:bg-midnight-light", icon: Activity }
    : partnerStoreState === "unavailable"
      ? { label: "SETUP REQUIRED", cls: "border-crimson/30 bg-crimson/5 text-crimson", icon: ServerCrash }
      : sourceAttention > 0
        ? { label: "ATTENTION NEEDED", cls: "border-amber/30 bg-amber/5 text-amber", icon: AlertTriangle }
        : partnerSources.length > 0
          ? { label: "OPERATIONAL", cls: "border-radar/30 bg-radar/5 text-radar", icon: CheckCircle2 }
          : { label: "READY FOR FIRST FEED", cls: "border-cyan/30 bg-cyan/5 text-cyan", icon: RadioTower };
  const ReadinessIcon = readiness.icon;

  return (
    <section className="space-y-4">
      <div className={`rounded-2xl border p-5 sm:p-6 ${readiness.cls}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ReadinessIcon className="mt-0.5 h-6 w-6 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em]">Enterprise operational readiness</p>
              <h2 className="mt-1 text-xl font-black sm:text-2xl">{readiness.label}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed opacity-80">
                {partnerStoreState === "unavailable"
                  ? "The application is running, but the canonical partner-source database tables are not active in this environment yet. Gauge, dam and official-advisory feeds are therefore never presented as connected or safe by assumption."
                  : partnerSources.length === 0
                    ? "The command layer is ready. Register the first authorised gauge, IoT, dam-operation or official-advisory source to begin live partner monitoring."
                    : sourceAttention > 0
                      ? `${sourceAttention} connected source${sourceAttention === 1 ? " needs" : "s need"} attention because data is stale, suspect or missing.`
                      : `All ${freshPartners} connected partner feed${freshPartners === 1 ? " is" : "s are"} currently inside the configured freshness window.`}
              </p>
            </div>
          </div>
          <div className="grid min-w-[210px] grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/60 px-3 py-2 dark:bg-black/10"><p className="text-xl font-black">{partnerSources.length}</p><p className="text-[9px] font-bold uppercase tracking-wider opacity-60">Connected</p></div>
            <div className="rounded-xl bg-white/60 px-3 py-2 dark:bg-black/10"><p className="text-xl font-black">{freshPartners}</p><p className="text-[9px] font-bold uppercase tracking-wider opacity-60">Fresh</p></div>
            <div className="rounded-xl bg-white/60 px-3 py-2 dark:bg-black/10"><p className="text-xl font-black">{sourceAttention}</p><p className="text-[9px] font-bold uppercase tracking-wider opacity-60">Attention</p></div>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/command" className="rounded-xl border border-current/15 bg-white/60 p-3 transition-transform hover:-translate-y-0.5 dark:bg-black/10">
            <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /><span className="text-sm font-bold">Command Queue</span></div>
            <p className="mt-1 text-[11px] opacity-70">Acknowledge, escalate and resolve official advisory cases.</p>
          </Link>
          <Link href="/action" className="rounded-xl border border-current/15 bg-white/60 p-3 transition-transform hover:-translate-y-0.5 dark:bg-black/10">
            <div className="flex items-center gap-2"><BellRing className="h-4 w-4" /><span className="text-sm font-bold">Warning Delivery</span></div>
            <p className="mt-1 text-[11px] opacity-70">Manage alert rules and verified delivery channels.</p>
          </Link>
          <Link href="/evidence" className="rounded-xl border border-current/15 bg-white/60 p-3 transition-transform hover:-translate-y-0.5 dark:bg-black/10">
            <div className="flex items-center gap-2"><History className="h-4 w-4" /><span className="text-sm font-bold">Operational Evidence</span></div>
            <p className="mt-1 text-[11px] opacity-70">Inspect warning, delivery and action history.</p>
          </Link>
          <Link href="/profile" className="rounded-xl border border-current/15 bg-white/60 p-3 transition-transform hover:-translate-y-0.5 dark:bg-black/10">
            <div className="flex items-center gap-2"><RadioTower className="h-4 w-4" /><span className="text-sm font-bold">Delivery Setup</span></div>
            <p className="mt-1 text-[11px] opacity-70">Verify phone and configure available channels.</p>
          </Link>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-radar">Multi-source flood intelligence</p>
            <h2 className="mt-1 text-lg font-bold">Source coverage & readiness</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              NaijaClimaGuard does not treat rainfall as the whole flood picture. This panel shows which inputs are live today, which are being scientifically validated, and which require an authorised partner feed before they can influence decisions.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full border border-radar/30 bg-radar/5 px-2.5 py-1 font-semibold text-radar">{live} live</span>
            <span className="rounded-full border border-cyan/30 bg-cyan/5 px-2.5 py-1 font-semibold text-cyan">{validating} validating</span>
            <span className="rounded-full border border-amber/30 bg-amber/5 px-2.5 py-1 font-semibold text-amber">{ready} integration ready</span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {INTELLIGENCE_SOURCES.map((source) => {
            const style = STATE_STYLE[source.state];
            const Icon = style.icon;
            return (
              <article key={source.id} className="rounded-xl border border-slate-100 p-4 dark:border-midnight-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.cls}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{source.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{source.purpose}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${style.cls}`}>{sourceStateLabel(source.state)}</span>
                </div>
                {technical && (
                  <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-500 dark:border-midnight-border">
                    <p><strong>Coverage:</strong> {source.coverage}</p>
                    {source.authority && <p className="mt-1"><strong>Source/authority:</strong> {source.authority}</p>}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-midnight-border">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Connected partner feeds</p>
              <p className="mt-1 text-xs text-slate-500">Actual registered gauge, sensor, dam or advisory streams appear here only after the canonical source store is enabled and data has been received.</p>
            </div>
            {partnerStoreState === "loading" && <span className="text-xs text-slate-400">Checking…</span>}
          </div>

          {partnerStoreState === "unavailable" && (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-midnight-light">
              Partner source storage is not operational yet. This is not treated as “safe” or as zero risk; the dashboard continues to show these feeds as unconnected until the database migration and authorised source credentials are deliberately enabled.
            </p>
          )}

          {partnerStoreState === "ready" && partnerSources.length === 0 && (
            <p className="mt-3 text-xs text-slate-500">No partner feeds have been registered yet.</p>
          )}

          {partnerSources.length > 0 && (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {partnerSources.map((source) => (
                <div key={source.slug} className="rounded-lg border border-slate-100 p-3 dark:border-midnight-border">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{source.name}</p>
                      <p className="text-[11px] text-slate-500">{source.provider} · {source.sourceKind.replaceAll("_", " ").toLowerCase()}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase ${HEALTH_STYLE[source.health]}`}>{source.health}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {source.latest ? `Latest observation ${source.ageMinutes ?? 0} min ago · ${source.latest.variable}` : "No observations received yet."}
                  </p>
                  {technical && source.latest && <p className="mt-1 font-mono text-[10px] text-slate-400">Freshness window: {source.freshnessMinutes} min · observed {source.latest.observedAt}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber/20 bg-amber/5 p-4">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <strong>Safety rule:</strong> an authenticated official emergency warning overrides a low model score in the user-facing safety state without changing the underlying model score. Missing sources reduce confidence; they are never silently treated as normal or safe conditions.
          </p>
        </div>

        <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-xs leading-relaxed text-slate-500 dark:border-midnight-border">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Integration-ready does not mean connected. River gauges, dam operations and official advisories require authoritative partner access before NaijaClimaGuard will label them live.
        </div>
      </div>
    </section>
  );
}
