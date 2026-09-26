import { NextResponse } from "next/server";
import { FloodPassInputError, isStorageNotReady, submitReport, validCoordinates } from "@/lib/floodpass/service";
import { reporterKeyFor } from "@/lib/floodpass/identity";
import { decodeWebPhoto, inspectPhoto } from "@/lib/floodpass/photo-intake";
import { savePhoto } from "@/lib/floodpass/photos";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/floodpass/reports
 * Body: { deviceId, latitude, longitude, depth?, note?, placeName?, language?,
 *         photo?: { data: "data:image/jpeg;base64,...", takenAt?, latitude?, longitude?, keep? } }
 * The photo is shrunk on the phone first (about 768 px). The AI looks at it once.
 * The photo itself is kept (privately, as proof) only if the person ticked "keep".
 * A person on the web says "there is water here". No login needed.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send the report as JSON." }, { status: 400 });
  }

  const deviceId = String(body.deviceId ?? "").trim();
  if (deviceId.length < 8 || deviceId.length > 100) {
    return NextResponse.json({ error: "A device id is needed." }, { status: 400 });
  }
  const coords = validCoordinates(body.latitude, body.longitude);
  if (!coords) return NextResponse.json({ error: "A valid location is needed." }, { status: 400 });

  const photo = body.photo && typeof body.photo === "object" ? (body.photo as Record<string, unknown>) : null;
  const photoTakenAt = photo?.takenAt ? new Date(String(photo.takenAt)) : null;
  const decoded = photo ? decodeWebPhoto(photo.data) : null;
  if (photo && photo.data && !decoded) {
    return NextResponse.json({ error: "The photo could not be read. Please send a smaller JPEG or PNG." }, { status: 400 });
  }
  const inspected = decoded ? await inspectPhoto(decoded.bytes, decoded.mimeType).catch(() => null) : null;

  try {
    const reporterKey = reporterKeyFor("web", deviceId);
    const outcome = await submitReport({
      channel: "web",
      reporterKey,
      latitude: coords.latitude,
      longitude: coords.longitude,
      placeName: typeof body.placeName === "string" ? body.placeName : null,
      depth: typeof body.depth === "string" ? body.depth : null,
      note: typeof body.note === "string" ? body.note : null,
      language: typeof body.language === "string" ? body.language.slice(0, 5) : "en",
      photoRef: decoded ? `web-photo:${inspected?.photoHash?.slice(0, 16) ?? Date.now()}` : null,
      photoHash: inspected?.photoHash ?? null,
      aiPhoto: inspected?.aiPhoto ?? null,
      // A browser cannot prove a photo is live, so web photos never get the "live" credit.
      photoLive: false,
      photoTakenAt: photoTakenAt && Number.isFinite(photoTakenAt.getTime()) ? photoTakenAt : null,
      photoLatitude: photo && Number.isFinite(Number(photo.latitude)) ? Number(photo.latitude) : null,
      photoLongitude: photo && Number.isFinite(Number(photo.longitude)) ? Number(photo.longitude) : null,
    });
    let photoKept = false;
    if (decoded && photo?.keep === true) {
      photoKept = Boolean(await savePhoto({ bytes: decoded.bytes, mimeType: decoded.mimeType, kind: "FLOOD", ownerKey: reporterKey, reportId: outcome.reportId }).catch(() => null));
    }
    return NextResponse.json({ ...outcome, photoKept }, { status: 201 });
  } catch (error) {
    if (error instanceof FloodPassInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (isStorageNotReady(error)) {
      return NextResponse.json({ error: "FloodPass storage is not switched on yet. The database update needs approval first." }, { status: 503 });
    }
    console.error("floodpass report failed", error);
    return NextResponse.json({ error: "We could not save the report. Please try again." }, { status: 500 });
  }
}
