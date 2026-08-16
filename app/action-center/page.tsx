"use client";

import AppShell from "@/components/shared/AppShell";
import { useExperienceProfile, type ExperienceRole } from "@/components/shared/ExperienceProfile";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, Check, CheckCircle2,
  ClipboardCheck, ExternalLink, House, Landmark, Loader2, MapPin,
  RefreshCw, Share2, ShieldAlert, ShieldCheck, Sprout, TriangleAlert, WifiOff,
} from "lucide-react";

type Location = { id: string; name: string; state: string; latitude: number; longitude: number };
type RiskResponse = {
  risk: { score: number; level?: string; flood_type?: string };
  safety_state?: {
    active: boolean;
    level?: string;
    headline?: string | null;
    instruction?: string | null;
    authority?: string | null;
    sourceName?: string | null;
    observedAt?: string | null;
  };
  meta?: { model?: string; data_source?: string; generated_at?: string; source_note?: string };
};

type ActionStage = { label: string; timeframe: string; items: string[] };
type RolePlan = {
  title: string;
  subtitle: string;
  icon: typeof House;
  checklist: string[];
  stages: ActionStage[];
};

const ROLE_PLANS: Record<ExperienceRole, RolePlan> = {
  HOUSEHOLD: {
    title: "Home & family action plan",
    subtitle: "Turn a flood signal into a simple family plan before water reaches your door.",
    icon: House,
    checklist: [
      "Important documents and medicines are together in one grab-ready place.",
      "Everyone in the household knows who to call and where to meet if separated.",
      "Phones/power banks are charged and emergency contacts are written down offline.",
      "Valuables and electrical items can be moved above likely water level quickly.",
    ],
    stages: [
      { label: "Do first", timeframe: "Now", items: ["Check any official warning shown above before the model score.", "Tell the people in your household what the current situation is.", "Keep children and vulnerable people away from drains, channels and rising water."] },
      { label: "Prepare", timeframe: "Next 24 hours", items: ["Charge phones and power banks.", "Move documents, medicines and important items higher.", "Decide where you would go if an authority tells you to relocate; do not invent a route from this app."] },
      { label: "Escalate", timeframe: "If conditions worsen", items: ["Follow official evacuation/relocation instructions immediately.", "Do not drive or walk through floodwater.", "Report visible flooding so the community/agency layer has ground evidence."] },
    ],
  },
  FARMER: {
    title: "Farm protection plan",
    subtitle: "Prioritise people, livestock, inputs and movable farm assets before losses compound.",
    icon: Sprout,
    checklist: [
      "Livestock movement and safe holding arrangements are known in advance.",
      "Seed, fertiliser, chemicals, feed and records can be moved above likely water level.",
      "Farm workers know the stop-work and communication plan.",
      "Photos/inventory of major farm assets are stored for later evidence and claims.",
    ],
    stages: [
      { label: "Do first", timeframe: "Now", items: ["Check the official-warning overlay and rainfall risk together.", "Identify animals, stored inputs and equipment that would be hardest to replace.", "Tell workers not to cross flooded fields, culverts or roads."] },
      { label: "Prepare", timeframe: "Next 24 hours", items: ["Move portable inputs and records to higher/drier storage.", "Prepare livestock movement only to a location you already know is suitable.", "Photograph current stock and equipment condition for evidence."] },
      { label: "Escalate", timeframe: "If conditions worsen", items: ["Stop non-essential field work in exposed areas.", "Follow agricultural/emergency authority instructions.", "Submit a ground report if flooding reaches the farm so the event can be reviewed, not automatically treated as a model label."] },
    ],
  },
  BUSINESS: {
    title: "Business continuity plan",
    subtitle: "Protect staff first, then the operations and assets that keep the business alive.",
    icon: BriefcaseBusiness,
    checklist: [
      "A named person can activate the flood continuity plan when the trigger is reached.",
      "Staff communication and remote-work/closure instructions are prepared.",
      "Critical stock, servers, documents and power equipment have a higher-ground plan.",
      "Suppliers/customers have a backup communication path for disruption.",
    ],
    stages: [
      { label: "Do first", timeframe: "Now", items: ["Check whether an official advisory is active for the monitored location.", "Notify the person responsible for business continuity.", "Identify staff, inventory and critical systems in the most exposed area."] },
      { label: "Prepare", timeframe: "Next 24 hours", items: ["Move high-value movable stock and documents above expected exposure.", "Back up critical digital records and verify remote access.", "Prepare a closure/remote-work message before roads become unsafe."] },
      { label: "Escalate", timeframe: "If conditions worsen", items: ["Prioritise staff safety over protecting stock.", "Suspend operations that require travel through affected areas.", "Record decisions and losses in the evidence workflow for later audit/insurance discussions."] },
    ],
  },
  AGENCY: {
    title: "Early-action operations plan",
    subtitle: "Convert warning evidence into accountable decisions without editing or impersonating the issuing authority.",
    icon: Landmark,
    checklist: [
      "Duty operator and escalation contacts are assigned for the current shift.",
      "Official advisory source/freshness can be verified before actioning it.",
      "Priority communities/assets and communication channels are pre-identified.",
      "Every acknowledge/escalate/resolve action will be captured in the evidence ledger.",
    ],
    stages: [
      { label: "Do first", timeframe: "Now", items: ["Verify whether a fresh canonical official advisory is present.", "Review source health and identify missing/stale feeds instead of treating them as safe.", "Open the Agency Command Queue for any actionable advisory."] },
      { label: "Coordinate", timeframe: "Next operational cycle", items: ["Acknowledge and assign ownership of active cases.", "Use verified field reports as supporting evidence; pending reports are not official truth.", "Choose delivery channels and target areas without rewriting the authority's source message."] },
      { label: "Close the loop", timeframe: "After action", items: ["Record escalation/resolution in the append-only evidence flow.", "Review failed deliveries and unverified reports.", "Preserve misses and false alarms for post-event learning instead of deleting them."] },
    ],
  },
};

