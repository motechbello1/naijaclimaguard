import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PLAN_LIMITS: Record<string, number> = { FREE: 3, PROFESSIONAL: 50, ENTERPRISE: 9999 };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { locations: { orderBy: { createdAt: "desc" }, include: { alerts: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ locations: user.locations, limit: PLAN_LIMITS[user.plan] || 3, used: user.locations.length, plan: user.plan });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { locations: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const limit = PLAN_LIMITS[user.plan] || 3;
  if (user.locations.length >= limit) {
    return NextResponse.json({ error: `${user.plan} plan allows ${limit} locations. Upgrade for more.` }, { status: 403 });
  }

  const { name, state, latitude, longitude } = await request.json();
  if (!name || !state || latitude == null || longitude == null) {
    return NextResponse.json({ error: "name, state, latitude, longitude required" }, { status: 400 });
  }

  const location = await prisma.location.create({ data: { name, state, latitude, longitude, userId: user.id } });
  return NextResponse.json({ location }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const loc = await prisma.location.findFirst({ where: { id, userId: user.id } });
  if (!loc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.location.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
