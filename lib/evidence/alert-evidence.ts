import type { AlertEvaluationResult, AlertRuleForEvaluation } from "@/lib/alerts/engine";
import { appendEvidenceEvent } from "@/lib/evidence/ledger";

function eventMetadata(result: AlertEvaluationResult) {
  return {
    alertId: result.alertId,
    threshold: result.threshold,
    triggerReason: result.triggerReason ?? "model_threshold",
    officialLevel: result.officialSafety?.level ?? null,
    officialAuthority: result.officialSafety?.authority ?? null,
    officialSourceName: result.officialSafety?.sourceName ?? null,
    officialObservedAt: result.officialSafety?.observedAt ?? null,
  };
}

export async function recordAlertEvidence(
  rules: AlertRuleForEvaluation[],
  results: AlertEvaluationResult[],
) {
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
  const writes: Promise<unknown>[] = [];

  for (const result of results) {
    if (result.status !== "triggered") continue;
    const rule = rulesById.get(result.alertId);
    if (!rule) continue;

    const officialTriggered = result.triggerReason === "official_advisory";
    const modelLabel = officialTriggered ? "official-advisory-overlay" : "derived-v2";
    const deliveryState = officialTriggered ? "official_advisory_active" : "threshold_crossed";
    const metadata = eventMetadata(result);

    writes.push(
      appendEvidenceEvent({
        eventType: "WARNING_TRIGGERED",
        userId: result.userId,
        locationId: rule.location.id,
        riskScore: result.score ?? null,
        riskLevel: result.level ?? null,
        modelLabel,
        deliveryState,
        metadata,
      }),
    );

    const deliveredChannels = [
      result.emailStatus === "email_sent" ? "EMAIL" : null,
      result.smsStatus === "sent" ? "SMS" : null,
      result.whatsappStatus === "sent" ? "WHATSAPP" : null,
      result.voiceStatus === "sent" ? "VOICE" : null,
    ].filter((channel): channel is string => Boolean(channel));

    for (const channel of deliveredChannels) {
      writes.push(
        appendEvidenceEvent({
          eventType: "WARNING_DELIVERED",
          userId: result.userId,
          locationId: rule.location.id,
          riskScore: result.score ?? null,
          riskLevel: result.level ?? null,
          modelLabel,
          channel,
          deliveryState: "delivered",
          metadata,
        }),
      );
    }
  }

  const settled = await Promise.allSettled(writes);
  return {
    attempted: writes.length,
    recorded: settled.filter((item) => item.status === "fulfilled").length,
    failed: settled.filter((item) => item.status === "rejected").length,
  };
}
