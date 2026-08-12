import { NextRequest, NextResponse } from "next/server";
import {
  scoreRiverineWatchV1,
  type RiverineWatchInput,
} from "@/lib/risk/riverine-watch-v1";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as RiverineWatchInput;
    const result = scoreRiverineWatchV1(input);
    return NextResponse.json({
      ...result,
      scope: ["Lokoja", "Makurdi"],
      notice:
        "Shadow/pilot 14-day riverine WATCH signal. Human review is required before public action.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to score riverine watch",
      },
      { status: 400 }
    );
  }
}
