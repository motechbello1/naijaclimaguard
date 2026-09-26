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
  /** "official_feed" = a connected official advisory source; "news_report" = an official warning reported in the news. */
  origin?: "official_feed" | "news_report";
  sourceUrl?: string;
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
      origin: "official_feed",
    };
  } catch {
    // Source store is optional until its controlled migration is applied.
    return null;
  }
}


const STATE_ALIASES: Record<string, string[]> = {
  FCT: ["FCT", "Abuja", "Federal Capital Territory"],
};

const AGENCY_NAMES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\bnihsa\b|hydrological/i, name: "NIHSA" },
  { pattern: /\bnema\b|emergency management/i, name: "NEMA" },
  { pattern: /\bnimet\b|meteorological/i, name: "NiMet" },
  { pattern: /\bfg\b|federal government/i, name: "Federal Government" },
];

/** Nearest known place (from the nationwide rainfall screen) to a point. */
export async function nearestKnownState(latitude: number, longitude: number): Promise<string | null> {
  try {
    const box = 0.6;
    const rows = await prisma.intelligenceObservation.findMany({
      where: {
        latitude: { gte: latitude - box, lte: latitude + box },
        longitude: { gte: longitude - box, lte: longitude + box },
        state: { not: null },
      },
      select: { state: true, latitude: true, longitude: true },
      distinct: ["locationName"],
      take: 300,
    });
    let best: { state: string; d: number } | null = null;
    for (const row of rows as Array<{ state: string | null; latitude: number | null; longitude: number | null }>) {
      if (!row.state || row.latitude == null || row.longitude == null) continue;
      const d = (row.latitude - latitude) ** 2 + (row.longitude - longitude) ** 2;
      if (!best || d < best.d) best = { state: row.state, d };
    }
    return best?.state ?? null;
  } catch {
    return null;
  }
}

/**
 * Finds a recent official flood warning that names this place's state in the
 * news feed (for example "NEMA: Kogi, Anambra, Benue, 13 other states risk high
 * flooding"). It exists so that a low rainfall score can never be shown as the
 * headline while an official warning for the state is circulating.
 */
export async function findReportedStateWarning(latitude: number, longitude: number): Promise<OfficialSafetyState | null> {
  try {
    const state = await nearestKnownState(latitude, longitude);
    if (!state) return null;
    const names = STATE_ALIASES[state] ?? [state];
    const since = new Date(Date.now() - 5 * 86_400_000);
    const rows = await prisma.externalFloodReport.findMany({
      where: {
        publishedAt: { gte: since },
        status: { in: ["WARNING", "WATCH"] },
        OR: [
          { state },
          { metadata: { path: ["states"], array_contains: [state] } },
          ...names.map((name) => ({ title: { contains: name, mode: "insensitive" as const } })),
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: 10,
    });
    const typed = rows as Array<{ title: string; url: string; source: string; publishedAt: Date; status: string }>;
    const official = typed.find((row) => AGENCY_NAMES.some((agency) => agency.pattern.test(row.title))) ?? typed[0];
    if (!official) return null;
    const authority = AGENCY_NAMES.find((agency) => agency.pattern.test(official.title))?.name ?? "Reported in the news";
    return {
      active: true,
      level: "WATCH",
      headline: `FLOOD WARNING REPORTED FOR ${state.toUpperCase()}`,
      instruction: `${authority === "Reported in the news" ? "A flood warning" : `${authority} has issued a flood warning`} that names ${state}. Be ready to move people, vehicles and goods, and follow official instructions. This comes before any low model score.`,
      authority,
      sourceName: official.source,
      observedAt: official.publishedAt.toISOString(),
      rawLevel: official.status,
      origin: "news_report",
      sourceUrl: official.url,
    };
  } catch {
    return null;
  }
}

export type PublicStatus = "DANGER" | "BE_CAREFUL" | "NO_WARNING_YET";

/**
 * The one status a member of the public sees. Rules:
 * 1. Any active official warning beats the model score.
 * 2. We never say "safe" or "normal"; the calmest status is "no warning yet".
 */
export function publicStatus(modelLevel: string | undefined, safety: OfficialSafetyState | null): PublicStatus {
  if (safety?.active) {
    if (safety.level === "EMERGENCY" || safety.level === "WARNING") return "DANGER";
    return "BE_CAREFUL";
  }
  const level = String(modelLevel ?? "").toUpperCase();
  if (level === "EXTREME" || level === "SEVERE") return "DANGER";
  if (level === "WARNING" || level === "WATCH") return "BE_CAREFUL";
  return "NO_WARNING_YET";
}
