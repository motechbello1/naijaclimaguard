export type HazardKind = "flood" | "heat" | "storm" | "dry_stress";
export type HazardSeverity = "LOW" | "WATCH" | "ELEVATED" | "HIGH";

export interface HazardSignal {
  kind: HazardKind;
  score: number;
  severity: HazardSeverity;
  title: string;
  when: string;
  starts_at: string | null;
  affects: string[];
  actions: string[];
  evidence: Record<string, number | string | null>;
}

export interface NoApprovalHazardForecast {
  location: { name: string | null; latitude: number; longitude: number };
  status: "CLEAR" | "DEVELOPING";
  headline: string;
  primary_hazard: HazardSignal | null;
  hazards: HazardSignal[];
  next_7_days: { highest_risk_day: string | null; highest_risk_score: number };
  source_status: {
    core_weather: "LIVE";
    ecmwf_detail: "LIVE" | "UNAVAILABLE_OPTIONAL";
    approval_or_api_key_required: false;
  };
  generated_at: string;
  limitations: string[];
}

const HOUR_MS = 3_600_000;
const NIGERIA_OFFSET = "+01:00";

function finite(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + finite(value), 0);
}

function max(values: number[]) {
  return values.length ? Math.max(...values.map((value) => finite(value))) : 0;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function severityFor(score: number): HazardSeverity {
  if (score >= 75) return "HIGH";
  if (score >= 50) return "ELEVATED";
  if (score >= 30) return "WATCH";
  return "LOW";
}

function localEpoch(value: string) {
  const parsed = new Date(`${value}${NIGERIA_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function futureIndices(times: string[], hours: number) {
  const start = Date.now() - HOUR_MS;
  const end = Date.now() + hours * HOUR_MS;
  return times
    .map((time, index) => ({ index, epoch: localEpoch(time) }))
    .filter((point) => point.epoch >= start && point.epoch <= end)
    .map((point) => point.index);
}

function valuesAt(values: number[] | undefined, indices: number[]) {
  const source = values ?? [];
  return indices.map((index) => finite(source[index]));
}

function rollingMax(values: number[], window: number) {
  let best = 0;
  for (let i = 0; i < values.length; i++) {
    best = Math.max(best, sum(values.slice(i, i + window)));
  }
  return best;
}

function firstMatchingTime(
  times: string[],
  indices: number[],
  predicate: (index: number) => boolean
) {
  const index = indices.find(predicate);
  return index === undefined ? null : times[index] ?? null;
}

function humanWhen(startsAt: string | null, fallback: string) {
  if (!startsAt) return fallback;
  const epoch = localEpoch(startsAt);
  if (!epoch) return fallback;
  const hours = Math.max(0, Math.round((epoch - Date.now()) / HOUR_MS));
  if (hours <= 1) return "within about an hour";
  if (hours < 24) return `in about ${hours} hours`;
  const days = Math.round(hours / 24);
  return `in about ${days} day${days === 1 ? "" : "s"}`;
}

async function fetchJson(url: string, timeoutMs = 9000) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`source returned ${response.status}`);
  return response.json();
}

export async function fetchNoApprovalHazardForecast(
  latitude: number,
  longitude: number,
  name: string | null = null
): Promise<NoApprovalHazardForecast> {
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    throw new Error("invalid coordinates");
  }

  const common = `latitude=${latitude}&longitude=${longitude}&timezone=Africa%2FLagos`;
  const coreUrl =
    `https://api.open-meteo.com/v1/forecast?${common}` +
    `&hourly=apparent_temperature,precipitation_probability,precipitation,weather_code,wind_gusts_10m,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm` +
    `&daily=apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,et0_fao_evapotranspiration` +
    `&past_days=7&forecast_days=7`;
  const ecmwfUrl =
    `https://api.open-meteo.com/v1/ecmwf?${common}` +
    `&hourly=runoff,cape,soil_moisture_0_to_7cm,soil_moisture_7_to_28cm&forecast_days=7`;

  const [core, ecmwfResult] = await Promise.all([
    fetchJson(coreUrl),
    fetchJson(ecmwfUrl)
      .then((data) => ({ ok: true as const, data }))
      .catch(() => ({ ok: false as const, data: null })),
  ]);

  const hourly = core?.hourly ?? {};
  const daily = core?.daily ?? {};
  const ecmwf = ecmwfResult.ok ? (ecmwfResult.data?.hourly ?? {}) : {};
  const times: string[] = hourly.time ?? [];
  if (!times.length) throw new Error("core forecast returned no hourly timeline");

  const next24 = futureIndices(times, 24);
  const next72 = futureIndices(times, 72);
  const next168 = futureIndices(times, 168);
  const precip72 = valuesAt(hourly.precipitation, next72);
  const precip168 = valuesAt(hourly.precipitation, next168);
  const gust72 = valuesAt(hourly.wind_gusts_10m, next72);
  const apparent72 = valuesAt(hourly.apparent_temperature, next72);
  const codes72 = valuesAt(hourly.weather_code, next72);

  const recent = times
    .map((time, index) => ({ index, epoch: localEpoch(time) }))
    .filter((point) => point.epoch >= Date.now() - 7 * 24 * HOUR_MS && point.epoch < Date.now())
    .map((point) => point.index);

  const recentRain7d = sum(valuesAt(hourly.precipitation, recent));
  const rain72 = sum(precip72);
  const rain7Forecast = sum(precip168);
  const max1h = max(precip72);
  const max3h = rollingMax(precip72, 3);

  const ecmwfTimes: string[] = ecmwf.time ?? [];
  const ecmwf72 = futureIndices(ecmwfTimes, 72);
  const runoff72 = sum(valuesAt(ecmwf.runoff, ecmwf72));
  const maxCape72 = max(valuesAt(ecmwf.cape, ecmwf72));
  const soilNow = max([
    ...valuesAt(ecmwf.soil_moisture_0_to_7cm, ecmwf72.slice(0, 3)),
    ...valuesAt(ecmwf.soil_moisture_7_to_28cm, ecmwf72.slice(0, 3)),
    ...valuesAt(hourly.soil_moisture_0_to_1cm, next24.slice(0, 3)),
    ...valuesAt(hourly.soil_moisture_1_to_3cm, next24.slice(0, 3)),
  ]);

  const floodScore = Math.round(100 * (
    clamp01(rain72 / 120) * 0.28 +
    Math.max(clamp01(max1h / 25), clamp01(max3h / 50)) * 0.30 +
    clamp01(runoff72 / 30) * 0.18 +
    clamp01((soilNow - 0.15) / 0.30) * 0.14 +
    clamp01(recentRain7d / 150) * 0.10
  ));
  const floodStart = firstMatchingTime(times, next72, (index) =>
    finite(hourly.precipitation?.[index]) >= 8 || finite(hourly.precipitation_probability?.[index]) >= 75
  );

  const maxFeels = max(apparent72);
  const heatScore = Math.round(100 * clamp01((maxFeels - 32) / 13));
  const heatStart = firstMatchingTime(times, next168, (index) =>
    finite(hourly.apparent_temperature?.[index]) >= 38
  );

  const maxGust = max(gust72);
  const stormScore = Math.round(100 * (
    clamp01((maxGust - 30) / 70) * 0.45 +
    clamp01(maxCape72 / 2500) * 0.30 +
    clamp01(max1h / 25) * 0.20 +
    (codes72.some((code) => code >= 95) ? 0.05 : 0)
  ));
  const stormStart = firstMatchingTime(times, next72, (index) =>
    finite(hourly.wind_gusts_10m?.[index]) >= 55 || finite(hourly.weather_code?.[index]) >= 95
  );

  const dailyTimes: string[] = daily.time ?? [];
  const todayNigeria = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const nextDays = dailyTimes
    .map((date, index) => ({ date, index }))
    .filter((point) => point.date >= todayNigeria)
    .slice(0, 7);
  const rainDaily = nextDays.map((point) => finite(daily.precipitation_sum?.[point.index]));
  const et0Daily = nextDays.map((point) => finite(daily.et0_fao_evapotranspiration?.[point.index]));
  const dryGap = Math.max(0, sum(et0Daily) - sum(rainDaily));
  const dryScore = Math.round(100 * (
    clamp01(dryGap / 35) * 0.65 + clamp01((0.25 - soilNow) / 0.15) * 0.35
  ));

  const hazards: HazardSignal[] = [
    {
      kind: "flood",
      score: floodScore,
      severity: severityFor(floodScore),
      title: floodScore >= 50 ? "Flood conditions are building" : "Flood risk is currently limited",
      when: humanWhen(floodStart, floodScore >= 30 ? "within the next 3 days" : "no strong onset signal in the next 3 days"),
      starts_at: floodStart,
      affects: ["low-lying roads", "poorly drained streets", "ground-floor spaces", "parked vehicles and exposed stock"],
      actions: [
        "Check the routes and places you depend on before leaving.",
        "Move important documents, electronics and other valuables away from floor level if your property is flood-prone.",
        "Never enter or drive through floodwater; use a safer route if conditions worsen.",
      ],
      evidence: {
        rain_next_72h_mm: +rain72.toFixed(1),
        peak_1h_rain_mm: +max1h.toFixed(1),
        peak_3h_rain_mm: +max3h.toFixed(1),
        recent_7d_rain_mm: +recentRain7d.toFixed(1),
        ecmwf_runoff_next_72h_mm: ecmwfResult.ok ? +runoff72.toFixed(1) : null,
      },
    },
    {
      kind: "heat",
      score: heatScore,
      severity: severityFor(heatScore),
      title: heatScore >= 50 ? "Dangerous heat may affect normal plans" : "Heat risk is currently limited",
      when: humanWhen(heatStart, heatScore >= 30 ? "during the hottest period in the next 7 days" : "no strong heat signal in the next 7 days"),
      starts_at: heatStart,
      affects: ["outdoor activity", "school and work journeys", "people sensitive to heat", "electricity and cooling demand"],
      actions: [
        "Plan demanding outdoor activity for cooler hours where possible.",
        "Carry drinking water and take regular shade or indoor breaks in very hot periods.",
        "Check on children, older relatives and anyone who may struggle with heat.",
      ],
      evidence: { maximum_apparent_temperature_c: +maxFeels.toFixed(1) },
    },
    {
      kind: "storm",
      score: stormScore,
      severity: severityFor(stormScore),
      title: stormScore >= 50 ? "Severe storm conditions may develop" : "Severe storm risk is currently limited",
      when: humanWhen(stormStart, stormScore >= 30 ? "within the next 3 days" : "no strong storm signal in the next 3 days"),
      starts_at: stormStart,
      affects: ["outdoor plans", "trees and lightweight structures", "road travel", "power and communications"],
      actions: [
        "Secure lightweight outdoor items before bad weather arrives if it is safe to do so.",
        "Avoid unnecessary outdoor travel during severe wind, lightning or intense rain.",
        "Keep your phone charged and follow fresh official safety instructions if issued.",
      ],
      evidence: {
        maximum_wind_gust_kmh: +maxGust.toFixed(1),
        maximum_cape_jkg: ecmwfResult.ok ? +maxCape72.toFixed(0) : null,
      },
    },
    {
      kind: "dry_stress",
      score: dryScore,
      severity: severityFor(dryScore),
      title: dryScore >= 50 ? "Dry conditions are building" : "Dry-stress risk is currently limited",
      when: dryScore >= 30 ? "building across the next 7 days" : "no strong dry-stress signal in the next 7 days",
      starts_at: null,
      affects: ["water-sensitive household activity", "gardens and crops", "water storage and supply planning"],
      actions: [
        "Plan water use early if your area normally has supply problems during dry periods.",
        "Check stored water and irrigation needs before conditions worsen.",
        "Avoid open burning during very dry or windy conditions.",
      ],
      evidence: {
        forecast_7d_rain_mm: +rain7Forecast.toFixed(1),
        forecast_7d_water_deficit_mm: +dryGap.toFixed(1),
        soil_moisture_proxy: soilNow ? +soilNow.toFixed(3) : null,
      },
    },
  ];
  hazards.sort((a, b) => b.score - a.score);

  const primary = hazards[0]?.score >= 30 ? hazards[0] : null;
  const dailyScores = nextDays.map((point) => {
    const rain = finite(daily.precipitation_sum?.[point.index]);
    const gust = finite(daily.wind_gusts_10m_max?.[point.index]);
    const feels = finite(daily.apparent_temperature_max?.[point.index]);
    return {
      date: point.date,
      score: Math.round(100 * Math.max(
        clamp01(rain / 60),
        clamp01((gust - 30) / 70),
        clamp01((feels - 32) / 13)
      )),
    };
  });
  const highestDay = [...dailyScores].sort((a, b) => b.score - a.score)[0] ?? null;

  return {
    location: { name, latitude, longitude },
    status: primary ? "DEVELOPING" : "CLEAR",
    headline: primary
      ? `${primary.title}. ${primary.when}.`
      : "No major environmental danger is showing around this location in the next 7 days.",
    primary_hazard: primary,
    hazards,
    next_7_days: {
      highest_risk_day: highestDay?.date ?? null,
      highest_risk_score: highestDay?.score ?? 0,
    },
    source_status: {
      core_weather: "LIVE",
      ecmwf_detail: ecmwfResult.ok ? "LIVE" : "UNAVAILABLE_OPTIONAL",
      approval_or_api_key_required: false,
    },
    generated_at: new Date().toISOString(),
    limitations: [
      "This is decision-support guidance, not an official emergency warning.",
      "Flood scoring uses rainfall, runoff and wetness signals; it does not yet replace gauge-based river discharge forecasting.",
      "Dry-stress is a short-horizon signal and must not be described as a long-term drought forecast.",
      "Money-at-risk estimates are intentionally not invented; they require local asset, price or business exposure data.",
    ],
  };
}
