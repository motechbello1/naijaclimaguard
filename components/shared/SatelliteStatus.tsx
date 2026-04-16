"use client";

import { Satellite } from "lucide-react";

export default function SatelliteStatus() {
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-radar/20 bg-radar/5 px-3.5 py-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-radar opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-radar" />
      </span>
      <Satellite className="h-3.5 w-3.5 text-radar" />
      <span className="text-xs font-medium text-radar">Satellite Link: Active</span>
    </div>
  );
}