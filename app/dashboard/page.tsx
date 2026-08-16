"use client";

import AppShell from "@/components/shared/AppShell";
import RiverineWatchEvidence from "@/components/shared/RiverineWatchEvidence";
import { useNationalArea } from "@/components/shared/NationalArea";
import AdaptiveDashboard, { LocationData, LiveRisk } from "@/components/dashboard/AdaptiveDashboard";
import ActionOSBanner from "@/components/dashboard/ActionOSBanner";
import { NIGERIA_ADMIN_AREAS } from "@/lib/nigeria-geography";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

function DashboardContent() {
  const { data: session, status } = useSession();
  const { area } = useNationalArea();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [risks, setRisks] = useState<Record<string, LiveRisk | "loading" | "error">>({});
  const [limit, setLimit] = useState(3);
  const [plan, setPlan] = useState("FREE");
  const [showAdd, setShowAdd] = useState(false);
  const [newLoc, setNewLoc] = useState({ name: "", state: area.name, latitude: "", longitude: "" });
  const [addErr, setAddErr] = useState("");
  const paymentStatus = searchParams.get("payment");

  useEffect(() => {
    setNewLoc((current) => ({ ...current, state: area.name }));
  }, [area.name]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchRisk = useCallback(async (loc: LocationData) => {
    setRisks((current) => ({ ...current, [loc.id]: "loading" }));
    try {
      const response = await fetch(`/api/v1/risk?latitude=${loc.latitude}&longitude=${loc.longitude}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRisks((current) => ({ ...current, [loc.id]: { score: data.risk.score, level: data.risk.level, model: data.meta.model, safety: data.safety_state } }));
    } catch {
      setRisks((current) => ({ ...current, [loc.id]: "error" }));
    }
  }, []);

  const loadLocations = useCallback(() => {
    fetch("/api/locations")
      .then((response) => response.json())
      .then((data) => {
        const saved: LocationData[] = data.locations || [];
        setLocations(saved);
        setLimit(data.limit || 3);
        setPlan(data.plan || "FREE");
        saved.forEach(fetchRisk);
      });
  }, [fetchRisk]);

  useEffect(() => { if (status === "authenticated") loadLocations(); }, [status, loadLocations]);

  const addLocation = async (preset?: { name: string; state: string; latitude: number; longitude: number }) => {
    setAddErr("");
    const body = preset ?? { name: newLoc.name, state: newLoc.state, latitude: parseFloat(newLoc.latitude), longitude: parseFloat(newLoc.longitude) };
    const validArea = NIGERIA_ADMIN_AREAS.some((item) => item.name === body.state);

    if (!body.name || !body.state || !validArea || !Number.isFinite(body.latitude) || !Number.isFinite(body.longitude)) {
      setAddErr("Add a place name, choose a valid Nigerian state or the FCT, then share your current location or enter valid coordinates.");
      return;
    }

    const response = await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (response.ok) {
      setLocations((current) => [data.location, ...current]);
      fetchRisk(data.location);
      setNewLoc({ name: "", state: area.name, latitude: "", longitude: "" });
      setShowAdd(false);
    } else {
      setAddErr(data.error || "Could not save this place.");
    }
  };

  const deleteLocation = async (id: string) => {
    await fetch(`/api/locations?id=${id}`, { method: "DELETE" });
    window.localStorage.removeItem(`naijaclimaguard.asset-profile.${id}`);
    setLocations((current) => current.filter((location) => location.id !== id));
  };

  if (status === "loading") return <AppShell><div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-radar border-t-transparent" /></div></AppShell>;
  if (!session) return null;

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="rounded-[2rem] bg-[#071713] p-6 text-white sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d9ff57]">{area.zone} · National workspace</p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div><h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl">{area.name}</h1><p className="mt-2 max-w-2xl text-sm text-white/60">Your working area organises the experience. Every risk result still belongs to an exact saved coordinate, not an invented state-wide forecast.</p></div>
            <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-black">36 states + FCT</div>
          </div>
        </div>
        <ActionOSBanner />
        <RiverineWatchEvidence compact />
        <AdaptiveDashboard userName={session.user?.name} paymentStatus={paymentStatus} locations={locations} risks={risks} limit={limit} plan={plan} showAdd={showAdd} setShowAdd={setShowAdd} newLoc={newLoc} setNewLoc={setNewLoc} addErr={addErr} addLocation={addLocation} deleteLocation={deleteLocation} fetchRisk={fetchRisk} />
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return <Suspense fallback={null}><DashboardContent /></Suspense>;
}