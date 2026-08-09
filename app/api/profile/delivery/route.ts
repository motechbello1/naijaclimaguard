import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { maskPhone, normalizePhoneE164 } from "@/lib/delivery/phone";

const LANGUAGES = new Set(["ENGLISH", "HAUSA", "YORUBA", "IGBO", "PIDGIN"]);

async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true },
  });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const preference = await prisma.deliveryPreference.findUnique({ where: { userId: user.id } });
    return NextResponse.json({
      delivery: preference
        ? {
            phone: preference.phoneE164,
            phoneMasked: maskPhone(preference.phoneE164),
            phoneVerified: Boolean(preference.phoneVerifiedAt),
            phoneVerifiedAt: preference.phoneVerifiedAt,
            preferredLanguage: preference.preferredLanguage,
            emailEnabled: preference.emailEnabled,
            smsEnabled: preference.smsEnabled,
            whatsappEnabled: preference.whatsappEnabled,
            voiceEnabled: preference.voiceEnabled,
          }
        : {
            phone: null,
            phoneMasked: null,
            phoneVerified: false,
            phoneVerifiedAt: null,
            preferredLanguage: "ENGLISH",
            emailEnabled: true,
            smsEnabled: false,
            whatsappEnabled: false,
            voiceEnabled: false,
          },
      providers: {
        sms: Boolean(process.env.SMS_PROVIDER_URL && process.env.SMS_PROVIDER_TOKEN),
        whatsapp: Boolean(process.env.WHATSAPP_PROVIDER_URL && process.env.WHATSAPP_PROVIDER_TOKEN),
        voice: Boolean(process.env.VOICE_PROVIDER_URL && process.env.VOICE_PROVIDER_TOKEN),
        email: Boolean(process.env.RESEND_API_KEY),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Delivery preferences are unavailable until the staged database migration is applied." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const existing = await prisma.deliveryPreference.findUnique({ where: { userId: user.id } });
    const preferredLanguage = body.preferredLanguage == null
      ? (existing?.preferredLanguage ?? "ENGLISH")
      : String(body.preferredLanguage).toUpperCase();
    if (!LANGUAGES.has(preferredLanguage)) {
      return NextResponse.json({ error: "Unsupported preferred language." }, { status: 400 });
    }

    let phoneE164 = existing?.phoneE164 ?? null;
    let phoneVerifiedAt = existing?.phoneVerifiedAt ?? null;
    let smsEnabled = existing?.smsEnabled ?? false;
    let whatsappEnabled = existing?.whatsappEnabled ?? false;
    let voiceEnabled = existing?.voiceEnabled ?? false;

    if (body.phone !== undefined) {
      const nextPhone = body.phone == null || String(body.phone).trim() === ""
        ? null
        : normalizePhoneE164(String(body.phone));
      if (nextPhone !== phoneE164) {
        phoneE164 = nextPhone;
        phoneVerifiedAt = null;
        smsEnabled = false;
        whatsappEnabled = false;
        voiceEnabled = false;
      }
    }

    const requestedSms = body.smsEnabled === undefined ? smsEnabled : Boolean(body.smsEnabled);
    const requestedWhatsapp = body.whatsappEnabled === undefined ? whatsappEnabled : Boolean(body.whatsappEnabled);
    const requestedVoice = body.voiceEnabled === undefined ? voiceEnabled : Boolean(body.voiceEnabled);

    if ((requestedSms || requestedWhatsapp || requestedVoice) && (!phoneE164 || !phoneVerifiedAt)) {
      return NextResponse.json(
        { error: "Verify your phone number before enabling SMS, WhatsApp or voice alerts." },
        { status: 409 },
      );
    }

    const preference = await prisma.deliveryPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        phoneE164,
        phoneVerifiedAt,
        preferredLanguage,
        emailEnabled: body.emailEnabled === undefined ? true : Boolean(body.emailEnabled),
        smsEnabled: requestedSms,
        whatsappEnabled: requestedWhatsapp,
        voiceEnabled: requestedVoice,
      },
      update: {
        phoneE164,
        phoneVerifiedAt,
        preferredLanguage,
        ...(body.emailEnabled !== undefined ? { emailEnabled: Boolean(body.emailEnabled) } : {}),
        smsEnabled: requestedSms,
        whatsappEnabled: requestedWhatsapp,
        voiceEnabled: requestedVoice,
      },
    });

    return NextResponse.json({
      delivery: {
        phone: preference.phoneE164,
        phoneMasked: maskPhone(preference.phoneE164),
        phoneVerified: Boolean(preference.phoneVerifiedAt),
        phoneVerifiedAt: preference.phoneVerifiedAt,
        preferredLanguage: preference.preferredLanguage,
        emailEnabled: preference.emailEnabled,
        smsEnabled: preference.smsEnabled,
        whatsappEnabled: preference.whatsappEnabled,
        voiceEnabled: preference.voiceEnabled,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save delivery preferences.";
    if (message.startsWith("Enter a valid phone")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Delivery preferences are unavailable until the staged database migration is applied." },
      { status: 503 },
    );
  }
}
