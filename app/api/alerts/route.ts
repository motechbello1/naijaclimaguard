import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_CHANNELS = new Set(["EMAIL", "SMS", "WHATSAPP", "VOICE"]);

function normalizeChannels(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().toUpperCase())
      .filter((item) => ALLOWED_CHANNELS.has(item)),
  ));
}

async function currentUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: { deliveryPreference: true },
  });
}

function validateDeliveryChannels(
  channels: string[],
  preference: {
    phoneE164: string | null;
    phoneVerifiedAt: Date | null;
    emailEnabled: boolean;
    smsEnabled: boolean;
    whatsappEnabled: boolean;
    voiceEnabled: boolean;
  } | null,
) {
  if (!channels.length) return "Choose at least one alert channel.";
  if (channels.includes("EMAIL") && preference?.emailEnabled === false) {
    return "Email alerts are disabled in your delivery settings.";
  }
  const phoneSelected = channels.some((channel) => ["SMS", "WHATSAPP", "VOICE"].includes(channel));
  if (phoneSelected && (!preference?.phoneE164 || !preference.phoneVerifiedAt)) {
    return "Verify your phone number before creating phone-based alerts.";
  }
  if (channels.includes("SMS") && !preference?.smsEnabled) return "Enable SMS in your delivery settings first.";
  if (channels.includes("WHATSAPP") && !preference?.whatsappEnabled) return "Enable WhatsApp in your delivery settings first.";
  if (channels.includes("VOICE") && !preference?.voiceEnabled) return "Enable voice alerts in your delivery settings first.";
  return null;
}

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

  const user = await currentUser(session.user.email);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();
  const locationId = String(body.locationId || "");
  const threshold = Number(body.threshold);
  const channels = normalizeChannels(body.channels);

  if (!locationId || !Number.isFinite(threshold) || threshold < 30 || threshold > 90) {
    return NextResponse.json({ error: "Choose a saved location and a warning level from 30 to 90." }, { status: 400 });
  }
  const channelError = validateDeliveryChannels(channels, user.deliveryPreference);
  if (channelError) return NextResponse.json({ error: channelError }, { status: 409 });

  const loc = await prisma.location.findFirst({ where: { id: locationId, userId: user.id } });
  if (!loc) return NextResponse.json({ error: "Location not found" }, { status: 404 });

  const alert = await prisma.alert.create({
    data: { threshold: Math.round(threshold), channels: JSON.stringify(channels), userId: user.id, locationId },
    include: { location: true },
  });

  return NextResponse.json({ alert: { ...alert, channels: JSON.parse(alert.channels) } }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const id = String(body.id || "");
  const user = await currentUser(session.user.email);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const alert = await prisma.alert.findFirst({ where: { id, userId: user.id } });
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

  const data: { active?: boolean; threshold?: number; channels?: string } = {};
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.threshold !== undefined) {
    const threshold = Number(body.threshold);
    if (!Number.isFinite(threshold) || threshold < 30 || threshold > 90) {
      return NextResponse.json({ error: "Warning level must be from 30 to 90." }, { status: 400 });
    }
    data.threshold = Math.round(threshold);
  }
  if (body.channels !== undefined) {
    const channels = normalizeChannels(body.channels);
    const channelError = validateDeliveryChannels(channels, user.deliveryPreference);
    if (channelError) return NextResponse.json({ error: channelError }, { status: 409 });
    data.channels = JSON.stringify(channels);
  }

  const updated = await prisma.alert.update({ where: { id }, data, include: { location: true } });
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
