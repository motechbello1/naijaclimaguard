import { createSign } from "crypto";
import type { PublicPass } from "@/lib/floodpass/service";

/**
 * "Save to Google Wallet" for a FloodPass (a Generic pass).
 *
 * Settings (from a Google Cloud service account linked to your Google Wallet issuer account):
 *   GOOGLE_WALLET_ISSUER_ID       the issuer number from the Google Pay and Wallet console
 *   GOOGLE_WALLET_SA_EMAIL        the service account email
 *   GOOGLE_WALLET_SA_PRIVATE_KEY  its private key (PEM; "\n" written as \\n is fine)
 * Until Google approves the issuer for production, only test accounts can save passes.
 */

export function googleWalletConfigured() {
  return Boolean(process.env.GOOGLE_WALLET_ISSUER_ID?.trim() && process.env.GOOGLE_WALLET_SA_EMAIL?.trim() && process.env.GOOGLE_WALLET_SA_PRIVATE_KEY?.trim());
}

function privateKey() {
  return process.env.GOOGLE_WALLET_SA_PRIVATE_KEY!.replace(/\\n/g, "\n");
}

const b64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

/** Signs a JWT with RS256 (what Google Wallet and Google's token service expect). */
export function signJwtRs256(claims: Record<string, unknown>, pem: string) {
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(claims));
  const signer = createSign("RSA-SHA256");
  signer.update(`${head}.${body}`);
  return `${head}.${body}.${signer.sign(pem).toString("base64url")}`;
}

const text = (value: string) => ({ defaultValue: { language: "en", value } });

export function walletIds(code: string, issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim() ?? "") {
  return { classId: `${issuerId}.floodpass_v1`, objectId: `${issuerId}.${code.replace(/[^A-Za-z0-9_.-]/g, "_")}` };
}

export function genericObject(pass: PublicPass, checkUrl: string, baseUrl: string, issuerId?: string) {
  const { classId, objectId } = walletIds(pass.code, issuerId);
  const when = new Date(pass.floodedAt).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });
  return {
    id: objectId,
    classId,
    state: pass.status === "VERIFIED" ? "ACTIVE" : "INACTIVE",
    cardTitle: text("FloodPass"),
    header: text(pass.code),
    subheader: text(pass.status === "VERIFIED" ? "Verified flood proof" : "Cancelled"),
    hexBackgroundColor: "#0a4d8c",
    logo: { sourceUri: { uri: `${baseUrl}/floodpass/logo-660.png` }, contentDescription: text("FloodPass") },
    barcode: { type: "QR_CODE", value: checkUrl, alternateText: pass.code },
    textModulesData: [
      { id: "place", header: "Place", body: `${pass.placeName}${pass.state ? `, ${pass.state}` : ""}` },
      { id: "time", header: "Flood time", body: when },
      { id: "water", header: "Water", body: pass.depthWords },
    ],
    linksModuleData: { uris: [{ uri: checkUrl, description: "Check this FloodPass", id: "check" }] },
  };
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwtRs256(
    { iss: process.env.GOOGLE_WALLET_SA_EMAIL!.trim(), scope: "https://www.googleapis.com/auth/wallet_object.issuer", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 },
    privateKey(),
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Google token ${response.status}`);
  return ((await response.json()) as { access_token: string }).access_token;
}

async function insert(kind: "genericClass" | "genericObject", body: Record<string, unknown>, token: string) {
  const response = await fetch(`https://walletobjects.googleapis.com/walletobjects/v1/${kind}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  // 409 = it already exists, which is fine.
  if (!response.ok && response.status !== 409) throw new Error(`Google Wallet ${kind} ${response.status}`);
}

/**
 * Returns the "Save to Google Wallet" link. Creates the pass on Google first so
 * the link stays short; if that fails, puts the whole pass inside the link.
 */
export async function googleSaveUrl(pass: PublicPass, checkUrl: string, baseUrl: string) {
  const object = genericObject(pass, checkUrl, baseUrl);
  const origins = [new URL(baseUrl).origin];
  const claims = (payload: Record<string, unknown>) => ({
    iss: process.env.GOOGLE_WALLET_SA_EMAIL!.trim(),
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins,
    payload,
  });
  try {
    const token = await accessToken();
    await insert("genericClass", { id: object.classId }, token);
    await insert("genericObject", object, token);
    return `https://pay.google.com/gp/v/save/${signJwtRs256(claims({ genericObjects: [{ id: object.id, classId: object.classId }] }), privateKey())}`;
  } catch {
    return `https://pay.google.com/gp/v/save/${signJwtRs256(claims({ genericClasses: [{ id: object.classId }], genericObjects: [object] }), privateKey())}`;
  }
}
