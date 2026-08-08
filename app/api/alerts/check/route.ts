import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  evaluateAlertRules,
  getActiveAlertRulesForUser,
} from "@/lib/alerts/engine";

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

  const rules = await getActiveAlertRulesForUser(session.user.email);
  const results = await evaluateAlertRules(rules);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    channels: {
      email: process.env.RESEND_API_KEY ? "live" : "pending_credential",
      sms: "integration_pending_phone_field",
    },
    model: "derived-v2 · same engine as /api/v1/risk",
    results,
  });
}
