/**
 * Rain that fell in the 24 hours before a moment, at a point.
 *
 * Uses Open-Meteo. IMPORTANT: Open-Meteo's free API is for NON-COMMERCIAL use
 * only (https://open-meteo.com/en/terms). Set OPEN_METEO_API_KEY (a paid plan)
 * before FloodPass earns money; the code then switches to the customer
 * endpoints automatically.
 */

type HourlyPayload = { hourly?: { time?: string[]; precipitation?: Array<number | null> } };

function endpoints() {
  const key = process.env.OPEN_METEO_API_KEY?.trim();
  return key
    ? { forecast: "https://customer-api.open-meteo.com/v1/forecast", archive: "https://customer-archive-api.open-meteo.com/v1/archive", suffix: `&apikey=${encodeURIComponent(key)}` }
    : { forecast: "https://api.open-meteo.com/v1/forecast", archive: "https://archive-api.open-meteo.com/v1/archive", suffix: "" };
}

function sumWindow(payload: HourlyPayload, at: Date) {
  const times = payload.hourly?.time ?? [];
  const values = payload.hourly?.precipitation ?? [];
  const end = at.getTime();
  const start = end - 24 * 3600_000;
  let total = 0;
  let seen = 0;
  for (let i = 0; i < times.length; i += 1) {
    // Times come back in UTC because we ask for timezone=GMT.
    const t = Date.parse(`${times[i]}:00Z`);
    if (!Number.isFinite(t) || t <= start || t > end) continue;
    const v = values[i];
    if (typeof v === "number" && Number.isFinite(v)) { total += v; seen += 1; }
  }
  return seen >= 12 ? total : null;
}

export async function rainfall24hBefore(latitude: number, longitude: number, at: Date): Promise<number | null> {
  const { forecast, archive, suffix } = endpoints();
  const ageHours = (Date.now() - at.getTime()) / 3600_000;
  try {
    let url: string;
    if (ageHours <= 72) {
      url = `${forecast}?latitude=${latitude}&longitude=${longitude}&hourly=precipitation&past_days=3&forecast_days=1&timezone=GMT${suffix}`;
    } else {
      const day = at.toISOString().slice(0, 10);
      const before = new Date(at.getTime() - 86_400_000).toISOString().slice(0, 10);
      url = `${archive}?latitude=${latitude}&longitude=${longitude}&start_date=${before}&end_date=${day}&hourly=precipitation&timezone=GMT${suffix}`;
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) return null;
    return sumWindow((await response.json()) as HourlyPayload, at);
  } catch {
    return null;
  }
}

export const __test = { sumWindow };
