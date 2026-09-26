import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isFounderSessionUser } from "@/lib/founder-auth";
import { prisma } from "@/lib/db";
import { newPartnerApiKey } from "@/lib/floodpass/identity";
import { isStorageNotReady } from "@/lib/floodpass/service";

export const dynamic = "force-dynamic";

const KINDS = new Set(["INSURER", "BANK", "MICROFINANCE", "CHARITY", "GOVERNMENT", "LANDLORD", "OTHER"]);

/** Founder only. Lists partners (never their keys). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isFounderSessionUser(session?.user as { role?: unknown } | undefined)) return NextResponse.json({ error: "Founder only." }, { status: 403 });
  try {
    const partners = await prisma.floodPassPartner.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, kind: true, apiKeyPrefix: true, active: true, pricePerCheckKobo: true, createdAt: true, _count: { select: { checks: true } } },
    });
    return NextResponse.json({ partners });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "FloodPass storage is not switched on yet." }, { status: 503 });
    throw error;
  }
}

/** Founder only. Creates a partner and shows its key ONCE. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isFounderSessionUser(session?.user as { role?: unknown } | undefined)) return NextResponse.json({ error: "Founder only." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim().slice(0, 120);
  const kind = String(body.kind ?? "OTHER").trim().toUpperCase();
  const price = Math.max(0, Math.round(Number(body.pricePerCheckNaira ?? 0) * 100));
  if (!name) return NextResponse.json({ error: "Partner name is needed." }, { status: 400 });
  if (!KINDS.has(kind)) return NextResponse.json({ error: `Kind must be one of ${Array.from(KINDS).join(", ")}.` }, { status: 400 });
  const key = newPartnerApiKey();
  try {
    const partner = await prisma.floodPassPartner.create({
      data: { name, kind, apiKeyPrefix: key.prefix, apiKeyHash: key.hash, pricePerCheckKobo: price },
      select: { id: true, name: true, kind: true, apiKeyPrefix: true },
    });
    return NextResponse.json({ partner, apiKey: key.key, note: "Copy this key now. It is stored only as a hash and cannot be shown again." }, { status: 201 });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ error: "FloodPass storage is not switched on yet." }, { status: 503 });
    throw error;
  }
}
