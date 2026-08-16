import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchNewsFloodHazards } from "@/lib/intelligence/news-flood-hazards";
import { findSaferRoutes, geocodeNigeriaPlace, RouteHazard, RoutePoint } from "@/lib/routing/flood-safe-route";

export const dynamic = "force-dynamic";

function parsePoint(value: any): RoutePoint | null {
  if (!value || typeof value !== "object") return null;
  const latitude = Number(value.latitude), longitude = Number(value.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  try {
    let origin = parsePoint(body.origin);
    let destination = parsePoint(body.destination);
    let originLabel = typeof body.originLabel === "string" ? body.originLabel.trim() : "Current location";
    let destinationLabel = typeof body.destinationLabel === "string" ? body.destinationLabel.trim() : "Destination";

    if (!origin && typeof body.originText === "string") {
      const found = await geocodeNigeriaPlace(body.originText);
      if (found) { origin = found.point; originLabel = found.label; }
    }
    if (!destination && typeof body.destinationText === "string") {
      const found = await geocodeNigeriaPlace(body.destinationText);
      if (found) { destination = found.point; destinationLabel = found.label; }
    }
    if (!origin) return NextResponse.json({ error: "We could not identify the starting point." }, { status: 400 });
    if (!destination) return NextResponse.json({ error: "We could not identify the destination." }, { status: 400 });

    const recentCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const [verified, newsZones] = await Promise.all([
      prisma.report.findMany({
        where: { status: "VERIFIED", createdAt: { gte: recentCutoff } },
        select: { id: true, latitude: true, longitude: true, area: true, waterLevel: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
      fetchNewsFloodHazards().catch(() => []),
    ]);

    const hazards: RouteHazard[] = [
      ...verified.map((item) => ({ ...item, sourceKind: "VERIFIED_CITIZEN" as const })),
      ...newsZones.map((item) => ({
        id: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        area: `${item.area}, ${item.state}`,
        createdAt: item.createdAt,
        radiusMeters: item.radiusMeters,
        sourceKind: "CORROBORATED_NEWS" as const,
      })),
    ];

    const candidates = await findSaferRoutes(origin, destination, hazards);
    const best = candidates[0];
    const allAffected = candidates.length > 0 && candidates.every((route) => route.hazardIntersections > 0);
    const verifiedBlocksAll = allAffected && candidates.every((route) => route.hazardKinds.includes("VERIFIED_CITIZEN"));
    const decision = hazards.length === 0
      ? "NO_KNOWN_HAZARDS"
      : verifiedBlocksAll
        ? "AVOID_TRAVEL"
        : allAffected
          ? "AVOID_REPORTED_FLOOD_AREAS"
          : best.hazardIntersections === 0
            ? "LOWER_EXPOSURE_ROUTE_FOUND"
            : "USE_CAUTION";

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      origin: { ...origin, label: originLabel },
      destination: { ...destination, label: destinationLabel },
      decision,
      bestRoute: best,
      alternatives: candidates.slice(1),
      verifiedHazardsConsidered: verified.length,
      corroboratedNewsZonesConsidered: newsZones.length,
      safetyMessage:
        decision === "AVOID_TRAVEL"
          ? "Every returned route passes close to a recent verified geotagged flood report. Do not treat any candidate as safe; delay travel or follow emergency-service instructions."
          : decision === "AVOID_REPORTED_FLOOD_AREAS"
            ? "Every returned route crosses a neighbourhood currently named in corroborated flood reporting. Avoid the reported areas if you can and wait for road-level confirmation before travelling."
            : decision === "LOWER_EXPOSURE_ROUTE_FOUND"
              ? "This candidate has the lowest known exposure to recent verified reports and corroborated specific-area flood reporting. Conditions can change quickly, so visible water and official closures always override it."
              : decision === "NO_KNOWN_HAZARDS"
                ? "No recent geolocated flood hazard is currently known along the candidate routes. That is not proof the roads are flood-free."
                : "Use caution. The suggested route has the lowest exposure among the returned alternatives, but a known flood hazard remains nearby.",
      dataPolicy: "Verified geotagged citizen reports can affect a road immediately. News only affects route scoring when a specific neighbourhood can be located and the wider incident is corroborated by independent reporting; it creates a broad caution zone, not an automatic road-closure claim.",
      routingProvider: "OSRM/OpenStreetMap beta",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not calculate a safer route." }, { status: 502 });
  }
}
