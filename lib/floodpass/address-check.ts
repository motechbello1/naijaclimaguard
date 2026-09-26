import { randomInt } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { distanceKm } from "@/lib/floodpass/truth-engine";
import { nearestHotspot } from "@/lib/floodpass/hotspots";
import { placeFor, searchableNames } from "@/lib/floodpass/places";
import { streetMemoryFor } from "@/lib/floodpass/street-memory-store";

/**
 * Rent and Land Check: "has this address flooded before?", answered from what
 * FloodPass knows, before someone pays rent, buys land or builds.
 *
 * Honest by design: it reports what is KNOWN (verified FloodPasses, known
 * flood spots, floods in the news, blocked drains). "Nothing found" is never
 * called "safe": it can also mean nobody reported there yet.
 */

export type AddressReport = {
  place: string;
  state: string | null;
  checkedAt: string;
  level: "MANY_FLOODS_KNOWN" | "SOME_FLOODS_KNOWN" | "NONE_FOUND_YET";
  summary: string;
  verifiedFloods: { count: number; recent: Array<{ code: string; floodedAt: string; depth: string; distanceM: number }> };
  hotspot: { name: string; note: string; distanceM: number } | null;
  newsFloods: { count: number; recent: Array<{ title: string; url: string; source: string; publishedAt: string }> };
  blockedDrainsNearby: number;
  streetMemory: { thresholdMm: number | null; floodsSeen: number; confidence: string };
  limits: string[];
};

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export function newAddressCode() {
  let tail = "";
  for (let i = 0; i < 8; i += 1) tail += ALPHABET[randomInt(ALPHABET.length)];
  return `AC-${tail}`;
}

/** The plain verdict, from the numbers. Pure, so it can be tested. */
export function addressLevel(input: { verifiedFloods: number; hotspotWithinM: number | null; newsFloods: number }): AddressReport["level"] {
  const hotspotClose = input.hotspotWithinM != null && input.hotspotWithinM <= 500;
  if (input.verifiedFloods >= 2 || (hotspotClose && (input.verifiedFloods >= 1 || input.newsFloods >= 1)) || input.newsFloods >= 3) return "MANY_FLOODS_KNOWN";
  if (input.verifiedFloods >= 1 || hotspotClose || input.newsFloods >= 1) return "SOME_FLOODS_KNOWN";
  return "NONE_FOUND_YET";
}

export function addressSummary(level: AddressReport["level"], place: string) {
  if (level === "MANY_FLOODS_KNOWN") return `${place} has a strong flood history. Ask the landlord or seller about past floods, check the drains, and look for water marks on walls before you pay.`;
  if (level === "SOME_FLOODS_KNOWN") return `Floods have been recorded at or near ${place}. Ask about past floods and check the drains and the ground level before you pay.`;
  return `We found no flood records for ${place} yet. That is not a promise: it may mean nobody has reported here. Ask neighbours and look for water marks before you pay.`;
}

export async function buildAddressReport(latitude: number, longitude: number, placeName?: string | null): Promise<AddressReport> {
  const place = await placeFor(latitude, longitude).catch(() => null);
  const name = placeName || place?.name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  const box = 0.01; // about 1.1 km
  const names = searchableNames(place && place.from !== "capital" ? place.searchNames : []);
  const [passes, news, drains, memory] = await Promise.all([
    prisma.floodPass.findMany({
      where: { revokedAt: null, latitude: { gte: latitude - box, lte: latitude + box }, longitude: { gte: longitude - box, lte: longitude + box } },
      orderBy: { floodedAt: "desc" },
      take: 100,
      select: { code: true, floodedAt: true, depth: true, latitude: true, longitude: true },
    }),
    names.length
      ? prisma.externalFloodReport.findMany({
          where: { status: "REPORTED", publishedAt: { gte: new Date(Date.now() - 3 * 365 * 86_400_000) }, OR: names.map((n) => ({ title: { contains: n, mode: "insensitive" as const } })) },
          orderBy: { publishedAt: "desc" },
          take: 20,
          select: { title: true, url: true, source: true, publishedAt: true },
        })
      : Promise.resolve([]),
    prisma.drain.count({ where: { status: { in: ["BLOCKED", "CLEANED"] }, latitude: { gte: latitude - 0.005, lte: latitude + 0.005 }, longitude: { gte: longitude - 0.005, lte: longitude + 0.005 } } }),
    streetMemoryFor(latitude, longitude).catch(() => null),
  ]);
  const within = passes
    .map((p) => ({ ...p, distanceM: Math.round(distanceKm(latitude, longitude, p.latitude, p.longitude) * 1000) }))
    .filter((p) => p.distanceM <= 1000);
  const spot = nearestHotspot(latitude, longitude, 1);
  const level = addressLevel({ verifiedFloods: within.length, hotspotWithinM: spot ? Math.round(spot.km * 1000) : null, newsFloods: news.length });
  return {
    place: name,
    state: place?.state ?? null,
    checkedAt: new Date().toISOString(),
    level,
    summary: addressSummary(level, name),
    verifiedFloods: {
      count: within.length,
      recent: within.slice(0, 10).map((p) => ({ code: p.code, floodedAt: p.floodedAt.toISOString(), depth: p.depth, distanceM: p.distanceM })),
    },
    hotspot: spot ? { name: `${spot.hotspot.name}, ${spot.hotspot.area}`, note: spot.hotspot.note, distanceM: Math.round(spot.km * 1000) } : null,
    newsFloods: { count: news.length, recent: news.slice(0, 5).map((n) => ({ title: n.title, url: n.url, source: n.source, publishedAt: n.publishedAt.toISOString() })) },
    blockedDrainsNearby: drains,
    streetMemory: { thresholdMm: memory?.thresholdMm ?? null, floodsSeen: memory?.floodsSeen ?? 0, confidence: memory?.confidence ?? "none" },
    limits: [
      "Built from FloodPass records, known flood spots and news reports. It is not a survey or an engineering report.",
      "Places with few FloodPass users have fewer records.",
      "Always ask neighbours, look for water marks, and check drains and ground level yourself.",
    ],
  };
}

/** Starts a check for one address (unpaid). */
export async function createAddressCheck(latitude: number, longitude: number, placeName?: string | null) {
  const place = await placeFor(latitude, longitude).catch(() => null);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.addressCheck.create({
        data: { code: newAddressCode(), latitude, longitude, placeName: (placeName || place?.name || "Selected address").slice(0, 120), state: place?.state ?? null },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new Error("Could not create an address check code.");
}

/** After payment: build the report once and keep it with the check. */
export async function completeAddressCheck(id: string, reference: string | null) {
  const check = await prisma.addressCheck.findUnique({ where: { id } });
  if (!check) return null;
  const report = await buildAddressReport(check.latitude, check.longitude, check.placeName);
  return prisma.addressCheck.update({
    where: { id },
    data: { status: "PAID", paidAt: check.paidAt ?? new Date(), reference: check.reference ?? reference, result: report as unknown as Prisma.InputJsonValue },
  });
}
