export type UrbanFlashLevel = "EMERGENCY" | "WARNING" | "WATCH" | "NORMAL";

export interface UrbanFlashFeatures {
  rain_1h_mm: number;
  rain_3h_mm: number;
  rain_6h_mm: number;
  rain_24h_mm: number;
  rain_72h_mm: number;
  rain_168h_mm: number;
  max_1h_last_6h_mm: number;
  max_3h_last_24h_mm: number;
  forecast_3h_mm: number;
  forecast_6h_mm: number;
}

export interface UrbanFlashRisk {
  score: number;
  level: UrbanFlashLevel;
  features: UrbanFlashFeatures;
  drivers: string[];
  model: "urban-flash-v1-derived";
  mode: "live" | "historical-observed-audit";
  generatedAt: string;
}

function sum(values: number[], start: number, end: number) {
  return values.slice(Math.max(0, start), Math.max(0, end)).reduce((total, value) => total + (Number.isFinite(value) ? Math.max(0, value) : 0), 0);
}
function clamp(value: number) { return Math.max(0, Math.min(1, value)); }
function round1(value: number) { return Math.round(value * 10) / 10; }

function lagosHourKey(anchor?: Date | string) {
  const source = anchor ? new Date(anchor) : new Date();
  if (Number.isNaN(source.getTime())) throw new Error("invalid audit time");
  return new Date(source.getTime() + 60 * 60 * 1000).toISOString().slice(0, 13) + ":00";
}

export function deriveUrbanFlashRisk(
  hourly: { time?: string[]; precipitation?: number[] },
  anchorAt?: Date | string,
): UrbanFlashRisk {
  const times = hourly?.time ?? [];
  const precip = (hourly?.precipitation ?? []).map((value) => Number.isFinite(value) ? Math.max(0, Number(value)) : 0);
  if (!times.length || !precip.length) throw new Error("hourly rainfall unavailable");

  const anchorKey = lagosHourKey(anchorAt);
  let idx = times.lastIndexOf(anchorKey);
  if (idx < 0) {
    idx = times.findIndex((time) => time > anchorKey) - 1;
    if (idx < 0) throw new Error("audit time is outside the available rainfall window");
  }

  const rain1 = sum(precip, idx, idx + 1);
  const rain3 = sum(precip, idx - 2, idx + 1);
  const rain6 = sum(precip, idx - 5, idx + 1);
  const rain24 = sum(precip, idx - 23, idx + 1);
  const rain72 = sum(precip, idx - 71, idx + 1);
  const rain168 = sum(precip, idx - 167, idx + 1);

  let max1h6 = 0;
  for (let i = Math.max(0, idx - 5); i <= idx; i += 1) max1h6 = Math.max(max1h6, precip[i] || 0);
  let max3h24 = 0;
  for (let i = Math.max(2, idx - 23); i <= idx; i += 1) max3h24 = Math.max(max3h24, sum(precip, i - 2, i + 1));

  const historicalAudit = Boolean(anchorAt);
  // We do not use post-event observed rainfall as if it were an archived forecast.
  // Historical audit therefore asks a narrower question: would rainfall observed
  // up to the report time alone have crossed our warning threshold?
  const future3 = historicalAudit ? 0 : sum(precip, idx + 1, idx + 4);
  const future6 = historicalAudit ? 0 : sum(precip, idx + 1, idx + 7);

  const burst = Math.max(clamp(rain1 / 20), clamp(rain3 / 40), clamp(rain6 / 70), clamp(max1h6 / 25), clamp(max3h24 / 55));
  const antecedent = Math.max(clamp(rain24 / 100), clamp(rain72 / 180), clamp(rain168 / 300));
  const nearForecast = Math.max(clamp(future3 / 40), clamp(future6 / 70));
  const raw = historicalAudit ? (0.55 * burst + 0.30 * antecedent) / 0.85 : 0.55 * burst + 0.30 * antecedent + 0.15 * nearForecast;
  const score = Math.round(clamp(raw) * 100);
  const level: UrbanFlashLevel = score >= 75 ? "EMERGENCY" : score >= 60 ? "WARNING" : score >= 40 ? "WATCH" : "NORMAL";

  const drivers: string[] = [];
  if (rain1 >= 20 || max1h6 >= 25) drivers.push("Very intense rainfall in the latest hours");
  if (rain3 >= 40 || max3h24 >= 55) drivers.push("Short-duration rainfall burst can overwhelm urban drainage");
  if (rain24 >= 100 || rain72 >= 180) drivers.push("Antecedent rainfall is already high, increasing runoff sensitivity");
  if (!historicalAudit && (future3 >= 40 || future6 >= 70)) drivers.push("More heavy rain is forecast in the next few hours");
  if (!drivers.length) drivers.push("No urban flash-flood rainfall threshold is currently dominant");

  return {
    score,
    level,
    features: {
      rain_1h_mm: round1(rain1), rain_3h_mm: round1(rain3), rain_6h_mm: round1(rain6),
      rain_24h_mm: round1(rain24), rain_72h_mm: round1(rain72), rain_168h_mm: round1(rain168),
      max_1h_last_6h_mm: round1(max1h6), max_3h_last_24h_mm: round1(max3h24),
      forecast_3h_mm: round1(future3), forecast_6h_mm: round1(future6),
    },
    drivers,
    model: "urban-flash-v1-derived",
    mode: historicalAudit ? "historical-observed-audit" : "live",
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchUrbanFlashRisk(latitude: number, longitude: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=precipitation&past_hours=168&forecast_hours=6&timezone=Africa%2FLagos`;
  const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error("hourly weather feed unavailable");
  const data = await response.json();
  return deriveUrbanFlashRisk(data.hourly);
}
