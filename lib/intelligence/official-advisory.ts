import { prisma } from "@/lib/db";

export type OfficialSafetyState = {
  active: boolean;
  level: "ADVISORY" | "WATCH" | "WARNING" | "EMERGENCY";
  headline: string;
  instruction: string;
  authority: string;
  sourceName: string;
  observedAt: string;
  rawLevel: string;
};

function severity(raw: unknown): OfficialSafetyState["level"] {
  const text = String(raw ?? "").trim().toUpperCase();
  if (/EVAC|EMERGEN|CRITICAL/.test(text)) return "EMERGENCY";
  if (/WARN|SEVERE|DANGER/.test(text)) return "WARNING";
  if (/WATCH|ALERT|HIGH/.test(text)) return "WATCH";
  return "ADVISORY";
}

function copy(level: OfficialSafetyState["level"]) {
  if (level === "EMERGENCY") return {
    headline: "OFFICIAL EMERGENCY INSTRUCTION ACTIVE",
    instruction: "Follow the issuing authority immediately. Do not rely on a lower model score to delay action.",
  };
  if (level === "WARNING") return {
    headline: "OFFICIAL FLOOD WARNING ACTIVE",
    instruction: "Follow the issuing authority's warning and prepare or move as instructed, even if the model score is lower.",
  };
  if (level === "WATCH") return {
    headline: "OFFICIAL FLOOD WATCH ACTIVE",
    instruction: "Stay ready and follow updates from the issuing authority. The official watch takes priority over reassurance from a low model score.",
  };
  return {
    headline: "OFFICIAL ADVISORY ACTIVE",
    instruction: "Read and follow the issuing authority's advice. Official instructions are shown separately from the model score.",
  };
}

/**
 * Returns a fresh official advisory close to the requested point when the
 * canonical intelligence store is available. This NEVER changes the ML/risk
 * score. It is an independent safety-state overlay.
 */
export async function findOfficialSafetyState(latitude: number, longitude: number): Promise<OfficialSafetyState | null> {
  try {
    const latTolerance = 0.25;
    const lonTolerance = 0.25;
    const candidates = await prisma.intelligenceObservation.findMany({
      where: {
        variable: "advisory_level",
        latitude: { gte: latitude - latTolerance, lte: latitude + latTolerance },
        longitude: { gte: longitude - lonTolerance, lte: longitude + lonTolerance },
        source: { active: true, sourceKind: "OFFICIAL_ADVISORY" },
      },
      orderBy: { observedAt: "desc" },
      take: 10,
      include: { source: { select: { provider: true, name: true, defaultFreshnessMinutes: true } } },
    });

    const now = Date.now();
    const fresh = candidates.find((candidate) => {
      const ageMinutes = Math.max(0, (now - candidate.observedAt.getTime()) / 60000);
      return ageMinutes <= candidate.source.defaultFreshnessMinutes && candidate.qualityStatus !== "MISSING" && candidate.qualityStatus !== "STALE";
    });
    if (!fresh) return null;

    const rawLevel = typeof fresh.value === "string" ? fresh.value : String(fresh.value ?? "ADVISORY");
    const level = severity(rawLevel);
    const message = copy(level);
    return {
      active: true,
      level,
      headline: message.headline,
      instruction: message.instruction,
      authority: fresh.source.provider,
      sourceName: fresh.source.name,
      observedAt: fresh.observedAt.toISOString(),
      rawLevel,
    };
  } catch {
    // Source store is optional until its controlled migration is applied.
    return null;
  }
}
