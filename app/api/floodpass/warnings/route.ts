import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isFounderRequest } from "@/lib/floodpass/founder-guard";
import { createWarning, validateWarning } from "@/lib/floodpass/warnings";
import { isStorageNotReady } from "@/lib/floodpass/service";

export const dynamic = "force-dynamic";

/** Founder only. Lists warnings, newest first (drafts made from official news included). */
export async function GET() {
  if (!(await isFounderRequest())) return NextResponse.json({ error: "Founder only." }, { status: 403 });
  try {
    const warnings = await prisma.floodWarning.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ warnings });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "FloodPass storage is not switched on yet." }, { status: 503 });
    throw error;
  }
}

/** Founder only. Creates a DRAFT warning. Nothing is sent until it is approved. */
export async function POST(req: Request) {
  if (!(await isFounderRequest())) return NextResponse.json({ error: "Founder only." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const checked = validateWarning(body);
  if (!checked.ok) return NextResponse.json({ error: checked.problems.join(" "), problems: checked.problems }, { status: 400 });
  try {
    const warning = await createWarning(checked.value, "founder");
    return NextResponse.json({ warning }, { status: 201 });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "FloodPass storage is not switched on yet." }, { status: 503 });
    throw error;
  }
}
