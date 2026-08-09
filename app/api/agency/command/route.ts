import { IntelligenceSourceKind, ObservationQuality } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appendEvidenceEvent, EvidenceEventType } from "@/lib/evidence/ledger";

export const dynamic = "force-dynamic";

const ACTIONS = new Set(["ACKNOWLEDGE", "ESCALATE", "RESOLVE"]);

async function enterpriseUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, plan: true },
  });
}

function advisoryLevel(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function priorityFor(level: string) {
  const value = level.toUpperCase();
  if (value.includes("EMERGENCY") || value.includes("EVACUATE") || value.includes("CRITICAL")) return "CRITICAL";
  if (value.includes("SEVERE") || value.includes("HIGH") || value.includes("WARNING")) return "HIGH";
  return "NORMAL";
}

/**
 * GET /api/agency/command
 * Enterprise operational queue built only from authenticated canonical
 * OFFICIAL_ADVISORY observations. This endpoint does not create official warnings.
 */
export async function GET() {
  const account = await enterpriseUser();
  if (!account) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (account.plan !== "ENTERPRISE") {
    return NextResponse.json({ error: "Enterprise access required." }, { status: 403 });
  }

  try {
    const now = new Date();
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const observations = await prisma.intelligenceObservation.findMany({
      where: {
        observedAt: { gte: since },
        variable: "advisory_level",
        qualityStatus: { notIn: [ObservationQuality.MISSING, ObservationQuality.STALE] },
        source: {
          active: true,
          sourceKind: IntelligenceSourceKind.OFFICIAL_ADVISORY,
        },
      },
      include: {
        source: {
          select: {
            slug: true,
            provider: true,
            name: true,
            defaultFreshnessMinutes: true,
          },
        },
        commandCase: true,
      },
      orderBy: { observedAt: "desc" },
      take: 200,
    });

    const cases = observations
      .filter((observation) => {
        const ageMs = now.getTime() - observation.observedAt.getTime();
        return ageMs <= observation.source.defaultFreshnessMinutes * 60_000;
      })
      .map((observation) => {
        const level = advisoryLevel(observation.value);
        return {
          observationId: observation.id,
          source: observation.source.name,
          provider: observation.source.provider,
          sourceSlug: observation.source.slug,
          advisoryLevel: level,
          observedAt: observation.observedAt,
          receivedAt: observation.receivedAt,
          location: {
            name: observation.locationName,
            state: observation.state,
            latitude: observation.latitude,
            longitude: observation.longitude,
          },
          qualityStatus: observation.qualityStatus,
          confidence: observation.confidence,
          command: observation.commandCase
            ? {
                id: observation.commandCase.id,
                status: observation.commandCase.status,
                priority: observation.commandCase.priority,
                notes: observation.commandCase.notes,
                acknowledgedAt: observation.commandCase.acknowledgedAt,
                escalatedAt: observation.commandCase.escalatedAt,
                resolvedAt: observation.commandCase.resolvedAt,
                updatedAt: observation.commandCase.updatedAt,
              }
            : {
                id: null,
                status: "RECEIVED",
                priority: priorityFor(level),
                notes: null,
                acknowledgedAt: null,
                escalatedAt: null,
                resolvedAt: null,
                updatedAt: observation.receivedAt,
              },
        };
      });

    return NextResponse.json({ checkedAt: now.toISOString(), cases });
  } catch (error) {
    console.error("Agency command queue unavailable", error);
    return NextResponse.json(
      { error: "Agency command storage is unavailable until the staged source/command migrations are applied." },
      { status: 503 },
    );
  }
}

/**
 * POST /api/agency/command
 * Tracks how an enterprise/agency operator handles an existing official advisory.
 * It never edits the immutable source observation and never issues an advisory.
 */
export async function POST(request: Request) {
  const account = await enterpriseUser();
  if (!account) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (account.plan !== "ENTERPRISE") {
    return NextResponse.json({ error: "Enterprise access required." }, { status: 403 });
  }

  let body: { observationId?: string; action?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const observationId = String(body.observationId || "").trim();
  const action = String(body.action || "").toUpperCase();
  const notes = body.notes == null ? undefined : String(body.notes).trim().slice(0, 2000);
  if (!observationId || !ACTIONS.has(action)) {
    return NextResponse.json({ error: "observationId and a valid action are required." }, { status: 400 });
  }

  try {
    const observation = await prisma.intelligenceObservation.findFirst({
      where: {
        id: observationId,
        variable: "advisory_level",
        source: { active: true, sourceKind: IntelligenceSourceKind.OFFICIAL_ADVISORY },
      },
      include: { source: true, commandCase: true },
    });
    if (!observation) {
      return NextResponse.json({ error: "Authenticated official advisory not found." }, { status: 404 });
    }

    const now = new Date();
    const ageMs = now.getTime() - observation.observedAt.getTime();
    if (ageMs > observation.source.defaultFreshnessMinutes * 60_000) {
      return NextResponse.json({ error: "This official advisory is stale and cannot be newly actioned." }, { status: 409 });
    }

    const currentStatus = observation.commandCase?.status ?? "RECEIVED";
    if (currentStatus === "RESOLVED") {
      return NextResponse.json({ error: "This command case is already resolved." }, { status: 409 });
    }

    let nextStatus = currentStatus;
    const timestamps: { acknowledgedAt?: Date; escalatedAt?: Date; resolvedAt?: Date } = {};
    if (action === "ACKNOWLEDGE") {
      nextStatus = currentStatus === "ESCALATED" ? "ESCALATED" : "ACKNOWLEDGED";
      if (!observation.commandCase?.acknowledgedAt) timestamps.acknowledgedAt = now;
    }
    if (action === "ESCALATE") {
      nextStatus = "ESCALATED";
      if (!observation.commandCase?.acknowledgedAt) timestamps.acknowledgedAt = now;
      if (!observation.commandCase?.escalatedAt) timestamps.escalatedAt = now;
    }
    if (action === "RESOLVE") {
      nextStatus = "RESOLVED";
      if (!observation.commandCase?.acknowledgedAt) timestamps.acknowledgedAt = now;
      timestamps.resolvedAt = now;
    }

    const level = advisoryLevel(observation.value);
    const command = await prisma.agencyCommandCase.upsert({
      where: { observationId },
      create: {
        observationId,
        createdByUserId: account.id,
        status: nextStatus,
        priority: priorityFor(level),
        notes,
        ...timestamps,
      },
      update: {
        status: nextStatus,
        ...(notes !== undefined ? { notes } : {}),
        ...timestamps,
      },
    });

    const eventType: EvidenceEventType =
      action === "ESCALATE"
        ? "AGENCY_ADVISORY_ESCALATED"
        : action === "RESOLVE"
          ? "AGENCY_ADVISORY_RESOLVED"
          : "AGENCY_ADVISORY_ACKNOWLEDGED";

    let evidenceRecorded = false;
    try {
      await appendEvidenceEvent({
        eventType,
        userId: account.id,
        modelLabel: "official-advisory-command",
        deliveryState: nextStatus.toLowerCase(),
        metadata: {
          commandCaseId: command.id,
          observationId,
          source: observation.source.name,
          provider: observation.source.provider,
          advisoryLevel: level,
          action,
        },
      });
      evidenceRecorded = true;
    } catch (error) {
      console.error("Agency command evidence write unavailable", error);
    }

    return NextResponse.json({ command, evidenceRecorded });
  } catch (error) {
    console.error("Agency command action failed", error);
    return NextResponse.json(
      { error: "Agency command storage is unavailable until the staged source/command migrations are applied." },
      { status: 503 },
    );
  }
}
