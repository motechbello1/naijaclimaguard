import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED = new Set(["en", "pcm", "ha", "yo", "ig"]);
const VOICE_BY_LOCALE: Record<string, string> = {
  en: "Amara",
  pcm: "Ngozi",
  ha: "Hauwa",
  yo: "Wura",
  ig: "Adaeze",
};

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .trim()
    .slice(0, 2200);
}

export async function POST(request: NextRequest) {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const text = cleanText(payload?.text);
  const locale = SUPPORTED.has(payload?.locale) ? payload.locale : "en";
  if (!text) return NextResponse.json({ error: "Nothing to read." }, { status: 400 });

  const endpoint = process.env.NCG_NEURAL_TTS_URL?.trim();
  if (!endpoint) {
    return NextResponse.json(
      {
        error: "Neural Nigerian voice service is not connected yet.",
        code: "NEURAL_TTS_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = process.env.NCG_NEURAL_TTS_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    // Contract intentionally matches a WazobiaVoice-style GPU service but remains
    // provider-neutral so a commercially licensed endpoint can be swapped in later.
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      cache: "no-store",
      body: JSON.stringify({
        text,
        language_id: locale,
        voice: payload?.voice || VOICE_BY_LOCALE[locale],
        format: "wav",
      }),
    });

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 400);
      return NextResponse.json(
        { error: "Neural voice generation failed.", detail },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") || "audio/wav";
    const bytes = await upstream.arrayBuffer();
    if (!bytes.byteLength) {
      return NextResponse.json({ error: "Voice service returned empty audio." }, { status: 502 });
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType.startsWith("audio/") ? contentType : "audio/wav",
        "Cache-Control": "private, max-age=0, no-store",
        "X-NaijaClimaGuard-Voice": VOICE_BY_LOCALE[locale] || "default",
      },
    });
  } catch (error: any) {
    const timedOut = error?.name === "AbortError";
    return NextResponse.json(
      { error: timedOut ? "Neural voice service timed out." : "Neural voice service is unavailable." },
      { status: timedOut ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
