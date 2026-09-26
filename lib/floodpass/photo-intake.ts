import { aiEnabled } from "@/lib/floodpass/ai/provider";
import { checkFloodPhoto, mediaTypeFrom, photoFingerprint, type PhotoVerdict } from "@/lib/floodpass/ai/photo-check";

/**
 * One place where every incoming photo (web or WhatsApp) is handled the same way:
 * 1. take a fingerprint, so one photo sent by many people can be caught;
 * 2. let the AI Photo Checker look at it, if AI is switched on;
 * 3. forget the photo. Only the fingerprint and the AI's verdict are kept.
 */
export async function inspectPhoto(bytes: Uint8Array, mimeType?: string | null): Promise<{ photoHash: string; aiPhoto: PhotoVerdict | null }> {
  const photoHash = photoFingerprint(bytes);
  if (!aiEnabled()) return { photoHash, aiPhoto: null };
  const verdict = await checkFloodPhoto({ base64: Buffer.from(bytes).toString("base64"), mediaType: mediaTypeFrom(mimeType) });
  return { photoHash, aiPhoto: verdict.source === "ai" ? verdict : null };
}

/** Reads a data URL or bare base64 string from the web form. Returns null if it is not a small image. */
export function decodeWebPhoto(value: unknown, maxBytes = 800_000): { bytes: Uint8Array; mimeType: string } | null {
  if (typeof value !== "string" || !value) return null;
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  const mimeType = match ? match[1] : "image/jpeg";
  const b64 = match ? match[2] : /^[A-Za-z0-9+/=]+$/.test(value) ? value : null;
  if (!b64 || b64.length > Math.ceil((maxBytes * 4) / 3) + 8) return null;
  const bytes = new Uint8Array(Buffer.from(b64, "base64"));
  if (!bytes.length || bytes.length > maxBytes) return null;
  // Magic numbers: JPEG FF D8, PNG 89 50, WEBP "RIFF".
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50;
  const webp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  if (!jpeg && !png && !webp) return null;
  return { bytes, mimeType: png ? "image/png" : webp ? "image/webp" : "image/jpeg" };
}
