import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() }, select: { id: true, email: true, name: true, plan: true } });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const [wallet, workspaces, orders] = await Promise.all([
    prisma.apiCreditWallet.findUnique({ where: { userId: user.id } }),
    prisma.organizationWorkspace.findMany({ where: { ownerUserId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.commercialOrder.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return NextResponse.json({ user, wallet: wallet || { balance: 0, purchased: 0, used: 0 }, workspaces, orders });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.plan !== "BUSINESS_STARTER" && user.plan !== "ENTERPRISE") return NextResponse.json({ error: "A business or enterprise plan is required." }, { status: 403 });

  let body: any = {};
  try { body = await request.json(); } catch {}
  const name = String(body.name || "").trim().slice(0, 180);
  const organizationType = String(body.organizationType || "business").trim().slice(0, 60);
  if (name.length < 2) return NextResponse.json({ error: "Enter an organisation name." }, { status: 400 });

  const existing = await prisma.organizationWorkspace.findFirst({ where: { ownerUserId: user.id, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  const workspace = existing
    ? await prisma.organizationWorkspace.update({ where: { id: existing.id }, data: { name, organizationType } })
    : await prisma.organizationWorkspace.create({ data: { ownerUserId: user.id, name, organizationType, plan: user.plan === "ENTERPRISE" ? "ENTERPRISE" : "BUSINESS_STARTER", seatLimit: user.plan === "ENTERPRISE" ? 50 : 5, locationLimit: user.plan === "ENTERPRISE" ? 500 : 25 } });

  return NextResponse.json({ ok: true, workspace });
}
