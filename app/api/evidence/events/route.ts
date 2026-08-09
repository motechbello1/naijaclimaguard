import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_EVENT_TYPES = new Set([
  "RISK_VIEWED",
  "ACTION_RECOMMENDED",
  "ACTION_ACKNOWLEDGED",
  "WARNING_TRIGGERED",
  "WARNING_DELIVERED",
  "WARNING_ACKNOWLEDGED",
]);

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

function fingerprint(payload: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(stable(payload))).digest("hex");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const events = await prisma.evidenceEvent.findMany({
      where: { userId: user.id },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        eventType: true,
        occurredAt: true,
        locationId: true,
        riskScore: true,
        riskLevel: true,
        modelLabel: true,
        assetType: true,
        actionCode: true,
        actionText: true,
        channel: true,
        deliveryState: true,
        previousHash: true,
        eventHash: true,
        metadata: true,
      },
    });
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json(
      { error: "Evidence ledger is not available until its database migration is applied." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();
  const eventType = String(body.eventType || "").toUpperCase();
  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: "Unsupported evidence event type" }, { status: 400 });
  }

  const locationId = body.locationId ? String(body.locationId) : null;
  if (locationId) {
    const owned = await prisma.location.findFirst({ where: { id: locationId, userId: user.id }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const id = randomUUID();
  const occurredAt = new Date();

  try {
    const created = await prisma.$transaction(async (tx) => {
      const previous = await tx.evidenceEvent.findFirst({
        where: { userId: user.id },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        select: { eventHash: true },
      });

      const immutable = {
        id,
        eventType,
        occurredAt: occurredAt.toISOString(),
        userId: user.id,
        locationId,
        riskScore: typeof body.riskScore === "number" ? body.riskScore : null,
        riskLevel: body.riskLevel ? String(body.riskLevel) : null,
        modelLabel: body.modelLabel ? String(body.modelLabel) : null,
        assetType: body.assetType ? String(body.assetType) : null,
        actionCode: body.actionCode ? String(body.actionCode) : null,
        actionText: body.actionText ? String(body.actionText) : null,
        channel: body.channel ? String(body.channel) : null,
        deliveryState: body.deliveryState ? String(body.deliveryState) : null,
        previousHash: previous?.eventHash ?? null,
        metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : null,
      };
      const eventHash = fingerprint(immutable);

      return tx.evidenceEvent.create({
        data: { ...immutable, occurredAt, eventHash },
        select: {
          id: true,
          eventType: true,
          occurredAt: true,
          eventHash: true,
          previousHash: true,
        },
      });
    });

    return NextResponse.json({ event: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Evidence ledger is not available until its database migration is applied." },
      { status: 503 },
    );
  }
}