function riskBand(score: number, official: boolean) {
  if (official) return { label: "Official warning active", tone: "border-crimson/30 bg-crimson/5 text-crimson", action: "Follow the issuing authority now." };
  if (score >= 75) return { label: "Act now", tone: "border-red-400/30 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-300", action: "Treat conditions as very concerning and prepare for rapid change." };
  if (score >= 60) return { label: "Prepare now", tone: "border-orange-400/30 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-300", action: "Start the next actions now rather than waiting for visible flooding." };
  if (score >= 40) return { label: "Get ready", tone: "border-amber-400/30 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300", action: "Conditions are wetter; complete your readiness gaps." };
  return { label: "Keep watching", tone: "border-emerald-400/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300", action: "Risk signal is low, but official warnings and visible flooding still take priority." };
}

export default function ActionCenterPage() {
  const { role } = useExperienceProfile();
  const plan = ROLE_PLANS[role];
  const Icon = plan.icon;
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [risk, setRisk] = useState<RiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [checks, setChecks] = useState<boolean[]>([]);
  const storageKey = `naijaclimaguard.readiness.${role.toLowerCase()}`;

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    try { setChecks(stored ? JSON.parse(stored) : plan.checklist.map(() => false)); }
    catch { setChecks(plan.checklist.map(() => false)); }
  }, [plan.checklist, storageKey]);

  const saveChecks = (next: boolean[]) => {
    setChecks(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const loadRisk = useCallback(async (lat: number, lon: number) => {
    setChecking(true); setError("");
    try {
      const res = await fetch(`/api/v1/risk?latitude=${lat}&longitude=${lon}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Risk service unavailable");
      setRisk(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check this location");
    } finally { setChecking(false); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/locations", { cache: "no-store" });
        const data = await res.json();
        const list: Location[] = data.locations ?? data ?? [];
        setLocations(list);
        if (list[0]) {
          setSelected(list[0].id);
          await loadRisk(list[0].latitude, list[0].longitude);
        }
      } catch { setError("Saved places could not be loaded. You can still use current location."); }
      finally { setLoading(false); }
    })();
  }, [loadRisk]);

  const selectedLocation = locations.find((l) => l.id === selected);
  const changeLocation = async (id: string) => {
    setSelected(id);
    const loc = locations.find((item) => item.id === id);
    if (loc) await loadRisk(loc.latitude, loc.longitude);
  };

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) { setError("This device does not expose location services."); return; }
    setChecking(true); setError("");
    navigator.geolocation.getCurrentPosition(
      (p) => { setSelected(""); loadRisk(p.coords.latitude, p.coords.longitude); },
      () => { setChecking(false); setError("Location permission was not available. Choose a saved place instead."); },
      { timeout: 8000, maximumAge: 300000 }
    );
  };

  const completed = checks.filter(Boolean).length;
  const readiness = checks.length ? Math.round((completed / checks.length) * 100) : 0;
  const official = Boolean(risk?.safety_state?.active);
  const band = risk ? riskBand(risk.risk.score, official) : null;
  const generatedAt = useMemo(() => risk?.meta?.generated_at ? new Date(risk.meta.generated_at) : null, [risk?.meta?.generated_at]);

  const snapshotText = useMemo(() => {
    if (!risk || !band) return "";
    const place = selectedLocation ? `${selectedLocation.name}, ${selectedLocation.state}` : "my current location";
    const officialText = official
      ? `Official advisory active${risk.safety_state?.authority ? ` — ${risk.safety_state.authority}` : ""}.`
      : "No fresh connected official advisory was returned by the platform source store.";
    return `NaijaClimaGuard risk snapshot for ${place}: ${band.label}. Decision-support index ${risk.risk.score}/100 (not a probability). ${officialText} Checked ${generatedAt?.toLocaleString() ?? "now"}. Follow official warnings and visible local conditions over this snapshot.`;
  }, [risk, band, selectedLocation, official, generatedAt]);

  const shareSnapshot = async () => {
    if (!snapshotText) return;
    try {
      if (navigator.share) await navigator.share({ title: "NaijaClimaGuard risk snapshot", text: snapshotText, url: window.location.origin + "/my-area" });
      else { await navigator.clipboard.writeText(snapshotText); alert("Risk snapshot copied."); }
    } catch { /* user cancelled share */ }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-radar/20 bg-gradient-to-br from-radar/10 via-white to-cyan-50 p-5 shadow-sm dark:via-midnight-light dark:to-cyan-950/10 sm:p-7">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-radar/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-radar/20 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-radar dark:bg-midnight/70"><ClipboardCheck className="h-3.5 w-3.5" /> Action OS</div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Know the next move, not just the next number.</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">NaijaClimaGuard turns the same risk and official-warning evidence into a practical plan for your role. Your role changes the actions — never the underlying risk score.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/emergency-pack" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm dark:border-midnight-border dark:bg-midnight-light"><WifiOff className="h-4 w-4 text-radar" /> Offline emergency pack</Link>
              <Link href="/evidence" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"><BadgeCheck className="h-4 w-4" /> Evidence</Link>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <section className="glass-card rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Current decision state</p>
                <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-bold"><MapPin className="h-5 w-5 text-radar" /> {selectedLocation ? `${selectedLocation.name}, ${selectedLocation.state}` : "Current location"}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {locations.length > 0 && <select value={selected} onChange={(e) => changeLocation(e.target.value)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-midnight-border dark:bg-midnight-light"><option value="">Current location</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.state}</option>)}</select>}
                <button onClick={useCurrentLocation} disabled={checking} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold dark:border-midnight-border"><MapPin className="h-4 w-4" /> Use my location</button>
              </div>
            </div>

            {(loading || checking) && !risk ? <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-radar" /></div> : risk && band ? (
              <div className="mt-5 space-y-4">
                <div className={`rounded-2xl border p-5 ${band.tone}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      {official || risk.risk.score >= 60 ? <ShieldAlert className="mt-1 h-7 w-7 shrink-0" /> : <ShieldCheck className="mt-1 h-7 w-7 shrink-0" />}
                      <div><p className="text-xs font-bold uppercase tracking-wider opacity-70">What matters now</p><p className="mt-1 font-display text-2xl font-bold">{band.label}</p><p className="mt-1 max-w-xl text-sm leading-relaxed opacity-90">{official && risk.safety_state?.instruction ? risk.safety_state.instruction : band.action}</p></div>
                    </div>
                    <div className="min-w-28 rounded-2xl border border-current/10 bg-white/50 px-4 py-3 text-center dark:bg-midnight/30"><p className="text-3xl font-black tabular-nums">{risk.risk.score}</p><p className="text-[10px] font-bold uppercase tracking-wider opacity-70">decision index / 100</p></div>
                  </div>
                </div>

                {official && <div className="rounded-2xl border border-crimson/30 bg-crimson/5 p-4"><div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-crimson" /><div><p className="font-bold text-crimson">{risk.safety_state?.headline || "Official warning active"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{risk.safety_state?.authority ? `Authority: ${risk.safety_state.authority}. ` : ""}This safety state takes precedence in the user experience but does not rewrite the numeric model score.</p></div></div></div>}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-midnight-border"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live engine</p><p className="mt-1 text-sm font-bold">{risk.meta?.model || "derived-v2"}</p><p className="mt-1 text-xs text-slate-500">Decision-support index, not a calibrated flood probability.</p></div>
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-midnight-border"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Official overlay</p><p className="mt-1 text-sm font-bold">{official ? "Active" : "No connected fresh advisory"}</p><p className="mt-1 text-xs text-slate-500">Absence here does not mean no authority has warned elsewhere.</p></div>
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-midnight-border"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Checked</p><p className="mt-1 text-sm font-bold">{generatedAt ? generatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Now"}</p><p className="mt-1 text-xs text-slate-500">Use refresh when conditions are changing quickly.</p></div>
                </div>

                <div className="flex flex-wrap gap-2"><button onClick={() => selectedLocation && loadRisk(selectedLocation.latitude, selectedLocation.longitude)} disabled={!selectedLocation || checking} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold disabled:opacity-40 dark:border-midnight-border"><RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} /> Refresh</button><button onClick={shareSnapshot} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-radar px-4 text-sm font-semibold text-white"><Share2 className="h-4 w-4" /> Share risk snapshot</button></div>
              </div>
            ) : <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-midnight-border"><MapPin className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-semibold">Choose a saved place or use your current location.</p></div>}
            {error && <div className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">{error}</div>}
          </section>

          <section className="glass-card rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Preparedness</p><h2 className="mt-1 font-display text-xl font-bold">Readiness checklist</h2></div><div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(rgb(6 182 212) ${readiness * 3.6}deg, rgb(226 232 240 / .7) 0deg)` }}><div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-black dark:bg-midnight-light">{readiness}%</div></div></div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">This is a preparation score based only on the checklist below. It is <strong>not</strong> a flood probability or safety guarantee.</p>
            <div className="mt-5 space-y-2">{plan.checklist.map((item, index) => <button key={item} type="button" onClick={() => { const next = [...checks]; next[index] = !next[index]; saveChecks(next); }} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${checks[index] ? "border-radar/30 bg-radar/5" : "border-slate-200 dark:border-midnight-border"}`}><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${checks[index] ? "border-radar bg-radar text-white" : "border-slate-300"}`}>{checks[index] && <Check className="h-3.5 w-3.5" />}</span><span className={checks[index] ? "font-medium" : "text-slate-600 dark:text-slate-300"}>{item}</span></button>)}</div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-midnight/50">{completed === checks.length ? "Your basic checklist is complete. Keep it current as people, assets and contacts change." : `${checks.length - completed} readiness item${checks.length - completed === 1 ? "" : "s"} still open.`}</div>
          </section>
        </div>

        <section className="glass-card rounded-3xl p-5 sm:p-6">
          <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-radar/10 text-radar"><Icon className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-radar">Role-specific early action</p><h2 className="mt-1 font-display text-2xl font-bold">{plan.title}</h2><p className="mt-1 text-sm text-slate-500">{plan.subtitle}</p></div></div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">{plan.stages.map((stage, index) => <div key={stage.label} className="relative rounded-2xl border border-slate-200 p-5 dark:border-midnight-border"><div className="mb-4 flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-radar text-sm font-black text-white">{index + 1}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800">{stage.timeframe}</span></div><h3 className="font-display text-lg font-bold">{stage.label}</h3><ul className="mt-3 space-y-3">{stage.items.map((item) => <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-radar" />{item}</li>)}</ul></div>)}</div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/emergency-pack" className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-radar/30 hover:shadow-lg dark:border-midnight-border"><WifiOff className="h-6 w-6 text-radar" /><h3 className="mt-3 font-display text-lg font-bold">Offline emergency pack</h3><p className="mt-1 text-sm text-slate-500">Keep core flood-safety steps available after the page has been cached on your device.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-radar">Open pack <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>
          <Link href="/report" className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-radar/30 hover:shadow-lg dark:border-midnight-border"><MapPin className="h-6 w-6 text-radar" /><h3 className="mt-3 font-display text-lg font-bold">Ground truth loop</h3><p className="mt-1 text-sm text-slate-500">Report visible flooding. Reports stay pending until reviewed and never become automatic training labels.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-radar">Report conditions <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>
          <Link href={role === "AGENCY" ? "/command" : "/action"} className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-radar/30 hover:shadow-lg dark:border-midnight-border">{role === "AGENCY" ? <Landmark className="h-6 w-6 text-radar" /> : <Building2 className="h-6 w-6 text-radar" />}<h3 className="mt-3 font-display text-lg font-bold">{role === "AGENCY" ? "Agency command queue" : "Automatic warning delivery"}</h3><p className="mt-1 text-sm text-slate-500">{role === "AGENCY" ? "Acknowledge, escalate and resolve authenticated advisories without changing the source warning." : "Choose warning thresholds and verified Email/SMS/WhatsApp/Voice channels."}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-radar">Continue <ExternalLink className="h-4 w-4" /></span></Link>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500 dark:border-midnight-border dark:bg-midnight-light/50"><strong>Safety boundary:</strong> Action OS does not invent evacuation routes, shelter locations, river-gauge readings, partner feeds or calibrated flood probabilities. A connected fresh official advisory takes precedence in the user experience; visible local flooding and instructions received directly from authorities must never be ignored because of a low platform score.</div>
      </div>
    </AppShell>
  );
}
