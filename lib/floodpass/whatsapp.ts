import { createHmac, timingSafeEqual } from "crypto";
import type { Inbound } from "@/lib/floodpass/conversation";

/**
 * WhatsApp Business Platform (Meta Cloud API) helpers.
 *
 * Settings:
 *   WHATSAPP_TOKEN            permanent access token for the business number
 *   WHATSAPP_PHONE_NUMBER_ID  the sending number's id
 *   WHATSAPP_VERIFY_TOKEN     any secret string, also typed into Meta's webhook setup
 *   WHATSAPP_APP_SECRET       the Meta app secret, used to check every webhook call
 *
 * Without WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID the sender runs in DRY-RUN
 * mode: it returns the text instead of sending it, so the flow can be tested.
 * Costs: Meta charges per message in Nigeria (about N14 per utility message from
 * 1 October 2026), so warnings should only go out when they matter.
 */

// Meta retires each Graph API version about two years after release; v26.0 came out in July 2026.
const GRAPH = `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v26.0"}`;

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim());
}

export async function sendWhatsAppText(to: string, body: string): Promise<{ sent: boolean; dryRun: boolean; error?: string }> {
  if (!whatsappConfigured()) return { sent: false, dryRun: true };
  try {
    const response = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: to.replace(/[^0-9]/g, ""), type: "text", text: { preview_url: true, body: body.slice(0, 4000) } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { sent: false, dryRun: false, error: `WhatsApp API ${response.status}` };
    return { sent: true, dryRun: false };
  } catch (error) {
    return { sent: false, dryRun: false, error: error instanceof Error ? error.message : "send failed" };
  }
}

/**
 * Sends an approved message template. WhatsApp only lets a business send free
 * text within 24 hours of the person's last message; after that, warnings must
 * use a template Meta has approved (see docs/FLOODPASS_SETUP.md for the text).
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[],
): Promise<{ sent: boolean; dryRun: boolean; error?: string }> {
  if (!whatsappConfigured()) return { sent: false, dryRun: true };
  try {
    const response = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/[^0-9]/g, ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text: text.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, " ").slice(0, 900) })) }],
        },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { sent: false, dryRun: false, error: `WhatsApp template ${response.status}` };
    return { sent: true, dryRun: false };
  } catch (error) {
    return { sent: false, dryRun: false, error: error instanceof Error ? error.message : "template send failed" };
  }
}

/** True when free text is still allowed (the person wrote to us in the last 24 hours, with a little margin). */
export function insideServiceWindow(lastInboundAt: Date | null | undefined, now = Date.now()) {
  return Boolean(lastInboundAt && now - lastInboundAt.getTime() < 23.5 * 3600_000);
}

/**
 * Downloads a photo a person sent, so the AI can look at it once.
 * Two steps (Meta's rule): ask for a short-lived link, then fetch it with the token.
 * The bytes are only held in memory; FloodPass keeps a fingerprint, not the photo.
 */
export async function downloadWhatsAppMedia(mediaRef: string, maxBytes = 5_000_000): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const mediaId = mediaRef.replace(/^wa-media:/, "");
  if (!token || !/^[0-9A-Za-z_-]{3,80}$/.test(mediaId)) return null;
  try {
    const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000) });
    if (!meta.ok) return null;
    const info = (await meta.json()) as { url?: string; mime_type?: string; file_size?: number };
    if (!info.url || (info.file_size && info.file_size > maxBytes)) return null;
    // Only follow links on Meta's own domains, with our token.
    const host = new URL(info.url).hostname;
    if (!/(^|\.)(fbsbx\.com|facebook\.com|whatsapp\.net|fbcdn\.net)$/.test(host)) return null;
    const file = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
    if (!file.ok) return null;
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (!buffer.length || buffer.length > maxBytes) return null;
    return { bytes: buffer, mimeType: info.mime_type ?? file.headers.get("content-type") ?? "image/jpeg" };
  } catch {
    return null;
  }
}

/** Checks Meta's X-Hub-Signature-256 header against the raw request body. */
export function validSignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const given = header.slice(7);
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
}

type WaMessage = {
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
  image?: { id?: string; caption?: string; mime_type?: string };
  context?: { forwarded?: boolean; frequently_forwarded?: boolean };
  interactive?: { button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
  button?: { text?: string; payload?: string };
};

export type ParsedInbound = { from: string; message: Inbound; id?: string };

/** Turns Meta's webhook payload into simple inbound messages. Status updates are ignored. */
export function parseWebhook(payload: unknown): ParsedInbound[] {
  const out: ParsedInbound[] = [];
  const entries = (payload as { entry?: Array<{ changes?: Array<{ value?: { messages?: WaMessage[] } }> }> })?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      for (const raw of change.value?.messages ?? []) {
        const from = String(raw.from ?? "").replace(/[^0-9]/g, "");
        if (!from) continue;
        const at = raw.timestamp ? new Date(Number(raw.timestamp) * 1000).toISOString() : new Date().toISOString();
        const id = (raw as { id?: string }).id;
        if (raw.type === "text" && raw.text?.body) out.push({ from, id, message: { kind: "text", text: raw.text.body, at } });
        else if (raw.type === "location" && Number.isFinite(Number(raw.location?.latitude)) && Number.isFinite(Number(raw.location?.longitude))) {
          out.push({ from, id, message: { kind: "location", latitude: Number(raw.location?.latitude), longitude: Number(raw.location?.longitude), name: raw.location?.name ?? raw.location?.address ?? null, at } });
        } else if (raw.type === "image" && raw.image?.id) out.push({ from, id, message: { kind: "image", mediaId: `wa-media:${raw.image.id}`, caption: raw.image.caption ?? null, at } });
        else if (raw.type === "interactive") {
          const title = raw.interactive?.button_reply?.title ?? raw.interactive?.list_reply?.title ?? raw.interactive?.button_reply?.id ?? "";
          out.push({ from, id, message: title ? { kind: "text", text: title, at } : { kind: "other", at } });
        } else if (raw.type === "button" && (raw.button?.text || raw.button?.payload)) {
          out.push({ from, id, message: { kind: "text", text: String(raw.button?.text ?? raw.button?.payload), at } });
        } else out.push({ from, id, message: { kind: "other", at } });
      }
    }
  }
  return out;
}
