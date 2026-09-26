import { askJson } from "@/lib/floodpass/ai/provider";
import { buildWarning, type FpLang, type WarningParts } from "@/lib/floodpass/messages";

/**
 * AI job 4: the Warning Writer.
 * Turns the facts of a warning into a short, natural message for one street.
 * Safety net: the AI's message is used only if it still contains the place,
 * the source and the action. Otherwise the fixed five-part template is used.
 */

function system(lang: FpLang) {
  return [
    "You write flood warnings for FloodPass WhatsApp users in Nigeria.",
    lang === "pcm" ? "Write in simple Nigerian Pidgin." : "Write in very simple English.",
    "Keep all five parts: the danger, the place, what to do, the time, and who said it (in brackets).",
    "Maximum 5 short lines. No asterisks, no markdown, no emojis. Never add facts that are not given. Never say the place is safe.",
    "End with the two given closing lines exactly.",
    'Reply with ONLY JSON: {"message":"..."}',
  ].join("\n");
}

export function acceptable(message: string, parts: WarningParts) {
  const text = message.toLowerCase();
  const mentions = (value: string) => text.includes(value.toLowerCase().slice(0, Math.min(12, value.length)));
  return (
    message.length > 40 &&
    message.length <= 700 &&
    !message.includes("*") &&
    !/\bsafe\b/i.test(message) &&
    mentions(parts.place) &&
    mentions(parts.source)
  );
}

export async function writeWarning(parts: WarningParts, lang: FpLang): Promise<{ message: string; writtenBy: "ai" | "template" }> {
  const template = buildWarning(lang, parts);
  const closing = template.split("\n").slice(-2).join("\n");
  const user = `Facts: ${JSON.stringify(parts)}\nClosing lines:\n${closing}`;
  const raw = await askJson<{ message?: string }>({ system: system(lang), user, maxTokens: 300, timeoutMs: 12000 });
  const message = String(raw?.message ?? "").trim();
  if (message && acceptable(message, parts)) return { message, writtenBy: "ai" };
  return { message: template, writtenBy: "template" };
}
