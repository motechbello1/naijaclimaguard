"use client";

/**
 * Overview — real live-risk command view of YOUR saved locations.
 * Each location's score is fetched live from our own public API
 * (/api/v1/risk) — the dashboard is the first consumer of the product.
 * No hardcoded state risk table. No invented numbers.
 */

import AppShell from "@/components/shared/AppShell";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useCallback } from "react";
import { MapPin, Plus, Trash2, Crown, Zap, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getRiskLevel } from "@/lib/data";

interface LocationData {
  id: string; name: string; state: string; latitude: number; longitude: number; alerts?: any[];
}
interface LiveRisk { score: number; level: string; model: string; }

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  PROFESSIONAL: "bg-radar/10 text-radar",
  ENTERPRISE: "bg-amber/10 text-amber",
};

// Quick-add presets: the six monitored flood-prone stations
const PRESETS = [
  { name: "Lokoja", state: "Kogi", latitude: 7.8023, longitude: 6.7333 },
  { name: "Makurdi", state: "Benue", latitude: 7.7322, longitude: 8.5391 },
  { name: "Onitsha", state: "Anambra", latitude: 6.1407, longitude: 6.7869 },
  { name: "Yenagoa", state: "Bayelsa", latitude: 4.9247, longitude: 6.2642 },
];

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [risks, setRisks] = useState<Record<string, LiveRisk | "loading" | "error">>({});
  const [limit, setLimit] = useState(3);
  const [plan, setPlan] = useState("FREE");
  const [showAdd, setShowAdd] = useState(false);
  const [newLoc, setNewLoc] = useState({ name: "", state: "", latitude: "", longitude: "" });
  const [addErr, setAddErr] = useState("");

  const paymentStatus = searchParams.get("payment");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchRisk = useCallback(async (loc: LocationData) => {
    setRisks((p) => ({ ...p, [loc.id]: "loading" }));
    try {
      const res = await fetch(`/api/v1/risk?latitude=${loc.latitude}&longitude=${loc.longitude}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setRisks((p) => ({ ...p, [loc.id]: { score: d.risk.score, level: d.risk.level, model: d.meta.model } }));
    } catch {
      setRisks((p) => ({ ...p, [loc.id]: "error" }));
    }
  }, []);

  const loadLocations = useCallback(() => {
    fetch("/api/locations").then((r) => r.json()).then((data) => {
      const locs: LocationData[] = data.locations || [];
      setLocations(locs);
      setLimit(data.limit || 3);
      setPlan(data.plan || "FREE");
      locs.forEach(fetchRisk);
    });
  }, [fetchRisk]);

  useEffect(() => {
    if (status === "authenticated") loadLocations();
  }, [status, loadLocations]);

  const addLocation = async (preset?: typeof PRESETS[number]) => {
    setAddErr("");
    const body = preset ?? {
      name: newLoc.name, state: newLoc.state,
      latitude: parseFloat(newLoc.latitude), longitude: parseFloat(newLoc.longitude),
    };
    const res = await fetch("/api/locations", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setLocations((prev) => [data.location, ...prev]);
      fetchRisk(data.location);
      setNewLoc({ name: "", state: "", latitude: "", longitude: "" });
      setShowAdd(false);
    } else setAddErr(data.error);
  };

  const deleteLocation = async (id: string) => {
    await fetch(`/api/locations?id=${id}`, { method: "DELETE" });
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  if (status === "loading")
    return (
      <AppShell><div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-radar border-t-transparent" />
      </div></AppShell>
    );
  if (!session) return null;

  const scored = Object.values(risks).filter((r): r is LiveRisk => typeof r === "object");
  const peak = scored.length ? Math.max(...scored.map((r) => r.score)) : null;
  const usingML = scored.some((r) => r.model === "xgboost-v2");

  return (
    <AppShell>
      <div className="space-y-6">
        {paymentStatus === "success" && (
          <div className="flex items-center gap-2 rounded-xl border border-radar/30 bg-radar/5 p-4 text-sm animate-slide-up">
            <CheckCircle2 className="h-4 w-4 text-radar" /> Payment successful — your plan has been upgraded.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">
              Welcome back{session.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Live risk for your saved locations — powered by our own public API
            </p>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${PLAN_COLORS[plan] ?? PLAN_COLORS.FREE}`}>
            <Crown className="h-3 w-3" /> {plan}
          </span>
        </div>

        {/* Live summary strip */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="glass-card rounded-xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Your peak risk</p>
            <p className="mt-1 font-mono text-xl font-bold" style={peak !== null ? { color: getRiskLevel(peak).color } : {}}>
              {peak !== null ? `${peak}/100` : "—"}
            </p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Locations</p>
            <p className="mt-1 font-mono text-xl font-bold">{locations.length} <span className="text-xs text-slate-500">/ {limit}</span></p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Risk engine</p>
            <p className={`mt-1 font-mono text-sm font-bold ${usingML ? "text-radar" : "text-cyan"}`}>
              {usingML ? "XGBoost · live" : "Derived · live data"}
            </p>
          </div>
          <Link href="/action" className="glass-card rounded-xl p-4 transition-all hover:border-radar/30">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Alerts</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-sm font-bold text-radar">
              <Zap className="h-3.5 w-3.5" /> Manage rules →
            </p>
          </Link>
        </div>

        {/* Location cards with LIVE risk */}
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Your locations — live risk</h2>
            <button onClick={() => setShowAdd((s) => !s)}
              className="flex items-center gap-1.5 rounded-lg border border-radar/40 px-3 py-1.5 text-xs font-semibold text-radar transition-all hover:bg-radar/5">
              <Plus className="h-3.5 w-3.5" /> Add location
            </button>
          </div>

          {showAdd && (
            <div className="mb-5 rounded-xl border border-slate-100 p-4 dark:border-midnight-border animate-slide-down">
              <p className="mb-2 text-xs text-slate-500">Quick add a monitored station:</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button key={p.name} onClick={() => addLocation(p)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold transition-all hover:border-radar/40 dark:border-midnight-border">
                    {p.name} · {p.state}
                  </button>
                ))}
              </div>
              <p className="mb-2 text-xs text-slate-500">Or enter custom coordinates:</p>
              <div className="grid gap-2 sm:grid-cols-5">
                {(["name", "state", "latitude", "longitude"] as const).map((f) => (
                  <input key={f} placeholder={f} value={(newLoc as any)[f]}
                    onChange={(e) => setNewLoc((p) => ({ ...p, [f]: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-radar focus:outline-none dark:border-midnight-border dark:bg-midnight-light" />
                ))}
                <button onClick={() => addLocation()}
                  className="rounded-lg bg-radar px-3 py-2 text-sm font-semibold text-white transition-all hover:brightness-110">
                  Save
                </button>
              </div>
              {addErr && <p className="mt-2 text-xs text-crimson">{addErr}</p>}
            </div>
          )}

          {locations.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No locations yet. Add one above — live risk appears instantly.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {locations.map((loc) => {
                const r = risks[loc.id];
                return (
                  <div key={loc.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-midnight-border">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold">{loc.name}</p>
                        <p className="font-mono text-xs text-slate-500">{loc.state} · {loc.latitude.toFixed(3)}, {loc.longitude.toFixed(3)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {r === "loading" || r === undefined ? (
                        <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/60" />
                      ) : r === "error" ? (
                        <button onClick={() => fetchRisk(loc)} title="Feed unreachable — retry"
                          className="flex items-center gap-1 font-mono text-xs text-slate-400 hover:text-radar">
                          <AlertTriangle className="h-3.5 w-3.5" /> retry
                        </button>
                      ) : (
                        <div className="text-right">
                          <p className="font-mono text-lg font-bold" style={{ color: getRiskLevel(r.score).color }}>{r.score}</p>
                          <p className="font-mono text-[10px] uppercase" style={{ color: getRiskLevel(r.score).color }}>{r.level}</p>
                        </div>
                      )}
                      <button onClick={() => fetchRisk(loc)} title="Refresh live risk"
                        className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-all hover:border-radar/40 hover:text-radar dark:border-midnight-border">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteLocation(loc.id)} title="Remove"
                        className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-all hover:border-crimson/40 hover:text-crimson dark:border-midnight-border">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
