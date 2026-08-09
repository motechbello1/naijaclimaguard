import { createHash, randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type EvidenceEventType =
  | "RISK_VIEWED"
  | "ACTION_RECOMMENDED"
  | "ACTION_ACKNOWLEDGED"
  | "WARNING_TRIGGERED"
  | "WARNING_DELIVERED"
  | "WARNING_ACKNOWLEDGED"
  | "AGENCY_ADVISORY_ACKNOWLEDGED"
  | "AGENCY_ADVISORY_ESCALATED"
  | "AGENCY_ADVISORY_RESOLVED";

export interface AppendEvidenceInput {
  eventType: EvidenceEventType;
  userId: string;
  locationId?: string | null;
  riskScore?: number | null;
  riskLevel?: string | null;
  modelLabel?: string | null;
  assetType?: string | null;
  actionCode?: string | null;
  actionText?: string | null;
  channel?: string | null;
  deliveryState?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
}

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

export async function appendEvidenceEvent(input: AppendEvidenceInput) {
  const id = randomUUID();
  const occurredAt = new Date();

  return prisma.$transaction(async (tx) => {
    const previous = await tx.evidenceEvent.findFirst({
      where: { userId: input.userId },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      select: { eventHash: true },
    });

    const immutable = {
      id,
      eventType: input.eventType,
      occurredAt: occurredAt.toISOString(),
      userId: input.userId,
      locationId: input.locationId ?? null,
      riskScore: input.riskScore ?? null,
      riskLevel: input.riskLevel ?? null,
      modelLabel: input.modelLabel ?? null,
      assetType: input.assetType ?? null,
      actionCode: input.actionCode ?? null,
      actionText: input.actionText ?? null,
      channel: input.channel ?? null,
      deliveryState: input.deliveryState ?? null,
      previousHash: previous?.eventHash ?? null,
      metadata: input.metadata ?? null,
    };

    const eventHash = fingerprint(immutable);

    return tx.evidenceEvent.create({
      data: {
        id,
        eventType: input.eventType,
        occurredAt,
        userId: input.userId,
        locationId: input.locationId ?? null,
        riskScore: input.riskScore ?? null,
        riskLevel: input.riskLevel ?? null,
        modelLabel: input.modelLabel ?? null,
        assetType: input.assetType ?? null,
        actionCode: input.actionCode ?? null,
        actionText: input.actionText ?? null,
        channel: input.channel ?? null,
        deliveryState: input.deliveryState ?? null,
        previousHash: previous?.eventHash ?? null,
        eventHash,
        metadata: input.metadata === undefined || input.metadata === null
          ? Prisma.JsonNull
          : (input.metadata as Prisma.InputJsonValue),
      },
      select: {
        id: true,
        eventType: true,
        occurredAt: true,
        eventHash: true,
        previousHash: true,
      },
    });
  });
}
