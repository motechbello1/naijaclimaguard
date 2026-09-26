import { maskPhone } from "@/lib/floodpass/channels/phone";

/**
 * Africa's Talking: one provider for SMS, voice calls, USSD and airtime,
 * all working in Nigeria (MTN, Airtel, Glo and 9mobile).
 *
 * Settings:
 *   AT_USERNAME        the app username ("sandbox" for testing)
 *   AT_API_KEY         the API key
 *   AT_SMS_FROM        sender ID or short code (a sender ID must be registered;
 *                      to reach numbers on the Do-Not-Disturb list it must be
 *                      registered as transactional, which takes about 2 weeks)
 *   AT_VOICE_NUMBER    the FloodPass phone number people call and that calls them
 *   AT_CALLBACK_SECRET a long random string added to every callback URL (?key=...);
 *                      Africa's Talking does not sign callbacks, so this is the lock
 *   AT_SANDBOX         "true" to use the sandbox
 *
 * Without AT_USERNAME/AT_API_KEY everything runs in DRY-RUN: nothing is sent,
 * the text is returned, so every flow can be tested for free.
 */

export type SendResult = { sent: boolean; dryRun: boolean; error?: string; providerId?: string; cost?: string };

export function atConfigured() {
  return Boolean(process.env.AT_USERNAME?.trim() && process.env.AT_API_KEY?.trim());
}

function sandbox() {
  return process.env.AT_SANDBOX === "true" || process.env.AT_USERNAME?.trim() === "sandbox";
}

function apiBase() {
  return sandbox() ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
}

function voiceBase() {
  return sandbox() ? "https://voice.sandbox.africastalking.com" : "https://voice.africastalking.com";
}

async function postForm(url: string, fields: Record<string, string>, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    apiKey: process.env.AT_API_KEY!.trim(),
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await fetch(url, { method: "POST", headers, body: new URLSearchParams(fields).toString(), signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { ok: response.status === 200 || response.status === 201, status: response.status, json, text };
}

/** Sends one SMS to one number. */
export async function sendSms(to: string, message: string): Promise<SendResult> {
  if (!atConfigured()) return { sent: false, dryRun: true };
  try {
    const fields: Record<string, string> = { username: process.env.AT_USERNAME!.trim(), to, message };
    const from = process.env.AT_SMS_FROM?.trim();
    if (from) fields.from = from;
    const result = await postForm(`${apiBase()}/version1/messaging`, fields);
    const recipient = (result.json as { SMSMessageData?: { Recipients?: Array<{ status?: string; statusCode?: number; messageId?: string; cost?: string }> } } | null)
      ?.SMSMessageData?.Recipients?.[0];
    if (!result.ok || !recipient) return { sent: false, dryRun: false, error: `SMS failed (${result.status}) for ${maskPhone(to)}` };
    const ok = recipient.status === "Success" || recipient.statusCode === 100 || recipient.statusCode === 101 || recipient.statusCode === 102;
    return ok
      ? { sent: true, dryRun: false, providerId: recipient.messageId, cost: recipient.cost }
      : { sent: false, dryRun: false, error: `SMS not accepted: ${recipient.status ?? recipient.statusCode}` };
  } catch (error) {
    return { sent: false, dryRun: false, error: error instanceof Error ? error.message : "SMS failed" };
  }
}

/**
 * Rings a number. When they pick up, Africa's Talking asks our voice callback
 * what to say; the callback reads the waiting message for that number.
 */
export async function makeCall(to: string, clientRequestId?: string): Promise<SendResult> {
  if (!atConfigured() || !process.env.AT_VOICE_NUMBER?.trim()) return { sent: false, dryRun: true };
  try {
    const fields: Record<string, string> = { username: process.env.AT_USERNAME!.trim(), from: process.env.AT_VOICE_NUMBER!.trim(), to };
    if (clientRequestId) fields.clientRequestId = clientRequestId;
    const result = await postForm(`${voiceBase()}/call`, fields);
    const entry = (result.json as { entries?: Array<{ status?: string; sessionId?: string }>; errorMessage?: string } | null)?.entries?.[0];
    if (!result.ok || !entry || !/queued|success/i.test(String(entry.status))) {
      return { sent: false, dryRun: false, error: `Call failed: ${entry?.status ?? (result.json as { errorMessage?: string } | null)?.errorMessage ?? result.status}` };
    }
    return { sent: true, dryRun: false, providerId: entry.sessionId };
  } catch (error) {
    return { sent: false, dryRun: false, error: error instanceof Error ? error.message : "Call failed" };
  }
}

/** Sends airtime, for example a Drain Heroes reward. amountNaira is whole naira. */
export async function sendAirtime(phone: string, amountNaira: number, idempotencyKey: string): Promise<SendResult> {
  if (!atConfigured()) return { sent: false, dryRun: true };
  try {
    const recipients = JSON.stringify([{ phoneNumber: phone, amount: `NGN ${Math.round(amountNaira)}` }]);
    const result = await postForm(`${apiBase()}/version1/airtime/send`, { username: process.env.AT_USERNAME!.trim(), recipients }, idempotencyKey);
    const json = result.json as { numSent?: number; errorMessage?: string; responses?: Array<{ status?: string; requestId?: string; errorMessage?: string }> } | null;
    const first = json?.responses?.[0];
    if (!result.ok || !json || !json.numSent || (first && first.errorMessage && first.errorMessage !== "None")) {
      return { sent: false, dryRun: false, error: first?.errorMessage ?? json?.errorMessage ?? `Airtime failed (${result.status})` };
    }
    return { sent: true, dryRun: false, providerId: first?.requestId };
  } catch (error) {
    return { sent: false, dryRun: false, error: error instanceof Error ? error.message : "Airtime failed" };
  }
}

/**
 * Callbacks carry ?key=AT_CALLBACK_SECRET. Fail closed: with no secret set,
 * nobody can use the callbacks, so strangers cannot fake reports or run up bills.
 */
export function callbackAllowed(url: string): "ok" | "not-configured" | "denied" {
  const secret = process.env.AT_CALLBACK_SECRET?.trim();
  if (!secret) return "not-configured";
  const given = new URL(url).searchParams.get("key") ?? "";
  if (given.length !== secret.length) return "denied";
  let diff = 0;
  for (let i = 0; i < secret.length; i += 1) diff |= secret.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0 ? "ok" : "denied";
}

/** Reads an Africa's Talking callback body (form-encoded, or JSON just in case). */
export async function readCallback(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  const raw = await req.text();
  if (type.includes("application/json")) {
    try {
      const json = JSON.parse(raw) as Record<string, unknown>;
      return Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v ?? "")]));
    } catch {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(raw).entries());
}
