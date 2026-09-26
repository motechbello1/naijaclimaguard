import { createHash } from "crypto";
import { askJson, type AiImage } from "@/lib/floodpass/ai/provider";
import { parseDepth, type Depth } from "@/lib/floodpass/truth-engine";

/**
 * AI job 1: the Photo Checker.
 * Looks at a flood photo and says whether flood water is really visible and
 * roughly how deep it is. The photo is not stored; only its fingerprint is.
 */

export type PhotoVerdict = {
  floodVisible: "yes" | "no" | "unsure";
  depth: Depth;
  confidence: number;
  reason: string;
  source: "ai" | "none";
};

const SYSTEM = [
  "You check photos sent to FloodPass, a flood reporting service in Nigeria.",
  "Reply with ONLY one JSON object, no other text:",
  '{"flood_visible":"yes"|"no"|"unsure","depth":"ANKLE"|"KNEE"|"WAIST"|"CAR_ROOF"|"UNKNOWN","confidence":0.0-1.0,"reason":"under 20 words","looks_like_screenshot_or_internet_image":true|false}',
  "flood_visible is yes only when standing or flowing flood water covers a road, compound, field or the inside of a building.",
  "Rain falling, wet ground, small puddles, and rivers inside their normal banks are no.",
  "Judge depth against people, cars, walls or doors in the photo. Use UNKNOWN if you cannot tell.",
  "If the image looks like a screenshot, a news graphic, a watermark from a website, or a photo of a screen, set looks_like_screenshot_or_internet_image to true.",
].join("\n");

type Raw = { flood_visible?: string; depth?: string; confidence?: number; reason?: string; looks_like_screenshot_or_internet_image?: boolean };

export function normalizeVerdict(raw: Raw | null): PhotoVerdict {
  if (!raw) return { floodVisible: "unsure", depth: "UNKNOWN", confidence: 0, reason: "No AI photo check was available.", source: "none" };
  const visible = ["yes", "no", "unsure"].includes(String(raw.flood_visible)) ? (raw.flood_visible as PhotoVerdict["floodVisible"]) : "unsure";
  const confidence = Math.max(0, Math.min(1, Number(raw.confidence) || 0));
  const reason = String(raw.reason ?? "").replace(/\*/g, "").slice(0, 160);
  if (raw.looks_like_screenshot_or_internet_image) {
    return { floodVisible: "unsure", depth: parseDepth(raw.depth), confidence: Math.min(confidence, 0.3), reason: `Looks like a screenshot or an internet picture. ${reason}`.trim(), source: "ai" };
  }
  return { floodVisible: visible, depth: parseDepth(raw.depth), confidence, reason, source: "ai" };
}

export async function checkFloodPhoto(image: AiImage): Promise<PhotoVerdict> {
  const raw = await askJson<Raw>({ system: SYSTEM, user: "Check this photo.", image, maxTokens: 200, timeoutMs: 12000 });
  return normalizeVerdict(raw);
}

/** A fingerprint of the exact photo bytes, so one photo sent by many people can be spotted. */
export function photoFingerprint(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function mediaTypeFrom(value: string | null | undefined): AiImage["mediaType"] {
  const v = String(value ?? "").toLowerCase();
  if (v.includes("png")) return "image/png";
  if (v.includes("webp")) return "image/webp";
  return "image/jpeg";
}

/** Reads the stored AI photo verdict back into the shape the Truth Engine wants. */
export function readAiPhoto(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ai: null, live: false };
  const v = value as Record<string, unknown>;
  const live = v.live === true;
  if (v.source !== "ai") return { ai: null, live };
  const floodVisible = v.floodVisible === "yes" || v.floodVisible === "no" ? v.floodVisible : "unsure";
  const confidence = Math.max(0, Math.min(1, Number(v.confidence) || 0));
  return { ai: { floodVisible, confidence, reason: typeof v.reason === "string" ? v.reason : undefined } as const, live };
}

export type DrainVerdict = { cleared: "yes" | "no" | "unsure"; sameDrain: "yes" | "no" | "unsure"; confidence: number; reason: string; source: "ai" | "none" };

const DRAIN_SYSTEM = [
  "You check Drain Heroes photos for FloodPass in Nigeria. The first image is a blocked drain or gutter. The second is said to be the same drain after cleaning.",
  "Reply with ONLY one JSON object:",
  '{"cleared":"yes"|"no"|"unsure","same_drain":"yes"|"no"|"unsure","confidence":0.0-1.0,"reason":"under 20 words"}',
  "cleared is yes only when the second photo shows the drain channel mostly free of rubbish, sand, plastic or water weeds.",
  "same_drain is no if the place clearly differs (different walls, road, buildings or drain shape).",
].join("\n");

export function normalizeDrainVerdict(raw: { cleared?: string; same_drain?: string; confidence?: number; reason?: string } | null): DrainVerdict {
  if (!raw) return { cleared: "unsure", sameDrain: "unsure", confidence: 0, reason: "No AI check was available.", source: "none" };
  const pick = (v: unknown) => (v === "yes" || v === "no" ? v : "unsure") as "yes" | "no" | "unsure";
  return {
    cleared: pick(raw.cleared),
    sameDrain: pick(raw.same_drain),
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0)),
    reason: String(raw.reason ?? "").replace(/\*/g, "").slice(0, 160),
    source: "ai",
  };
}

export async function checkDrainPhotos(before: AiImage, after: AiImage): Promise<DrainVerdict> {
  const raw = await askJson<{ cleared?: string; same_drain?: string; confidence?: number; reason?: string }>({
    system: DRAIN_SYSTEM,
    user: "Image 1 is before, image 2 is after. Check them.",
    images: [before, after],
    maxTokens: 200,
    timeoutMs: 15000,
  });
  return normalizeDrainVerdict(raw);
}
