export type RiverineWatchLocation = "Lokoja" | "Makurdi";

export interface RiverineWatchInput {
  location: RiverineWatchLocation;
  rain_1d?: number | null;
  rain_3d?: number | null;
  rain_7d?: number | null;
  rain_14d?: number | null;
  rain_30d?: number | null;
  rain_accel_3d?: number | null;
  rain_3_14_ratio?: number | null;
  rain_7_30_ratio?: number | null;
  wet_days_7d?: number | null;
  wet_days_30d?: number | null;
  q24?: number | null;
  q48?: number | null;
  q72?: number | null;
  qmax_72?: number | null;
  q48_minus_q24?: number | null;
  q72_minus_q24?: number | null;
  q72_pct_rise?: number | null;
  q_slope_per_day?: number | null;
  q_monotonic_rise?: number | null;
}

export interface RiverineWatchResult {
  model_id: "riverine-watch-v1";
  probability: number;
  state: "NORMAL" | "MONITOR" | "WATCH";
  horizon_days: 14;
  watch_threshold: 0.7;
  evidence: "retrospective-shadow-pilot";
}

const FEATURES = ["rain_1d", "rain_3d", "rain_7d", "rain_14d", "rain_30d", "rain_accel_3d", "rain_3_14_ratio", "rain_7_30_ratio", "wet_days_7d", "wet_days_30d", "q24", "q48", "q72", "qmax_72", "q48_minus_q24", "q72_minus_q24", "q72_pct_rise", "q_slope_per_day", "q_monotonic_rise"] as const;
const MEDIANS = {"rain_1d": 0.3199999928474426, "rain_3d": 4.364999666810036, "rain_7d": 16.77500033378601, "rain_14d": 40.08499744348228, "rain_30d": 97.82500317972152, "rain_accel_3d": 0.0, "rain_3_14_ratio": 0.14336297225039, "rain_7_30_ratio": 0.2014204273931018, "wet_days_7d": 3.0, "wet_days_30d": 12.0, "q24": 1138.71875, "q48": 1131.7890625, "q72": 1126.3203125, "qmax_72": 1160.59765625, "q48_minus_q24": -2.421875, "q72_minus_q24": -4.90625, "q72_pct_rise": -0.0159680638514408, "q_slope_per_day": -2.453125, "q_monotonic_rise": 0.0} as const;
const MEANS = {"rain_1d": 3.459696506839829, "rain_3d": 10.349392959494166, "rain_7d": 24.501598020169883, "rain_14d": 49.336122221905256, "rain_30d": 106.82470667510786, "rain_accel_3d": -0.2450058092116578, "rain_3_14_ratio": 0.21103636794939576, "rain_7_30_ratio": 0.2358597162634668, "wet_days_7d": 2.6702744491689216, "wet_days_30d": 11.499033629686895, "q24": 3379.1531062765753, "q48": 3366.360395728643, "q72": 3354.5673514809623, "qmax_72": 3479.751925190858, "q48_minus_q24": -12.792710547931968, "q72_minus_q24": -24.58575479561268, "q72_pct_rise": 0.1670795965777752, "q_slope_per_day": -12.29287739780634, "q_monotonic_rise": 0.31851565519907227} as const;
const SCALES = {"rain_1d": 7.206417824893443, "rain_3d": 13.547913678308007, "rain_7d": 25.019296633873925, "rain_14d": 43.75298668822361, "rain_30d": 81.96310664861993, "rain_accel_3d": 16.416067928835847, "rain_3_14_ratio": 0.22214447929909067, "rain_7_30_ratio": 0.1964314762293174, "wet_days_7d": 2.024372571473293, "wet_days_30d": 7.120931964737092, "q24": 4862.016010193053, "q48": 4853.518185170623, "q72": 4848.413485116954, "qmax_72": 4987.425515840905, "q48_minus_q24": 295.53402016376936, "q72_minus_q24": 534.9625580811077, "q72_pct_rise": 1.843134066370984, "q_slope_per_day": 267.48127904055383, "q_monotonic_rise": 0.46590066816026143} as const;
const COEFFICIENTS = [0.067936388347897, 0.01729559276827787, -0.3057465336106425, -0.5507883723164226, -0.3513867421063357, 0.10814828514729931, -0.09966030158917857, 0.23230320338192836, 0.7516987618900884, 1.5834633930929358, 0.10858131025870031, 0.0827765758091293, 0.13407526074134635, 0.43765995871091334, -0.42691008236500705, 0.22829304867884553, -0.08502649123995282, 0.22829304867884553, 0.3187216451702128] as const;
const LOCATION_COEFFICIENTS: Record<RiverineWatchLocation, number> = {
  Lokoja: -1.5425326682295508,
  Makurdi: 1.539210996975959,
};
const INTERCEPT = -2.287828234141512;
const WATCH_THRESHOLD = 0.7;

function finiteOrMedian(value: unknown, median: number) {
  const x = Number(value);
  return Number.isFinite(x) ? x : median;
}

export function scoreRiverineWatchV1(input: RiverineWatchInput): RiverineWatchResult {
  if (input.location !== "Lokoja" && input.location !== "Makurdi") {
    throw new Error("Riverine Watch v1 supports only Lokoja and Makurdi");
  }

  let z = INTERCEPT + LOCATION_COEFFICIENTS[input.location];
  FEATURES.forEach((feature, index) => {
    const x = finiteOrMedian(input[feature], MEDIANS[feature]);
    const standardized = (x - MEANS[feature]) / SCALES[feature];
    z += COEFFICIENTS[index] * standardized;
  });

  const probability = z >= 0
    ? 1 / (1 + Math.exp(-z))
    : Math.exp(z) / (1 + Math.exp(z));

  const state = probability >= WATCH_THRESHOLD
    ? "WATCH"
    : probability >= WATCH_THRESHOLD * 0.6
      ? "MONITOR"
      : "NORMAL";

  return {
    model_id: "riverine-watch-v1",
    probability,
    state,
    horizon_days: 14,
    watch_threshold: WATCH_THRESHOLD,
    evidence: "retrospective-shadow-pilot",
  };
}

export function shouldEmitRiverineWatch(
  state: RiverineWatchResult["state"],
  issueDate: Date,
  lastWatchDate?: Date | null,
  cooldownDays = 7
) {
  if (state !== "WATCH") return false;
  if (!lastWatchDate) return true;
  return issueDate.getTime() - lastWatchDate.getTime() > cooldownDays * 86_400_000;
}
