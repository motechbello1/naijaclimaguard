import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  evaluateAlertRules,
  getActiveAlertRulesForUser,
} from "@/lib/alerts/engine";
import { recordAlertEvidence } from "@/lib/evidence/alert-evidence";

/**
 * GET /api/alerts/check
 * Manual, authenticated alert evaluation for the signed-in user's active rules.
 * Uses the exact same derived-v2 calculation as /api/v1/risk.
 */
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
      email: process.env.RESEND_API_KEY ? "live" : "pending_credential",
      sms: "integration_pending_phone_field",
    },
    evidence,
    model: "derived-v2 · same engine as /api/v1/risk",
    results,
  });
}
