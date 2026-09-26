import { NextResponse } from "next/server";
import { createAddressCheck } from "@/lib/floodpass/address-check";
import { placeByName } from "@/lib/floodpass/places";
import { isStorageNotReady, validCoordinates } from "@/lib/floodpass/service";

export const dynamic = "force-dynamic";

/** POST { latitude, longitude } or { placeText } → an unpaid address check code to pay for. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  let coords = validCoordinates(body.latitude, body.longitude);
  let placeName: string | null = typeof body.placeName === "string" ? body.placeName.slice(0, 120) : null;
  if (!coords && typeof body.placeText === "string") {
    const found = await placeByName(body.placeText);
    if (found) { coords = { latitude: found.latitude, longitude: found.longitude }; placeName = found.name; }
  }
  if (!coords) return NextResponse.json({ error: "We could not find that place. Use your location or type the area and state." }, { status: 400 });
  try {
    const check = await createAddressCheck(coords.latitude, coords.longitude, placeName);
    return NextResponse.json({ code: check.code, placeName: check.placeName, state: check.state }, { status: 201 });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "FloodPass storage is not switched on yet." }, { status: 503 });
    throw error;
  }
}
