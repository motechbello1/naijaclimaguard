export interface DerivedV2Risk {
  risk: {
    score: number;
    level: "EXTREME" | "SEVERE" | "WARNING" | "WATCH" | "NORMAL";
    flood_type: "urban" | "riverine" | "mixed";
  };
  factors: {
    rainfall_7d: number;
    burst_intensity: number;
    soil_saturation: number;
  };
  hourly: {
    max_mm_per_hour: number;
    max_3h_mm: number;
    classification: "heavy" | "moderate" | "light" | "trace";
  };
  raw_weather: {
    precipitation_7d_mm: number;
    precipitation_3d_mm: number;
    moisture_balance_7d_mm: number;
  };
}

function sumRange(values: number[], start: number, end: number) {
  return values
    .slice(Math.max(0, start), end)
    .reduce((total, value) => total + (value || 0), 0);
}

export function deriveV2FromWeather(daily: any, hourlyPrecip: number[] = []): DerivedV2Risk {
  if (!daily?.time?.length) throw new Error("daily weather data unavailable");

  const idx = daily.time.length - 5;
  const precip: number[] = daily.precipitation_sum ?? [];
  const et0: number[] = daily.et0_fao_evapotranspiration ?? [];

  const precip7 = sumRange(precip, idx - 6, idx + 1);
  const precip3 = sumRange(precip, idx - 2, idx + 1);
  const balance7 = precip7 - sumRange(et0, idx - 6, idx + 1);

  const rainfallNorm = Math.min(1, precip7 / 200);
  const burstDaily = Math.min(1, precip3 / 120);
  const wetnessProxy = Math.min(1, Math.max(0, (balance7 + 40) / 160));

  const safeHourly = hourlyPrecip
    .map((value) => (Number.isFinite(value) ? value : 0))
    .map((value) => Math.max(0, value));

  const maxHourly = safeHourly.length ? Math.max(...safeHourly) : 0;
  let max3h = 0;
  for (let i = 2; i < safeHourly.length; i++) {
    max3h = Math.max(max3h, safeHourly[i] + safeHourly[i - 1] + safeHourly[i - 2]);
  }

  const hourlyBurst = Math.max(
    Math.min(1, maxHourly / 30),
    Math.min(1, max3h / 60)
  );
  const effectiveBurst = Math.max(burstDaily, hourlyBurst);

  const floodType =
    hourlyBurst > burstDaily + 0.1
      ? "urban"
      : burstDaily > hourlyBurst + 0.1
        ? "riverine"
        : "mixed";

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round((rainfallNorm * 0.4 + effectiveBurst * 0.35 + wetnessProxy * 0.25) * 100)
    )
  );

  const level =
    score >= 90
      ? "EXTREME"
      : score >= 75
        ? "SEVERE"
        : score >= 60
          ? "WARNING"
          : score >= 40
            ? "WATCH"
            : "NORMAL";

  return {
    risk: { score, level, flood_type: floodType },
    factors: {
      rainfall_7d: +rainfallNorm.toFixed(2),
      burst_intensity: +effectiveBurst.toFixed(2),
      // Backward-compatible name: this remains a rainfall-minus-ET0 wetness proxy.
      soil_saturation: +wetnessProxy.toFixed(2),
    },
    hourly: {
      max_mm_per_hour: +maxHourly.toFixed(1),
      max_3h_mm: +max3h.toFixed(1),
      classification:
        maxHourly >= 20 ? "heavy" : maxHourly >= 10 ? "moderate" : maxHourly >= 2 ? "light" : "trace",
    },
    raw_weather: {
      precipitation_7d_mm: +precip7.toFixed(1),
      precipitation_3d_mm: +precip3.toFixed(1),
      moisture_balance_7d_mm: +balance7.toFixed(1),
    },
  };
}

export async function fetchDerivedV2Risk(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    throw new Error("invalid coordinates");
  }

  const [dailyRes, hourlyRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&daily=precipitation_sum,et0_fao_evapotranspiration&past_days=10&forecast_days=4&timezone=Africa%2FLagos`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&hourly=precipitation&past_hours=48&forecast_hours=0&timezone=Africa%2FLagos`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    ),
  ]);

  if (!dailyRes.ok) throw new Error("weather feed unavailable");
  const daily = (await dailyRes.json()).daily;

  let hourlyPrecip: number[] = [];
  if (hourlyRes.ok) {
    const hourly = (await hourlyRes.json()).hourly;
    hourlyPrecip = hourly?.precipitation ?? [];
  }

  return deriveV2FromWeather(daily, hourlyPrecip);
}
