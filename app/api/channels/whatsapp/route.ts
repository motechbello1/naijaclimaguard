import { NextResponse } from "next/server";
import { handleInbound } from "@/lib/floodpass/conversation-runner";
import { parseWebhook, sendWhatsAppText, validSignature } from "@/lib/floodpass/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Meta calls this once to confirm the webhook belongs to us. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (expected && params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === expected) {
    return new NextResponse(params.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Verification failed." }, { status: 403 });
}

/** Every message a person sends to the FloodPass WhatsApp number arrives here. */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  // Fail closed: without the app secret we cannot tell Meta's calls from a stranger's.
  if (!secret) return NextResponse.json({ error: "WHATSAPP_APP_SECRET is not configured." }, { status: 503 });
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }

  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  for (const item of parseWebhook(payload)) {
    const replies = await handleInbound("whatsapp", item.from, item.message);
    for (const reply of replies) await sendWhatsAppText(item.from, reply);
  }
  // Always 200 so Meta does not retry and send duplicates.
  return NextResponse.json({ ok: true });
}
