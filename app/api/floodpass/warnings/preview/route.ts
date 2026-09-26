import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isFounderSessionUser } from "@/lib/founder-auth";
import { asLang, buildWarning, type WarningParts } from "@/lib/floodpass/messages";
import { writeWarning } from "@/lib/floodpass/ai/warning-writer";
import { aiEnabled, aiModel } from "@/lib/floodpass/ai/provider";
import { floodChance, memorySentence } from "@/lib/floodpass/street-memory";
import { streetMemoryFor } from "@/lib/floodpass/street-memory-store";
import { placeFor } from "@/lib/floodpass/places";
import { isStorageNotReady, validCoordinates } from "@/lib/floodpass/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/floodpass/warnings/preview (founder only)
 * Shows the warning a street WOULD get, written by the AI Warning Writer with
 * Street Memory added. It never sends anything: sending a public warning needs
 * an official source (NiMet Act 2022) and a human decision.
 * Body: { latitude, longitude, hazard, window, source, action, avoid?, forecastMm?, lang? }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isFounderSessionUser(session?.user as { role?: unknown } | undefined)) {
    return NextResponse.json({ error: "Founder only." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch { return NextResponse.json({ error: "Send JSON." }, { status: 400 }); }
  const coords = validCoordinates(body.latitude, body.longitude);
  if (!coords) return NextResponse.json({ error: "A valid location is needed." }, { status: 400 });
  const text = (key: string, fallback: string) => (typeof body[key] === "string" && String(body[key]).trim() ? String(body[key]).trim().slice(0, 160) : fallback);
  const lang = asLang(typeof body.lang === "string" ? body.lang : "en");

  const place = await placeFor(coords.latitude, coords.longitude).catch(() => null);
  let memory = null;
  try {
    memory = await streetMemoryFor(coords.latitude, coords.longitude);
  } catch (error) {
    if (!isStorageNotReady(error)) throw error;
  }
  const forecastMm = Number.isFinite(Number(body.forecastMm)) ? Number(body.forecastMm) : null;

  const parts: WarningParts = {
    hazard: text("hazard", "Heavy rain"),
    place: text("place", place?.name.replace(/^Near /, "") ?? "your area"),
    window: text("window", "today"),
    source: text("source", "NiMet"),
    action: text("action", "Move your car and valuables to high ground now."),
    avoid: typeof body.avoid === "string" ? body.avoid.slice(0, 80) : undefined,
    history: memorySentence(memory, lang),
  };
  const written = await writeWarning(parts, lang);
  return NextResponse.json({
    sent: false,
    note: "Preview only. Nothing was sent.",
    ai: { enabled: aiEnabled(), model: aiEnabled() ? aiModel() : null },
    place,
    streetMemory: memory,
    floodChance: floodChance(memory, forecastMm),
    message: written.message,
    writtenBy: written.writtenBy,
    template: buildWarning(lang, parts),
  });
}
