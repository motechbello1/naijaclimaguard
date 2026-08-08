import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Supabase's transaction pooler (Supavisor, normally port 6543) does not support
 * Prisma's prepared statements. Normalise the runtime URL defensively so a
 * rotated/re-entered DATABASE_URL cannot accidentally drop the required flag.
 *
 * DIRECT_URL remains untouched and is still used by Prisma CLI/migrations.
 */
function runtimeDatabaseUrl(): string | undefined {
  const value = process.env.DATABASE_URL;
  if (!value) return undefined;

  try {
    const url = new URL(value);
    const usesSupabasePooler =
      url.port === "6543" || url.hostname.endsWith(".pooler.supabase.com");

    if (usesSupabasePooler) {
      url.searchParams.set("pgbouncer", "true");
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", "1");
      }
    }

    return url.toString();
  } catch {
    // Preserve the original value if parsing ever fails; Prisma will surface a
    // normal connection-string error rather than hiding the configuration issue.
    return value;
  }
}

const url = runtimeDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    url
      ? {
          datasources: {
            db: { url },
          },
        }
      : undefined
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
