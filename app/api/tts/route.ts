import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED = new Set(["en", "pcm", "ha", "yo", "ig"]);
const HF_MODEL = process.env.NCG_HF_TTS_MODEL?.trim() || "Axiveri/WazobiaVoice";
const WAZOBIA_SPACE = "https://ememzyvisuals-wazobiavoice-demo.hf.space";
const WAZOBIA_API_NAME = "generate_tts_audio";
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
  return "wazobia-space-preview";
}

export async function GET() {
  const provider = configuredProvider();
  return NextResponse.json({
    available: true,
    provider,
    model: provider === "huggingface" ? HF_MODEL : provider === "wazobia-space-preview" ? "Axiveri/WazobiaVoice via public ZeroGPU demo" : "configured-neural-endpoint",
    languages: ["en", "pcm", "ha", "yo", "ig"],
    deviceSpeech: false,
    previewFallback: provider === "wazobia-space-preview",
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
      parameters: { language_id: locale, voice: VOICE_BY_LOCALE[locale] },
      options: { wait_for_model: true, use_cache: false },
    }),
  });
}

function extractCompleteData(sse: string): any[] | null {
  const blocks = sse.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    if (!/^event:\s*complete\s*$/m.test(block)) continue;
    const lines = block.split(/\r?\n/).filter((line) => line.startsWith("data:"));
    if (!lines.length) continue;
    const raw = lines.map((line) => line.slice(5).trimStart()).join("\n");
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return null;
    }
  }
  return null;
}

function findAudioUrl(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("/")) return `${WAZOBIA_SPACE}${value}`;
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAudioUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const key of ["url", "download_url"]) {
      const candidate = value[key];
      if (typeof candidate === "string") {
        if (/^https?:\/\//i.test(candidate)) return candidate;
        if (candidate.startsWith("/")) return `${WAZOBIA_SPACE}${candidate}`;
      }
    }
    const path = value.path || value.name;
    if (typeof path === "string" && path.trim()) {
      if (/^https?:\/\//i.test(path)) return path;
      if (path.startsWith("/gradio_api/") || path.startsWith("/file=")) return `${WAZOBIA_SPACE}${path}`;
      return `${WAZOBIA_SPACE}/gradio_api/file=${encodeURIComponent(path)}`;
    }
    for (const nested of Object.values(value)) {
      const found = findAudioUrl(nested);
      if (found) return found;
    }
  }
  return null;
}

async function callWazobiaSpace(text: string, locale: string, signal: AbortSignal) {
  // The public demo function itself caps a single generation at 300 characters.
  // The browser chunks longer selected sections and plays them sequentially.
  const submit = await fetch(`${WAZOBIA_SPACE}/gradio_api/call/${WAZOBIA_API_NAME}`, {
    method: "POST",
    signal,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [text.slice(0, 290), locale, null, 0.5, 0.8, 0, 0.5],
    }),
  });
  if (!submit.ok) return submit;
  const submitted: any = await submit.json();
  if (!submitted?.event_id) throw new Error("WAZOBIA_EVENT_ID_MISSING");

  const result = await fetch(`${WAZOBIA_SPACE}/gradio_api/call/${WAZOBIA_API_NAME}/${encodeURIComponent(submitted.event_id)}`, {
    method: "GET",
    signal,
    cache: "no-store",
    headers: { Accept: "text/event-stream" },
  });
  if (!result.ok) return result;
  const sse = await result.text();
  if (/^event:\s*error\s*$/m.test(sse)) throw new Error("WAZOBIA_GENERATION_ERROR");
  const complete = extractCompleteData(sse);
  const audioUrl = findAudioUrl(complete);
  if (!audioUrl) throw new Error("WAZOBIA_AUDIO_URL_MISSING");

  return fetch(audioUrl, { method: "GET", signal, cache: "no-store" });
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
  const provider = configuredProvider();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), provider === "wazobia-space-preview" ? 110_000 : 55_000);

  try {
    const upstream = dedicated
      ? await callDedicated(dedicated, text, locale, controller.signal, payload?.voice)
      : hfToken()
        ? await callHuggingFace(text, locale, controller.signal)
        : await callWazobiaSpace(text, locale, controller.signal);

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
    return NextResponse.json({
      error: timedOut ? "Voice generation is taking longer than expected. Please try again." : "Voice is temporarily unavailable.",
      code: error?.message || "TTS_ERROR",
      provider,
    }, { status: timedOut ? 504 : 502 });
  } finally {
    clearTimeout(timeout);
  }
}
