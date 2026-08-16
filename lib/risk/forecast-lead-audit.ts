import { expandNigeriaSentinels } from "@/lib/risk/nigeria-sentinels";

export interface ForecastLeadAudit {
  requestedLeadHours: number;
  run: string;
  effectiveLeadHours: number;
  available: boolean;
  state: string;
  city: string;
  highestPoint?: string;
  precipitation1hMaxMm?: number;
  precipitation3hMaxMm?: number;
  precipitation6hWindowMm?: number;
  precipitation12hWindowMm?: number;
  capeMaxJkg?: number;
  signalScore?: number;
  signalLevel?: "QUIET" | "ELEVATED" | "HIGH" | "CRITICAL";
  error?: string;
}

const MODEL_PUBLICATION_DELAY_HOURS = 6;
const VALID_RUN_HOURS = [0, 6, 12, 18];

function clamp(value: number) { return Math.max(0, Math.min(1, value)); }
function round1(value: number) { return Math.round(value * 10) / 10; }

function latestValidRunBefore(event: Date, requestedLeadHours: number) {
  // We require the run to have had six hours to finish computing/distributing.
  const latestAllowed = new Date(event.getTime() - (requestedLeadHours + MODEL_PUBLICATION_DELAY_HOURS) * 3600_000);
  const run = new Date(Date.UTC(latestAllowed.getUTCFullYear(), latestAllowed.getUTCMonth(), latestAllowed.getUTCDate(), 0, 0, 0, 0));
  const eligible = VALID_RUN_HOURS.filter((hour) => hour <= latestAllowed.getUTCHours());
  if (eligible.length) run.setUTCHours(eligible[eligible.length - 1]);
  else {
    run.setUTCDate(run.getUTCDate() - 1);
    run.setUTCHours(18);
  }
  return run;
}

function runParam(date: Date) {
  return `${date.toISOString().slice(0, 13)}:00`;
}

function valueAt(times: string[], values: number[], targetMs: number) {
  let bestIndex = -1;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let i = 0; i < times.length; i += 1) {
    const diff = Math.abs(new Date(`${times[i]}Z`).getTime() - targetMs);
    if (diff < bestDiff) { bestDiff = diff; bestIndex = i; }
  }
  if (bestIndex < 0 || bestDiff > 90 * 60_000) return null;
  return Number(values[bestIndex] ?? 0);
}

function maxWindow(times: string[], values: number[], startMs: number, endMs: number, width: number) {
  const selected: number[] = [];
  for (let t = startMs; t <= endMs; t += 3600_000) selected.push(Math.max(0, valueAt(times, values, t) ?? 0));
  let best = 0;
  for (let i = 0; i < selected.length; i += 1) {
    const sum = selected.slice(i, i + width).reduce((total, value) => total + value, 0);
    best = Math.max(best, sum);
  }
  return best;
}

async function fetchRun(latitude: number, longitude: number, run: Date) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    models: "ecmwf_ifs",
    run: runParam(run),
    hourly: "precipitation,cape",
    timezone: "UTC",
    forecast_days: "7",
  });
  const response = await fetch(`https://single-runs-api.open-meteo.com/v1/forecast?${params.toString()}`, {
    cache: "force-cache",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`forecast archive returned ${response.status}`);
  return response.json();
}

function scoreForecast(times: string[], precipitation: number[], cape: number[], event: Date) {
  const eventMs = event.getTime();
  // Flood onset is not exactly the publication time, so inspect a compact
  // six-hour envelope centred around the first public report.
  const start = eventMs - 3 * 3600_000;
  const end = eventMs + 3 * 3600_000;
  const p1 = maxWindow(times, precipitation, start, end, 1);
  const p3 = maxWindow(times, precipitation, start, end, 3);
  const p6 = maxWindow(times, precipitation, start, end, 6);
  const p12 = maxWindow(times, precipitation, eventMs - 9 * 3600_000, eventMs + 3 * 3600_000, 12);
  let capeMax = 0;
  for (let t = start; t <= end; t += 3600_000) capeMax = Math.max(capeMax, Math.max(0, valueAt(times, cape, t) ?? 0));

  // This is a transparent forecast-signal screen, not a calibrated flood probability.
  // Heavy short bursts dominate, with CAPE adding context for convective potential.
  const rainSignal = Math.max(clamp(p1 / 15), clamp(p3 / 30), clamp(p6 / 50), clamp(p12 / 80));
  const convection = clamp(capeMax / 2000);
  const score = Math.round((0.85 * rainSignal + 0.15 * convection) * 100);
  const level = score >= 75 ? "CRITICAL" : score >= 55 ? "HIGH" : score >= 35 ? "ELEVATED" : "QUIET";
  return { p1, p3, p6, p12, capeMax, score, level: level as ForecastLeadAudit["signalLevel"] };
}

export async function auditForecastLeadTimes(state: string, eventAt: string, leads = [6, 12, 24, 48]): Promise<ForecastLeadAudit[]> {
  const event = new Date(eventAt);
  if (Number.isNaN(event.getTime())) throw new Error("invalid event time");
  const points = expandNigeriaSentinels(9).filter((point) => point.state === state);
  if (!points.length) throw new Error(`no rainfall screening grid exists for ${state}`);

  const results: ForecastLeadAudit[] = [];
  for (const requestedLeadHours of leads) {
    const run = latestValidRunBefore(event, requestedLeadHours);
    const effectiveLeadHours = Math.round((event.getTime() - (run.getTime() + MODEL_PUBLICATION_DELAY_HOURS * 3600_000)) / 3600_000);
    try {
      const scored = await Promise.all(points.map(async (point) => {
        const payload = await fetchRun(point.latitude, point.longitude, run);
        const times: string[] = payload?.hourly?.time ?? [];
        const precipitation: number[] = payload?.hourly?.precipitation ?? [];
        const cape: number[] = payload?.hourly?.cape ?? [];
        if (!times.length || !precipitation.length) throw new Error("forecast run has no rainfall series");
        return { point, signal: scoreForecast(times, precipitation, cape, event) };
      }));
      scored.sort((a, b) => b.signal.score - a.signal.score);
      const highest = scored[0];
      results.push({
        requestedLeadHours,
        run: runParam(run),
        effectiveLeadHours,
        available: true,
        state,
        city: highest.point.anchorCity,
        highestPoint: highest.point.pointLabel,
        precipitation1hMaxMm: round1(highest.signal.p1),
        precipitation3hMaxMm: round1(highest.signal.p3),
        precipitation6hWindowMm: round1(highest.signal.p6),
        precipitation12hWindowMm: round1(highest.signal.p12),
        capeMaxJkg: Math.round(highest.signal.capeMax),
        signalScore: highest.signal.score,
        signalLevel: highest.signal.level,
      });
    } catch (error) {
      results.push({
        requestedLeadHours,
        run: runParam(run),
        effectiveLeadHours,
        available: false,
        state,
        city: points[0].anchorCity,
        error: error instanceof Error ? error.message : "forecast run unavailable",
      });
    }
  }
  return results;
}
