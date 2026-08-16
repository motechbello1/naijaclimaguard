export type RoutePoint = { latitude: number; longitude: number };
export type RouteHazard = RoutePoint & {
  id: string;
  area: string;
  createdAt: Date;
  waterLevel?: string;
  radiusMeters?: number;
  sourceKind?: "VERIFIED_CITIZEN" | "CORROBORATED_NEWS";
};

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][]; type: "LineString" };
  legs?: Array<{ steps?: Array<{ name?: string; distance?: number }> }>;
};

export type SaferRouteCandidate = {
  index: number;
  distanceKm: number;
  durationMinutes: number;
  hazardIntersections: number;
  nearestHazardMeters: number | null;
  hazardAreas: string[];
  hazardKinds: string[];
  roadNames: string[];
  navigationUrl: string;
  geometry: [number, number][];
};

const R = 6_371_000;
const rad = (value: number) => value * Math.PI / 180;

export function distanceMeters(a: RoutePoint, b: RoutePoint) {
  const dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude);
  const lat1 = rad(a.latitude), lat2 = rad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function hazardRadius(hazard: RouteHazard) {
  if (Number.isFinite(hazard.radiusMeters) && Number(hazard.radiusMeters) > 0) return Number(hazard.radiusMeters);
  switch (hazard.waterLevel) {
    case "ABOVE_HEAD": return 900;
    case "WAIST": return 650;
    case "KNEE": return 400;
    default: return 250;
  }
}

function distanceToRoute(hazard: RouteHazard, coordinates: [number, number][]) {
  let nearest = Number.POSITIVE_INFINITY;
  const step = Math.max(1, Math.floor(coordinates.length / 800));
  for (let i = 0; i < coordinates.length; i += step) {
    const [lon, lat] = coordinates[i];
    nearest = Math.min(nearest, distanceMeters(hazard, { latitude: lat, longitude: lon }));
  }
  const last = coordinates[coordinates.length - 1];
  if (last) nearest = Math.min(nearest, distanceMeters(hazard, { latitude: last[1], longitude: last[0] }));
  return nearest;
}

export async function geocodeNigeriaPlace(query: string): Promise<{ point: RoutePoint; label: string } | null> {
  const q = query.trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ng&addressdetails=1&q=${encodeURIComponent(`${q}, Nigeria`)}`;
  const response = await fetch(url, { cache: "no-store", headers: { "User-Agent": "NaijaClimaGuard/1.0 flood-safe-route" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("place search unavailable");
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) return null;
  const latitude = Number(rows[0].lat), longitude = Number(rows[0].lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { point: { latitude, longitude }, label: String(rows[0].display_name || q) };
}

function navigationUrl(origin: RoutePoint, destination: RoutePoint, coordinates: [number, number][]) {
  const waypointCount = Math.min(5, Math.max(0, coordinates.length - 2));
  const waypoints: string[] = [];
  for (let i = 1; i <= waypointCount; i += 1) {
    const idx = Math.floor((i * (coordinates.length - 1)) / (waypointCount + 1));
    const point = coordinates[idx];
    if (point) waypoints.push(`${point[1]},${point[0]}`);
  }
  const params = new URLSearchParams({ api: "1", origin: `${origin.latitude},${origin.longitude}`, destination: `${destination.latitude},${destination.longitude}`, travelmode: "driving" });
  if (waypoints.length) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export async function findSaferRoutes(origin: RoutePoint, destination: RoutePoint, hazards: RouteHazard[]) {
  const endpoints = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${endpoints}?alternatives=true&steps=true&overview=full&geometries=geojson`;
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("routing provider unavailable");
  const payload = await response.json();
  const routes: OsrmRoute[] = Array.isArray(payload?.routes) ? payload.routes : [];
  if (!routes.length) throw new Error("no drivable route found");

  const candidates: SaferRouteCandidate[] = routes.map((route, index) => {
    const coordinates = route.geometry?.coordinates ?? [];
    const relevant = hazards.map((hazard) => ({ hazard, meters: distanceToRoute(hazard, coordinates) }));
    const intersections = relevant.filter(({ hazard, meters }) => meters <= hazardRadius(hazard));
    const nearest = relevant.length ? Math.min(...relevant.map(({ meters }) => meters)) : null;
    const roadNames = (route.legs ?? []).flatMap((leg) => leg.steps ?? []).map((step) => String(step.name || "").trim())
      .filter((name, i, all) => name && all.indexOf(name) === i).slice(0, 10);
    return {
      index,
      distanceKm: Math.round(route.distance / 100) / 10,
      durationMinutes: Math.round(route.duration / 60),
      hazardIntersections: intersections.length,
      nearestHazardMeters: nearest === null ? null : Math.round(nearest),
      hazardAreas: intersections.map(({ hazard }) => hazard.area).filter((value, i, all) => all.indexOf(value) === i),
      hazardKinds: intersections.map(({ hazard }) => hazard.sourceKind || "VERIFIED_CITIZEN").filter((value, i, all) => all.indexOf(value) === i),
      roadNames,
      navigationUrl: navigationUrl(origin, destination, coordinates),
      geometry: coordinates,
    };
  });
  candidates.sort((a, b) => a.hazardIntersections - b.hazardIntersections || a.durationMinutes - b.durationMinutes || a.distanceKm - b.distanceKm);
  return candidates;
}
