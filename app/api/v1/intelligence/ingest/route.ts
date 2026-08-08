import { NextResponse } from "next/server";
import { authenticateIntelligenceRequest } from "@/lib/intelligence/auth";
import { normalizeObservation } from "@/lib/intelligence/normalize";
import { persistCanonicalObservations } from "@/lib/intelligence/persistence";
import { QualityStatus } from "@/lib/intelligence/types";

export const dynamic = "force-dynamic";

const MAX_RECORDS = 500;
const QUALITY = new Set<QualityStatus>(["good", "suspect", "stale", "missing", "unknown"]);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("observation must be a JSON object");
  }
  return value as Record<string, unknown>;
}

function metadata(value: unknown) {
  if (value == null) return undefined;
  const obj = asRecord(value);
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(obj)) {
    if (item == null || ["string", "number", "boolean"].includes(typeof item)) {
      clean[key] = item as string | number | boolean | null;
    } else {
      throw new Error(`metadata.${key} must be a primitive JSON value`);
    }
  }
  return clean;
}

export async function POST(request: Request) {
  let auth;
  try {
    auth = await authenticateIntelligenceRequest(request, "ingest");
  } catch (error) {
    console.error("Platform-v3 ingestion auth/storage error", error);
    return NextResponse.json(
      { error: "Platform-v3 ingestion storage is not ready." },
      { status: 503 }
    );
  }

  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const root = asRecord(body);
  const rawObservations = root.observations;
  if (!Array.isArray(rawObservations) || rawObservations.length === 0) {
    return NextResponse.json({ error: "observations must be a non-empty array." }, { status: 400 });
  }
  if (rawObservations.length > MAX_RECORDS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_RECORDS} observations per request.` },
      { status: 413 }
    );
  }

  const accepted = [];
  const rejected: Array<{ index: number; error: string }> = [];
  const receivedAt = new Date();

  for (let index = 0; index < rawObservations.length; index++) {
    try {
      const raw = asRecord(rawObservations[index]);
      const location = asRecord(raw.location);
      const rawQuality = raw.qualityStatus == null ? "unknown" : String(raw.qualityStatus).toLowerCase();
      if (!QUALITY.has(rawQuality as QualityStatus)) {
        throw new Error(`unsupported qualityStatus: ${raw.qualityStatus}`);
      }

      const flags = raw.flags == null
        ? undefined
        : Array.isArray(raw.flags) && raw.flags.every((x) => typeof x === "string")
          ? (raw.flags as string[])
          : (() => { throw new Error("flags must be an array of strings"); })();

      const observation = normalizeObservation({
        sourceKind: auth.source.sourceKind,
        provider: auth.source.provider,
        sourceId: auth.source.slug,
        variable: String(raw.variable ?? ""),
        value: raw.value as number | string | boolean,
        unit: raw.unit == null ? undefined : String(raw.unit),
        observedAt: String(raw.observedAt ?? ""),
        receivedAt,
        location: {
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          name: location.name == null ? undefined : String(location.name),
          state: location.state == null ? undefined : String(location.state),
          country: location.country == null ? undefined : String(location.country),
        },
        qualityStatus: rawQuality as QualityStatus,
        confidence: raw.confidence == null ? undefined : Number(raw.confidence),
        flags,
        sourceVersion: raw.sourceVersion == null ? undefined : String(raw.sourceVersion),
        externalRecordId: raw.externalRecordId == null ? undefined : String(raw.externalRecordId),
        metadata: metadata(raw.metadata),
      });

      accepted.push(observation);
    } catch (error) {
      rejected.push({
        index,
        error: error instanceof Error ? error.message : "Invalid observation",
      });
    }
  }

  if (!accepted.length) {
    return NextResponse.json(
      { error: "No valid observations supplied.", rejected },
      { status: 400 }
    );
  }

  try {
    const persisted = await persistCanonicalObservations(auth.source.slug, accepted);
    return NextResponse.json(
      {
        source: {
          slug: auth.source.slug,
          provider: auth.source.provider,
          kind: auth.source.sourceKind,
        },
        received: rawObservations.length,
        valid: accepted.length,
        rejected,
        persisted,
        decisionStatus: "evidence_only",
        note: "Ingestion stores evidence only; it does not assign a flood warning or probability.",
      },
      { status: persisted.inserted > 0 ? 201 : 200 }
    );
  } catch (error) {
    console.error("Platform-v3 ingestion persistence error", error);
    return NextResponse.json(
      { error: "Platform-v3 ingestion persistence is unavailable." },
      { status: 503 }
    );
  }
}
