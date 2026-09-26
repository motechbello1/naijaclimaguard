import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { signValue } from "@/lib/floodpass/identity";

/**
 * Private photo store for flood proof and Drain Heroes.
 *
 * Where photos live:
 *   - Supabase Storage (a PRIVATE bucket) when SUPABASE_URL and
 *     SUPABASE_SERVICE_ROLE_KEY are set. Bucket name: FLOODPASS_PHOTO_BUCKET
 *     (default "floodpass-photos"). Best for scale.
 *   - Otherwise inside the database (FloodPhoto.bytes). Fine for a pilot:
 *     phone photos are shrunk to about 100 KB first.
 *
 * Rules:
 *   - Nobody gets a public link. A viewer gets a signed link that dies after
 *     a few minutes (partners checking a FloodPass, the founder).
 *   - STOP deletes every photo a person sent.
 *   - Every photo is deleted after 2 years (FLOODPASS_PHOTO_DAYS to change).
 */

export type PhotoKind = "FLOOD" | "DRAIN_BEFORE" | "DRAIN_AFTER" | "VAULT";

const MAX_BYTES = 2_000_000;

function keepDays() {
  const days = Number(process.env.FLOODPASS_PHOTO_DAYS);
  return Number.isFinite(days) && days >= 1 ? Math.min(days, 3650) : 730;
}

function bucket() {
  return process.env.FLOODPASS_PHOTO_BUCKET?.trim() || "floodpass-photos";
}

export function supabaseStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function storageHeaders(extra: Record<string, string> = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  return { Authorization: `Bearer ${key}`, apikey: key, ...extra };
}

function storageBase() {
  return `${process.env.SUPABASE_URL!.trim().replace(/\/+$/, "")}/storage/v1`;
}

function extensionFor(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

export function sha256Hex(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Saves one photo. Returns null if it is too big or empty. Never throws for storage trouble; it falls back to the database. */
export async function savePhoto(input: {
  bytes: Uint8Array;
  mimeType: string;
  kind: PhotoKind;
  ownerKey: string;
  reportId?: string | null;
  drainId?: string | null;
}): Promise<{ id: string; sha256: string } | null> {
  if (!input.bytes.length || input.bytes.length > MAX_BYTES) return null;
  const sha256 = sha256Hex(input.bytes);
  const deleteAfter = new Date(Date.now() + keepDays() * 86_400_000);
  const mimeType = /^image\/(jpeg|png|webp)$/.test(input.mimeType) ? input.mimeType : "image/jpeg";

  let storage: "database" | "supabase" = "database";
  let storageKey: string | null = null;
  if (supabaseStorageConfigured()) {
    const now = new Date();
    const key = `${input.kind.toLowerCase()}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(12).toString("hex")}.${extensionFor(mimeType)}`;
    try {
      const response = await fetch(`${storageBase()}/object/${bucket()}/${key}`, {
        method: "POST",
        headers: storageHeaders({ "Content-Type": mimeType, "x-upsert": "false" }),
        body: Buffer.from(input.bytes),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) { storage = "supabase"; storageKey = key; }
    } catch {
      // fall back to the database below
    }
  }

  const row = await prisma.floodPhoto.create({
    data: {
      kind: input.kind,
      ownerKey: input.ownerKey,
      reportId: input.reportId ?? null,
      drainId: input.drainId ?? null,
      sha256,
      mimeType,
      sizeBytes: input.bytes.length,
      storage,
      storageKey,
      bytes: storage === "database" ? Buffer.from(input.bytes) : null,
      deleteAfter,
    },
    select: { id: true },
  });
  return { id: row.id, sha256 };
}

export async function readPhoto(id: string): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const row = await prisma.floodPhoto.findUnique({ where: { id } });
  if (!row || row.deleteAfter.getTime() < Date.now()) return null;
  if (row.storage === "database") return row.bytes ? { bytes: new Uint8Array(row.bytes), mimeType: row.mimeType } : null;
  if (!supabaseStorageConfigured() || !row.storageKey) return null;
  try {
    const response = await fetch(`${storageBase()}/object/${bucket()}/${row.storageKey}`, { headers: storageHeaders(), signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    return { bytes: new Uint8Array(await response.arrayBuffer()), mimeType: row.mimeType };
  } catch {
    return null;
  }
}

async function removeFromStorage(keys: string[]) {
  if (!keys.length || !supabaseStorageConfigured()) return;
  try {
    await fetch(`${storageBase()}/object/${bucket()}`, {
      method: "DELETE",
      headers: storageHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: keys }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // The rows are deleted anyway; a stray file is removed by the expiry sweep of the bucket.
  }
}

/** Deletes every photo one person sent (used when they send STOP). */
export async function deletePhotosForOwner(ownerKey: string) {
  const rows = await prisma.floodPhoto.findMany({ where: { ownerKey }, select: { id: true, storageKey: true } });
  await removeFromStorage(rows.map((row) => row.storageKey).filter((key): key is string => Boolean(key)));
  const deleted = await prisma.floodPhoto.deleteMany({ where: { ownerKey } });
  return deleted.count;
}

/** Deletes photos past their keep-until date. Run by the scheduled job. */
export async function purgeExpiredPhotos(limit = 200) {
  const rows = await prisma.floodPhoto.findMany({ where: { deleteAfter: { lt: new Date() } }, select: { id: true, storageKey: true }, take: limit });
  if (!rows.length) return 0;
  await removeFromStorage(rows.map((row) => row.storageKey).filter((key): key is string => Boolean(key)));
  const deleted = await prisma.floodPhoto.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
  return deleted.count;
}

/** A link to one photo that stops working after ttlSeconds. */
export function signedPhotoPath(id: string, ttlSeconds = 600) {
  const expires = Math.floor(Date.now() / 1000) + Math.max(30, Math.min(ttlSeconds, 3600));
  return `/api/floodpass/photos/${id}?e=${expires}&t=${signValue(`photo:${id}:${expires}`)}`;
}

export function photoLinkValid(id: string, expires: string | null, token: string | null) {
  const e = Number(expires);
  if (!Number.isFinite(e) || e * 1000 < Date.now() || !token) return false;
  const expected = signValue(`photo:${id}:${e}`);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
