import { createHash, randomInt, timingSafeEqual } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendLastMileMessage } from "@/lib/delivery/provider";

const CODE_TTL_MS = 10 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
}

function pepper() {
  const value = process.env.PHONE_VERIFICATION_PEPPER || process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("Phone verification secret is not configured.");
  return value;
}

function hashCode(userId: string, phone: string, code: string) {
  return createHash("sha256").update(`${pepper()}|${userId}|${phone}|${code}`).digest("hex");
}

function equalHash(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = String(body.action || "").toUpperCase();

  try {
    const preference = await prisma.deliveryPreference.findUnique({ where: { userId: user.id } });
    if (!preference?.phoneE164) {
      return NextResponse.json({ error: "Save a phone number first." }, { status: 409 });
    }

    if (action === "REQUEST") {
      if (preference.phoneVerifiedAt) {
        return NextResponse.json({ verified: true, message: "This phone number is already verified." });
      }

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const recent = await prisma.phoneVerificationChallenge.findMany({
        where: { userId: user.id, createdAt: { gte: oneHourAgo } },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true },
      });
      if (recent[0] && now.getTime() - recent[0].createdAt.getTime() < REQUEST_COOLDOWN_MS) {
        return NextResponse.json({ error: "Wait one minute before requesting another code." }, { status: 429 });
      }
      if (recent.length >= MAX_REQUESTS_PER_HOUR) {
        return NextResponse.json({ error: "Too many verification requests. Try again later." }, { status: 429 });
      }

      const code = String(randomInt(100000, 1000000));
      const challenge = await prisma.phoneVerificationChallenge.create({
        data: {
          userId: user.id,
          phoneE164: preference.phoneE164,
          codeHash: hashCode(user.id, preference.phoneE164, code),
          expiresAt: new Date(now.getTime() + CODE_TTL_MS),
        },
        select: { id: true },
      });

      const delivery = await sendLastMileMessage({
        channel: "SMS",
        to: preference.phoneE164,
        message: `NaijaClimaGuard verification code: ${code}. It expires in 10 minutes. Do not share this code.`,
        metadata: { purpose: "phone_verification" },
      });

      if (delivery.status !== "sent") {
        await prisma.phoneVerificationChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);
        if (delivery.status === "not_configured") {
          return NextResponse.json({ error: "SMS verification provider is not configured yet." }, { status: 503 });
        }
        return NextResponse.json({ error: "Verification SMS could not be delivered. Try again shortly." }, { status: 502 });
      }

      return NextResponse.json({ sent: true, expiresInSeconds: CODE_TTL_MS / 1000 });
    }

    if (action === "VERIFY") {
      const code = String(body.code || "").trim();
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
      }

      const challenge = await prisma.phoneVerificationChallenge.findFirst({
        where: {
          userId: user.id,
          phoneE164: preference.phoneE164,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
      if (!challenge) {
        return NextResponse.json({ error: "No active verification code. Request a new one." }, { status: 409 });
      }
      if (challenge.attempts >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
      }

      const candidate = hashCode(user.id, preference.phoneE164, code);
      if (!equalHash(challenge.codeHash, candidate)) {
        await prisma.phoneVerificationChallenge.update({
          where: { id: challenge.id },
          data: { attempts: { increment: 1 } },
        });
        return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
      }

      const verifiedAt = new Date();
      await prisma.$transaction([
        prisma.phoneVerificationChallenge.update({
          where: { id: challenge.id },
          data: { consumedAt: verifiedAt },
        }),
        prisma.deliveryPreference.update({
          where: { userId: user.id },
          data: { phoneVerifiedAt: verifiedAt },
        }),
      ]);

      return NextResponse.json({ verified: true, verifiedAt });
    }

    return NextResponse.json({ error: "action must be REQUEST or VERIFY." }, { status: 400 });
  } catch (error) {
    console.error("Phone verification failed", error);
    return NextResponse.json(
      { error: "Phone verification is unavailable until delivery storage and provider configuration are ready." },
      { status: 503 },
    );
  }
}
