import { NextResponse } from "next/server";
import { isStorageNotReady, recentPasses } from "@/lib/floodpass/service";
import { ABUJA_HOTSPOTS } from "@/lib/floodpass/hotspots";

export const dynamic = "force-dynamic";

/** GET /api/floodpass/recent: recent verified floods (no personal data) and the hotspot registry. */
export async function GET(req: Request) {
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 100);
  const hotspots = ABUJA_HOTSPOTS.map(({ sources, ...rest }) => ({ ...rest, sourceCount: sources.length }));
  try {
    return NextResponse.json({ passes: await recentPasses(limit), hotspots, storage: "ready" });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ passes: [], hotspots, storage: "not_ready" });
    console.error("floodpass recent failed", error);
    return NextResponse.json({ passes: [], hotspots, storage: "error" }, { status: 500 });
  }
}
