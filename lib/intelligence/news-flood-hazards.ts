import { fetchLiveFloodFeed } from "@/lib/intelligence/live-flood-feed";

export type NewsFloodHazard = {
  id: string;
  latitude: number;
  longitude: number;
  area: string;
  state: string;
  createdAt: Date;
  sourceCount: number;
  sources: string[];
  radiusMeters: number;
  confidence: "CORROBORATED_AREA_REPORT" | "SPECIFIC_AREA_REPORT";
};

type AreaPoint = { latitude: number; longitude: number; radiusMeters?: number };

// These are neighbourhood/urban-area centroids, not road closures. We only use
// them to create broad caution zones when live reporting names the area. Generic
// city/state aliases such as "Abuja" and "Lagos" are intentionally omitted.
const AREA_POINTS: Record<string, AreaPoint> = {
  "fct:maitama": { latitude: 9.0962, longitude: 7.4934, radiusMeters: 1800 },
  "fct:asokoro": { latitude: 9.0492, longitude: 7.5262, radiusMeters: 1800 },
  "fct:garki": { latitude: 9.0330, longitude: 7.4870, radiusMeters: 1800 },
  "fct:wuse": { latitude: 9.0760, longitude: 7.4700, radiusMeters: 1800 },
  "fct:wuse 2": { latitude: 9.0760, longitude: 7.4700, radiusMeters: 1600 },
  "fct:gudu": { latitude: 9.0110, longitude: 7.4310, radiusMeters: 1500 },
  "fct:lokogoma": { latitude: 8.9850, longitude: 7.4540, radiusMeters: 1800 },
  "fct:gaduwa": { latitude: 9.0020, longitude: 7.4560, radiusMeters: 1600 },
  "fct:lugbe": { latitude: 8.9550, longitude: 7.3590, radiusMeters: 2200 },
  "fct:kubwa": { latitude: 9.1540, longitude: 7.3210, radiusMeters: 2200 },
  "fct:jabi": { latitude: 9.0710, longitude: 7.4200, radiusMeters: 1600 },
  "fct:gwarinpa": { latitude: 9.1090, longitude: 7.4140, radiusMeters: 2200 },
  "fct:apo": { latitude: 9.0120, longitude: 7.5000, radiusMeters: 1700 },
  "fct:guzape": { latitude: 9.0280, longitude: 7.5240, radiusMeters: 1800 },
  "fct:nyanya": { latitude: 9.0260, longitude: 7.5740, radiusMeters: 1800 },
  "fct:kuje": { latitude: 8.8790, longitude: 7.2270, radiusMeters: 2500 },
  "fct:gwagwalada": { latitude: 8.9430, longitude: 7.0800, radiusMeters: 2500 },
  "fct:bwari": { latitude: 9.2840, longitude: 7.3800, radiusMeters: 2500 },
  "lagos:ikeja": { latitude: 6.6018, longitude: 3.3515, radiusMeters: 2200 },
  "lagos:lekki": { latitude: 6.4478, longitude: 3.4723, radiusMeters: 3000 },
  "lagos:victoria island": { latitude: 6.4281, longitude: 3.4219, radiusMeters: 2200 },
  "lagos:ikorodu": { latitude: 6.6194, longitude: 3.5105, radiusMeters: 3000 },
  "lagos:ajah": { latitude: 6.4698, longitude: 3.5852, radiusMeters: 2500 },
  "lagos:epe": { latitude: 6.5841, longitude: 3.9834, radiusMeters: 3000 },
  "niger:shiroro": { latitude: 9.9790, longitude: 6.8340, radiusMeters: 3500 },
  "anambra:ogidi": { latitude: 6.1530, longitude: 6.8660, radiusMeters: 2200 },
};

function normalize(value: string) { return value.trim().toLowerCase(); }

export async function fetchNewsFloodHazards(): Promise<NewsFloodHazard[]> {
  const feed = await fetchLiveFloodFeed();
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  const severe = feed.items.filter((item) => item.status === "REPORTED" && item.severity >= 3 && new Date(item.publishedAt).getTime() >= cutoff);
  const stateSourceCounts = new Map<string, Set<string>>();
  for (const item of severe) {
    const set = stateSourceCounts.get(item.state) ?? new Set<string>();
    set.add(item.source.toLowerCase());
    stateSourceCounts.set(item.state, set);
  }

  const grouped = new Map<string, { area: string; state: string; point: AreaPoint; createdAt: Date; sources: Set<string> }>();
  for (const item of severe) {
    for (const area of item.areas) {
      const key = `${normalize(item.state)}:${normalize(area)}`;
      const point = AREA_POINTS[key];
      if (!point) continue;
      const current = grouped.get(key) ?? { area, state: item.state, point, createdAt: new Date(item.publishedAt), sources: new Set<string>() };
      current.sources.add(item.source);
      if (new Date(item.publishedAt) > current.createdAt) current.createdAt = new Date(item.publishedAt);
      grouped.set(key, current);
    }
  }

  return Array.from(grouped.entries()).map(([key, value]) => {
    const stateSources = stateSourceCounts.get(value.state)?.size ?? 0;
    const sources = Array.from(value.sources);
    const corroborated = sources.length >= 2 || stateSources >= 2;
    return {
      id: `news-zone:${key}`,
      latitude: value.point.latitude,
      longitude: value.point.longitude,
      area: value.area,
      state: value.state,
      createdAt: value.createdAt,
      sourceCount: Math.max(sources.length, stateSources),
      sources,
      radiusMeters: value.point.radiusMeters ?? 1800,
      confidence: corroborated ? "CORROBORATED_AREA_REPORT" as const : "SPECIFIC_AREA_REPORT" as const,
    };
  }).filter((hazard) => hazard.confidence === "CORROBORATED_AREA_REPORT");
}
