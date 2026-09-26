import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";

export const FOUNDER_ROLE = "FOUNDER" as const;

function sameText(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Founder login is only possible when BOTH deployment secrets are set:
 *   NCG_FOUNDER_USERNAME       the founder username
 *   NCG_FOUNDER_PASSWORD_HASH  a bcrypt hash of the founder password
 *
 * There is deliberately no built-in fallback. An earlier version shipped a
 * preview username and password hash inside the public repository, which meant
 * any deployment without these variables accepted a credential anyone could read
 * and attack offline. If the variables are missing, founder login is disabled.
 */
export function founderLoginConfigured() {
  return Boolean(process.env.NCG_FOUNDER_USERNAME?.trim() && process.env.NCG_FOUNDER_PASSWORD_HASH?.trim());
}

export async function verifyFounderCredentials(username?: string, password?: string) {
  const expectedUsername = String(process.env.NCG_FOUNDER_USERNAME ?? "").trim().toLowerCase();
  const passwordHash = String(process.env.NCG_FOUNDER_PASSWORD_HASH ?? "").trim();
  const suppliedUsername = String(username ?? "").trim().toLowerCase();

  if (!expectedUsername || !passwordHash || !suppliedUsername || !password) return false;
  if (!sameText(suppliedUsername, expectedUsername)) return false;
  return bcrypt.compare(password, passwordHash);
}

export function isFounderSessionUser(user?: { role?: unknown } | null) {
  return user?.role === FOUNDER_ROLE;
}
