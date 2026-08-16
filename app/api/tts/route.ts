import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED = new Set(["en", "pcm", "ha", "yo", "ig"]);
const HF_MODEL = process.env.NCG_HF_TTS_MODEL?.trim() || "Axiveri/WazobiaVoice";
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

function hfToken() {
  return process.env.NCG_HF_TOKEN?.trim() || process.env.HF_TOKEN?.trim() || process.env.HUGGINGFACE_API_TOKEN?.trim() || "";
}

function configuredProvider() {
  if (process.env.NCG_NEURAL_TTS_URL?.trim()) return "dedicated";
  if (hfToken()) return "huggingface";
  return null;
}

export async function GET() {
  const provider = configuredProvider();
  return NextResponse.json({
    available: Boolean(provider),
    provider,
    model: provider === "huggingface" ? HF_MODEL : provider ? "configured-neural-endpoint" : null,
    languages: ["en", "pcm", "ha", "yo", "ig"],
    deviceSpeech: false,
  }, { headers: { "Cache-Control": "no-store" } });
}

async function callDedicated(endpoint: string, text: string, locale: string, signal: AbortSignal, requestedVoice?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = process.env.NCG_NEURAL_TTS_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(endpoint, {
    method: "POST",
    headers,
    signal,
    cache: "no-store",
    body: JSON.stringify({
      text,
      language_id: locale,
      voice: requestedVoice || VOICE_BY_LOCALE[locale],
      format: "wav",
    }),
  });
}

async function callHuggingFace(text: string, locale: string, signal: AbortSignal) {
  const token = hfToken();
  if (!token) throw new Error("HF_TOKEN_MISSING");
  const endpoint = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(HF_MODEL).replace(/%2F/g, "/")}`;
  return fetch(endpoint, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "audio/wav,audio/*,application/octet-stream",
    },
    cache: "no-store",
    body: JSON.stringify({
      inputs: text,
      parameters: {
        language_id: locale,
        voice: VOICE_BY_LOCALE[locale],
      },
      options: { wait_for_model: true, use_cache: false },
    }),
  });
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

  const dedicated = process.env.NCG_NEURAL_TTS_URL?.trim();
  const provider = dedicated ? "dedicated" : hfToken() ? "huggingface" : null;
  if (!provider) {
    return NextResponse.json({ error: "Voice is temporarily unavailable.", code: "NEURAL_TTS_NOT_CONFIGURED" }, { status: 503 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const upstream = dedicated
      ? await callDedicated(dedicated, text, locale, controller.signal, payload?.voice)
      : await callHuggingFace(text, locale, controller.signal);

    if (!upstream.ok) {
      const contentType = upstream.headers.get("content-type") || "";
      let detail = "";
      if (contentType.includes("json") || contentType.includes("text")) detail = (await upstream.text()).slice(0, 400);
      return NextResponse.json({ error: "Voice generation is temporarily unavailable.", detail, provider }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") || "audio/wav";
    const bytes = await upstream.arrayBuffer();
    if (!bytes.byteLength) return NextResponse.json({ error: "Voice service returned empty audio." }, { status: 502 });

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType.startsWith("audio/") || contentType.includes("octet-stream") ? contentType : "audio/wav",
        "Cache-Control": "private, max-age=0, no-store",
        "X-NaijaClimaGuard-Voice": VOICE_BY_LOCALE[locale] || "default",
        "X-NaijaClimaGuard-TTS-Provider": provider,
      },
    });
  } catch (error: any) {
    const timedOut = error?.name === "AbortError";
    return NextResponse.json({ error: timedOut ? "Voice generation took too long. Please try again." : "Voice is temporarily unavailable." }, { status: timedOut ? 504 : 502 });
  } finally {
    clearTimeout(timeout);
  }
}
