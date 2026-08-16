export function isRevenueAdminEmail(email?: string | null) {
  if (!email) return false;

  // Preview deployments are already behind Vercel preview access plus app login.
  // This keeps the founder console testable without weakening production access.
  if (process.env.VERCEL_ENV === "preview") return true;

  const allowed = String(process.env.NCG_REVENUE_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.trim().toLowerCase());
}
