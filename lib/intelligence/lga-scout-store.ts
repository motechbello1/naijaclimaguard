import { prisma } from "@/lib/db";
import type { NationalLgaScoutResult } from "@/lib/intelligence/national-lga-scout";

function quarterHourKey(value: string) {
  const date = new Date(value);
  const minutes = Math.floor(date.getUTCMinutes() / 15) * 15;
  date.setUTCMinutes(minutes, 0, 0);
  return date.toISOString();
}

export async function persistLgaScoutHotspots(result: NationalLgaScoutResult) {
  const source = await prisma.intelligenceSource.upsert({
    where: { slug: "open-meteo-lga-rainfall-scout" },
    update: {
      active: true,
      defaultFreshnessMinutes: 30,
      description: "Nationwide rainfall/convection screening across Nigerian LGA centroids, with targeted antecedent-rainfall deep scans.",
      config: {
        coverage: "774 Nigerian LGAs when registry is complete",
        role: "early screening, not flood confirmation",
        providerAttribution: "Weather data: Open-Meteo.com (CC BY 4.0)",
      },
    },
    create: {
      slug: "open-meteo-lga-rainfall-scout",
      provider: "Open-Meteo",
      name: "Nationwide LGA Rainfall Scout",
      sourceKind: "WEATHER",
      description: "Nationwide rainfall/convection screening across Nigerian LGA centroids, with targeted antecedent-rainfall deep scans.",
      defaultFreshnessMinutes: 30,
      config: {
        coverage: "774 Nigerian LGAs when registry is complete",
        role: "early screening, not flood confirmation",
        providerAttribution: "Weather data: Open-Meteo.com (CC BY 4.0)",
      },
    },
  });

  if (!result.hotspots.length) return { sourceId: source.id, inserted: 0, hotspots: 0 };

  const observedAt = new Date(result.generatedAt);
  const scanKey = quarterHourKey(result.generatedAt);
  const rows = result.hotspots.map((item) => ({
    sourceId: source.id,
    variable: "urban_flash_flood_screen",
    value: {
      scoutScore: item.scoutScore,
      scoutLevel: item.scoutLevel,
      deepRiskScore: item.deepRisk?.score ?? null,
      deepRiskLevel: item.deepRisk?.level ?? null,
      rain1hMm: item.recent1hMm,
      rain3hMm: item.recent3hMm,
      rain6hMm: item.recent6hMm,
      next3hMm: item.next3hMm,
      next6hMm: item.next6hMm,
      maxHourlyMm: item.maxHourlyMm,
      capeMaxJkg: item.capeMaxJkg,
      drivers: item.deepRisk?.drivers ?? [],
    },
    unit: "screen_score_0_100",
    observedAt,
    receivedAt: new Date(),
    latitude: item.latitude,
    longitude: item.longitude,
    locationName: item.lga,
    state: item.state,
    country: "Nigeria",
    qualityStatus: "GOOD" as const,
    confidence: item.deepRisk ? 0.65 : 0.45,
    flags: {
      floodConfirmed: false,
      screeningOnly: true,
      deepScanApplied: Boolean(item.deepRisk),
    },
    sourceVersion: "national-lga-scout-v1",
    externalRecordId: `${item.state}:${item.lga}:${scanKey}`,
    originalUnit: "mm rainfall / J kg-1 CAPE",
    originalVariable: "precipitation, showers, cape",
    metadata: {
      generatedAt: result.generatedAt,
      methodology: result.methodology,
      limitation: result.limitation,
    },
    dedupeKey: `lga-scout:${item.state}:${item.lga}:${scanKey}`,
  }));

  const inserted = await prisma.intelligenceObservation.createMany({ data: rows, skipDuplicates: true });
  return { sourceId: source.id, inserted: inserted.count, hotspots: rows.length };
}
