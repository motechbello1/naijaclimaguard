import { createHash, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const KEY_PREFIX = "ncg_int_";

export function hashIntelligenceKey(plaintext: string) {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function issueIntelligenceKeyMaterial() {
  const secret = randomBytes(32).toString("base64url");
  const plaintext = `${KEY_PREFIX}${secret}`;
  return {
    plaintext,
    keyHash: hashIntelligenceKey(plaintext),
    keyPrefix: plaintext.slice(0, 16),
  };
}

export async function createIntelligenceCredential(input: {
  sourceSlug: string;
  name: string;
  scopes?: string[];
}) {
  const source = await prisma.intelligenceSource.findUnique({ where: { slug: input.sourceSlug } });
  if (!source) throw new Error(`Unknown intelligence source: ${input.sourceSlug}`);

  const material = issueIntelligenceKeyMaterial();
  const scopes = input.scopes?.length ? input.scopes : ["ingest"];

  await prisma.intelligenceCredential.create({
    data: {
      sourceId: source.id,
      name: input.name,
      keyPrefix: material.keyPrefix,
      keyHash: material.keyHash,
      scopes: scopes as Prisma.InputJsonValue,
    },
  });

  // The plaintext is intentionally returned only at creation time. The database
  // retains only the SHA-256 hash and a short display prefix.
  return { key: material.plaintext, keyPrefix: material.keyPrefix, scopes };
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export type IntelligenceAuthResult =
  | {
      ok: true;
      credentialId: string;
      source: {
        id: string;
        slug: string;
        provider: string;
        name: string;
        active: boolean;
      };
      scopes: string[];
    }
  | { ok: false; status: 401 | 403 | 503; error: string };

export async function authenticateIntelligenceRequest(
  request: Request,
  requiredScope = "ingest"
): Promise<IntelligenceAuthResult> {
  if (process.env.PLATFORM_V3_INGESTION_ENABLED !== "true") {
    return { ok: false, status: 503, error: "Platform-v3 ingestion is not enabled." };
  }

  const token = bearerToken(request);
  if (!token) return { ok: false, status: 401, error: "Bearer service credential required." };

  const keyHash = hashIntelligenceKey(token);
  const credential = await prisma.intelligenceCredential.findUnique({
    where: { keyHash },
    include: { source: true },
  });

  if (!credential || !credential.active) {
    return { ok: false, status: 401, error: "Invalid or inactive service credential." };
  }
  if (!credential.source.active) {
    return { ok: false, status: 403, error: "Registered intelligence source is disabled." };
  }

  const scopes = Array.isArray(credential.scopes)
    ? credential.scopes.filter((scope): scope is string => typeof scope === "string")
    : [];
  if (!scopes.includes(requiredScope)) {
    return { ok: false, status: 403, error: `Credential lacks required scope: ${requiredScope}` };
  }

  await prisma.intelligenceCredential.update({
    where: { id: credential.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    ok: true,
    credentialId: credential.id,
    source: {
      id: credential.source.id,
      slug: credential.source.slug,
      provider: credential.source.provider,
      name: credential.source.name,
      active: credential.source.active,
    },
    scopes,
  };
}
