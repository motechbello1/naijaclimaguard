/**
 * Shared risk scoring — handles BOTH riverine and urban flash-flood patterns.
 *
 * Riverine (Lokoja, Makurdi, etc.): 7-day accumulation + moisture balance.
 * Urban (Abuja, Lagos, etc.): hourly burst intensity from the last 48 hours.
 *
 * Open-Meteo free tier supports hourly precipitation — verified.
 * Every value is a live reading, nothing invented.
 */

export interface RiskResult {
  score: number;
  level: string;
  color: string;
  rain7: number;
  rain3: number;
  maxHourly: number;      // peak hourly mm in last 48h
  balance7: number;
  factors: {
    rainfall: number;     // 7d accumulation normalized
    burst: number;        // 3d burst OR hourly intensity (whichever worse)
    saturation: number;   // moisture balance
  };
  floodType: "riverine" | "urban" | "mixed";
}

export function levelFor(s: number) {
  if (s >= 90) return { label: "Extreme", color: "#8E5CD9" };
  if (s >= 75) return { label: "Severe", color: "#EF4444" };
  if (s >= 60) return { label: "Warning", color: "#F97316" };
  if (s >= 40) return { label: "Watch", color: "#F59E0B" };
  return { label: "Normal", color: "#10B981" };
}

/**
 * Fetch both daily AND hourly data from Open-Meteo for a coordinate.
 * Returns the raw JSON for both endpoints.
 */
export async function fetchWeatherData(lat: number, lon: number) {
  const [dailyRes, hourlyRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=precipitation_sum,et0_fao_evapotranspiration&past_days=10&forecast_days=4&timezone=Africa%2FLagos`,
      { cache: "no-store" }
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=precipitation&past_hours=48&forecast_hours=0&timezone=Africa%2FLagos`,
      { cache: "no-store" }
    ),
  ]);

  if (!dailyRes.ok) throw new Error("Daily feed unavailable");

  const daily = (await dailyRes.json()).daily;
  let hourly: { time: string[]; precipitation: number[] } | null = null;
  if (hourlyRes.ok) {
    hourly = (await hourlyRes.json()).hourly;
  }

  return { daily, hourly };
}

/**
 * Compute risk from raw weather data.
 * Uses both daily accumulation AND hourly intensity.
 */
export function computeRisk(
  daily: any,
  hourly: { time: string[]; precipitation: number[] } | null
): RiskResult {
  // ---- Daily accumulation (riverine signal) ----
  const idx = daily.time.length - 5;
  const p: number[] = daily.precipitation_sum ?? [];
  const et0: number[] = daily.et0_fao_evapotranspiration ?? [];
  const sum = (a: number[], x: number, y: number) =>
    a.slice(Math.max(0, x), y).reduce((m, n) => m + (n || 0), 0);

  const rain7 = sum(p, idx - 6, idx + 1);
  const rain3 = sum(p, idx - 2, idx + 1);
  const balance7 = rain7 - sum(et0, idx - 6, idx + 1);

  const rainfallNorm = Math.min(1, rain7 / 200);
  const burstDaily = Math.min(1, rain3 / 120);
  const saturationNorm = Math.min(1, Math.max(0, (balance7 + 40) / 160));

  // ---- Hourly intensity (urban flash-flood signal) ----
  let maxHourly = 0;
  let hourlyBurst = 0;
  if (hourly?.precipitation?.length) {
    const hp = hourly.precipitation;
    maxHourly = Math.max(0, ...hp.map(v => v ?? 0));

    // Thresholds based on WMO/NiMet intensity classification:
    // >10mm/hr = heavy, >20mm/hr = very heavy, >50mm/hr = extreme
    hourlyBurst = Math.min(1, maxHourly / 30); // 30mm/hr = 1.0 (extreme for urban drainage)

    // Also check 3-hour rolling sum (captures sustained heavy bursts)
    let max3h = 0;
    for (let i = 2; i < hp.length; i++) {
      const sum3 = (hp[i] ?? 0) + (hp[i-1] ?? 0) + (hp[i-2] ?? 0);
      max3h = Math.max(max3h, sum3);
    }
    const burst3h = Math.min(1, max3h / 60); // 60mm in 3 hours = extreme for drainage
    hourlyBurst = Math.max(hourlyBurst, burst3h);
  }

  // ---- Blend: take the WORSE of daily-burst and hourly-burst ----
  const effectiveBurst = Math.max(burstDaily, hourlyBurst);

  // Determine flood type for transparency
  const floodType: "riverine" | "urban" | "mixed" =
    hourlyBurst > burstDaily + 0.1 ? "urban" :
    burstDaily > hourlyBurst + 0.1 ? "riverine" : "mixed";

  // Final score — same disclosed formula but burst uses the worse signal
  const score = Math.round(
    (rainfallNorm * 0.40 + effectiveBurst * 0.35 + saturationNorm * 0.25) * 100
  );

  const clamped = Math.max(0, Math.min(100, score));
  const { label, color } = levelFor(clamped);

  return {
    score: clamped,
    level: label,
    color,
    rain7: +rain7.toFixed(1),
    rain3: +rain3.toFixed(1),
    maxHourly: +maxHourly.toFixed(1),
    balance7: +balance7.toFixed(1),
    factors: {
      rainfall: +rainfallNorm.toFixed(2),
      burst: +effectiveBurst.toFixed(2),
      saturation: +saturationNorm.toFixed(2),
    },
    floodType,
  };
}
