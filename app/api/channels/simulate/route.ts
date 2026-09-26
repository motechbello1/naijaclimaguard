import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isFounderSessionUser } from "@/lib/founder-auth";
import { handleInbound } from "@/lib/floodpass/conversation-runner";
import type { Inbound } from "@/lib/floodpass/conversation";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * The founder's on-stage backup: runs the exact WhatsApp conversation from a
 * web screen, for when the live WhatsApp number is not approved yet or the
 * venue network is poor. Founder session or FLOODPASS_DEMO_KEY only.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const demoKey = process.env.FLOODPASS_DEMO_KEY?.trim();
  const allowed = isFounderSessionUser(session?.user as { role?: unknown } | undefined) || (demoKey && req.headers.get("x-floodpass-demo-key") === demoKey);
  if (!allowed) return NextResponse.json({ error: "Founder or demo key only." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const address = `sim-${String(body.from ?? "demo").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40) || "demo"}`;
  const at = new Date().toISOString();
  let message: Inbound;
  if (body.kind === "location" && Number.isFinite(Number(body.latitude)) && Number.isFinite(Number(body.longitude))) {
    message = { kind: "location", latitude: Number(body.latitude), longitude: Number(body.longitude), name: typeof body.name === "string" ? body.name : null, at };
  } else if (body.kind === "image") {
    message = { kind: "image", mediaId: `sim-photo:${Date.now()}`, caption: typeof body.caption === "string" ? body.caption : null, at };
  } else {
    message = { kind: "text", text: String(body.text ?? "").slice(0, 500), at };
  }
  const replies = await handleInbound("simulator", address, message);
  return NextResponse.json({ replies });
}
