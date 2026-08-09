import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appendEvidenceEvent, EvidenceEventType, verifyEvidenceWindow } from "@/lib/evidence/ledger";

// A browser user may record only events that genuinely originate from the user.
// System outcomes such as WARNING_TRIGGERED, WARNING_DELIVERED and
// ACTION_RECOMMENDED must be appended by trusted server workflows instead.
const USER_ASSERTABLE_EVENT_TYPES = new Set<EvidenceEventType>([
  "RISK_VIEWED",
  "ACTION_ACKNOWLEDGED",
  "WARNING_ACKNOWLEDGED",
]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const [events, totalEvents] = await prisma.$transaction([
      prisma.evidenceEvent.findMany({
        where: { userId: user.id },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 100,
        select: {
          id: true,
          eventType: true,
          occurredAt: true,
          createdAt: true,
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
      }),
      prisma.evidenceEvent.count({ where: { userId: user.id } }),
    ]);

    const verification = verifyEvidenceWindow(user.id, events);
    return NextResponse.json({
      events,
      verification: {
        ...verification,
        checkedEvents: events.length,
        totalEvents,
        windowTruncated: totalEvents > events.length,
      },
    });
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = String(body.eventType || "").toUpperCase() as EvidenceEventType;
  if (!USER_ASSERTABLE_EVENT_TYPES.has(eventType)) {
    return NextResponse.json(
      { error: "This evidence event can only be recorded by a trusted server workflow." },
      { status: 403 },
    );
  }

  const locationId = body.locationId ? String(body.locationId) : null;
  if (locationId) {
    const owned = await prisma.location.findFirst({ where: { id: locationId, userId: user.id }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const clientMetadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
    ? body.metadata as Record<string, string | number | boolean | null>
    : {};

  try {
    const event = await appendEvidenceEvent({
      eventType,
      userId: user.id,
      locationId,
      // User-asserted entries cannot claim server-calculated score/model or delivery state.
      riskScore: null,
      riskLevel: null,
      modelLabel: "user-asserted",
      assetType: body.assetType ? String(body.assetType) : null,
      actionCode: body.actionCode ? String(body.actionCode) : null,
      actionText: body.actionText ? String(body.actionText).slice(0, 2000) : null,
      channel: null,
      deliveryState: null,
      metadata: {
        ...clientMetadata,
        evidenceProvenance: "user_asserted",
      },
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Evidence ledger is not available until its database migration is applied." },
      { status: 503 },
    );
  }
}
