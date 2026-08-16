import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";

export const FOUNDER_ROLE = "FOUNDER" as const;
const PREVIEW_FOUNDER_USERNAME = "founder.ncg.2026";
const PREVIEW_FOUNDER_PASSWORD_HASH = "$2b$12$q87mkYoNbAp7v33VNR8oGuuk1wMopTNDJlilxydockVoiCbpKAD7O";

function sameText(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function verifyFounderCredentials(username?: string, password?: string) {
  // Deployment secrets take precedence. The branch preview keeps only a
  // one-way hash so its generated founder credential works before env setup.
  const expectedUsername = String(process.env.NCG_FOUNDER_USERNAME || PREVIEW_FOUNDER_USERNAME).trim().toLowerCase();
  const passwordHash = String(process.env.NCG_FOUNDER_PASSWORD_HASH || PREVIEW_FOUNDER_PASSWORD_HASH).trim();
  const suppliedUsername = String(username || "").trim().toLowerCase();

  if (!expectedUsername || !passwordHash || !suppliedUsername || !password) return false;
  if (!sameText(suppliedUsername, expectedUsername)) return false;
  return bcrypt.compare(password, passwordHash);
}

export function isFounderSessionUser(user?: { role?: unknown } | null) {
  return user?.role === FOUNDER_ROLE;
}
