"use client";

import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, MapPin, ShieldCheck, Sprout, Store, Landmark } from "lucide-react";
import type { ExperienceRole } from "@/components/shared/ExperienceProfile";

type SimpleRisk = { score: number; level: string; model: string };
type SimpleLocation = { id: string; name: string; state: string };

interface Props {
  role: ExperienceRole;
  locations: SimpleLocation[];
  risks: Record<string, SimpleRisk | "loading" | "error">;
}

const ROLE_COPY: Record<ExperienceRole, { title: string; subtitle: string; icon: typeof ShieldCheck }> = {
  HOUSEHOLD: {
    title: "Is my family safe?",
    subtitle: "We will show the place that needs your attention most and what to do next.",
    icon: ShieldCheck,
  },
  FARMER: {
    title: "Does my farm need action?",
    subtitle: "See which saved farm or area needs attention and what you can protect first.",
    icon: Sprout,
  },
  BUSINESS: {
    title: "Which site needs attention?",
    subtitle: "See your most exposed saved location and the next practical business action.",
    icon: Store,
  },
  AGENCY: {
    title: "Where should we focus first?",
    subtitle: "See the highest current risk among saved locations before opening operational detail.",
    icon: Landmark,
  },
};

const riskMessage = (level: string) => {
  const value = level.toUpperCase();
  if (value.includes("CRITICAL")) return { label: "Act now", text: "This place needs immediate attention. Follow the action steps below and official instructions." };
  if (value.includes("HIGH")) return { label: "Prepare now", text: "Risk is high. Take the recommended protective steps now instead of waiting." };
  if (value.includes("MODERATE")) return { label: "Get ready", text: "Risk is rising. Prepare now so you can move quickly if conditions worsen." };
  return { label: "Keep watching", text: "No urgent action is shown right now. Keep alerts on and continue monitoring." };
};

export default function SimpleDashboardSummary({ role, locations, risks }: Props) {
  const copy = ROLE_COPY[role];
  const Icon = copy.icon;
  const scored = locations
    .map((location) => ({ location, risk: risks[location.id] }))
    .filter((item): item is { location: SimpleLocation; risk: SimpleRisk } => typeof item.risk === "object")
    .sort((a, b) => b.risk.score - a.risk.score);
  const highest = scored[0];

  if (locations.length === 0) {
    return (
      <section className="rounded-3xl border border-radar/20 bg-radar/[0.04] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-radar/10"><Icon className="h-6 w-6 text-radar" /></div>
          <div>
            <h2 className="font-display text-2xl font-bold">{copy.title}</h2>
            <p className="mt-1 text-sm text-slate-500">Add the first place you care about. NaijaClimaGuard will watch it and tell you what to do.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!highest) {
    return (
      <section className="rounded-3xl border border-slate-200 p-6 sm:p-8 dark:border-midnight-border">
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-radar" />
          <div>
            <h2 className="font-display text-2xl font-bold">{copy.title}</h2>
            <p className="mt-1 text-sm text-slate-500">We are checking your saved places now. You do not need to interpret any numbers.</p>
          </div>
        </div>
      </section>
    );
  }

  const message = riskMessage(highest.risk.level);
  const urgent = highest.risk.level.toUpperCase().includes("HIGH") || highest.risk.level.toUpperCase().includes("CRITICAL");

  return (
    <section className={`rounded-3xl border p-6 sm:p-8 ${urgent ? "border-crimson/25 bg-crimson/[0.04]" : "border-radar/20 bg-radar/[0.04]"}`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${urgent ? "bg-crimson/10" : "bg-radar/10"}`}>
              {urgent ? <AlertTriangle className="h-6 w-6 text-crimson" /> : <Icon className="h-6 w-6 text-radar" />}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{copy.title}</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{message.label}</h2>
            </div>
          </div>
          <div className="mt-5 flex items-start gap-2 text-base font-semibold">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <span>{highest.location.name}, {highest.location.state}</span>
          </div>
          <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">{message.text}</p>
          <p className="mt-2 text-sm text-slate-500">{copy.subtitle}</p>
        </div>

        <div className="grid min-w-[250px] gap-3">
          <a href={`#location-${highest.location.id}`} className="flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
            <span>Show me what to do</span>
            <CheckCircle2 className="h-4 w-4" />
          </a>
          <Link href="/action" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold dark:border-midnight-border dark:bg-midnight-light">
            <span>Check my alerts</span>
            <BellRing className="h-4 w-4 text-radar" />
          </Link>
        </div>
      </div>
    </section>
  );
}
