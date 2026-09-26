/**
 * AI job 5: Street Memory, FloodPass's own learning model.
 *
 * It learns, for each place, how much rain it takes to flood that place,
 * using only FloodPass's own records: every verified FloodPass (a flood) and,
 * where known, heavy-rain days with no flood. Nobody else has this data, so
 * nobody else can learn it. It starts simple and explainable on purpose; with
 * enough records it can be replaced by a trained model using the same inputs.
 */

export type RainObservation = { placeKey: string; rainfall24hMm: number; flooded: boolean };

export type PlaceMemory = {
  placeKey: string;
  floodsSeen: number;
  dryDaysSeen: number;
  /** Rain in 24 hours at or above which this place has flooded. null = not learned yet. */
  thresholdMm: number | null;
  confidence: "none" | "low" | "medium" | "high";
};

export type FloodChance = "likely" | "possible" | "unlikely" | "unknown";

function confidenceFor(floods: number): PlaceMemory["confidence"] {
  if (floods >= 5) return "high";
  if (floods >= 2) return "medium";
  if (floods === 1) return "low";
  return "none";
}

/**
 * Picks the rain level that best separates flood days from dry days:
 * the candidate threshold that catches the most floods while wrongly
 * catching the fewest dry days.
 */
export function learnPlace(placeKey: string, observations: RainObservation[]): PlaceMemory {
  const mine = observations.filter((o) => o.placeKey === placeKey && Number.isFinite(o.rainfall24hMm) && o.rainfall24hMm >= 0);
  const floods = mine.filter((o) => o.flooded).map((o) => o.rainfall24hMm).sort((a, b) => a - b);
  const dry = mine.filter((o) => !o.flooded).map((o) => o.rainfall24hMm);
  if (!floods.length) return { placeKey, floodsSeen: 0, dryDaysSeen: dry.length, thresholdMm: null, confidence: "none" };

  let best = floods[0];
  let bestScore = -Infinity;
  for (const candidate of floods) {
    const caught = floods.filter((r) => r >= candidate).length / floods.length;
    const falseAlarms = dry.length ? dry.filter((r) => r >= candidate).length / dry.length : 0;
    const score = caught - falseAlarms;
    // Prefer the lower threshold on ties: a missed flood hurts more than an extra warning.
    if (score > bestScore + 1e-9) { bestScore = score; best = candidate; }
  }
  return { placeKey, floodsSeen: floods.length, dryDaysSeen: dry.length, thresholdMm: Math.round(best * 10) / 10, confidence: confidenceFor(floods.length) };
}

export function learnAll(observations: RainObservation[]) {
  const keys = Array.from(new Set(observations.map((o) => o.placeKey)));
  return new Map(keys.map((key) => [key, learnPlace(key, observations)]));
}

export function floodChance(memory: PlaceMemory | null | undefined, forecastMm: number | null | undefined): FloodChance {
  if (!memory || memory.thresholdMm == null || forecastMm == null || !Number.isFinite(forecastMm)) return "unknown";
  if (forecastMm >= memory.thresholdMm) return memory.confidence === "low" ? "possible" : "likely";
  if (forecastMm >= memory.thresholdMm * 0.75) return "possible";
  return "unlikely";
}

/** A plain sentence for warnings, for example "This street flooded 3 times, after about 35 mm of rain." */
export function memorySentence(memory: PlaceMemory | null | undefined, lang: "en" | "pcm" = "en") {
  if (!memory || memory.thresholdMm == null) return undefined;
  const times = memory.floodsSeen === 1 ? (lang === "pcm" ? "one time" : "once") : `${memory.floodsSeen} ${lang === "pcm" ? "times" : "times"}`;
  return lang === "pcm"
    ? `This place don flood ${times} before, when rain reach about ${Math.round(memory.thresholdMm)} mm for one day.`
    : `This place has flooded ${times} before, after about ${Math.round(memory.thresholdMm)} mm of rain in a day.`;
}

/** Groups nearby points into the same place (about 300 m squares). */
export function placeKeyFor(latitude: number, longitude: number) {
  const step = 0.003;
  return `${(Math.round(latitude / step) * step).toFixed(3)},${(Math.round(longitude / step) * step).toFixed(3)}`;
}
