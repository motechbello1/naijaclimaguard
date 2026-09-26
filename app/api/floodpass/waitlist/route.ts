import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { planByCode } from "@/lib/floodpass/billing/plans";
import { normalizePhone } from "@/lib/floodpass/channels/phone";
import { ALL_STATES } from "@/lib/floodpass/places";
import { isStorageNotReady } from "@/lib/floodpass/service";

export const dynamic = "force-dynamic";

/** POST { plan, phone?, email?, state? }: "tell me when this is ready". */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const plan = planByCode(body.plan);
  if (!plan) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  const phone = normalizePhone(body.phone);
  const email = typeof body.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email.trim()) ? body.email.trim().toLowerCase() : null;
  if (!phone && !email) return NextResponse.json({ error: "Give a phone number or an email." }, { status: 400 });
  const state = typeof body.state === "string" && ALL_STATES.includes(body.state) ? body.state : null;
  try {
    await prisma.floodPassWaitlist.create({ data: { plan: plan.code, phone, email, state } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "FloodPass storage is not switched on yet." }, { status: 503 });
    throw error;
  }
}
