/**
 * FloodPass AI: one small door to a language-and-vision model.
 *
 * Choose the model with settings, not code:
 *   FLOODPASS_AI_PROVIDER   "anthropic" (default) or "openai-compatible"
 *   FLOODPASS_AI_API_KEY    the provider key (falls back to ANTHROPIC_API_KEY / OPENAI_API_KEY)
 *   FLOODPASS_AI_MODEL      default "claude-haiku-4-5-20251001" (cheap, sees images)
 *   FLOODPASS_AI_BASE_URL   for openai-compatible providers (OpenAI, OpenRouter, Groq, a self-hosted model, ...)
 *
 * Rules every AI job follows:
 * - AI never decides alone. Its answer is one input to the Truth Engine, and every job
 *   has a plain rule-based fallback that runs when no key is set or the model fails.
 * - Answers must be JSON; anything else is thrown away.
 * - Short timeouts, so a slow model never blocks a warning.
 * - No personal data is sent: no phone numbers, no names.
 */

export type AiImage = { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };

export type AiRequest = {
  system: string;
  user: string;
  image?: AiImage | null;
  /** Several images in order, for example a drain before and after cleaning. */
  images?: AiImage[];
  maxTokens?: number;
  timeoutMs?: number;
};

function provider() {
  return (process.env.FLOODPASS_AI_PROVIDER?.trim().toLowerCase() || "anthropic") as "anthropic" | "openai-compatible";
}

function apiKey() {
  const p = provider();
  return (
    process.env.FLOODPASS_AI_API_KEY?.trim() ||
    (p === "anthropic" ? process.env.ANTHROPIC_API_KEY?.trim() : process.env.OPENAI_API_KEY?.trim()) ||
    ""
  );
}

export function aiModel() {
  return process.env.FLOODPASS_AI_MODEL?.trim() || (provider() === "anthropic" ? "claude-haiku-4-5-20251001" : "gpt-4o-mini");
}

export function aiEnabled() {
  return Boolean(apiKey());
}

/** Pulls the first JSON object or array out of a model's text answer. */
export function extractJson(text: string): unknown {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start < 0) return null;
  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  const end = candidate.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callAnthropic(req: AiRequest): Promise<string | null> {
  const content: Array<Record<string, unknown>> = [];
  for (const image of [...(req.image ? [req.image] : []), ...(req.images ?? [])]) {
    content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } });
  }
  content.push({ type: "text", text: req.user });
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey(), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: aiModel(), max_tokens: req.maxTokens ?? 600, system: req.system, messages: [{ role: "user", content }] }),
    signal: AbortSignal.timeout(req.timeoutMs ?? 15000),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  return json.content?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("") ?? null;
}

async function callOpenAiCompatible(req: AiRequest): Promise<string | null> {
  const base = (process.env.FLOODPASS_AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const userContent: Array<Record<string, unknown>> = [{ type: "text", text: req.user }];
  for (const image of [...(req.image ? [req.image] : []), ...(req.images ?? [])]) {
    userContent.push({ type: "image_url", image_url: { url: `data:${image.mediaType};base64,${image.base64}` } });
  }
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "content-type": "application/json" },
    body: JSON.stringify({ model: aiModel(), max_tokens: req.maxTokens ?? 600, messages: [{ role: "system", content: req.system }, { role: "user", content: userContent }] }),
    signal: AbortSignal.timeout(req.timeoutMs ?? 15000),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? null;
}

/** Asks the model and returns parsed JSON, or null (no key, error, timeout or bad JSON). Never throws. */
export async function askJson<T = unknown>(req: AiRequest): Promise<T | null> {
  if (!aiEnabled()) return null;
  try {
    const text = provider() === "openai-compatible" ? await callOpenAiCompatible(req) : await callAnthropic(req);
    return (text ? extractJson(text) : null) as T | null;
  } catch {
    return null;
  }
}
