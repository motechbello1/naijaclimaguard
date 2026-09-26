import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { findOfficialSafetyState, nearestKnownState } from "@/lib/intelligence/official-advisory";
import { nearestHotspot } from "@/lib/floodpass/hotspots";
import { placeFor, searchableNames } from "@/lib/floodpass/places";
import { readAiPhoto, type PhotoVerdict } from "@/lib/floodpass/ai/photo-check";
import { signedPhotoPath } from "@/lib/floodpass/photos";
import { apiKeyPrefix, hashApiKey } from "@/lib/floodpass/identity";
import { GENESIS_HASH, generatePassCode, normalizePassCode, sealEntry, verifyChain, type LedgerEntry, type LedgerFacts } from "@/lib/floodpass/ledger";
import { rainfall24hBefore } from "@/lib/floodpass/rainfall";
import { DEPTH_WORDS, distanceKm, parseDepth, scoreReport, TRUTH_ENGINE_VERSION, type Depth, type TruthInput, type TruthResult } from "@/lib/floodpass/truth-engine";

// Any fixed number works; every writer of the chain takes the same lock.
const LEDGER_LOCK_KEY = 20260925;

export type NewReportInput = {
  channel: "whatsapp" | "web" | "sms" | "voice" | "ussd" | "seed";
  reporterKey: string;
  latitude: number;
  longitude: number;
  placeName?: string | null;
  state?: string | null;
  depth?: string | null;
  note?: string | null;
  photoRef?: string | null;
  photoTakenAt?: Date | null;
  photoLatitude?: number | null;
  photoLongitude?: number | null;
  /** SHA-256 of the photo bytes (the photo itself is not kept). */
  photoHash?: string | null;
  /** What the AI Photo Checker saw. */
  aiPhoto?: PhotoVerdict | null;
  /** The photo came straight from the camera or chat, not forwarded. */
  photoLive?: boolean;
  /** "gps" for a pin or phone location, "place_name" for a typed place (SMS, USSD, voice). */
  locationSource?: "gps" | "place_name";
  language?: string | null;
  reportedAt?: Date | null;
  seeded?: boolean;
  sourceUrl?: string | null;
};

export type ReportOutcome = {
  reportId: string;
  status: TruthResult["status"];
  score: number;
  checks: TruthResult["checks"];
  pass: PublicPass | null;
  alsoVerified: string[];
};

export type PublicPass = {
  code: string;
  status: "VERIFIED" | "REVOKED";
  placeName: string;
  state: string | null;
  depth: Depth;
  depthWords: string;
  floodedAt: string;
  issuedAt: string;
  checksPassed: number;
  checksTotal: number;
  seeded: boolean;
  sequence: number;
  /** The place was typed (SMS, USSD or voice), not pinned, so it is approximate. */
  approximate?: boolean;
};

export class FloodPassInputError extends Error {}

export function validCoordinates(latitude: unknown, longitude: unknown) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
}

async function resolvePlace(latitude: number, longitude: number, givenName?: string | null, givenState?: string | null) {
  const fix = await placeFor(latitude, longitude).catch(() => null);
  const state = givenState || fix?.state || (await nearestKnownState(latitude, longitude).catch(() => null));
  let name: string;
  if (givenName && givenName.trim()) name = givenName.trim().slice(0, 120);
  else if (fix?.from === "hotspot") name = fix.name;
  else if (fix) name = fix.from === "lga" ? `Near ${fix.name}` : fix.name;
  else name = `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  return { name, state: state ?? null, searchNames: fix?.searchNames ?? [] };
}

function placeLabel(latitude: number, longitude: number, given?: string | null) {
  if (given && given.trim()) return given.trim().slice(0, 120);
  const hotspot = nearestHotspot(latitude, longitude, 0.8);
  if (hotspot) return `${hotspot.hotspot.name}, ${hotspot.hotspot.area}`;
  return `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}


type ReportRow = {
  id: string;
  channel: string;
  reporterKey: string;
  placeName: string | null;
  latitude: number;
  longitude: number;
  state: string | null;
  reportedAt: Date;
  photoRef: string | null;
  photoTakenAt: Date | null;
  photoLatitude: number | null;
  photoLongitude: number | null;
  photoHash: string | null;
  aiPhoto: Prisma.JsonValue | null;
};

