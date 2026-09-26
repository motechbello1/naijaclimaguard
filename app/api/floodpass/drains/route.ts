import { NextResponse } from "next/server";
import { drainBoard, reportBlockedDrain } from "@/lib/floodpass/drains";
import { reporterKeyFor } from "@/lib/floodpass/identity";
import { decodeWebPhoto } from "@/lib/floodpass/photo-intake";
import { ALL_STATES } from "@/lib/floodpass/places";
import { isStorageNotReady, validCoordinates } from "@/lib/floodpass/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET ?state=Lagos: drain counts, top Drain Heroes and recent drains. No personal data. */
export async function GET(req: Request) {
  const state = new URL(req.url).searchParams.get("state");
  try {
    return NextResponse.json(await drainBoard(state && ALL_STATES.includes(state) ? state : null), { headers: { "Cache-Control": "public, s-maxage=120" } });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "Drain Heroes is being switched on." }, { status: 503 });
    throw error;
  }
}

/** POST { deviceId, latitude, longitude, photo: "data:image/jpeg;base64,..." }: report a blocked drain from the website. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const deviceId = String(body.deviceId ?? "").trim();
  if (deviceId.length < 8 || deviceId.length > 100) return NextResponse.json({ error: "A device id is needed." }, { status: 400 });
  const coords = validCoordinates(body.latitude, body.longitude);
  if (!coords) return NextResponse.json({ error: "Share your location so we know where the drain is." }, { status: 400 });
  const photo = decodeWebPhoto(body.photo);
  if (!photo) return NextResponse.json({ error: "A photo of the blocked drain is needed." }, { status: 400 });
  try {
    const drain = await reportBlockedDrain({ reporterKey: reporterKeyFor("web", deviceId), latitude: coords.latitude, longitude: coords.longitude, photo });
    return NextResponse.json(drain, { status: drain.existing ? 200 : 201 });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "Drain Heroes is being switched on." }, { status: 503 });
    console.error("drain report failed", error);
    return NextResponse.json({ error: "We could not save the drain. Please try again." }, { status: 500 });
  }
}
