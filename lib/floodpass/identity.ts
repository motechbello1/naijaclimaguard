import { createHash, createHmac, randomBytes } from "crypto";

/**
 * People are identified by a one-way key, never by their raw phone number,
 * in every flood report. FLOODPASS_KEY_PEPPER must be set in production so the
 * keys cannot be reversed by guessing phone numbers.
 */
function pepper() {
  const value = process.env.FLOODPASS_KEY_PEPPER?.trim();
  if (value) return value;
  if (process.env.NODE_ENV !== "production") return "local-development-only-pepper";
  throw new Error("FLOODPASS_KEY_PEPPER is not configured.");
}

export function reporterKeyFor(channel: string, address: string) {
  return createHmac("sha256", pepper()).update(`${channel}:${address.trim().toLowerCase()}`).digest("hex");
}

/** One person, one key, whichever phone channel they use (WhatsApp, SMS, USSD or voice). */
export function personKeyForPhone(phoneE164: string) {
  return reporterKeyFor("phone", phoneE164);
}

/** A short signature for links that must expire (photo links, pass downloads). */
export function signValue(value: string) {
  return createHmac("sha256", pepper()).update(`sign:${value}`).digest("base64url").slice(0, 32);
}

/** Partner API keys: shown once, stored only as a hash. */
export function newPartnerApiKey() {
  const secret = randomBytes(24).toString("base64url");
  const prefix = `fpk_${randomBytes(4).toString("hex")}`;
  return { key: `${prefix}.${secret}`, prefix, hash: hashApiKey(`${prefix}.${secret}`) };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key.trim()).digest("hex");
}

export function apiKeyPrefix(key: string) {
  const [prefix] = key.trim().split(".");
  return prefix || null;
}
