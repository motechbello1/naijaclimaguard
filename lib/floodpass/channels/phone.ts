/**
 * Phone numbers in one shape: +<country><number>, for example +2348031234567.
 * Nigerian numbers may arrive as 08031234567, 2348031234567, +234 803 123 4567
 * or 8031234567; all become +2348031234567. Other countries must already
 * carry their country code.
 */
export function normalizePhone(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const hadPlus = text.startsWith("+") || text.startsWith("00");
  let digits = text.replace(/[^0-9]/g, "");
  if (text.startsWith("00")) digits = digits.slice(2);
  if (!digits) return null;

  // Nigerian local forms.
  if (!hadPlus && /^0[789][01]\d{8}$/.test(digits)) return `+234${digits.slice(1)}`;
  if (!hadPlus && /^[789][01]\d{8}$/.test(digits)) return `+234${digits}`;
  if (/^2340[789][01]\d{8}$/.test(digits)) return `+234${digits.slice(4)}`;
  if (/^234[789][01]\d{8}$/.test(digits)) return `+${digits}`;

  // Anything else must look like a full international number (E.164: 8 to 15 digits).
  if (digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0")) return `+${digits}`;
  return null;
}

export function isNigerianPhone(phone: string | null | undefined) {
  return Boolean(phone && /^\+234[789][01]\d{8}$/.test(phone));
}

/** WhatsApp's API wants digits only, no plus sign. */
export function whatsappId(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

/** For logs and screens: +234803***4567. Never show a full number in public. */
export function maskPhone(phone: string | null | undefined) {
  if (!phone) return "";
  if (phone.length <= 8) return "***";
  return `${phone.slice(0, 7)}***${phone.slice(-4)}`;
}

/**
 * SMS length: plain text fits 160 characters in one message (153 when split),
 * anything outside the basic alphabet (like curly quotes or emojis) only 70 (67).
 */
export function smsSegments(text: string) {
  const gsm = /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\\[~\]|€]*$/.test(text);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  if (text.length <= single) return 1;
  return Math.ceil(text.length / multi);
}

/** Replaces characters that would push an SMS into the expensive 70-character mode. */
export function smsSafe(text: string) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x0A\x0D\x20-\x7E£¥€]/g, "");
}
