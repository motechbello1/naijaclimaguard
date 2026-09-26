import { NextResponse } from "next/server";
import { handleInbound, joinForSms } from "@/lib/floodpass/conversation-runner";
import { callbackAllowed, readCallback, sendSms } from "@/lib/floodpass/channels/africastalking";
import { smsSafe } from "@/lib/floodpass/channels/phone";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Incoming SMS from Africa's Talking (set this URL, with ?key=AT_CALLBACK_SECRET,
 * as the SMS callback for your short code or number). Same conversation as
 * WhatsApp, but people type their area instead of sending a pin.
 */
export async function POST(req: Request) {
  const allowed = callbackAllowed(req.url);
  if (allowed === "not-configured") return NextResponse.json({ error: "AT_CALLBACK_SECRET is not configured." }, { status: 503 });
  if (allowed === "denied") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readCallback(req);
  const from = body.from ?? "";
  const text = (body.text ?? "").slice(0, 500);
  if (!from) return NextResponse.json({ ok: true });

  const replies = await handleInbound("sms", from, { kind: "text", text, at: new Date().toISOString() });
  for (const reply of joinForSms(replies)) await sendSms(from, smsSafe(reply));
  return NextResponse.json({ ok: true });
}
