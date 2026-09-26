/**
 * Abuja flood hotspot registry, version 1.
 *
 * Built from news reports of repeated flooding (2023 to August 2026).
 * Coordinates are APPROXIMATE centre points for each named place and must be
 * confirmed with GPS on the ground before anyone relies on them for payouts.
 */

export type Hotspot = {
  id: string;
  name: string;
  area: string;
  state: string;
  latitude: number;
  longitude: number;
  approximate: true;
  lastReported: string; // YYYY-MM or YYYY-MM-DD
  note: string;
  sources: string[];
};

const GUARDIAN_2026 = "https://guardian.ng/news/nigeria/metro/abuja-floods-green-space-loss-blocked-waterways-worsen-citys-woes/";
const THECABLE_2026 = "https://www.thecable.ng/residents-stranded-cars-submerged-as-flash-flood-hits-parts-of-abuja/";
const VANGUARD_2026 = "https://www.vanguardngr.com/2026/08/residents-count-losses-as-flood-sweeps-through-parts-of-abuja/";
const DAILYTRUST_2026 = "https://allafrica.com/stories/202606030039.html";
const TRIBUNE_2024 = "https://tribuneonlineng.com/flood-submerges-trademore-estate-in-abuja/";

export const ABUJA_HOTSPOTS: Hotspot[] = [
  { id: "abj-wuse2-adetokunbo", name: "Adetokunbo Ademola Crescent", area: "Wuse 2", state: "FCT", latitude: 9.079, longitude: 7.481, approximate: true, lastReported: "2026-08-16", note: "Cars submerged in the 16 August 2026 flash flood.", sources: [THECABLE_2026, GUARDIAN_2026] },
  { id: "abj-gudu-ebeano", name: "Ebeano-Gudu Road", area: "Gudu", state: "FCT", latitude: 9.006, longitude: 7.475, approximate: true, lastReported: "2026-08-16", note: "Road cut off; businesses closed.", sources: [THECABLE_2026] },
  { id: "abj-gaduwa-durumi-bridge", name: "Gaduwa-Durumi bridge", area: "Gaduwa / Durumi", state: "FCT", latitude: 9.003, longitude: 7.462, approximate: true, lastReported: "2026-08-16", note: "Bridge flooded; residents could not cross.", sources: [THECABLE_2026, GUARDIAN_2026] },
  { id: "abj-lokogoma-efab", name: "Efab Estate", area: "Lokogoma", state: "FCT", latitude: 8.988, longitude: 7.488, approximate: true, lastReported: "2026-08-16", note: "Estate flooded in August 2026; Lokogoma floods repeatedly.", sources: [THECABLE_2026, DAILYTRUST_2026] },
  { id: "abj-katampe-main", name: "Katampe Main", area: "Katampe", state: "FCT", latitude: 9.114, longitude: 7.448, approximate: true, lastReported: "2026-08-16", note: "Worst hit in August 2026; third flooding incident.", sources: [VANGUARD_2026] },
  { id: "abj-utako-dan-suleiman", name: "Dan Suleiman Street", area: "Utako", state: "FCT", latitude: 9.07, longitude: 7.442, approximate: true, lastReported: "2026-08-16", note: "A resident's car was submerged; he said he almost died.", sources: [VANGUARD_2026, DAILYTRUST_2026] },
  { id: "abj-jabi-under-bridge", name: "Jabi Under Bridge", area: "Jabi", state: "FCT", latitude: 9.066, longitude: 7.428, approximate: true, lastReported: "2026-06", note: "Regular flooding under the bridge.", sources: [DAILYTRUST_2026] },
  { id: "abj-berger-junction", name: "Berger Junction", area: "Wuse", state: "FCT", latitude: 9.062, longitude: 7.464, approximate: true, lastReported: "2026-06", note: "Regular flooding at the junction.", sources: [DAILYTRUST_2026] },
  { id: "abj-mabushi", name: "Mabushi water channel", area: "Mabushi", state: "FCT", latitude: 9.085, longitude: 7.46, approximate: true, lastReported: "2026-08", note: "Blocked channel reported; water rose to window level on one street.", sources: [GUARDIAN_2026] },
  { id: "abj-trademore", name: "Trademore Estate", area: "Lugbe", state: "FCT", latitude: 8.974, longitude: 7.369, approximate: true, lastReported: "2024-06-24", note: "Floods most rainy seasons; 116 structures marked for demolition in 2023 for blocking water channels.", sources: [TRIBUNE_2024, DAILYTRUST_2026] },
  { id: "abj-lugbe", name: "Lugbe", area: "Lugbe", state: "FCT", latitude: 8.98, longitude: 7.38, approximate: true, lastReported: "2026-08", note: "Named among repeat flood areas.", sources: [GUARDIAN_2026, DAILYTRUST_2026] },
  { id: "abj-galadimawa", name: "Galadimawa", area: "Galadimawa", state: "FCT", latitude: 8.995, longitude: 7.425, approximate: true, lastReported: "2026-06", note: "Named among repeat flood areas.", sources: [DAILYTRUST_2026] },
  { id: "abj-gwarinpa", name: "Gwarinpa", area: "Gwarinpa", state: "FCT", latitude: 9.102, longitude: 7.4, approximate: true, lastReported: "2026-08", note: "Named among repeat flood areas.", sources: [GUARDIAN_2026] },
  { id: "abj-nyanya", name: "Nyanya", area: "Nyanya", state: "FCT", latitude: 9.02, longitude: 7.565, approximate: true, lastReported: "2026-08", note: "Named among repeat flood areas.", sources: [GUARDIAN_2026] },
  { id: "abj-wuye", name: "Wuye", area: "Wuye", state: "FCT", latitude: 9.058, longitude: 7.455, approximate: true, lastReported: "2026-08", note: "Named among repeat flood areas.", sources: [GUARDIAN_2026] },
  { id: "abj-maitama", name: "Maitama", area: "Maitama", state: "FCT", latitude: 9.088, longitude: 7.496, approximate: true, lastReported: "2026-08", note: "Flooded in August 2026.", sources: [GUARDIAN_2026] },
  { id: "abj-asokoro", name: "Asokoro", area: "Asokoro", state: "FCT", latitude: 9.046, longitude: 7.53, approximate: true, lastReported: "2026-08", note: "Named among repeat flood areas.", sources: [GUARDIAN_2026] },
  { id: "abj-apo", name: "Apo", area: "Apo", state: "FCT", latitude: 8.995, longitude: 7.503, approximate: true, lastReported: "2026-08-16", note: "Flooded in August 2026.", sources: [GUARDIAN_2026] },
];

export function nearestHotspot(latitude: number, longitude: number, withinKm = 0.8) {
  let best: { hotspot: Hotspot; km: number } | null = null;
  for (const hotspot of ABUJA_HOTSPOTS) {
    const km = haversineKm(latitude, longitude, hotspot.latitude, hotspot.longitude);
    if (km <= withinKm && (!best || km < best.km)) best = { hotspot, km };
  }
  return best;
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
