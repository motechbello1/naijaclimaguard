/**
 * Builds the XML that tells Africa's Talking what to say on a phone call.
 * Pure functions, so every call script can be tested.
 */

export function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type VoiceStep =
  | { say: string }
  | { play: string }
  | { ask: string; callbackUrl: string; numDigits?: number; timeout?: number; finishOnKey?: string }
  | { reject: true };

const VOICE = () => process.env.AT_VOICE_TTS?.trim() || "woman";

/** Speaks slowly and clearly: short sentences, codes read letter by letter. */
export function spellCode(code: string) {
  return code.replace(/-/g, " ").split("").filter((c) => c !== " ").join(", ");
}

export function voiceXml(steps: VoiceStep[]) {
  const parts = steps.map((step) => {
    if ("say" in step) return `<Say voice="${VOICE()}" playBeep="false">${escapeXml(step.say)}</Say>`;
    if ("play" in step) return `<Play url="${escapeXml(step.play)}"/>`;
    if ("reject" in step) return "<Reject/>";
    const attrs = [
      `timeout="${step.timeout ?? 20}"`,
      `finishOnKey="${step.finishOnKey ?? "#"}"`,
      step.numDigits ? `numDigits="${step.numDigits}"` : "",
      `callbackUrl="${escapeXml(step.callbackUrl)}"`,
    ].filter(Boolean).join(" ");
    return `<GetDigits ${attrs}><Say voice="${VOICE()}" playBeep="false">${escapeXml(step.ask)}</Say></GetDigits>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${parts.join("")}</Response>`;
}
