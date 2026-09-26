import { prisma } from "@/lib/db";
import { distanceKm } from "@/lib/floodpass/truth-engine";
import { learnPlace, placeKeyFor, type PlaceMemory } from "@/lib/floodpass/street-memory";

/**
 * Builds Street Memory for one spot from FloodPass's own records:
 * every verified flood within about 400 m that has a rain reading.
 * The more verified floods a place has, the surer the memory gets.
 */
export async function streetMemoryFor(latitude: number, longitude: number): Promise<PlaceMemory> {
  const placeKey = placeKeyFor(latitude, longitude);
  const box = 0.005;
  const rows = await prisma.floodReport.findMany({
    where: {
      status: "VERIFIED",
      rainfall24hMm: { not: null },
      latitude: { gte: latitude - box, lte: latitude + box },
      longitude: { gte: longitude - box, lte: longitude + box },
    },
    select: { latitude: true, longitude: true, rainfall24hMm: true, reportedAt: true },
    orderBy: { reportedAt: "desc" },
    take: 300,
  });
  // One flood per day per place: ten people reporting the same flood is still one flood.
  const days = new Map<string, number>();
  for (const row of rows) {
    if (distanceKm(latitude, longitude, row.latitude, row.longitude) > 0.4) continue;
    const day = row.reportedAt.toISOString().slice(0, 10);
    const mm = Number(row.rainfall24hMm);
    if (!Number.isFinite(mm)) continue;
    days.set(day, Math.min(days.get(day) ?? Infinity, mm));
  }
  const observations = Array.from(days.values()).map((mm) => ({ placeKey, rainfall24hMm: mm, flooded: true }));
  return learnPlace(placeKey, observations);
}
