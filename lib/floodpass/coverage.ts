import { prisma } from "@/lib/db";
import { lgaRegistry, STATE_CAPITALS } from "@/lib/floodpass/places";

/**
 * How well FloodPass covers each of the 36 states and the FCT, in numbers
 * anyone can check. Each number comes from a different source, so a judge or
 * partner can see exactly what is live where.
 */
export type StateCoverage = {
  state: string;
  capital: string;
  /** Local Government Areas whose rain is checked every 15 minutes. */
  lgasWatched: number;
  /** LGAs the rain scout flagged in the last 24 hours. */
  lgasFlaggedToday: number;
  /** Floods in this state reported in the news in the last 90 days. */
  newsFloods90d: number;
  /** Warnings or watches in the news for this state in the last 14 days. */
  warnings14d: number;
  lastNewsFloodAt: string | null;
  /** Verified FloodPasses issued in this state. */
  floodPasses: number;
  /** People who joined on WhatsApp with a place in this state. */
  people: number;
};

export type CoverageReport = {
  generatedAt: string;
  statesCovered: number;
  lgasWatched: number;
  lastRainScanAt: string | null;
  floodPassStorageReady: boolean;
  states: StateCoverage[];
  sources: Array<{ name: string; what: string; howOften: string; status: "live" | "ready, needs key" | "planned" }>;
};

type NewsRow = { state: string | null; floods90: number; warnings14: number; lastFlood: Date | null };
type CountRow = { state: string | null; n: number };

export const DATA_SOURCES: CoverageReport["sources"] = [
  { name: "Open-Meteo weather model", what: "Rain that fell and rain coming, for every LGA centre", howOften: "Every 15 minutes", status: "live" },
  { name: "GDELT world news index", what: "Nigerian flood news, read and tagged by state", howOften: "Every 15 minutes", status: "live" },
  { name: "Google News (incl. NiMet, NEMA, NIHSA pages)", what: "Flood news and official warnings reported in the news", howOften: "Every 15 minutes", status: "live" },
  { name: "People on WhatsApp and the web", what: "Flood reports with depth and photos", howOften: "Any time", status: "live" },
  { name: "FloodPass AI (5 jobs)", what: "Checks photos, reads news, answers questions, writes warnings, learns each street", howOften: "Any time", status: "ready, needs key" },
  { name: "NiMet, NIHSA and NEMA direct feeds", what: "Official forecasts and warnings, straight from the source", howOften: "When issued", status: "planned" },
  { name: "Google Flood Hub", what: "River flood forecasts up to 7 days ahead", howOften: "Daily", status: "planned" },
  { name: "Sentinel-1 radar satellite", what: "Sees flood water through clouds, day or night", howOften: "About every 6 to 12 days", status: "planned" },
];

export async function coverageByState(): Promise<CoverageReport> {
  const since24h = new Date(Date.now() - 24 * 3600_000);

  const [registry, news, flagged, lastScan, passes, people] = await Promise.all([
    lgaRegistry(),
    prisma.$queryRaw<NewsRow[]>`
      SELECT s AS state,
        COUNT(*) FILTER (WHERE r.status = 'REPORTED')::int AS floods90,
        COUNT(*) FILTER (WHERE r.status IN ('WARNING', 'WATCH') AND r."publishedAt" >= NOW() - INTERVAL '14 days')::int AS warnings14,
        MAX(r."publishedAt") FILTER (WHERE r.status = 'REPORTED') AS "lastFlood"
      FROM "ExternalFloodReport" r
      CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(r.metadata::jsonb -> 'states') = 'array' THEN r.metadata::jsonb -> 'states' ELSE jsonb_build_array(r.state) END
      ) AS s
      WHERE r."publishedAt" >= NOW() - INTERVAL '90 days'
      GROUP BY s`.catch(() => [] as NewsRow[]),
    prisma.$queryRaw<CountRow[]>`
      SELECT o.state AS state, COUNT(DISTINCT o."locationName")::int AS n
      FROM "IntelligenceObservation" o
      WHERE o."sourceVersion" = 'national-lga-scout-v1' AND o."observedAt" >= ${since24h}
      GROUP BY o.state`.catch(() => [] as CountRow[]),
    prisma.intelligenceObservation
      .findFirst({ where: { sourceVersion: "national-lga-scout-v1" }, orderBy: { observedAt: "desc" }, select: { observedAt: true } })
      .catch(() => null),
    prisma.floodPass.groupBy({ by: ["state"], where: { revokedAt: null }, _count: { _all: true } }).then(
      (rows) => ({ ready: true, rows: rows.map((row) => ({ state: row.state, n: row._count._all })) }),
      () => ({ ready: false, rows: [] as CountRow[] }),
    ),
    prisma.floodPassContact.groupBy({ by: ["state"], where: { consentAt: { not: null } }, _count: { _all: true } }).then(
      (rows) => rows.map((row) => ({ state: row.state, n: row._count._all })),
      () => [] as CountRow[],
    ),
  ]);

  const count = (rows: CountRow[], state: string) => rows.find((row) => row.state === state)?.n ?? 0;
  const states: StateCoverage[] = STATE_CAPITALS.map(({ state, capital }) => {
    const newsRow = news.find((row) => row.state === state);
    return {
      state,
      capital,
      lgasWatched: registry.filter((lga) => lga.state === state).length,
      lgasFlaggedToday: count(flagged, state),
      newsFloods90d: newsRow?.floods90 ?? 0,
      warnings14d: newsRow?.warnings14 ?? 0,
      lastNewsFloodAt: newsRow?.lastFlood ? new Date(newsRow.lastFlood).toISOString() : null,
      floodPasses: count(passes.rows, state),
      people: count(people, state),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    // Every state and the FCT can report floods and get a FloodPass; places fall back to the state capital if the LGA list is down.
    statesCovered: STATE_CAPITALS.length,
    lgasWatched: registry.length,
    lastRainScanAt: lastScan?.observedAt?.toISOString() ?? null,
    floodPassStorageReady: passes.ready,
    states,
    sources: DATA_SOURCES,
  };
}
