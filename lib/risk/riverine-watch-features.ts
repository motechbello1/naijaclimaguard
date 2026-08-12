import type { RiverineWatchInput, RiverineWatchLocation } from "@/lib/risk/riverine-watch-v1";

export interface NasaImergDailyPoint {
  date: string;
  mm: number;
}

export interface GlofasOperationalTriplet {
  q24: number;
  q48: number;
  q72: number;
}

export interface RiverineWatchSourcePayload {
  location: RiverineWatchLocation;
  issue_date: string;
  nasa_imerg_early: NasaImergDailyPoint[];
  glofas_control_forecast: GlofasOperationalTriplet;
  last_watch_date?: string | null;
}

function finite(value: unknown, name: string) {
  const x = Number(value);
  if (!Number.isFinite(x)) throw new Error(`${name} must be finite`);
  return x;
}

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

function safeRatio(numerator: number, denominator: number) {
  return numerator / (Math.abs(denominator) + 1e-6);
}

/**
 * Build exactly the source-level feature family used by Model v5 / Riverine Watch v1.
 *
 * Contract:
 * - NASA IMERG Early daily rainfall must contain at least 30 complete calendar days
 *   strictly before issue_date for the requested location.
 * - GloFAS values are the operational control forecast discharge at +24/+48/+72 h
 *   for issue_date.
 * - No Open-Meteo or other substitute source is accepted here because the model was
 *   not trained on those inputs.
 */
export function buildRiverineWatchFeatures(
  payload: RiverineWatchSourcePayload
): RiverineWatchInput {
  if (payload.location !== "Lokoja" && payload.location !== "Makurdi") {
    throw new Error("Riverine Watch v1 supports only Lokoja and Makurdi");
  }

  const issue = new Date(`${payload.issue_date}T00:00:00Z`);
  if (Number.isNaN(issue.getTime())) throw new Error("issue_date must be YYYY-MM-DD");

  const byDate = new Map<string, number>();
  for (const point of payload.nasa_imerg_early ?? []) {
    const d = new Date(`${point.date}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) throw new Error(`invalid NASA date: ${point.date}`);
    if (d.getTime() >= issue.getTime()) continue;
    byDate.set(point.date, Math.max(0, finite(point.mm, `NASA rainfall ${point.date}`)));
  }

  const completeDays: number[] = [];
  for (let daysBack = 30; daysBack >= 1; daysBack--) {
    const d = new Date(issue.getTime() - daysBack * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    if (!byDate.has(key)) {
      throw new Error(`NASA IMERG Early history missing complete day ${key}; 30 consecutive prior days are required`);
    }
    completeDays.push(byDate.get(key)!);
  }

  const last = (n: number) => completeDays.slice(completeDays.length - n);
  const rain1 = completeDays[completeDays.length - 1];
  const rain3 = sum(last(3));
  const rain7 = sum(last(7));
  const rain14 = sum(last(14));
  const rain30 = sum(last(30));
  // Mirrors pandas: rain.shift(3).rolling(3).sum() on the final complete rainfall day.
  const previous3 = sum(completeDays.slice(completeDays.length - 6, completeDays.length - 3));
  const wet7 = last(7).filter((v) => v >= 1).length;
  const wet30 = completeDays.filter((v) => v >= 1).length;

  const q24 = finite(payload.glofas_control_forecast?.q24, "GloFAS q24");
  const q48 = finite(payload.glofas_control_forecast?.q48, "GloFAS q48");
  const q72 = finite(payload.glofas_control_forecast?.q72, "GloFAS q72");
  const qmax = Math.max(q24, q48, q72);
  const q48MinusQ24 = q48 - q24;
  const q72MinusQ24 = q72 - q24;

  return {
    location: payload.location,
    rain_1d: rain1,
    rain_3d: rain3,
    rain_7d: rain7,
    rain_14d: rain14,
    rain_30d: rain30,
    rain_accel_3d: rain3 - previous3,
    rain_3_14_ratio: safeRatio(rain3, rain14),
    rain_7_30_ratio: safeRatio(rain7, rain30),
    wet_days_7d: wet7,
    wet_days_30d: wet30,
    q24,
    q48,
    q72,
    qmax_72: qmax,
    q48_minus_q24: q48MinusQ24,
    q72_minus_q24: q72MinusQ24,
    q72_pct_rise: q72MinusQ24 / (Math.abs(q24) + 1e-6),
    q_slope_per_day: q72MinusQ24 / 2,
    q_monotonic_rise: q24 <= q48 && q48 <= q72 ? 1 : 0,
  };
}
