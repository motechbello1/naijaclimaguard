import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { distanceKm } from "@/lib/floodpass/truth-engine";
import { placeFor } from "@/lib/floodpass/places";
import { readPhoto, savePhoto } from "@/lib/floodpass/photos";
import { aiEnabled } from "@/lib/floodpass/ai/provider";
import { checkDrainPhotos, mediaTypeFrom } from "@/lib/floodpass/ai/photo-check";
import {
  canConfirm,
  DRAIN_POINTS,
  drainOutcome,
  heroAlias,
  newDrainCode,
  REWARD,
  rewardFor,
  SAME_DRAIN_KM,
  type AiDrainView,
  type ConfirmCheck,
} from "@/lib/floodpass/drain-rules";
import { sendAirtime } from "@/lib/floodpass/channels/africastalking";

/** Drain Heroes, database side. The rules live in drain-rules.ts. */

export class DrainError extends Error {
  constructor(public code: "missing" | "state" | "bad-photo" | "location", message: string) {
    super(message);
  }
}

type PhotoInput = { bytes: Uint8Array; mimeType: string } | null;

async function award(reporterKey: string, points: number, reason: string, drainId: string | null) {
  try {
    await prisma.heroPoints.create({ data: { reporterKey, points, reason, drainId } });
    return true;
  } catch (error) {
    // Unique (person, reason, drain): points for the same thing are never given twice.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
}

/** Someone reports a blocked drain with a photo. The same drain reported twice keeps one code. */
export async function reportBlockedDrain(input: { reporterKey: string; latitude: number; longitude: number; photo: PhotoInput; photoHash?: string | null }) {
  const box = 0.001;
  const nearby = await prisma.drain.findMany({
    where: {
      status: { in: ["BLOCKED", "CLEANED"] },
      latitude: { gte: input.latitude - box, lte: input.latitude + box },
      longitude: { gte: input.longitude - box, lte: input.longitude + box },
    },
    take: 20,
  });
  const same = nearby.find((row) => distanceKm(row.latitude, row.longitude, input.latitude, input.longitude) <= SAME_DRAIN_KM);
  if (same) return { code: same.code, placeName: same.placeName, existing: true };

  const place = await placeFor(input.latitude, input.longitude).catch(() => null);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = newDrainCode(attempt < 4 ? 4 : 6);
    try {
      const drain = await prisma.drain.create({
        data: {
          code,
          latitude: input.latitude,
          longitude: input.longitude,
          placeName: place ? place.name.replace(/^Near /, "near ") : `${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)}`,
          state: place?.state ?? null,
          reportedByKey: input.reporterKey,
          beforePhotoHash: input.photoHash ?? null,
        },
      });
      if (input.photo) {
        const saved = await savePhoto({ bytes: input.photo.bytes, mimeType: input.photo.mimeType, kind: "DRAIN_BEFORE", ownerKey: input.reporterKey, drainId: drain.id });
        if (saved && !input.photoHash) await prisma.drain.update({ where: { id: drain.id }, data: { beforePhotoHash: saved.sha256 } });
      }
      return { code: drain.code, placeName: drain.placeName, existing: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new Error("Could not create a drain code.");
}

async function aiViewFor(drainId: string): Promise<AiDrainView> {
  if (!aiEnabled()) return null;
  const [before, after] = await Promise.all([
    prisma.floodPhoto.findFirst({ where: { drainId, kind: "DRAIN_BEFORE" }, orderBy: { createdAt: "asc" }, select: { id: true } }),
    prisma.floodPhoto.findFirst({ where: { drainId, kind: "DRAIN_AFTER" }, orderBy: { createdAt: "desc" }, select: { id: true } }),
  ]);
  if (!before || !after) return null;
  const [b, a] = await Promise.all([readPhoto(before.id), readPhoto(after.id)]);
  if (!b || !a) return null;
  const verdict = await checkDrainPhotos(
    { base64: Buffer.from(b.bytes).toString("base64"), mediaType: mediaTypeFrom(b.mimeType) },
    { base64: Buffer.from(a.bytes).toString("base64"), mediaType: mediaTypeFrom(a.mimeType) },
  );
  return verdict.source === "ai" ? { cleared: verdict.cleared, sameDrain: verdict.sameDrain, confidence: verdict.confidence } : null;
}

function storedAi(value: Prisma.JsonValue | null): AiDrainView {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const pick = (x: unknown) => (x === "yes" || x === "no" ? x : "unsure") as "yes" | "no" | "unsure";
  return { cleared: pick(v.cleared), sameDrain: pick(v.sameDrain), confidence: Math.max(0, Math.min(1, Number(v.confidence) || 0)) };
}

/** Someone sends the "after" photo. */
export async function markDrainCleaned(input: { code: string; cleanerKey: string; photo: PhotoInput; photoHash?: string | null }) {
  const drain = await prisma.drain.findUnique({ where: { code: input.code } });
  if (!drain) throw new DrainError("missing", "No such drain.");
  if (drain.status !== "BLOCKED") throw new DrainError("state", drain.status);
  if (!input.photo && !input.photoHash) throw new DrainError("bad-photo", "A photo is needed.");

  let afterHash = input.photoHash ?? null;
  if (input.photo) {
    const saved = await savePhoto({ bytes: input.photo.bytes, mimeType: input.photo.mimeType, kind: "DRAIN_AFTER", ownerKey: input.cleanerKey, drainId: drain.id });
    afterHash = afterHash ?? saved?.sha256 ?? null;
  }
  const ai = await aiViewFor(drain.id).catch(() => null);
  const result = drainOutcome({ beforeHash: drain.beforePhotoHash, afterHash, confirmations: 0, ai });
  await prisma.drain.update({
    where: { id: drain.id },
    data: {
      status: result.outcome === "REJECTED" ? "REJECTED" : "CLEANED",
      cleanedByKey: input.cleanerKey,
      cleanedAt: new Date(),
      afterPhotoHash: afterHash,
      aiCheck: ai ? (ai as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      rejectedReason: result.reason ?? null,
    },
  });
  return { code: drain.code, outcome: result.outcome === "REJECTED" ? "REJECTED" : "CLEANED", reason: result.reason };
}

/** A neighbour checks a cleaned drain. May verify it and pay out points. */
export async function confirmDrain(input: { code: string; confirmerKey: string; latitude: number | null; longitude: number | null; approximatePlace?: boolean }): Promise<{
  check: ConfirmCheck | "missing";
  status?: string;
  verified?: boolean;
  cleanerKey?: string | null;
}> {
  const drain = await prisma.drain.findUnique({ where: { code: input.code } });
  if (!drain) return { check: "missing" };
  const dayAgo = new Date(Date.now() - 86_400_000);
  const today = await prisma.drainConfirmation.count({ where: { reporterKey: input.confirmerKey, createdAt: { gte: dayAgo } } });
  const km = input.latitude != null && input.longitude != null ? distanceKm(drain.latitude, drain.longitude, input.latitude, input.longitude) : null;
  const check = canConfirm({
    confirmerKey: input.confirmerKey,
    reportedByKey: drain.reportedByKey,
    cleanedByKey: drain.cleanedByKey,
    status: drain.status,
    distanceKm: km,
    confirmationsToday: today,
    approximatePlace: input.approximatePlace,
  });
  if (check !== "ok") return { check, status: drain.status };

  try {
    await prisma.drainConfirmation.create({ data: { drainId: drain.id, reporterKey: input.confirmerKey } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { check: "ok", status: drain.status, verified: false };
    throw error;
  }
  await award(input.confirmerKey, DRAIN_POINTS.confirmed, "DRAIN_CONFIRMED", drain.id);
  const updated = await prisma.drain.update({ where: { id: drain.id }, data: { confirmations: { increment: 1 } } });
  const result = drainOutcome({ beforeHash: drain.beforePhotoHash, afterHash: drain.afterPhotoHash, confirmations: updated.confirmations, ai: storedAi(drain.aiCheck) });
  if (result.outcome === "VERIFIED") {
    await prisma.drain.update({ where: { id: drain.id }, data: { status: "VERIFIED", verifiedAt: new Date() } });
    if (drain.cleanedByKey) await award(drain.cleanedByKey, DRAIN_POINTS.cleaned, "DRAIN_CLEANED", drain.id);
    if (drain.reportedByKey !== drain.cleanedByKey) await award(drain.reportedByKey, DRAIN_POINTS.reported, "DRAIN_REPORTED", drain.id);
    return { check: "ok", status: "VERIFIED", verified: true, cleanerKey: drain.cleanedByKey };
  }
  return { check: "ok", status: drain.status, verified: false };
}

export async function pointsFor(reporterKey: string) {
  const sum = await prisma.heroPoints.aggregate({ where: { reporterKey }, _sum: { points: true } });
  return sum._sum.points ?? 0;
}

/** A person asks for airtime. A person must approve it before it is paid. */
export async function requestReward(reporterKey: string, phone: string | null) {
  if (!phone) return { status: "no-phone" as const };
  const pending = await prisma.rewardPayout.findFirst({ where: { reporterKey, status: { in: ["REQUESTED", "APPROVED"] } } });
  if (pending) return { status: "pending" as const };
  const [available, paid] = await Promise.all([
    pointsFor(reporterKey),
    prisma.rewardPayout.aggregate({ where: { reporterKey, status: "PAID", paidAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, _sum: { amountNaira: true } }),
  ]);
  const reward = rewardFor(available, paid._sum.amountNaira ?? 0);
  if (reward.units < 1) return { status: "too-few" as const, points: available, min: REWARD.pointsPerUnit };
  await prisma.rewardPayout.create({ data: { reporterKey, phone, points: reward.points, amountNaira: reward.naira } });
  return { status: "requested" as const, naira: reward.naira, points: reward.points };
}

/** Founder decision on one payout. Approve sends the airtime straight away. */
export async function decidePayout(id: string, approve: boolean) {
  const payout = await prisma.rewardPayout.findUnique({ where: { id } });
  if (!payout || payout.status !== "REQUESTED") return { ok: false, error: "Not waiting for a decision." };
  if (!approve) {
    await prisma.rewardPayout.update({ where: { id }, data: { status: "REJECTED", decidedAt: new Date() } });
    return { ok: true, status: "REJECTED" };
  }
  await prisma.rewardPayout.update({ where: { id }, data: { status: "APPROVED", decidedAt: new Date() } });
  const result = await sendAirtime(payout.phone, payout.amountNaira, `floodpass-reward-${payout.id}`);
  if (result.sent) {
    await prisma.$transaction([
      prisma.rewardPayout.update({ where: { id }, data: { status: "PAID", paidAt: new Date(), providerRef: result.providerId ?? null } }),
      prisma.heroPoints.create({ data: { reporterKey: payout.reporterKey, points: -payout.points, reason: `REWARD_PAID:${payout.id}` } }),
    ]);
    return { ok: true, status: "PAID" };
  }
  const error = result.dryRun ? "Airtime is not switched on (Africa's Talking keys missing)." : result.error ?? "Airtime failed.";
  await prisma.rewardPayout.update({ where: { id }, data: { status: result.dryRun ? "REQUESTED" : "FAILED", error } });
  return { ok: false, error };
}

/** Public numbers: drains per state and the top heroes. Never shows phone numbers. */
export async function drainBoard(state?: string | null) {
  const since = new Date(Date.now() - 90 * 86_400_000);
  const where = state ? { state } : {};
  const [byStatus, leaders, recent] = await Promise.all([
    prisma.drain.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.heroPoints.groupBy({
      by: ["reporterKey"],
      where: { createdAt: { gte: since }, points: { gt: 0 } },
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: 10,
    }),
    prisma.drain.findMany({
      where,
      orderBy: { reportedAt: "desc" },
      take: 20,
      select: { code: true, placeName: true, state: true, status: true, reportedAt: true, verifiedAt: true, confirmations: true },
    }),
  ]);
  const counts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));
  return {
    counts: { blocked: counts.BLOCKED ?? 0, cleaned: counts.CLEANED ?? 0, verified: counts.VERIFIED ?? 0 },
    leaders: leaders.map((row) => ({ hero: heroAlias(row.reporterKey), points: row._sum.points ?? 0 })),
    recent: recent.map((row) => ({ ...row, reportedAt: row.reportedAt.toISOString(), verifiedAt: row.verifiedAt?.toISOString() ?? null })),
    reward: REWARD,
  };
}
