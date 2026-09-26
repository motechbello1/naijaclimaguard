/**
 * Rebuilds the 16 August 2026 Abuja flash floods as FloodPass reports, using
 * public news reports as the witnesses. Every record is marked seeded=true and
 * shown to users as "Rebuilt from news reports", never as a person's report.
 * Safe to run twice: it stops if demo records already exist.
 */
import { prisma } from "@/lib/db";
import { submitReport } from "@/lib/floodpass/service";
import { ABUJA_HOTSPOTS } from "@/lib/floodpass/hotspots";

const EVENT_TIME = new Date("2026-08-16T17:00:00.000Z"); // evening of Saturday 16 August 2026 (Lagos time 6pm)

const WITNESSES: Record<string, Array<{ source: string; url: string; depth: string }>> = {
  "abj-wuse2-adetokunbo": [
    { source: "TheCable", url: "https://www.thecable.ng/residents-stranded-cars-submerged-as-flash-flood-hits-parts-of-abuja/", depth: "CAR_ROOF" },
    { source: "Peoples Gazette", url: "https://gazettengr.com/nigerias-capital-city-abuja-flooded-vehicles-submerged-as-fct-residents-accuse-wike-of-encroaching-on-green-areas/", depth: "WAIST" },
    { source: "The Guardian", url: "https://guardian.ng/news/nigeria/metro/abuja-floods-green-space-loss-blocked-waterways-worsen-citys-woes/", depth: "WAIST" },
  ],
  "abj-gudu-ebeano": [
    { source: "TheCable", url: "https://www.thecable.ng/residents-stranded-cars-submerged-as-flash-flood-hits-parts-of-abuja/", depth: "WAIST" },
    { source: "The Reflector", url: "https://thereflector.com.ng/2026/08/16/flood-submerge-homes-cars-as-torrential-rain-hits-abuja/", depth: "WAIST" },
    { source: "The Guardian", url: "https://guardian.ng/news/nigeria/metro/abuja-floods-green-space-loss-blocked-waterways-worsen-citys-woes/", depth: "KNEE" },
  ],
  "abj-katampe-main": [
    { source: "Vanguard", url: "https://www.vanguardngr.com/2026/08/residents-count-losses-as-flood-sweeps-through-parts-of-abuja/", depth: "CAR_ROOF" },
    { source: "Peoples Gazette", url: "https://gazettengr.com/nigerias-capital-city-abuja-flooded-vehicles-submerged-as-fct-residents-accuse-wike-of-encroaching-on-green-areas/", depth: "WAIST" },
    { source: "The Guardian", url: "https://guardian.ng/news/nigeria/metro/abuja-floods-green-space-loss-blocked-waterways-worsen-citys-woes/", depth: "WAIST" },
  ],
  "abj-utako-dan-suleiman": [
    { source: "Vanguard", url: "https://www.vanguardngr.com/2026/08/residents-count-losses-as-flood-sweeps-through-parts-of-abuja/", depth: "CAR_ROOF" },
    { source: "Peoples Gazette", url: "https://gazettengr.com/nigerias-capital-city-abuja-flooded-vehicles-submerged-as-fct-residents-accuse-wike-of-encroaching-on-green-areas/", depth: "WAIST" },
    { source: "The Guardian", url: "https://guardian.ng/news/nigeria/metro/abuja-floods-green-space-loss-blocked-waterways-worsen-citys-woes/", depth: "KNEE" },
  ],
};

export async function seedAbujaAugust2026() {
  const already = await prisma.floodReport.count({ where: { seeded: true } });
  if (already > 0) return { skipped: true, reports: already, passes: [] as string[] };
  const passes: string[] = [];
  let reports = 0;
  for (const [hotspotId, witnesses] of Object.entries(WITNESSES)) {
    const hotspot = ABUJA_HOTSPOTS.find((item) => item.id === hotspotId);
    if (!hotspot) continue;
    for (let index = 0; index < witnesses.length; index += 1) {
      const witness = witnesses[index];
      const outcome = await submitReport({
        channel: "seed",
        reporterKey: `seed:${witness.source}`,
        latitude: hotspot.latitude + index * 0.0004,
        longitude: hotspot.longitude,
        placeName: `${hotspot.name}, ${hotspot.area}`,
        state: hotspot.state,
        depth: witness.depth,
        note: `Rebuilt from a public news report (${witness.source}).`,
        reportedAt: new Date(EVENT_TIME.getTime() + index * 10 * 60_000),
        seeded: true,
        sourceUrl: witness.url,
      });
      reports += 1;
      if (outcome.pass) passes.push(outcome.pass.code);
      passes.push(...outcome.alsoVerified);
    }
  }
  return { skipped: false, reports, passes: Array.from(new Set(passes)) };
}
