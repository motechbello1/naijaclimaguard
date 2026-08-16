import { fetchNigeriaLgaRegistry, NigeriaLgaPoint } from "@/lib/intelligence/nigeria-lga-registry";
import { deriveUrbanFlashRisk, UrbanFlashRisk } from "@/lib/risk/urban-flash-v1";

export type LgaScoutLevel = "CRITICAL" | "HIGH" | "ELEVATED" | "QUIET";

export interface LgaScoutResult {
  lga: string;
  state: string;
  latitude: number;
  longitude: number;
  scoutScore: number;
  scoutLevel: LgaScoutLevel;
  recent1hMm: number;
  recent3hMm: number;
  recent6hMm: number;
  next3hMm: number;
  next6hMm: number;
  maxHourlyMm: number;
  capeMaxJkg: number;
  deepRisk?: UrbanFlashRisk;
}

export interface NationalLgaScoutResult {
  generatedAt: string;
  coverage: number;
  available: number;
  elevated: number;
  high: number;
  critical: number;
  hotspots: LgaScoutResult[];
  stateSummary: Array<{
    state: string;
    highestScore: number;
    highestLevel: LgaScoutLevel;
    hotspotLga: string;
    elevatedLgas: number;
  }>;
  methodology: string;
  limitation: string;
}

const BATCH_SIZE = 60;
const DEEP_SCAN_LIMIT = 60;
const MAX_BATCH_ATTEMPTS = 3;

function clamp(value: number) { return Math.max(0, Math.min(1, value)); }
function round1(value: number) { return Math.round(value * 10) / 10; }
function sum(values: number[], start: number, end: number) {
  return values.slice(Math.max(0, start), Math.max(0, end)).reduce((total, value) => total + Math.max(0, Number(value) || 0), 0);
}
function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function nigeriaHourKey() {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 13) + ":00";
}

function currentIndex(times: string[]) {
  const key = nigeriaHourKey();
  let idx = times.lastIndexOf(key);
  if (idx >= 0) return idx;
  idx = times.findIndex((time) => time > key) - 1;
  return idx >= 0 ? idx : Math.min(5, Math.max(0, times.length - 1));
}

function scoutFromHourly(point: NigeriaLgaPoint, hourly: any): LgaScoutResult | null {
  const times: string[] = Array.isArray(hourly?.time) ? hourly.time : [];
  const precipitation: number[] = Array.isArray(hourly?.precipitation) ? hourly.precipitation.map(Number) : [];
  const showers: number[] = Array.isArray(hourly?.showers) ? hourly.showers.map(Number) : [];
  const cape: number[] = Array.isArray(hourly?.cape) ? hourly.cape.map(Number) : [];
  if (!times.length || !precipitation.length) return null;
  const idx = currentIndex(times);

  const recent1 = sum(precipitation, idx, idx + 1);
  const recent3 = sum(precipitation, idx - 2, idx + 1);
  const recent6 = sum(precipitation, idx - 5, idx + 1);
  const future3 = sum(precipitation, idx + 1, idx + 4);
  const future6 = sum(precipitation, idx + 1, idx + 7);
  const envelopeStart = Math.max(0, idx - 2);
  const envelopeEnd = Math.min(precipitation.length, idx + 7);
  const maxHourly = Math.max(0, ...precipitation.slice(envelopeStart, envelopeEnd).map((value) => Number(value) || 0));
  const maxShowers = showers.length ? Math.max(0, ...showers.slice(envelopeStart, envelopeEnd).map((value) => Number(value) || 0)) : 0;
  const capeMax = cape.length ? Math.max(0, ...cape.slice(envelopeStart, envelopeEnd).map((value) => Number(value) || 0)) : 0;

  const rainSignal = Math.max(
    clamp(recent1 / 12),
    clamp(recent3 / 25),
    clamp(recent6 / 40),
    clamp(future3 / 25),
    clamp(future6 / 45),
    clamp(maxHourly / 15),
    clamp(maxShowers / 12),
  );
  const convection = clamp(capeMax / 2200);
  const scoutScore = Math.round((0.88 * rainSignal + 0.12 * convection) * 100);
  const scoutLevel: LgaScoutLevel = scoutScore >= 75 ? "CRITICAL" : scoutScore >= 55 ? "HIGH" : scoutScore >= 30 ? "ELEVATED" : "QUIET";

  return {
    ...point,
    lga: point.name,
    scoutScore,
    scoutLevel,
    recent1hMm: round1(recent1),
    recent3hMm: round1(recent3),
    recent6hMm: round1(recent6),
    next3hMm: round1(future3),
    next6hMm: round1(future6),
    maxHourlyMm: round1(maxHourly),
    capeMaxJkg: Math.round(capeMax),
  };
}

async function fetchScoutBatch(points: NigeriaLgaPoint[]) {
  const params = new URLSearchParams({
    latitude: points.map((point) => point.latitude).join(","),
    longitude: points.map((point) => point.longitude).join(","),
    hourly: "precipitation,showers,cape",
    past_hours: "6",
    forecast_hours: "6",
    timezone: "Africa/Lagos",
  });

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_BATCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
        next: { revalidate: 15 * 60 },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`nationwide weather scout returned ${response.status}`);
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : [payload];
      if (rows.length < Math.max(1, Math.floor(points.length * 0.9))) {
        throw new Error(`weather scout returned only ${rows.length}/${points.length} points`);
      }
      return rows;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_BATCH_ATTEMPTS) await sleep(250 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("nationwide weather batch failed");
}