/** Collects the facts the Truth Engine needs for one report. */
export async function gatherEvidence(report: ReportRow): Promise<TruthInput> {
  const t = report.reportedAt.getTime();
  const box = 0.012; // about 1.3 km; refined with real distance below
  // Search the news by names WE work out from the location, never by a name the reporter typed.
  // A state capital is too big an area to count as "this spot", so it is left out.
  const fix = await placeFor(report.latitude, report.longitude).catch(() => null);
  const newsNames = searchableNames(fix && fix.from !== "capital" ? fix.searchNames : []);
  const [rainfall, nearbyReports, official, newsSignal, earlierPasses, samePhoto, newsHistory] = await Promise.all([
    rainfall24hBefore(report.latitude, report.longitude, report.reportedAt),
    prisma.floodReport.findMany({
      where: {
        id: { not: report.id },
        reporterKey: { not: report.reporterKey },
        latitude: { gte: report.latitude - box, lte: report.latitude + box },
        longitude: { gte: report.longitude - box, lte: report.longitude + box },
        reportedAt: { gte: new Date(t - 3 * 3600_000), lte: new Date(t + 3 * 3600_000) },
      },
      select: { reporterKey: true, latitude: true, longitude: true },
      take: 200,
    }),
    // A connected official feed only knows the present, so use it for fresh reports.
    Date.now() - t < 6 * 3600_000 ? findOfficialSafetyState(report.latitude, report.longitude) : Promise.resolve(null),
    report.state
      ? prisma.externalFloodReport.findFirst({
          where: {
            publishedAt: { gte: new Date(t - 48 * 3600_000), lte: new Date(t + 24 * 3600_000) },
            status: { in: ["REPORTED", "WARNING"] },
            OR: [
              { state: report.state },
              { metadata: { path: ["states"], array_contains: [report.state] } },
              ...(report.state === "FCT" ? [{ title: { contains: "Abuja", mode: "insensitive" as const } }] : []),
            ],
          },
          orderBy: { publishedAt: "desc" },
          select: { title: true, source: true },
        })
      : Promise.resolve(null),
    prisma.floodPass.findMany({
      where: {
        revokedAt: null,
        latitude: { gte: report.latitude - 0.005, lte: report.latitude + 0.005 },
        longitude: { gte: report.longitude - 0.005, lte: report.longitude + 0.005 },
        floodedAt: { lt: new Date(t - 6 * 3600_000) },
      },
      select: { id: true },
      take: 50,
    }),
    // The same photo already sent by a different person is a red flag.
    report.photoHash
      ? prisma.floodReport.findFirst({
          where: { photoHash: report.photoHash, id: { not: report.id }, reporterKey: { not: report.reporterKey } },
          select: { id: true },
        })
      : Promise.resolve(null),
    // Floods at this named place in the news in the last 3 years (not counting the last week,
    // which the Official check already looks at).
    newsNames.length
      ? prisma.externalFloodReport.count({
          where: {
            status: "REPORTED",
            publishedAt: { gte: new Date(t - 3 * 365 * 86_400_000), lt: new Date(t - 7 * 86_400_000) },
            OR: newsNames.map((name) => ({ title: { contains: name, mode: "insensitive" as const } })),
          },
        })
      : Promise.resolve(0),
  ]);

  const neighbours = new Set(
    nearbyReports
      .filter((row) => distanceKm(report.latitude, report.longitude, row.latitude, row.longitude) <= 1)
      .map((row) => row.reporterKey),
  ).size;

  const photoPresent = Boolean(report.photoRef);
  const takenHours = photoPresent && report.photoTakenAt ? (report.photoTakenAt.getTime() - t) / 3600_000 : null;
  const photoKm = photoPresent && report.photoLatitude != null && report.photoLongitude != null
    ? distanceKm(report.latitude, report.longitude, report.photoLatitude, report.photoLongitude)
    : null;

  const officialPresent = Boolean(official?.active || newsSignal);
  const officialDetail = official?.active
    ? `${official.authority}: ${official.headline.toLowerCase()}.`
    : newsSignal
      ? `Reported by ${newsSignal.source}: "${newsSignal.title.slice(0, 120)}"`
      : undefined;

  const aiPhoto = readAiPhoto(report.aiPhoto);

  return {
    rainfall24hMm: rainfall,
    neighbourReports: neighbours,
    photo: {
      present: photoPresent,
      takenHoursFromReport: takenHours,
      distanceKm: photoKm,
      liveCapture: photoPresent && aiPhoto.live,
      ai: photoPresent ? aiPhoto.ai : null,
      duplicateOfOtherReporter: Boolean(samePhoto),
    },
    officialSignal: { present: officialPresent, detail: officialDetail },
    history: {
      knownHotspot: Boolean(nearestHotspot(report.latitude, report.longitude, 0.8)),
      earlierVerifiedNearby: earlierPasses.length,
      newsReportsNearby: newsHistory,
    },
    rulerReading: false,
  };
}

