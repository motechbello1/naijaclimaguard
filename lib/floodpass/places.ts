import { ABUJA_HOTSPOTS, nearestHotspot } from "@/lib/floodpass/hotspots";
import { NIGERIA_JURISDICTIONS } from "@/lib/intelligence/live-flood-feed";
import { distanceKm } from "@/lib/floodpass/truth-engine";
import { fetchNigeriaLgaRegistry, type NigeriaLgaPoint } from "@/lib/intelligence/nigeria-lga-registry";

/**
 * Where is this point? FloodPass must work in all 36 states and the FCT, not
 * only in Abuja. The answer comes from three layers, best first:
 *   1. a known flood hotspot within 800 m (Abuja today, more states as we map them),
 *   2. the nearest Local Government Area centre (774 LGAs, fetched daily),
 *   3. the nearest state capital (built in, always works, even offline).
 */

export type StateCapital = { state: string; capital: string; latitude: number; longitude: number };

/** 36 states and the FCT. Capital coordinates are approximate city centres. */
export const STATE_CAPITALS: StateCapital[] = [
  { state: "Abia", capital: "Umuahia", latitude: 5.526, longitude: 7.489 },
  { state: "Adamawa", capital: "Yola", latitude: 9.203, longitude: 12.495 },
  { state: "Akwa Ibom", capital: "Uyo", latitude: 5.038, longitude: 7.909 },
  { state: "Anambra", capital: "Awka", latitude: 6.21, longitude: 7.072 },
  { state: "Bauchi", capital: "Bauchi", latitude: 10.314, longitude: 9.846 },
  { state: "Bayelsa", capital: "Yenagoa", latitude: 4.926, longitude: 6.264 },
  { state: "Benue", capital: "Makurdi", latitude: 7.733, longitude: 8.521 },
  { state: "Borno", capital: "Maiduguri", latitude: 11.846, longitude: 13.16 },
  { state: "Cross River", capital: "Calabar", latitude: 4.958, longitude: 8.327 },
  { state: "Delta", capital: "Asaba", latitude: 6.198, longitude: 6.73 },
  { state: "Ebonyi", capital: "Abakaliki", latitude: 6.325, longitude: 8.113 },
  { state: "Edo", capital: "Benin City", latitude: 6.335, longitude: 5.603 },
  { state: "Ekiti", capital: "Ado-Ekiti", latitude: 7.621, longitude: 5.221 },
  { state: "Enugu", capital: "Enugu", latitude: 6.459, longitude: 7.549 },
  { state: "FCT", capital: "Abuja", latitude: 9.058, longitude: 7.489 },
  { state: "Gombe", capital: "Gombe", latitude: 10.29, longitude: 11.167 },
  { state: "Imo", capital: "Owerri", latitude: 5.485, longitude: 7.035 },
  { state: "Jigawa", capital: "Dutse", latitude: 11.756, longitude: 9.339 },
  { state: "Kaduna", capital: "Kaduna", latitude: 10.51, longitude: 7.416 },
  { state: "Kano", capital: "Kano", latitude: 12.0, longitude: 8.517 },
  { state: "Katsina", capital: "Katsina", latitude: 12.989, longitude: 7.601 },
  { state: "Kebbi", capital: "Birnin Kebbi", latitude: 12.454, longitude: 4.197 },
  { state: "Kogi", capital: "Lokoja", latitude: 7.802, longitude: 6.743 },
  { state: "Kwara", capital: "Ilorin", latitude: 8.497, longitude: 4.542 },
  { state: "Lagos", capital: "Ikeja", latitude: 6.601, longitude: 3.351 },
  { state: "Nasarawa", capital: "Lafia", latitude: 8.494, longitude: 8.515 },
  { state: "Niger", capital: "Minna", latitude: 9.583, longitude: 6.546 },
  { state: "Ogun", capital: "Abeokuta", latitude: 7.146, longitude: 3.361 },
  { state: "Ondo", capital: "Akure", latitude: 7.25, longitude: 5.195 },
  { state: "Osun", capital: "Osogbo", latitude: 7.771, longitude: 4.557 },
  { state: "Oyo", capital: "Ibadan", latitude: 7.378, longitude: 3.947 },
  { state: "Plateau", capital: "Jos", latitude: 9.896, longitude: 8.858 },
  { state: "Rivers", capital: "Port Harcourt", latitude: 4.815, longitude: 7.049 },
  { state: "Sokoto", capital: "Sokoto", latitude: 13.006, longitude: 5.247 },
  { state: "Taraba", capital: "Jalingo", latitude: 8.893, longitude: 11.36 },
  { state: "Yobe", capital: "Damaturu", latitude: 11.747, longitude: 11.961 },
  { state: "Zamfara", capital: "Gusau", latitude: 12.17, longitude: 6.664 },
];

export const ALL_STATES = STATE_CAPITALS.map((row) => row.state);

export type PlaceFix = {
  /** A short name people recognise, for example "Kosofe" or "Ebeano-Gudu Road, Gudu". */
  name: string;
  state: string;
  /** Other names to search the news for this place. */
  searchNames: string[];
  from: "hotspot" | "lga" | "capital";
  distanceKm: number;
  /** The point used for this place: the person's own point, or the centre of the named place. */
  latitude: number;
  longitude: number;
};

/** Roughly inside Nigeria (a generous box). Outside it FloodPass does not guess a state. */
export function insideNigeria(latitude: number, longitude: number) {
  return latitude >= 4.0 && latitude <= 14.0 && longitude >= 2.6 && longitude <= 14.8;
}

