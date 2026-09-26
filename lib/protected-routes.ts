/**
 * Routes that need a signed-in user.
 *
 * Shared by middleware.ts (server redirect) and RouteSecurityGuard (client
 * redirect) so the two code paths can never drift apart again.
 *
 * Safety pages are intentionally NOT listed: live floods, safe route, the
 * emergency pack and the flood drill are open to everyone, because safety
 * help should never sit behind a login.
 */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/my-area",
  "/action-center",
  "/action",
  "/command",
  "/intelligence",
  "/predict",
  "/outlook",
  "/evidence",
  "/report",
  "/prove",
  "/profile",
] as const;

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
