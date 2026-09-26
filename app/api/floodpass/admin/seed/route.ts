import { NextResponse } from "next/server";
import { isFounderRequest } from "@/lib/floodpass/founder-guard";
import { seedAbujaAugust2026 } from "@/lib/floodpass/seed-abuja";
import { isStorageNotReady } from "@/lib/floodpass/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Founder only. Loads the 16 August 2026 Abuja floods, rebuilt from news, clearly marked as demo records. */
export async function POST() {
  if (!(await isFounderRequest())) return NextResponse.json({ error: "Founder only." }, { status: 403 });
  try {
    return NextResponse.json(await seedAbujaAugust2026());
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "FloodPass tables are not created yet." }, { status: 503 });
    console.error("seed failed", error);
    return NextResponse.json({ error: "Loading demo floods failed." }, { status: 500 });
  }
}
