import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { alerts: { include: { location: true }, orderBy: { createdAt: "desc" } } },
  });

  const alerts = (user?.alerts || []).map((a) => ({
    ...a,
    channels: JSON.parse(a.channels),
  }));

  return NextResponse.json({ alerts });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { locationId, threshold, channels } = await request.json();
  if (!locationId || !threshold || !channels?.length) {
    return NextResponse.json({ error: "locationId, threshold, channels required" }, { status: 400 });
  }

  const loc = await prisma.location.findFirst({ where: { id: locationId, userId: user.id } });
  if (!loc) return NextResponse.json({ error: "Location not found" }, { status: 404 });

  const alert = await prisma.alert.create({
    data: { threshold, channels: JSON.stringify(channels), userId: user.id, locationId },
    include: { location: true },
  });

  return NextResponse.json({ alert: { ...alert, channels: JSON.parse(alert.channels) } }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, active } = await request.json();
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const alert = await prisma.alert.findFirst({ where: { id, userId: user.id } });
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

  const updated = await prisma.alert.update({ where: { id }, data: { active }, include: { location: true } });
  return NextResponse.json({ alert: { ...updated, channels: JSON.parse(updated.channels) } });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const alert = await prisma.alert.findFirst({ where: { id, userId: user.id } });
  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.alert.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
