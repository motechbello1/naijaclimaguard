"use client";

import AppShell from "@/components/shared/AppShell";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Activity, TrendingUp, CloudRain, Bell, MapPin, ArrowRight, Plus, Trash2, Crown } from "lucide-react";
import Link from "next/link";
import { getRiskLevel } from "@/lib/data";

interface LocationData {
  id: string; name: string; state: string; latitude: number; longitude: number; alerts: any[];
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  PROFESSIONAL: "bg-radar/10 text-radar",
  ENTERPRISE: "bg-amber/10 text-amber",
};

const STATE_RISK: Record<string, number> = {
  Kogi: 67, Anambra: 52, Lagos: 48, Rivers: 63, Bayelsa: 71, Delta: 58, Niger: 61, Benue: 55,
};

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [limit, setLimit] = useState(3);
  const [plan, setPlan] = useState("FREE");
  const [showAdd, setShowAdd] = useState(false);
  const [newLoc, setNewLoc] = useState({ name: "", state: "", latitude: "", longitude: "" });

  const paymentStatus = searchParams.get("payment");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/locations").then((r) => r.json()).then((data) => {
        setLocations(data.locations || []);
        setLimit(data.limit || 3);
        setPlan(data.plan || "FREE");
      });
    }
  }, [status]);

  const addLocation = async () => {
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newLoc, latitude: parseFloat(newLoc.latitude), longitude: parseFloat(newLoc.longitude) }),
    });
    const data = await res.json();
    if (res.ok) {
      setLocations((prev) => [data.location, ...prev]);
      setNewLoc({ name: "", state: "", latitude: "", longitude: "" });
      setShowAdd(false);
    } else {
      alert(data.error);
    }
  };

  const deleteLocation = async (id: string) => {
    if (!confirm("Delete this location?")) return;
    await fetch(`/api/locations?id=${id}`, { method: "DELETE" });
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  if (status === "loading") return <AppShell><div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-radar border-t-transparent rounded-full" /></div></AppShell>;
  if (!session) return null;

  const user = session.user as any;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header with plan badge */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold">Risk Dashboard</h1>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PLAN_COLORS[plan]}`}>
                <Crown className="h-3 w-3 inline mr-1" />{plan}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Welcome back, {user?.name || user?.email}</p>
          </div>
          <Link href="/predict" className="flex items-center gap-2 text-sm text-radar font-medium hover:underline">
            Open Prediction Map <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Payment success message */}
        {paymentStatus === "success" && (
          <div className="rounded-xl bg-radar/10 border border-radar/20 p-4 text-sm text-radar flex items-center gap-2">
            <Crown className="h-4 w-4" /> Payment successful! Your plan has been upgraded. Please log out and log back in to see changes.
          </div>
        )}

        {paymentStatus === "failed" && (
          <div className="rounded-xl bg-crimson/10 border border-crimson/20 p-4 text-sm text-crimson">
            Payment was not completed. Please try again or contact support.
          </div>
        )}

        {/* Upgrade banner for FREE users */}
        {plan === "FREE" && (
          <div className="glass-card rounded-xl p-6 border-2 border-radar/20 bg-gradient-to-r from-radar/5 to-cyan/5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold">Upgrade to Professional</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Get 50 locations, hourly updates, 72-hour forecasts, full API access, and PDF reports — ₦15,000/month
                </p>
              </div>
              <button
                onClick={() => {
                  const email = prompt("Enter your email to upgrade:");
                  if (email) {
                    fetch("/api/payment/initialize", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email, plan: "professional" }),
                    })
                      .then((r) => r.json())
                      .then((data) => {
                        if (data.authorization_url) window.location.href = data.authorization_url;
                        else alert("Error: " + (data.error || "Payment failed"));
                      })
                      .catch(() => alert("Could not connect to payment service"));
                  }
                }}
                className="shrink-0 rounded-xl bg-radar px-6 py-3 text-sm font-semibold text-white hover:bg-radar/90 shadow-lg shadow-radar/20 transition-all"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/50"><MapPin className="h-5 w-5 text-radar" /></div>
              <div><p className="text-xs text-slate-400">Locations</p><p className="text-xl font-display font-bold text-radar">{locations.length}/{limit}</p></div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/50"><Bell className="h-5 w-5 text-cyan" /></div>
              <div><p className="text-xs text-slate-400">Active Alerts</p><p className="text-xl font-display font-bold text-cyan">{locations.reduce((a, l) => a + (l.alerts?.length || 0), 0)}</p></div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/50"><TrendingUp className="h-5 w-5 text-crimson" /></div>
              <div><p className="text-xs text-slate-400">Highest Risk</p><p className="text-xl font-display font-bold text-crimson">{locations.length > 0 ? locations.reduce((max, l) => (STATE_RISK[l.state] || 0) > (STATE_RISK[max.state] || 0) ? l : max, locations[0]).state : "—"}</p></div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/50"><Activity className="h-5 w-5 text-amber" /></div>
              <div><p className="text-xs text-slate-400">Plan</p><p className="text-xl font-display font-bold">{plan}</p></div>
            </div>
          </div>
        </div>

        {/* Locations */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider">Your Monitored Locations ({locations.length}/{limit})</h2>
            <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 rounded-lg bg-radar/10 border border-radar/20 px-3 py-1.5 text-xs font-medium text-radar hover:bg-radar/15 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Location
            </button>
          </div>

          {showAdd && (
            <div className="mb-6 p-4 rounded-lg bg-slate-50 dark:bg-midnight border border-slate-200 dark:border-midnight-border">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <input type="text" placeholder="Location name" value={newLoc.name} onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })} className="rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light px-3 py-2 text-sm focus:border-radar focus:outline-none" />
                <input type="text" placeholder="State (e.g. Kogi)" value={newLoc.state} onChange={(e) => setNewLoc({ ...newLoc, state: e.target.value })} className="rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light px-3 py-2 text-sm focus:border-radar focus:outline-none" />
                <input type="number" step="any" placeholder="Latitude" value={newLoc.latitude} onChange={(e) => setNewLoc({ ...newLoc, latitude: e.target.value })} className="rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light px-3 py-2 text-sm focus:border-radar focus:outline-none" />
                <input type="number" step="any" placeholder="Longitude" value={newLoc.longitude} onChange={(e) => setNewLoc({ ...newLoc, longitude: e.target.value })} className="rounded-lg border border-slate-200 dark:border-midnight-border bg-white dark:bg-midnight-light px-3 py-2 text-sm focus:border-radar focus:outline-none" />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                <button onClick={addLocation} className="rounded-lg bg-radar px-4 py-1.5 text-xs font-semibold text-white hover:bg-radar/90">Save</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {locations.map((loc) => {
              const risk = getRiskLevel(STATE_RISK[loc.state] || 30);
              const score = STATE_RISK[loc.state] || 30;
              return (
                <div key={loc.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <div>
                      <span className="text-sm font-medium">{loc.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{loc.state}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${score}%`, background: risk.color }} />
                    </div>
                    <span className="text-sm font-bold font-mono w-8 text-right" style={{ color: risk.color }}>{score}</span>
                    <button onClick={() => deleteLocation(loc.id)} className="text-slate-300 hover:text-crimson transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
            {locations.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No locations yet. Click &quot;Add Location&quot; to start monitoring.</p>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { href: "/predict", title: "Layer 1: Predict", desc: "72-hour hydrological forecast", icon: MapPin },
            { href: "/action", title: "Layer 2: Action", desc: "Early warning & grid protection", icon: Bell },
            { href: "/prove", title: "Layer 3: Prove", desc: "Impact ledger & audit reports", icon: Activity },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="glass-card rounded-xl p-6 block hover:border-radar/30 transition-all group">
              <link.icon className="h-5 w-5 text-radar mb-3" />
              <h3 className="font-display text-base font-bold group-hover:text-radar transition-colors">{link.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<AppShell><div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-radar border-t-transparent rounded-full" /></div></AppShell>}>
      <DashboardContent />
    </Suspense>
  );
}