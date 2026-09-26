/**
 * FloodPass Truth Engine.
 *
 * Decides whether a flood report is true, the way VAR checks a goal: no single
 * camera decides, several independent checks must agree. This file is PURE (no
 * database, no network) so it can be unit-tested and explained line by line.
 *
 * The weights below are a starting guess, written down openly so that partners
 * can see exactly how a FloodPass is earned. Real floods will teach us better
 * weights; any change must bump TRUTH_ENGINE_VERSION so old passes stay
 * explainable under the rules that issued them.
 */

export const TRUTH_ENGINE_VERSION = "truth-engine-v2";

export const VERIFIED_AT = 70;
export const LIKELY_AT = 40;

export type Depth = "ANKLE" | "KNEE" | "WAIST" | "CAR_ROOF" | "UNKNOWN";
export type ReportStatus = "VERIFIED" | "LIKELY" | "UNCONFIRMED";

export type TruthInput = {
  /** Rain that fell in the 24 hours before the report, in millimetres. null = no data. */
  rainfall24hMm: number | null;
  /** Other people (not this reporter) who reported water within about 1 km and 3 hours. */
  neighbourReports: number;
  photo: {
    present: boolean;
    /** Hours between when the photo was taken and when the flood was reported. null = unknown. */
    takenHoursFromReport: number | null;
    /** Distance between where the photo was taken and the report, in km. null = unknown. */
    distanceKm: number | null;
    /** Sent straight from the camera or chat at the time of the report. */
    liveCapture?: boolean;
    /** The AI Photo Checker's view. null or missing = no AI check. */
    ai?: { floodVisible: "yes" | "no" | "unsure"; confidence: number; reason?: string } | null;
    /** The exact same photo was already sent by a different person. */
    duplicateOfOtherReporter?: boolean;
  };
  /** An official warning or a news report of flooding for this area in the last 48 hours. */
  officialSignal: { present: boolean; detail?: string };
  /** A known flood hotspot, or an earlier verified FloodPass within about 500 m. */
  history: { knownHotspot: boolean; earlierVerifiedNearby: number; newsReportsNearby?: number };
  /** Someone scanned a QR depth ruler at this spot (planned; always false until rulers exist). */
  rulerReading: boolean;
};

export type TruthCheck = {
  key: "sky" | "neighbours" | "photo" | "official" | "history" | "ruler";
  label: string;
  question: string;
  points: number;
  max: number;
  passed: boolean;
  detail: string;
};

export type TruthResult = {
  version: string;
  score: number;
  status: ReportStatus;
  checks: TruthCheck[];
  checksPassed: number;
  checksTotal: number;
};

function skyCheck(mm: number | null): TruthCheck {
  const base = { key: "sky" as const, label: "Sky check", question: "Did heavy rain fall here in the 24 hours before?", max: 25 };
  if (mm == null || !Number.isFinite(mm)) return { ...base, points: 0, passed: false, detail: "No rainfall data for this place and time." };
  const rounded = Math.round(mm * 10) / 10;
  if (mm >= 20) return { ...base, points: 25, passed: true, detail: `${rounded} mm of rain fell in the 24 hours before: heavy.` };
  if (mm >= 10) return { ...base, points: 15, passed: true, detail: `${rounded} mm of rain fell in the 24 hours before: moderate.` };
  if (mm >= 5) return { ...base, points: 8, passed: true, detail: `${rounded} mm of rain fell in the 24 hours before: light.` };
  return { ...base, points: 0, passed: false, detail: `Only ${rounded} mm of rain fell in the 24 hours before.` };
}

function neighbourCheck(count: number): TruthCheck {
  const base = { key: "neighbours" as const, label: "Neighbour check", question: "Did other people nearby report water too?", max: 25 };
  const n = Math.max(0, Math.floor(count));
  if (n >= 3) return { ...base, points: 25, passed: true, detail: `${n} other people nearby reported water.` };
  if (n === 2) return { ...base, points: 20, passed: true, detail: "2 other people nearby reported water." };
  if (n === 1) return { ...base, points: 12, passed: true, detail: "1 other person nearby reported water." };
  return { ...base, points: 0, passed: false, detail: "No one else nearby has reported water yet." };
}

