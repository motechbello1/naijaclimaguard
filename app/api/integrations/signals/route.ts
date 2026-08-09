import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const SIGNAL_TYPES = new Set(["WATER_LEVEL", "OFFICIAL_ADVISORY", "DAM_RELEASE"]);
const DEVICE_TYPES = new Set(["RIVER_GAUGE", "IOT_WATER_LEVEL_SENSOR"]);

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

function fingerprint(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(canonical(payload))).digest("hex");
}

function partnerAuthorized(request: NextRequest) {
  const key = process.env.SOURCE_INGEST_API_KEY;
  if (!key) return { ok: false as const, status: 503, error: "Partner ingestion is not configured." };
  if (request.headers.get("authorization") !== `Bearer ${key}`) {
    return { ok: false as const, status: 401, error: "Unauthorized partner source." };
  }
  return { ok: true as const };
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * POST /api/integrations/signals
 *
 * Server-to-server ingestion for approved agency/partner sources. The shared
 * secret is never accepted from query parameters or browser state. Signals are
 * stored immutably and are not treated as model-training labels.
 */
export async function POST(request: NextRequest) {
  const auth = partnerAuthorized(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const signalType = String(body.signalType || "").toUpperCase();
  if (!SIGNAL_TYPES.has(signalType)) {
    return NextResponse.json({ error: "Unsupported signalType." }, { status: 400 });
  }

  const observedAt = new Date(body.observedAt);
  if (Number.isNaN(observedAt.getTime())) {
    return NextResponse.json({ error: "observedAt must be a valid timestamp." }, { status: 400 });
  }

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "expiresAt must be a valid timestamp." }, { status: 400 });
  }

  const latitude = finiteNumber(body.latitude);
  const longitude = finiteNumber(body.longitude);
  const numericValue = finiteNumber(body.numericValue);
  const sourceName = String(body.sourceName || "").trim();
  const authority = body.authority ? String(body.authority).trim() : null;
  const severity = body.severity ? String(body.severity).toUpperCase() : null;
  const area = body.area ? String(body.area).trim() : null;

  if (!sourceName) return NextResponse.json({ error: "sourceName is required." }, { status: 400 });

  if (signalType === "OFFICIAL_ADVISORY" && (!authority || !severity || !area)) {
    return NextResponse.json(
      { error: "Official advisories require authority, severity and area." },
      { status: 400 },
    );
  }

  if (signalType === "WATER_LEVEL" && numericValue === null) {
    return NextResponse.json({ error: "Water-level signals require numericValue." }, { status: 400 });
  }

  let deviceId: string | null = null;
  if (body.device) {
    const device = body.device as Record<string, any>;
    const externalId = String(device.externalId || "").trim();
    const sourceType = String(device.sourceType || "").toUpperCase();
    const deviceLat = finiteNumber(device.latitude);
    const deviceLon = finiteNumber(device.longitude);
    const provider = String(device.provider || sourceName).trim();
    const name = String(device.name || externalId).trim();

    if (!externalId || !DEVICE_TYPES.has(sourceType) || deviceLat === null || deviceLon === null || !provider || !name) {
      return NextResponse.json({ error: "Invalid device registration payload." }, { status: 400 });
    }

    const registered = await prisma.sourceDevice.upsert({
      where: { externalId },
      update: {
        name,
        sourceType,
        provider,
        latitude: deviceLat,
        longitude: deviceLon,
        status: "ACTIVE",
        lastSeenAt: observedAt,
        metadata: device.metadata ?? undefined,
      },
      create: {
        externalId,
        name,
        sourceType,
        provider,
        latitude: deviceLat,
        longitude: deviceLon,
        lastSeenAt: observedAt,
        metadata: device.metadata ?? undefined,
      },
      select: { id: true },
    });
    deviceId = registered.id;
  }

  const immutablePayload = {
    signalType,
    severity,
    observedAt: observedAt.toISOString(),
    expiresAt: expiresAt?.toISOString() ?? null,
    latitude,
    longitude,
    area,
    numericValue,
    unit: body.unit ? String(body.unit) : null,
    sourceName,
    authority,
    deviceExternalId: body.device?.externalId ? String(body.device.externalId) : null,
    externalEventId: body.externalEventId ? String(body.externalEventId) : null,
  };
  const hash = fingerprint(immutablePayload);

  try {
    const signal = await prisma.externalSignal.create({
      data: {
        signalType,
        severity,
        observedAt,
        expiresAt,
        latitude,
        longitude,
        area,
        numericValue,
        unit: body.unit ? String(body.unit) : null,
        sourceName,
        authority,
        deviceId,
        fingerprint: hash,
        rawPayload: body,
      },
      select: {
        id: true,
        signalType: true,
        observedAt: true,
        severity: true,
        fingerprint: true,
        deviceId: true,
      },
    });
    return NextResponse.json({ accepted: true, signal }, { status: 201 });
  } catch (error: any) {
    if (String(error?.code) === "P2002") {
      return NextResponse.json({ accepted: true, duplicate: true, fingerprint: hash }, { status: 200 });
    }
    console.error("External source ingestion failed", error);
    return NextResponse.json(
      { error: "Source ingestion storage is unavailable. Confirm the external-signal migration is applied." },
      { status: 503 },
    );
  }
}

/**
 * GET /api/integrations/signals
 * Enterprise-only operational inspection of recent partner signals. This does
 * not expose the server-to-server ingest secret or raw payload bodies.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { plan: true },
  });
  if (!account || account.plan !== "ENTERPRISE") {
    return NextResponse.json({ error: "Enterprise access required." }, { status: 403 });
  }

  try {
    const now = new Date();
    const signals = await prisma.externalSignal.findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { observedAt: "desc" },
      take: 200,
      select: {
        id: true,
        signalType: true,
        severity: true,
        observedAt: true,
        expiresAt: true,
        latitude: true,
        longitude: true,
        area: true,
        numericValue: true,
        unit: true,
        sourceName: true,
        authority: true,
        fingerprint: true,
        device: {
          select: {
            externalId: true,
            name: true,
            sourceType: true,
            provider: true,
            status: true,
            lastSeenAt: true,
          },
        },
      },
    });

    return NextResponse.json({ checkedAt: now.toISOString(), signals });
  } catch {
    return NextResponse.json(
      { error: "Partner signal storage is not available until its database migration is applied." },
      { status: 503 },
    );
  }
}
