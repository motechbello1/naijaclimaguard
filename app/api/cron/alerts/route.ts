import { NextResponse } from "next/server";
import {
  evaluateAlertRules,
  getBackgroundAlertBatch,
} from "@/lib/alerts/engine";
import { recordAlertEvidence } from "@/lib/evidence/alert-evidence";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Background alert evaluator.
 * Vercel Cron automatically supplies Authorization: Bearer <CRON_SECRET> when configured.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    const batch = await getBackgroundAlertBatch(250, now);
    const results = await evaluateAlertRules(batch.rules, now);
    const evidence = await recordAlertEvidence(batch.rules, results);

    const summary = {
      evaluated: results.length,
      triggered: results.filter((r) => r.status === "triggered").length,
      delivered: results.filter((r) => r.deliveryRecorded === true).length,
      alreadyNotified: results.filter((r) => r.status === "already_notified").length,
      belowThreshold: results.filter((r) => r.status === "below_threshold").length,
      feedUnreachable: results.filter((r) => r.status === "feed_unreachable").length,
      emailFailed: results.filter((r) => r.emailStatus === "email_failed").length,
      emailPendingCredential: results.filter((r) => r.emailStatus === "email_pending_credential").length,
    };

    return NextResponse.json({
      ok: true,
      checkedAt: now.toISOString(),
      model: "derived-v2 · same engine as /api/v1/risk",
      evidence,
      batch: {
        totalActive: batch.totalActive,
        page: batch.page + 1,
        pageCount: batch.pageCount,
        offset: batch.offset,
        limit: batch.limit,
      },
      summary,
      results: results.map(({ userId: _userId, ...result }) => result),
    });
  } catch (error) {
    console.error("Background alert evaluation failed", error);
    return NextResponse.json(
      { error: "Background alert evaluation failed." },
      { status: 500 }
    );
  }
}