function photoCheck(photo: TruthInput["photo"]): TruthCheck {
  const base = { key: "photo" as const, label: "Photo check", question: "Does the photo show flood water, here and now?", max: 20 };
  if (!photo.present) return { ...base, points: 0, passed: false, detail: "No photo was sent." };
  if (photo.duplicateOfOtherReporter) return { ...base, points: 0, passed: false, detail: "This exact photo was already sent by someone else." };
  const ai = photo.ai;
  if (ai && ai.floodVisible === "no" && ai.confidence >= 0.6) {
    return { ...base, points: 0, passed: false, detail: `The AI photo check did not see flood water${ai.reason ? `: ${ai.reason}` : "."}` };
  }
  const timeKnown = photo.takenHoursFromReport != null;
  const placeKnown = photo.distanceKm != null;
  const timeOk = timeKnown && Math.abs(photo.takenHoursFromReport as number) <= 6;
  const placeOk = placeKnown && (photo.distanceKm as number) <= 1;
  if ((timeKnown && !timeOk) || (placeKnown && !placeOk)) {
    return { ...base, points: 0, passed: false, detail: "The photo's time or place does not match the report." };
  }
  // What the photo shows (up to 12) plus how fresh and local it is (up to 8).
  const aiSaysYes = Boolean(ai && ai.floodVisible === "yes" && ai.confidence >= 0.6);
  const content = aiSaysYes ? 12 : 6;
  const freshness = timeOk && placeOk ? 8 : timeOk || placeOk || photo.liveCapture ? 5 : 2;
  const points = Math.min(20, content + freshness);
  const parts = [
    aiSaysYes ? "The AI photo check sees flood water." : ai ? "The AI photo check was not sure." : "A photo was sent (not checked by AI).",
    timeOk && placeOk ? "Taken here, just now." : photo.liveCapture ? "Sent live from the camera or chat." : "Its time and place are not known.",
  ];
  return { ...base, points, passed: true, detail: parts.join(" ") };
}

function officialCheck(signal: TruthInput["officialSignal"]): TruthCheck {
  const base = { key: "official" as const, label: "Official check", question: "Do NIHSA, NiMet, NEMA, satellites or news show flooding here?", max: 15 };
  if (signal.present) return { ...base, points: 15, passed: true, detail: signal.detail || "An official warning or flood report covers this area." };
  return { ...base, points: 0, passed: false, detail: "No official warning or flood report for this area in the last 48 hours." };
}

function historyCheck(history: TruthInput["history"]): TruthCheck {
  const base = { key: "history" as const, label: "History check", question: "Has this spot flooded before?", max: 10 };
  if (history.knownHotspot) return { ...base, points: 10, passed: true, detail: "This is a known flood hotspot." };
  if (history.earlierVerifiedNearby > 0) return { ...base, points: 10, passed: true, detail: `${history.earlierVerifiedNearby} earlier verified flood${history.earlierVerifiedNearby === 1 ? "" : "s"} nearby.` };
  const news = history.newsReportsNearby ?? 0;
  if (news >= 2) return { ...base, points: 10, passed: true, detail: `Floods here were in the news ${news} times in the last 3 years.` };
  if (news === 1) return { ...base, points: 5, passed: true, detail: "A flood here was in the news once in the last 3 years." };
  return { ...base, points: 0, passed: false, detail: "No flood history recorded here yet." };
}

function rulerCheck(reading: boolean): TruthCheck {
  const base = { key: "ruler" as const, label: "Ruler check", question: "Did someone scan a QR depth ruler here?", max: 5 };
  return reading
    ? { ...base, points: 5, passed: true, detail: "A depth ruler reading was scanned here." }
    : { ...base, points: 0, passed: false, detail: "No depth ruler at this spot yet." };
}

export function statusFor(score: number): ReportStatus {
  if (score >= VERIFIED_AT) return "VERIFIED";
  if (score >= LIKELY_AT) return "LIKELY";
  return "UNCONFIRMED";
}

export function scoreReport(input: TruthInput): TruthResult {
  const checks = [
    skyCheck(input.rainfall24hMm),
    neighbourCheck(input.neighbourReports),
    photoCheck(input.photo),
    officialCheck(input.officialSignal),
    historyCheck(input.history),
    rulerCheck(input.rulerReading),
  ];
  const score = Math.min(100, checks.reduce((sum, check) => sum + check.points, 0));
  return {
    version: TRUTH_ENGINE_VERSION,
    score,
    status: statusFor(score),
    checks,
    checksPassed: checks.filter((check) => check.passed).length,
    checksTotal: checks.length,
  };
}

/** Distance between two points in kilometres (haversine). */
export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function parseDepth(value: unknown): Depth {
  const text = String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (["1", "ANKLE", "ANKLE_DEEP"].includes(text)) return "ANKLE";
  if (["2", "KNEE", "KNEE_DEEP"].includes(text)) return "KNEE";
  if (["3", "WAIST", "WAIST_DEEP"].includes(text)) return "WAIST";
  if (["4", "CAR_ROOF", "ROOF", "CAR"].includes(text)) return "CAR_ROOF";
  return "UNKNOWN";
}

export const DEPTH_WORDS: Record<Depth, string> = {
  ANKLE: "ankle deep",
  KNEE: "knee deep",
  WAIST: "waist deep",
  CAR_ROOF: "up to a car roof",
  UNKNOWN: "depth not given",
};
