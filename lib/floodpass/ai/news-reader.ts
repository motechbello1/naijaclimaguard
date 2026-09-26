import { askJson } from "@/lib/floodpass/ai/provider";
import { NIGERIA_JURISDICTIONS } from "@/lib/intelligence/live-flood-feed";

/**
 * AI job 2: the News Reader.
 * Reads flood headlines and says: is this a real flood in Nigeria, a warning,
 * or noise? Which states and towns? How many people hurt or displaced?
 * The keyword rules still run first; the AI corrects them when it is sure.
 */

export type NewsKind = "flood_event" | "warning" | "other" | "foreign";

export type NewsReading = {
  kind: NewsKind;
  states: string[];
  places: string[];
  deaths: number | null;
  displaced: number | null;
  confidence: number;
};

const STATE_NAMES = NIGERIA_JURISDICTIONS.map((entry) => entry.state);

const SYSTEM = [
  "You read Nigerian flood news headlines for FloodPass.",
  "For each headline decide:",
  "kind: flood_event (flooding happened in Nigeria), warning (a forecast, alert or list of places at risk in Nigeria), foreign (about another country), other (opinion, politics, blame, funding, or not about flooding).",
  `states: which of these are named or clearly meant: ${STATE_NAMES.join(", ")}. Use FCT for Abuja.`,
  "places: towns, LGAs, estates or roads named, as written.",
  "deaths and displaced: numbers only if the headline states them, otherwise null.",
  'Reply with ONLY a JSON array, one object per headline, in the same order: [{"i":0,"kind":"...","states":[],"places":[],"deaths":null,"displaced":null,"confidence":0.0-1.0}]',
].join("\n");

type Raw = { i?: number; kind?: string; states?: unknown; places?: unknown; deaths?: unknown; displaced?: unknown; confidence?: unknown };

function cleanStates(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .map((item) => (/^abuja$|federal capital/i.test(item) ? "FCT" : item))
    .filter((item) => STATE_NAMES.includes(item))
    .filter((item, index, all) => all.indexOf(item) === index);
}

function cleanNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export function normalizeReadings(raw: unknown, count: number): Array<NewsReading | null> {
  const out: Array<NewsReading | null> = Array.from({ length: count }, () => null);
  if (!Array.isArray(raw)) return out;
  raw.forEach((item: Raw, position) => {
    const index = Number.isInteger(item?.i) ? Number(item.i) : position;
    if (index < 0 || index >= count) return;
    const kind = ["flood_event", "warning", "other", "foreign"].includes(String(item?.kind)) ? (item.kind as NewsKind) : null;
    if (!kind) return;
    out[index] = {
      kind,
      states: cleanStates(item.states),
      places: Array.isArray(item.places) ? item.places.map((p) => String(p).slice(0, 60)).slice(0, 6) : [],
      deaths: cleanNumber(item.deaths),
      displaced: cleanNumber(item.displaced),
      confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
    };
  });
  return out;
}

/** Reads up to 25 headlines in one call. Returns null entries where the AI was not sure or not available. */
export async function readHeadlines(headlines: string[]): Promise<Array<NewsReading | null>> {
  const batch = headlines.slice(0, 25);
  if (!batch.length) return [];
  const user = batch.map((title, index) => `${index}. ${title}`).join("\n");
  const raw = await askJson<unknown>({ system: SYSTEM, user, maxTokens: 1800, timeoutMs: 20000 });
  return normalizeReadings(raw, batch.length);
}

type FeedItemLike = { state: string; states?: string[]; areas: string[]; status: "REPORTED" | "WARNING" | "WATCH" | "UNVERIFIED"; severity: number };

/**
 * Applies the AI's reading to a news item, but only when the AI is sure (70% or more).
 * The keyword rules stay in charge when the AI is unsure or switched off.
 */
export function applyReading<T extends FeedItemLike>(item: T, reading: NewsReading | null | undefined): T {
  if (!reading || reading.confidence < 0.7) return item;
  const next: T = { ...item };
  if (reading.kind === "foreign" || reading.kind === "other") {
    next.status = "UNVERIFIED";
    next.severity = 0;
    return next;
  }
  if (reading.kind === "flood_event") {
    next.status = "REPORTED";
    const hurt = (reading.deaths ?? 0) > 0 || (reading.displaced ?? 0) > 0;
    next.severity = Math.max(item.severity, hurt ? 4 : 3);
  } else if (reading.kind === "warning") {
    next.status = "WARNING";
    next.severity = Math.max(2, Math.min(item.severity, 3));
  }
  if (reading.states.length) {
    next.states = reading.states;
    next.state = reading.states[0];
  }
  if (reading.places.length) {
    next.areas = Array.from(new Set([...item.areas, ...reading.places])).slice(0, 8);
  }
  return next;
}

export function storedReading(metadata: unknown): NewsReading | null {
  const ai = (metadata as { ai?: unknown } | null)?.ai;
  if (!ai || typeof ai !== "object") return null;
  const [reading] = normalizeReadings([ai], 1);
  return reading;
}
