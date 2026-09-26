import { NextResponse } from "next/server";
import { isFounderRequest } from "@/lib/floodpass/founder-guard";
import { photoLinkValid, readPhoto } from "@/lib/floodpass/photos";

export const dynamic = "force-dynamic";

/**
 * GET /api/floodpass/photos/{id}?e=...&t=...
 * Shows one private photo, only through a signed link that expires (given to a
 * partner checking a FloodPass, or to the owner for their vault), or to the founder.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const allowed = photoLinkValid(params.id, url.searchParams.get("e"), url.searchParams.get("t")) || (await isFounderRequest());
  if (!allowed) return NextResponse.json({ error: "This photo link has expired or is not valid." }, { status: 403 });
  const photo = await readPhoto(params.id).catch(() => null);
  if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  return new NextResponse(new Uint8Array(photo.bytes), {
    status: 200,
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
