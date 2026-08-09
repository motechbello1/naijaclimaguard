export function normalizePhoneE164(input: string): string {
  const raw = input.trim().replace(/[\s()-]/g, "");
  if (!raw) throw new Error("Phone number is required.");

  let normalized = raw;
  if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
  if (normalized.startsWith("0")) normalized = `+234${normalized.slice(1)}`;
  if (normalized.startsWith("234") && !normalized.startsWith("+")) normalized = `+${normalized}`;

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("Enter a valid phone number, for example 0803… or +234803…");
  }
  return normalized;
}

export function maskPhone(phone?: string | null) {
  if (!phone) return null;
  if (phone.length <= 7) return phone;
  return `${phone.slice(0, 4)}••••${phone.slice(-3)}`;
}
