import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isFounderRequest } from "@/lib/floodpass/founder-guard";
import { previewWarning, sendWarningBatch } from "@/lib/floodpass/warnings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Founder only. Shows who would get this warning and the exact words, before anything is sent. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isFounderRequest())) return NextResponse.json({ error: "Founder only." }, { status: 403 });
  const preview = await previewWarning(params.id);
  if (!preview) return NextResponse.json({ error: "No such warning." }, { status: 404 });
  const deliveries = await prisma.warningDelivery.groupBy({ by: ["channel", "status"], where: { warningId: params.id }, _count: { _all: true } });
  return NextResponse.json({ ...preview, deliveries: deliveries.map((d) => ({ channel: d.channel, status: d.status, count: d._count._all })) });
}

/**
 * Founder only. body.action:
 *   "approve"  start sending (then batches continue every 15 minutes, or press send_batch)
 *   "send_batch" send the next batch now
 *   "cancel"   stop; nobody else gets it
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!(await isFounderRequest())) return NextResponse.json({ error: "Founder only." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const warning = await prisma.floodWarning.findUnique({ where: { id: params.id } });
  if (!warning) return NextResponse.json({ error: "No such warning." }, { status: 404 });

  if (body.action === "cancel") {
    if (warning.status === "SENT") return NextResponse.json({ error: "Already sent." }, { status: 409 });
    await prisma.floodWarning.update({ where: { id: warning.id }, data: { status: "CANCELLED", finishedAt: new Date() } });
    return NextResponse.json({ status: "CANCELLED" });
  }
  if (body.action === "approve") {
    if (warning.status !== "DRAFT") return NextResponse.json({ error: `This warning is ${warning.status}.` }, { status: 409 });
    if (!warning.sourceUrl) return NextResponse.json({ error: "Add the official source link before sending." }, { status: 400 });
    await prisma.floodWarning.update({ where: { id: warning.id }, data: { status: "SENDING", approvedAt: new Date() } });
    const batch = await sendWarningBatch(warning.id);
    return NextResponse.json(batch);
  }
  if (body.action === "send_batch") {
    const batch = await sendWarningBatch(warning.id);
    return NextResponse.json(batch);
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
