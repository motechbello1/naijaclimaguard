import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  evaluateAlertRules,
  getActiveAlertRulesForUser,
} from "@/lib/alerts/engine";
import { recordAlertEvidence } from "@/lib/evidence/alert-evidence";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const account = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 401 });
  }

  const rules = await getActiveAlertRulesForUser(session.user.email);
  const evaluated = await evaluateAlertRules(rules);
  const evidence = await recordAlertEvidence(rules, evaluated);
  const results = evaluated.map(({ userId: _userId, ...result }) => result);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    channels: {
      email: process.env.RESEND_API_KEY ? "provider_configured" : "not_configured",
      sms: process.env.SMS_PROVIDER_URL && process.env.SMS_PROVIDER_TOKEN ? "provider_configured" : "not_configured",
      whatsapp: process.env.WHATSAPP_PROVIDER_URL && process.env.WHATSAPP_PROVIDER_TOKEN ? "provider_configured" : "not_configured",
      voice: process.env.VOICE_PROVIDER_URL && process.env.VOICE_PROVIDER_TOKEN ? "provider_configured" : "not_configured",
    },
    evidence,
    model: "derived-v2 plus independent official-advisory safety overlay",
    results,
  });
}