export function nearestCapital(latitude: number, longitude: number) {
  let best = STATE_CAPITALS[0];
  let bestKm = Infinity;
  for (const row of STATE_CAPITALS) {
    const km = distanceKm(latitude, longitude, row.latitude, row.longitude);
    if (km < bestKm) { bestKm = km; best = row; }
  }
  return { capital: best, km: bestKm };
}

export function nearestLga(latitude: number, longitude: number, registry: NigeriaLgaPoint[]) {
  let best: NigeriaLgaPoint | null = null;
  let bestKm = Infinity;
  for (const row of registry) {
    // A cheap box test first keeps this fast across 774 points.
    if (Math.abs(row.latitude - latitude) > 1 || Math.abs(row.longitude - longitude) > 1) continue;
    const km = distanceKm(latitude, longitude, row.latitude, row.longitude);
    if (km < bestKm) { bestKm = km; best = row; }
  }
  return best ? { lga: best, km: bestKm } : null;
}

let registryCache: { at: number; rows: NigeriaLgaPoint[] } | null = null;

/** The LGA list, cached for a day. Returns [] if it cannot be fetched; callers then fall back to capitals. */
export async function lgaRegistry(): Promise<NigeriaLgaPoint[]> {
  if (registryCache && Date.now() - registryCache.at < 24 * 3600_000) return registryCache.rows;
  try {
    const rows = await fetchNigeriaLgaRegistry();
    registryCache = { at: Date.now(), rows };
    return rows;
  } catch {
    return registryCache?.rows ?? [];
  }
}

/** Pure version, for tests and for callers that already hold the registry. */
export function placeFromRegistry(latitude: number, longitude: number, registry: NigeriaLgaPoint[]): PlaceFix | null {
  if (!insideNigeria(latitude, longitude)) return null;
  const hotspot = nearestHotspot(latitude, longitude, 0.8);
  if (hotspot) {
    return {
      name: `${hotspot.hotspot.name}, ${hotspot.hotspot.area}`,
      state: hotspot.hotspot.state,
      searchNames: [hotspot.hotspot.name, hotspot.hotspot.area],
      from: "hotspot",
      distanceKm: Math.round(hotspot.km * 10) / 10,
      latitude,
      longitude,
    };
  }
  const lga = nearestLga(latitude, longitude, registry);
  if (lga && lga.km <= 40) {
    return { name: lga.lga.name, state: lga.lga.state, searchNames: [lga.lga.name], from: "lga", distanceKm: Math.round(lga.km * 10) / 10, latitude, longitude };
  }
  const cap = nearestCapital(latitude, longitude);
  return { name: `Near ${cap.capital.capital}`, state: cap.capital.state, searchNames: [cap.capital.capital], from: "capital", distanceKm: Math.round(cap.km), latitude, longitude };
}

export async function placeFor(latitude: number, longitude: number): Promise<PlaceFix | null> {
  return placeFromRegistry(latitude, longitude, await lgaRegistry());
}

/** Names worth searching the news for: long enough to be specific, no duplicates. */
export function searchableNames(names: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = String(raw ?? "").replace(/^near\s+/i, "").split(",")[0].trim();
    if (name.length < 4 || /^-?\d/.test(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.slice(0, 4);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function named(text: string, name: string) {
  const pattern = escapeRegExp(name.toLowerCase().trim()).replace(/[-\s]+/g, "[-\\s]+");
  return new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, "i").test(text);
}

/**
 * Finds a place from words a person typed, for SMS, USSD and voice users who
 * cannot send a map pin. Example: "Gudu Abuja", "Kosofe Lagos", "Makurdi".
 * The point is the centre of the named place, so reports made this way are
 * marked as less exact.
 */
export function findPlaceByName(input: string, registry: NigeriaLgaPoint[]): PlaceFix | null {
  const text = ` ${String(input ?? "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim()} `;
  if (text.trim().length < 3) return null;

  // Which state did they name, if any? (State names, capitals and well-known towns.)
  const stateNamed = NIGERIA_JURISDICTIONS.find((j) => named(text, j.state) || j.aliases.some((alias) => named(text, alias)))?.state
    ?? STATE_CAPITALS.find((row) => named(text, row.capital))?.state
    ?? null;

  // 1. A known flood hotspot, by street/estate name or area.
  const hotspot = [...ABUJA_HOTSPOTS]
    .sort((a, b) => b.name.length - a.name.length)
    .find((h) => (!stateNamed || stateNamed === h.state) && (named(text, h.name) || named(text, h.area)));
  if (hotspot) {
    return {
      name: `${hotspot.name}, ${hotspot.area}`,
      state: hotspot.state,
      searchNames: [hotspot.name, hotspot.area],
      from: "hotspot",
      distanceKm: 0,
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,
    };
  }

  // 2. A Local Government Area; if they named a state, only LGAs in that state.
  const lgas = registry
    .filter((row) => row.name.length >= 3 && named(text, row.name))
    .filter((row) => !stateNamed || row.state === stateNamed)
    .sort((a, b) => b.name.length - a.name.length);
  if (lgas.length) {
    const lga = lgas[0];
    return { name: lga.name, state: lga.state, searchNames: [lga.name], from: "lga", distanceKm: 0, latitude: lga.latitude, longitude: lga.longitude };
  }

  // 3. Only a state or a big town: use the state capital (least exact).
  if (stateNamed) {
    const cap = STATE_CAPITALS.find((row) => row.state === stateNamed)!;
    return { name: `${cap.capital} area`, state: cap.state, searchNames: [cap.capital], from: "capital", distanceKm: 0, latitude: cap.latitude, longitude: cap.longitude };
  }
  return null;
}

export async function placeByName(input: string) {
  return findPlaceByName(input, await lgaRegistry());
}
