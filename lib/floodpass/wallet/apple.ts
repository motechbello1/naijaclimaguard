import { createHash } from "crypto";
import forge from "node-forge";
import type { PublicPass } from "@/lib/floodpass/service";
import { WALLET_IMAGES } from "@/lib/floodpass/wallet-assets";
import { zipStore } from "@/lib/floodpass/wallet/zip";

/**
 * "Add to Apple Wallet" for a FloodPass (.pkpass file).
 *
 * Settings (from an Apple Developer account, Pass Type ID certificate):
 *   APPLE_PASS_TYPE_ID        for example pass.app.floodpass
 *   APPLE_TEAM_ID             the 10-character team ID
 *   APPLE_PASS_CERT_PEM       the Pass Type ID certificate (PEM, or the PEM base64-encoded)
 *   APPLE_PASS_KEY_PEM        its private key (PEM, or base64 of it)
 *   APPLE_PASS_KEY_PASSPHRASE only if the key has a password
 *   APPLE_WWDR_CERT_PEM       Apple's WWDR intermediate certificate (G4)
 */

export function appleWalletConfigured() {
  return ["APPLE_PASS_TYPE_ID", "APPLE_TEAM_ID", "APPLE_PASS_CERT_PEM", "APPLE_PASS_KEY_PEM", "APPLE_WWDR_CERT_PEM"].every((key) => Boolean(process.env[key]?.trim()));
}

/** Accepts a PEM as-is, with \n written out, or base64-encoded. */
export function readPem(value: string) {
  const raw = value.trim().replace(/\\n/g, "\n");
  if (raw.includes("-----BEGIN")) return raw;
  return Buffer.from(raw, "base64").toString("utf8");
}

export function passJson(pass: PublicPass, checkUrl: string, ids: { passTypeIdentifier: string; teamIdentifier: string }) {
  const when = new Date(pass.floodedAt).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });
  return {
    formatVersion: 1,
    passTypeIdentifier: ids.passTypeIdentifier,
    serialNumber: pass.code,
    teamIdentifier: ids.teamIdentifier,
    organizationName: "FloodPass",
    description: `FloodPass ${pass.code}: verified flood proof`,
    logoText: "FloodPass",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(10, 77, 140)",
    labelColor: "rgb(219, 234, 254)",
    voided: pass.status !== "VERIFIED",
    generic: {
      primaryFields: [{ key: "code", label: pass.status === "VERIFIED" ? "VERIFIED FLOODPASS" : "CANCELLED", value: pass.code }],
      secondaryFields: [{ key: "place", label: "PLACE", value: `${pass.placeName}${pass.state ? `, ${pass.state}` : ""}` }],
      auxiliaryFields: [
        { key: "time", label: "FLOOD TIME", value: when },
        { key: "water", label: "WATER", value: pass.depthWords },
      ],
      backFields: [
        { key: "check", label: "Check this FloodPass", value: checkUrl },
        { key: "about", label: "What this is", value: "Proof that a flood reached this place at this time, checked by weather data, neighbours, photos, official warnings and flood history, and locked in the FloodPass Flood Record." },
      ],
    },
    barcodes: [{ format: "PKBarcodeFormatQR", message: checkUrl, messageEncoding: "iso-8859-1", altText: pass.code }],
    barcode: { format: "PKBarcodeFormatQR", message: checkUrl, messageEncoding: "iso-8859-1", altText: pass.code },
  };
}

/** SHA-1 of every file, as Apple requires in manifest.json. */
export function manifestFor(files: Record<string, Uint8Array>) {
  return Object.fromEntries(Object.entries(files).map(([name, data]) => [name, createHash("sha1").update(data).digest("hex")]));
}

/** Detached PKCS#7 signature of manifest.json, with the WWDR certificate included. */
export function signManifest(manifest: Uint8Array, certPem: string, keyPem: string, wwdrPem: string, passphrase?: string) {
  const certificate = forge.pki.certificateFromPem(certPem);
  const wwdr = forge.pki.certificateFromPem(wwdrPem);
  const key = passphrase ? forge.pki.decryptRsaPrivateKey(keyPem, passphrase) : forge.pki.privateKeyFromPem(keyPem);
  if (!key) throw new Error("Could not read the Apple pass key (wrong passphrase?).");
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(Buffer.from(manifest).toString("binary"), "raw");
  p7.addCertificate(certificate);
  p7.addCertificate(wwdr);
  p7.addSigner({
    key,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      // Left empty on purpose: node-forge fills in the signing time itself.
      { type: forge.pki.oids.signingTime },
    ],
  });
  p7.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), "binary");
}

export function buildPkpass(pass: PublicPass, checkUrl: string, keys: { passTypeIdentifier: string; teamIdentifier: string; certPem: string; keyPem: string; wwdrPem: string; passphrase?: string }) {
  const files: Record<string, Uint8Array> = {
    "pass.json": Buffer.from(JSON.stringify(passJson(pass, checkUrl, keys)), "utf8"),
  };
  for (const [name, b64] of Object.entries(WALLET_IMAGES)) files[name] = Buffer.from(b64, "base64");
  const manifest = Buffer.from(JSON.stringify(manifestFor(files)), "utf8");
  const signature = signManifest(manifest, keys.certPem, keys.keyPem, keys.wwdrPem, keys.passphrase);
  return zipStore([
    ...Object.entries(files).map(([name, data]) => ({ name, data })),
    { name: "manifest.json", data: manifest },
    { name: "signature", data: signature },
  ]);
}

export function pkpassFromSettings(pass: PublicPass, checkUrl: string) {
  return buildPkpass(pass, checkUrl, {
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID!.trim(),
    teamIdentifier: process.env.APPLE_TEAM_ID!.trim(),
    certPem: readPem(process.env.APPLE_PASS_CERT_PEM!),
    keyPem: readPem(process.env.APPLE_PASS_KEY_PEM!),
    wwdrPem: readPem(process.env.APPLE_WWDR_CERT_PEM!),
    passphrase: process.env.APPLE_PASS_KEY_PASSPHRASE?.trim() || undefined,
  });
}
