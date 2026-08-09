import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function healthStatus(source: {
  defaultFreshnessMinutes: number;
  observations: Array<{ observedAt: Date; qualityStatus: string }>;
}) {
  const latest = source.observations[0];
  if (!latest) return { status: "missing" as const, ageMinutes: null };
  const ageMinutes = Math.max(0, Math.round((Date.now() - latest.observedAt.getTime()) / 60000));
  if (latest.qualityStatus === "SUSPECT") return { status: "suspect" as const, ageMinutes };
  if (latest.qualityStatus === "MISSING") return { status: "missing" as const, ageMinutes };
  if (latest.qualityStatus === "STALE" || ageMinutes > source.defaultFreshnessMinutes) return { status: "stale" as const, ageMinutes };
  return { status: "fresh" as const, ageMinutes };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.user.findUnique({ where: { email: session.user.email }, select: { plan: true } });
  if (!account || account.plan !== "ENTERPRISE") return NextResponse.json({ error: "Enterprise access required." }, { status: 403 });

  try {
    const sources = await prisma.intelligenceSource.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        observations: {
          orderBy: { observedAt: "desc" },
          take: 1,
          select: { observedAt: true, receivedAt: true, qualityStatus: true, variable: true, unit: true, value: true },
        },
      },
    });

    return NextResponse.json({
      operational: true,
      checkedAt: new Date().toISOString(),
      sources: sources.map((source) => {
        const health = healthStatus(source);
        const latest = source.observations[0] ?? null;
        return {
          slug: source.slug,
          provider: source.provider,
          name: source.name,
          sourceKind: source.sourceKind,
          freshnessMinutes: source.defaultFreshnessMinutes,
          health: health.status,
          ageMinutes: health.ageMinutes,
          latest: latest ? {
            observedAt: latest.observedAt.toISOString(),
            receivedAt: latest.receivedAt.toISOString(),
            qualityStatus: latest.qualityStatus,
            variable: latest.variable,
            unit: latest.unit,
            value: latest.value,
          } : null,
        };
      }),
    });
  } catch (error) {
    console.error("Intelligence source-health storage unavailable", error);
    return NextResponse.json({
      operational: false,
      sources: [],
      reason: "The canonical multi-source database migration has not been applied or the source store is unavailable.",
    }, { status: 503 });
  }
}
