import { askJson } from "@/lib/floodpass/ai/provider";
import type { FpLang } from "@/lib/floodpass/messages";

/**
 * AI job 3: the Chat Helper.
 * Answers flood-safety questions on WhatsApp in simple English or Pidgin.
 * It may only use the facts it is given; it must never invent a warning.
 */

export type HelperContext = {
  placeName: string | null;
  state: string | null;
  currentStatus: string | null; // "DANGER" | "BE_CAREFUL" | "NO_WARNING_YET" | null
  officialWarning: string | null;
};

const SAFETY_FACTS = [
  "Move people first, then valuables, to high ground.",
  "Never walk or drive through moving water; 15 cm of moving water can knock a person down and about 30 cm can float many cars.",
  "Switch off electricity at the main switch if water is coming in and it is safe.",
  "Keep papers, phone and charger in a waterproof bag.",
  "Do not drink flood water; boil or treat water.",
  "After a flood, photograph damage before cleaning, and keep your FloodPass code for your bank, insurer, landlord or a charity.",
  "Emergency number in Nigeria: 112.",
  "Official warnings come from NiMet (weather), NIHSA (rivers and floods) and NEMA (emergencies).",
  "FloodPass: send WATER or a photo to report a flood; send a code to check a FloodPass; send STOP to leave.",
];

function system(lang: FpLang) {
  return [
    "You are the FloodPass helper on WhatsApp in Nigeria.",
    lang === "pcm" ? "Answer in simple Nigerian Pidgin." : "Answer in very simple English that a child could follow.",
    "Use at most 3 short sentences. No asterisks, no markdown, no emojis.",
    "Only use the facts below and the context. Never invent a warning, a forecast, a number or a phone number.",
    "If the question is not about floods, rain, safety or FloodPass, say you can only help with floods and send HELP for the menu.",
    "If someone is in danger now, tell them to move to high ground and call 112.",
    `Facts: ${SAFETY_FACTS.join(" ")}`,
    'Reply with ONLY JSON: {"answer":"..."}',
  ].join("\n");
}

export async function answerQuestion(question: string, lang: FpLang, context: HelperContext): Promise<string | null> {
  const user = [
    `Question: ${question.slice(0, 400)}`,
    `Context: place=${context.placeName ?? "unknown"}; state=${context.state ?? "unknown"}; status=${context.currentStatus ?? "unknown"}; official warning=${context.officialWarning ?? "none"}.`,
  ].join("\n");
  const raw = await askJson<{ answer?: string }>({ system: system(lang), user, maxTokens: 250, timeoutMs: 12000 });
  const answer = String(raw?.answer ?? "").replace(/\*/g, "").trim();
  if (!answer) return null;
  return answer.slice(0, 600);
}

export function looksLikeQuestion(text: string) {
  const value = text.trim().toLowerCase();
  if (value.length < 8) return false;
  return value.endsWith("?") || /^(what|how|when|where|why|which|who|is|are|can|should|will|do|does|wetin|abeg|please|pls|una|i wan|how i fit)\b/.test(value);
}
