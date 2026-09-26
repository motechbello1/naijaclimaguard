import { NextResponse } from "next/server";
import { callbackAllowed, readCallback } from "@/lib/floodpass/channels/africastalking";
import { handleUssd } from "@/lib/floodpass/ussd-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * USSD callback from Africa's Talking (for example *384*1234#). Set this URL,
 * with ?key=AT_CALLBACK_SECRET, as the USSD callback. Reply is plain text that
 * starts with CON (show more) or END (finish). Networks give about 20 seconds.
 */
export async function POST(req: Request) {
  const allowed = callbackAllowed(req.url);
  if (allowed !== "ok") return new NextResponse("END FloodPass is not available right now.", { status: allowed === "denied" ? 401 : 503, headers: { "Content-Type": "text/plain" } });
  const body = await readCallback(req);
  const reply = await handleUssd({ sessionId: body.sessionId ?? "", phoneNumber: body.phoneNumber ?? "", text: body.text ?? "" });
  return new NextResponse(reply, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
