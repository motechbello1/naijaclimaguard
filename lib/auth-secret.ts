/**
 * Single source of truth for the NextAuth signing secret.
 *
 * Production and preview deployments MUST set NEXTAUTH_SECRET. There is no
 * hard-coded fallback in production: a secret written in a public repository
 * would let anyone forge a session token. Local development gets a clearly
 * labelled development-only value so `next dev` still starts without setup.
 */
export function authSecret(): string | undefined {
  const configured = process.env.NEXTAUTH_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "local-development-only-secret-not-for-deployment";
  return undefined;
}