function toPublic(pass: {
  code: string; placeName: string; state: string | null; depth: string; floodedAt: Date; issuedAt: Date;
  checksPassed: number; checksTotal: number; seeded: boolean; sequence: number; revokedAt: Date | null;
}): PublicPass {
  const depth = parseDepth(pass.depth);
  return {
    code: pass.code,
    status: pass.revokedAt ? "REVOKED" : "VERIFIED",
    placeName: pass.placeName,
    state: pass.state,
    depth,
    depthWords: DEPTH_WORDS[depth],
    floodedAt: pass.floodedAt.toISOString(),
    issuedAt: pass.issuedAt.toISOString(),
    checksPassed: pass.checksPassed,
    checksTotal: pass.checksTotal,
    seeded: pass.seeded,
    sequence: pass.sequence,
  };
}

/** Locks the next page of the Flood Record for a verified report. */
async function issuePass(reportId: string, result: TruthResult): Promise<PublicPass> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LEDGER_LOCK_KEY})`;
    const existing = await tx.floodPass.findUnique({ where: { reportId } });
    if (existing) return toPublic(existing);

    const report = await tx.floodReport.findUniqueOrThrow({ where: { id: reportId } });
    const last = await tx.floodPass.findFirst({ orderBy: { sequence: "desc" }, select: { sequence: true, hash: true } });
    const sequence = (last?.sequence ?? 0) + 1;
    const previousHash = last?.hash ?? GENESIS_HASH;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const code = generatePassCode(report.state, attempt < 4 ? 4 : 6);
      const clash = await tx.floodPass.findUnique({ where: { code }, select: { id: true } });
      if (clash) continue;
      const facts: LedgerFacts = {
        sequence,
        code,
        placeName: report.placeName ?? placeLabel(report.latitude, report.longitude),
        state: report.state,
        latitude: report.latitude,
        longitude: report.longitude,
        depth: report.depth,
        floodedAt: report.reportedAt.toISOString(),
        score: result.score,
        engineVersion: result.version,
      };
      const sealed = sealEntry(facts, previousHash);
      const created = await tx.floodPass.create({
        data: {
          code,
          sequence,
          reportId,
          placeName: facts.placeName,
          state: facts.state,
          latitude: facts.latitude,
          longitude: facts.longitude,
          depth: facts.depth,
          floodedAt: report.reportedAt,
          score: facts.score,
          checksPassed: result.checksPassed,
          checksTotal: result.checksTotal,
          engineVersion: facts.engineVersion,
          previousHash: sealed.previousHash,
          hash: sealed.hash,
          seeded: report.seeded,
        },
      });
      return toPublic(created);
    }
    throw new Error("Could not create a unique FloodPass code.");
  }, { timeout: 15000 });
}

async function evaluate(reportId: string): Promise<{ result: TruthResult; pass: PublicPass | null }> {
  const report = await prisma.floodReport.findUniqueOrThrow({ where: { id: reportId } });
  const evidence = await gatherEvidence(report);
  const result = scoreReport(evidence);
  await prisma.floodReport.update({
    where: { id: reportId },
    data: {
      score: result.score,
      status: result.status,
      checks: result.checks as unknown as Prisma.InputJsonValue,
      engineVersion: result.version,
      // Kept so Street Memory can learn how much rain floods this place.
      rainfall24hMm: evidence.rainfall24hMm,
    },
  });
  const pass = result.status === "VERIFIED" ? await issuePass(reportId, result) : null;
  return { result, pass };
}

/** Takes a new report, checks it, and issues a FloodPass if it passes. */
export async function submitReport(input: NewReportInput): Promise<ReportOutcome> {
  const coords = validCoordinates(input.latitude, input.longitude);
  if (!coords) throw new FloodPassInputError("A valid location is needed.");
  if (!input.reporterKey) throw new FloodPassInputError("A reporter key is needed.");
  const reportedAt = input.reportedAt ?? new Date();
  if (reportedAt.getTime() > Date.now() + 10 * 60_000) throw new FloodPassInputError("A report cannot be in the future.");

  // One person, one open report per place per hour: stops button-mashing.
  const duplicate = await prisma.floodReport.findFirst({
    where: {
      reporterKey: input.reporterKey,
      reportedAt: { gte: new Date(reportedAt.getTime() - 3600_000) },
      latitude: { gte: coords.latitude - 0.003, lte: coords.latitude + 0.003 },
      longitude: { gte: coords.longitude - 0.003, lte: coords.longitude + 0.003 },
    },
    include: { pass: true },
  });
  if (duplicate) {
    return {
      reportId: duplicate.id,
      status: duplicate.status as TruthResult["status"],
      score: duplicate.score,
      checks: (duplicate.checks as unknown as TruthResult["checks"]) ?? [],
      pass: duplicate.pass ? toPublic(duplicate.pass) : null,
      alsoVerified: [],
    };
  }

  const place = await resolvePlace(coords.latitude, coords.longitude, input.placeName, input.state);
  // If the person did not say how deep, a confident AI photo reading can fill it in.
  let depth = parseDepth(input.depth);
  const ai = input.aiPhoto;
  if (depth === "UNKNOWN" && ai?.source === "ai" && ai.floodVisible === "yes" && ai.confidence >= 0.6) depth = ai.depth;
  const report = await prisma.floodReport.create({
    data: {
      channel: input.channel,
      reporterKey: input.reporterKey,
      latitude: coords.latitude,
      longitude: coords.longitude,
      placeName: place.name,
      state: place.state,
      depth,
      note: input.note?.slice(0, 500) ?? null,
      photoRef: input.photoRef ?? null,
      photoTakenAt: input.photoTakenAt ?? null,
      photoLatitude: input.photoLatitude ?? null,
      photoLongitude: input.photoLongitude ?? null,
      photoHash: input.photoHash ?? null,
      locationSource: input.locationSource ?? "gps",
      aiPhoto: input.photoRef
        ? ({ ...(input.aiPhoto ?? { source: "none" }), live: Boolean(input.photoLive) } as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      language: input.language ?? "en",
      reportedAt,
      seeded: Boolean(input.seeded),
      sourceUrl: input.sourceUrl ?? null,
      engineVersion: TRUTH_ENGINE_VERSION,
    },
  });

  const { result, pass } = await evaluate(report.id);

  // A new report is also a new neighbour for earlier reports close by.
  const alsoVerified: string[] = [];
  const waiting = await prisma.floodReport.findMany({
    where: {
      id: { not: report.id },
      status: { in: ["LIKELY", "UNCONFIRMED"] },
      pass: null,
      reportedAt: { gte: new Date(reportedAt.getTime() - 3 * 3600_000), lte: new Date(reportedAt.getTime() + 3 * 3600_000) },
      latitude: { gte: coords.latitude - 0.012, lte: coords.latitude + 0.012 },
      longitude: { gte: coords.longitude - 0.012, lte: coords.longitude + 0.012 },
    },
    select: { id: true },
    take: 10,
  });
  for (const row of waiting) {
    const again = await evaluate(row.id);
    if (again.pass) alsoVerified.push(again.pass.code);
  }

  return { reportId: report.id, status: result.status, score: result.score, checks: result.checks, pass, alsoVerified };
}

export type CheckOutcome =
  | { found: false; code: string }
  | { found: true; code: string; pass: PublicPass; partnerView?: PartnerPassView };

export type PartnerPassView = {
  latitude: number;
  longitude: number;
  score: number;
  engineVersion: string;
  hash: string;
  previousHash: string;
  checks: TruthResult["checks"];
  revokedReason: string | null;
  partner: string;
  /** Private proof photos, as links that stop working after 15 minutes. */
  photoLinks: string[];
};

async function partnerFromKey(key: string | null | undefined) {
  if (!key) return null;
  const prefix = apiKeyPrefix(key);
  if (!prefix) return null;
  const partner = await prisma.floodPassPartner.findUnique({ where: { apiKeyPrefix: prefix } });
  if (!partner || !partner.active || partner.apiKeyHash !== hashApiKey(key)) return null;
  return partner;
}

/** Anyone can check a code. Partners with a key get detail, and each of their checks is logged for billing. */
export async function checkPass(rawCode: string, partnerKey?: string | null): Promise<CheckOutcome> {
  const code = normalizePassCode(rawCode);
  const [pass, partner] = await Promise.all([
    prisma.floodPass.findUnique({ where: { code }, include: { report: { select: { checks: true } } } }),
    partnerFromKey(partnerKey),
  ]);

  await prisma.passCheck.create({
    data: {
      code,
      passId: pass?.id ?? null,
      partnerId: partner?.id ?? null,
      result: !pass ? "NOT_FOUND" : pass.revokedAt ? "REVOKED" : "VERIFIED",
      billable: Boolean(partner && pass),
    },
  }).catch(() => undefined);

  if (!pass) return { found: false, code };
  const view: CheckOutcome = { found: true, code, pass: toPublic(pass) };
  if (partner) {
    const photos = await prisma.floodPhoto.findMany({ where: { reportId: pass.reportId, kind: "FLOOD" }, select: { id: true }, take: 5 }).catch(() => []);
    view.partnerView = {
      latitude: pass.latitude,
      longitude: pass.longitude,
      score: pass.score,
      engineVersion: pass.engineVersion,
      hash: pass.hash,
      previousHash: pass.previousHash,
      checks: (pass.report.checks as unknown as TruthResult["checks"]) ?? [],
      revokedReason: pass.revokedReason,
      partner: partner.name,
      photoLinks: photos.map((photo) => signedPhotoPath(photo.id, 900)),
    };
  }
  return view;
}

/** Re-checks every fingerprint in the Flood Record. */
export async function verifyRecord() {
  const rows = await prisma.floodPass.findMany({
    orderBy: { sequence: "asc" },
    select: {
      sequence: true, code: true, placeName: true, state: true, latitude: true, longitude: true, depth: true,
      floodedAt: true, score: true, engineVersion: true, previousHash: true, hash: true,
    },
  });
  const entries: LedgerEntry[] = rows.map((row) => ({
    sequence: row.sequence,
    code: row.code,
    placeName: row.placeName,
    state: row.state,
    latitude: row.latitude,
    longitude: row.longitude,
    depth: row.depth,
    floodedAt: row.floodedAt.toISOString(),
    score: row.score,
    engineVersion: row.engineVersion,
    previousHash: row.previousHash,
    hash: row.hash,
  }));
  const check = verifyChain(entries);
  return { ...check, total: rows.length, latestHash: rows.at(-1)?.hash ?? GENESIS_HASH, checkedAt: new Date().toISOString() };
}

/** Recent verified floods for the public map. No personal data. */
export async function recentPasses(limit = 100) {
  const rows = await prisma.floodPass.findMany({
    where: { revokedAt: null },
    orderBy: { floodedAt: "desc" },
    take: Math.max(1, Math.min(limit, 500)),
  });
  return rows.map((row) => ({ ...toPublic(row), latitude: Number(row.latitude.toFixed(3)), longitude: Number(row.longitude.toFixed(3)) }));
}

export function isStorageNotReady(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /does not exist|P2021|P2022|relation .* does not exist/i.test(message);
}

/** Reads a pass for its own page. Not logged as a check. */
export async function getPublicPass(rawCode: string): Promise<PublicPass | null> {
  const code = normalizePassCode(rawCode);
  const pass = await prisma.floodPass.findUnique({ where: { code }, include: { report: { select: { locationSource: true } } } });
  return pass ? { ...toPublic(pass), approximate: pass.report.locationSource === "place_name" } : null;
}
