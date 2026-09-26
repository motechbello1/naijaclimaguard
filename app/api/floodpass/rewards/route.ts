import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isFounderRequest } from "@/lib/floodpass/founder-guard";
import { decidePayout } from "@/lib/floodpass/drains";
import { maskPhone } from "@/lib/floodpass/channels/phone";
import { heroAlias } from "@/lib/floodpass/drain-rules";
import { isStorageNotReady } from "@/lib/floodpass/service";

export const dynamic = "force-dynamic";

/** Founder only. Airtime requests from Drain Heroes. */
export async function GET() {
  if (!(await isFounderRequest())) return NextResponse.json({ error: "Founder only." }, { status: 403 });
  try {
    const rows = await prisma.rewardPayout.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({
      payouts: rows.map((row) => ({
        id: row.id,
        hero: heroAlias(row.reporterKey),
        phone: maskPhone(row.phone),
        points: row.points,
        amountNaira: row.amountNaira,
        status: row.status,
        error: row.error,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "FloodPass storage is not switched on yet." }, { status: 503 });
    throw error;
  }
}

/** Founder only. { id, approve: true|false }. Approving sends the airtime at once. */
export async function POST(req: Request) {
  if (!(await isFounderRequest())) return NextResponse.json({ error: "Founder only." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { id?: string; approve?: boolean };
  if (!body.id) return NextResponse.json({ error: "Which payout?" }, { status: 400 });
  const result = await decidePayout(body.id, body.approve === true);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
