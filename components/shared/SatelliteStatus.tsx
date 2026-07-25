"use client";

import { useState, useEffect, useCallback } from "react";
import { Satellite, SatelliteDish } from "lucide-react";

type FeedState = "checking" | "live" | "offline";

/**
 * Real data-feed health check — no hardcoded status.
 * Pings Open-Meteo (our upstream weather source) every 60s.
 * Shows exactly what is true: Live (with last-sync time) or Offline.
 */
export default function SatelliteStatus() {
  const [state, setState] = useState<FeedState>("checking");
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=7.80&longitude=6.73&daily=precipitation_sum&forecast_days=1&timezone=Africa%2FLagos",
        { cache: "no-store" }
      );
      if (res.ok) {
        setState("live");
        setLastSync(new Date());
      } else {
        setState("offline");
      }
    } catch {
      setState("offline");
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [check]);

  const live = state === "live";
  const checking = state === "checking";

  return (
    <div
      className={`flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 transition-colors duration-300 ${
        live
          ? "border-radar/20 bg-radar/5"
          : checking
          ? "border-amber/20 bg-amber/5"
          : "border-slate-300 dark:border-midnight-border bg-slate-50 dark:bg-slate-800/40"
      }`}
      title={
        live && lastSync
          ? `Weather feed verified at ${lastSync.toLocaleTimeString()}`
          : checking
          ? "Verifying weather data feed…"
          : "Weather data feed unreachable — retrying every 60s"
      }
    >
      <span className="relative flex h-2 w-2">
        {live && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-radar opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            live ? "bg-radar" : checking ? "bg-amber" : "bg-slate-400"
          }`}
        />
      </span>
      {live ? (
        <Satellite className="h-3.5 w-3.5 text-radar" />
      ) : (
        <SatelliteDish className="h-3.5 w-3.5 text-slate-400" />
      )}
      <span
        className={`text-xs font-medium ${
          live ? "text-radar" : checking ? "text-amber" : "text-slate-400"
        }`}
      >
        {live
          ? `Data Feed: Live${lastSync ? " · " + lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}`
          : checking
          ? "Data Feed: Checking…"
          : "Data Feed: Offline"}
      </span>
    </div>
  );
}
