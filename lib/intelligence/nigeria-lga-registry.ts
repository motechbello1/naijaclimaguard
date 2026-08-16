export interface NigeriaLgaPoint {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}

type RemoteLga = {
  name?: string;
  state_name?: string;
  latitude?: number | string;
  longitude?: number | string;
};

const SOURCE = "https://raw.githubusercontent.com/xosasx/nigerian-local-government-areas/master/lgas.json";

function normalizeState(value: string) {
  const state = value.trim();
  if (/federal capital territory|abuja/i.test(state)) return "FCT";
  return state;
}

export async function fetchNigeriaLgaRegistry(): Promise<NigeriaLgaPoint[]> {
  const response = await fetch(SOURCE, {
    next: { revalidate: 24 * 60 * 60 },
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "NaijaClimaGuard/1.0 nationwide-flood-intelligence" },
  });
  if (!response.ok) throw new Error(`Nigeria LGA registry unavailable (${response.status})`);
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error("Nigeria LGA registry returned an invalid payload");

  return payload
    .map((item: RemoteLga) => ({
      name: String(item.name || "").trim(),
      state: normalizeState(String(item.state_name || "")),
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
    }))
    .filter((item) => item.name && item.state && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function appears(text: string, name: string) {
  const pattern = escapeRegExp(name.toLowerCase()).replace(/[-\s]+/g, "[-\\s]+");
  return new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, "i").test(text.toLowerCase());
}

/**
 * Finds the most specific LGA named in a headline or short incident description.
 * Longest-name-first avoids preferring "Oyi" when a longer distinct place name is present.
 */
export function resolveLgaFromText(text: string, registry: NigeriaLgaPoint[]) {
  const matches = registry.filter((item) => appears(text, item.name));
  if (!matches.length) return null;
  matches.sort((a, b) => b.name.length - a.name.length);
  return matches[0];
}
