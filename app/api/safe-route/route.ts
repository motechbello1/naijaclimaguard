import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findSaferRoutes, geocodeNigeriaPlace, RoutePoint } from "@/lib/routing/flood-safe-route";

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
    const verified = await prisma.report.findMany({
      where: { status: "VERIFIED", createdAt: { gte: recentCutoff } },
      select: { id: true, latitude: true, longitude: true, area: true, waterLevel: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 250,
    });

    const candidates = await findSaferRoutes(origin, destination, verified);
    const best = candidates[0];
    const allAffected = candidates.length > 0 && candidates.every((route) => route.hazardIntersections > 0);
    const decision = verified.length === 0
      ? "NO_VERIFIED_HAZARDS"
      : allAffected
        ? "AVOID_TRAVEL"
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
      safetyMessage:
        decision === "AVOID_TRAVEL"
          ? "Every returned route passes close to a recent verified flood report. Do not treat any route as safe; delay travel or follow emergency-service instructions."
          : decision === "LOWER_EXPOSURE_ROUTE_FOUND"
            ? "This route avoids the recent verified geotagged flood reports known to NaijaClimaGuard. Conditions can change quickly, so visible water and official road closures always override this suggestion."
            : decision === "NO_VERIFIED_HAZARDS"
              ? "No recent verified geotagged flood reports are currently stored near the candidate routes. That is not proof that the roads are flood-free."
              : "Use caution. The suggested route has the lowest exposure among the returned alternatives, but a verified flood report remains nearby.",
      dataPolicy: "Only verified geotagged citizen reports from the last 12 hours affect route scoring. News headlines are not precise enough to block a road automatically.",
      routingProvider: "OSRM/OpenStreetMap beta",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not calculate a safer route." }, { status: 502 });
  }
}
