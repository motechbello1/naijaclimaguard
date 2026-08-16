"use client";

import AppShell from "@/components/shared/AppShell";
import { AlertTriangle, Car, CheckCircle2, ExternalLink, LocateFixed, MapPin, Navigation, Route, ShieldAlert } from "lucide-react";
import { useState } from "react";

type RouteResult = {
  decision: string;
  safetyMessage: string;
  verifiedHazardsConsidered: number;
  origin: { label: string; latitude: number; longitude: number };
  destination: { label: string; latitude: number; longitude: number };
  bestRoute?: {
    distanceKm: number;
    durationMinutes: number;
    hazardIntersections: number;
    nearestVerifiedHazardMeters: number | null;
    hazardAreas: string[];
    roadNames: string[];
    navigationUrl: string;
  };
  alternatives?: Array<{ distanceKm: number; durationMinutes: number; hazardIntersections: number }>;
};

export default function SafeRoutePage() {
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [current, setCurrent] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RouteResult | null>(null);

  const useMyLocation = () => {
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => { setCurrent({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setOriginText("Current location"); setLocating(false); },
      () => { setError("We could not access your location. Type your starting point instead."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const plan = async () => {
    if ((!current && !originText.trim()) || !destinationText.trim()) { setError("Add a starting point and destination."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/safe-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current
          ? { origin: current, originLabel: "Current location", destinationText }
          : { originText, destinationText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not calculate route");
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not calculate route"); }
    finally { setLoading(false); }
  };

  const danger = result?.decision === "AVOID_TRAVEL";
  const positive = result?.decision === "LOWER_EXPOSURE_ROUTE_FOUND";

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-radar"><Navigation className="h-4 w-4" /> Flood-aware travel beta</div>
          <h1 className="font-display text-3xl font-bold">Find a lower-exposure route</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">NaijaClimaGuard compares driving alternatives against recent <strong>verified, geotagged flood reports</strong>. It will never mark a road closed from a vague news headline alone.</p>
        </header>

        <section className="glass-card rounded-2xl p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold">Starting point</label>
              <div className="flex gap-2"><input value={originText} onChange={(e) => { setOriginText(e.target.value); if (current) setCurrent(null); }} placeholder="e.g. Maitama, Abuja" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-radar dark:border-midnight-border dark:bg-midnight" /><button onClick={useMyLocation} type="button" title="Use my location" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-radar/20 bg-radar/5 text-radar"><LocateFixed className={`h-5 w-5 ${locating ? "animate-pulse" : ""}`} /></button></div>
              {current ? <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-radar"><MapPin className="h-3.5 w-3.5" /> Live location captured</p> : null}
            </div>
            <div><label className="mb-2 block text-sm font-bold">Destination</label><input value={destinationText} onChange={(e) => setDestinationText(e.target.value)} placeholder="e.g. Garki Area 1, Abuja" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-radar dark:border-midnight-border dark:bg-midnight" /></div>
          </div>
          <button onClick={plan} disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-radar px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50"><Route className="h-4 w-4" /> {loading ? "Checking routes against flood reports…" : "Check lower-exposure routes"}</button>
          {error ? <div className="mt-4 rounded-xl border border-crimson/20 bg-crimson/5 p-3 text-sm text-crimson">{error}</div> : null}
        </section>

        {result ? (
          <section className={`rounded-2xl border p-5 sm:p-6 ${danger ? "border-crimson/30 bg-crimson/5" : positive ? "border-radar/30 bg-radar/5" : "border-amber/30 bg-amber/5"}`}>
            <div className="flex items-start gap-3">{danger ? <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-crimson" /> : positive ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-radar" /> : <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber" />}<div className="min-w-0 flex-1"><h2 className="font-display text-xl font-bold">{danger ? "Avoid travel on the returned routes" : positive ? "Lower-exposure route found" : result.decision === "NO_VERIFIED_HAZARDS" ? "No verified route hazard is currently stored" : "Use caution"}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{result.safetyMessage}</p></div></div>

            {result.bestRoute ? <div className="mt-5 grid gap-3 sm:grid-cols-4"><Stat label="Drive time" value={`${result.bestRoute.durationMinutes} min`} /><Stat label="Distance" value={`${result.bestRoute.distanceKm} km`} /><Stat label="Flood intersections" value={result.bestRoute.hazardIntersections} /><Stat label="Verified reports checked" value={result.verifiedHazardsConsidered} /></div> : null}

            {result.bestRoute?.roadNames?.length ? <div className="mt-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Main roads on suggested candidate</p><p className="mt-2 text-sm leading-6">{result.bestRoute.roadNames.join(" → ")}</p></div> : null}
            {result.bestRoute?.hazardAreas?.length ? <div className="mt-4 rounded-xl border border-crimson/20 bg-white/50 p-3 text-sm dark:bg-midnight/40"><strong>Nearby verified flood reports:</strong> {result.bestRoute.hazardAreas.join(", ")}</div> : null}
            {result.bestRoute?.navigationUrl && !danger ? <a href={result.bestRoute.navigationUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-950"><Car className="h-4 w-4" /> Open route in Google Maps <ExternalLink className="h-3.5 w-3.5" /></a> : null}
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 p-4 text-xs leading-5 text-slate-500 dark:border-midnight-border"><strong>Safety rule:</strong> this is a decision-support beta, not a guarantee that a road is passable. Do not drive into visible floodwater. A verified report can protect a route immediately; news reports remain district/state evidence until a road can be geolocated reliably. The public OSRM/OpenStreetMap routing provider is suitable for testing, not yet the final national-scale routing contract.</section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-midnight-border dark:bg-midnight/60"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-mono text-lg font-bold">{value}</p></div>; }
