import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { draftWarningsFromNews, sendWarningBatch } from "@/lib/floodpass/warnings";
import { purgeExpiredPhotos } from "@/lib/floodpass/photos";
import { isStorageNotReady } from "@/lib/floodpass/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * FloodPass housekeeping, every 15 minutes (GitHub Actions calls it with CRON_SECRET):
 *   1. turn fresh official warnings in the news into DRAFTS for a person to check;
 *   2. keep sending approved warnings, batch by batch;
 *   3. delete photos past their keep-until date;
 *   4. end paid plans whose time ran out (2 days of grace).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured on this deployment." }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const started = Date.now();
  const report: Record<string, unknown> = {};
  try {
    report.draftsCreated = await draftWarningsFromNews();

    const sending = await prisma.floodWarning.findMany({ where: { status: "SENDING" }, orderBy: { approvedAt: "asc" }, take: 5 });
    const batches = [];
    for (const warning of sending) {
      if (Date.now() - started > 40_000) break;
      batches.push({ id: warning.id, ...(await sendWarningBatch(warning.id)) });
    }
    report.warningBatches = batches;

    report.photosDeleted = await purgeExpiredPhotos();

    const expired = await prisma.floodPassSubscription.updateMany({
      where: { status: "ACTIVE", currentPeriodEnd: { lt: new Date(Date.now() - 2 * 86_400_000) } },
      data: { status: "EXPIRED" },
    });
    report.plansExpired = expired.count;

    return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...report });
  } catch (error) {
    if (isStorageNotReady(error)) return NextResponse.json({ ok: false, error: "FloodPass tables are not created yet." }, { status: 503 });
    console.error("floodpass housekeeping failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "failed", ...report }, { status: 502 });
  }
}
