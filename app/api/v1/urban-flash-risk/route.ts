import { NextResponse } from "next/server";
import { fetchUrbanFlashRisk } from "@/lib/risk/urban-flash-v1";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const latitude = Number(searchParams.get("latitude"));
  const longitude = Number(searchParams.get("longitude"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
  }

  try {
    const risk = await fetchUrbanFlashRisk(latitude, longitude);
    return NextResponse.json({
      risk,
      meta: {
        status: "operational nowcast heuristic",
        purpose: "short-duration urban/flash flood rainfall detection",
        note: "This is not yet the trained urban flood model. It is a disclosed rainfall nowcast used while the news-labelled model remains in shadow validation.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "urban nowcast unavailable" },
      { status: 502 }
    );
  }
}
