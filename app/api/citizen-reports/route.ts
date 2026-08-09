import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appendEvidenceEvent, EvidenceEventType } from "@/lib/evidence/ledger";

const LEVELS = ["ANKLE", "KNEE", "WAIST", "ABOVE_HEAD"] as const;

/** POST /api/citizen-reports — submit a real geotagged flood report. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in to submit a report." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { latitude, longitude, area, waterLevel, description } = body ?? {};

  if (
    typeof latitude !== "number" || latitude < -90 || latitude > 90 ||
    typeof longitude !== "number" || longitude < -180 || longitude > 180
  ) {
    return NextResponse.json({ error: "A valid location is required." }, { status: 400 });
  }
  if (typeof area !== "string" || area.trim().length < 2 || area.length > 120) {
    return NextResponse.json({ error: "Area name is required (2–120 characters)." }, { status: 400 });
  }
  if (!LEVELS.includes(waterLevel)) {
    return NextResponse.json({ error: "Select a water level." }, { status: 400 });
  }
  if (description && (typeof description !== "string" || description.length > 500)) {
    return NextResponse.json({ error: "Description must be under 500 characters." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 401 });

  // Basic abuse guard: max 5 reports per user per hour.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.report.count({
    where: { userId: user.id, createdAt: { gte: oneHourAgo } },
  });
  if (recent >= 5) {
    return NextResponse.json(
      { error: "Rate limit: max 5 reports per hour. Thank you for reporting — please wait before submitting more." },
      { status: 429 },
    );
  }

  const report = await prisma.report.create({
    data: {
      latitude,
      longitude,
      area: area.trim(),
      waterLevel,
      description: description?.trim() || null,
      userId: user.id,
      // Schema default is PENDING; keep moderation separate from submission.
    },
  });

  return NextResponse.json({ ok: true, report: { id: report.id, createdAt: report.createdAt, status: report.status } }, { status: 201 });
}

/** GET /api/citizen-reports — latest community reports (authenticated). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in to view reports." }, { status: 401 });
  }

  const account = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { plan: true },
  });
  if (!account) return NextResponse.json({ error: "Account not found." }, { status: 401 });

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      latitude: true,
      longitude: true,
      area: true,
      waterLevel: true,
      description: true,
      status: true,
      createdAt: true,
    },
  });

  const canSeeExactCoordinates = account.plan === "ENTERPRISE";
  return NextResponse.json({
    reports: reports.map((report) => ({
      id: report.id,
      area: report.area,
      waterLevel: report.waterLevel,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt,
      ...(canSeeExactCoordinates ? { latitude: report.latitude, longitude: report.longitude } : {}),
    })),
    coordinateAccess: canSeeExactCoordinates ? "exact_enterprise_operator" : "withheld_from_community_view",
  });
}

/** PATCH /api/citizen-reports — verify or reject a report (ENTERPRISE operators only). */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 401 });
  if (user.plan !== "ENTERPRISE") {
    return NextResponse.json(
      { error: "Report verification requires an ENTERPRISE operator account." },
      { status: 403 },
    );
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { id, status } = body ?? {};
  if (typeof id !== "string" || !["VERIFIED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "id and status (VERIFIED | REJECTED) required." }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  if (report.status !== "PENDING") {
    return NextResponse.json(
      { error: `This report has already been reviewed as ${report.status}.` },
      { status: 409 },
    );
  }

  // Conditional update prevents two operators from silently making competing decisions.
  const changed = await prisma.report.updateMany({
    where: { id, status: "PENDING" },
    data: { status },
  });
  if (changed.count !== 1) {
    return NextResponse.json({ error: "This report was reviewed by another operator." }, { status: 409 });
  }

  const eventType: EvidenceEventType = status === "VERIFIED" ? "CITIZEN_REPORT_VERIFIED" : "CITIZEN_REPORT_REJECTED";
  let evidenceRecorded = false;
  try {
    await appendEvidenceEvent({
      eventType,
      userId: user.id,
      modelLabel: "citizen-report-moderation",
      actionCode: status,
      deliveryState: status.toLowerCase(),
      metadata: {
        reportId: report.id,
        reportOwnerUserId: report.userId,
        area: report.area,
        waterLevel: report.waterLevel,
        reviewProvenance: "enterprise_operator",
      },
    });
    evidenceRecorded = true;
  } catch (error) {
    console.error("Citizen report moderation evidence write unavailable", error);
  }

  return NextResponse.json({ ok: true, report: { id: report.id, status }, evidenceRecorded });
}