async function deepScan(points: LgaScoutResult[]) {
  if (!points.length) return new Map<string, UrbanFlashRisk>();
  const params = new URLSearchParams({
    latitude: points.map((point) => point.latitude).join(","),
    longitude: points.map((point) => point.longitude).join(","),
    hourly: "precipitation",
    past_hours: "168",
    forecast_hours: "6",
    timezone: "Africa/Lagos",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    next: { revalidate: 15 * 60 },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return new Map<string, UrbanFlashRisk>();
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : [payload];
  const result = new Map<string, UrbanFlashRisk>();
  points.forEach((point, index) => {
    try {
      if (rows[index]?.hourly) result.set(`${point.state}|${point.lga}`, deriveUrbanFlashRisk(rows[index].hourly));
    } catch {
      // Keep the lightweight result if deeper history fails.
    }
  });
  return result;
}

export async function scoutNationwideLgas(): Promise<NationalLgaScoutResult> {
  const registry = await fetchNigeriaLgaRegistry();
  const outputs: LgaScoutResult[] = [];
  const failedBatches: NigeriaLgaPoint[][] = [];

  for (let i = 0; i < registry.length; i += BATCH_SIZE) {
    const points = registry.slice(i, i + BATCH_SIZE);
    try {
      const payloads = await fetchScoutBatch(points);
      points.forEach((point, index) => {
        const parsed = scoutFromHourly(point, payloads[index]?.hourly);
        if (parsed) outputs.push(parsed);
      });
    } catch {
      failedBatches.push(points);
    }
  }

  // One smaller salvage pass means a single large-request timeout does not remove
  // an entire region from the national picture.
  for (const failed of failedBatches) {
    for (let i = 0; i < failed.length; i += 20) {
      const points = failed.slice(i, i + 20);
      try {
        const payloads = await fetchScoutBatch(points);
        points.forEach((point, index) => {
          const parsed = scoutFromHourly(point, payloads[index]?.hourly);
          if (parsed) outputs.push(parsed);
        });
      } catch {
        // Availability count remains visible so partial provider failure is never hidden.
      }
    }
  }

  const deduped = Array.from(new Map(outputs.map((item) => [`${item.state}|${item.lga}`, item])).values());
  deduped.sort((a, b) => b.scoutScore - a.scoutScore);
  const deepCandidates = deduped.filter((item) => item.scoutScore >= 25).slice(0, DEEP_SCAN_LIMIT);
  const deep = await deepScan(deepCandidates);
  const enriched = deduped.map((item) => ({ ...item, deepRisk: deep.get(`${item.state}|${item.lga}`) }));
  enriched.sort((a, b) => Math.max(b.scoutScore, b.deepRisk?.score ?? 0) - Math.max(a.scoutScore, a.deepRisk?.score ?? 0));

  const stateMap = new Map<string, NationalLgaScoutResult["stateSummary"][number]>();
  for (const item of enriched) {
    const effectiveScore = Math.max(item.scoutScore, item.deepRisk?.score ?? 0);
    const effectiveLevel: LgaScoutLevel = effectiveScore >= 75 ? "CRITICAL" : effectiveScore >= 55 ? "HIGH" : effectiveScore >= 30 ? "ELEVATED" : "QUIET";
    const existing = stateMap.get(item.state);
    if (!existing) {
      stateMap.set(item.state, { state: item.state, highestScore: effectiveScore, highestLevel: effectiveLevel, hotspotLga: item.lga, elevatedLgas: effectiveScore >= 30 ? 1 : 0 });
    } else {
      if (effectiveScore >= 30) existing.elevatedLgas += 1;
      if (effectiveScore > existing.highestScore) {
        existing.highestScore = effectiveScore;
        existing.highestLevel = effectiveLevel;
        existing.hotspotLga = item.lga;
      }
    }
  }

  const hotspots = enriched.filter((item) => Math.max(item.scoutScore, item.deepRisk?.score ?? 0) >= 30).slice(0, 100);
  return {
    generatedAt: new Date().toISOString(),
    coverage: registry.length,
    available: deduped.length,
    elevated: hotspots.filter((item) => Math.max(item.scoutScore, item.deepRisk?.score ?? 0) >= 30).length,
    high: hotspots.filter((item) => Math.max(item.scoutScore, item.deepRisk?.score ?? 0) >= 55).length,
    critical: hotspots.filter((item) => Math.max(item.scoutScore, item.deepRisk?.score ?? 0) >= 75).length,
    hotspots,
    stateSummary: Array.from(stateMap.values()).sort((a, b) => b.highestScore - a.highestScore),
    methodology: "A lightweight rainfall and convection screen checks one geographic point for every Nigerian LGA. Failed provider batches are retried and salvaged in smaller groups. Only suspicious LGAs receive the more expensive 168-hour antecedent-rainfall deep scan.",
    limitation: "An LGA centroid is not street-level sensing. Weather models can still miss a local cloudburst or drainage failure. Scout results are early-warning signals, not confirmation that flooding is occurring.",
  };
}
