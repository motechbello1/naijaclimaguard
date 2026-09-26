import { NextResponse } from "next/server";
import { callbackAllowed, readCallback } from "@/lib/floodpass/channels/africastalking";
import { handleVoice } from "@/lib/floodpass/voice-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Voice callback from Africa's Talking. Set this URL, with ?key=AT_CALLBACK_SECRET,
 * as the voice callback for the FloodPass phone number. It answers people who
 * call us and reads warnings to people we call.
 */
export async function POST(req: Request) {
  const allowed = callbackAllowed(req.url);
  if (allowed !== "ok") return new NextResponse("", { status: allowed === "denied" ? 401 : 503 });
  const url = new URL(req.url);
  const body = await readCallback(req);
  const next = (step: string) => {
    const target = new URL(url.toString());
    target.searchParams.set("step", step);
    return target.toString();
  };
  const xml = await handleVoice(
    {
      isActive: body.isActive ?? "1",
      sessionId: body.sessionId,
      direction: body.direction,
      callerNumber: body.callerNumber,
      destinationNumber: body.destinationNumber,
      dtmfDigits: body.dtmfDigits,
    },
    url.searchParams.get("step"),
    next,
  );
  return new NextResponse(xml, { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
