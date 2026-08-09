import type { AlertEvaluationResult, AlertRuleForEvaluation } from "@/lib/alerts/engine";
import { appendEvidenceEvent } from "@/lib/evidence/ledger";

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

    writes.push(
      appendEvidenceEvent({
        eventType: "WARNING_TRIGGERED",
        userId: result.userId,
        locationId: rule.location.id,
        riskScore: result.score ?? null,
        riskLevel: result.level ?? null,
        modelLabel: "derived-v2",
        deliveryState: "threshold_crossed",
        metadata: {
          alertId: result.alertId,
          threshold: result.threshold,
        },
      }),
    );

    if (result.deliveryRecorded && result.emailStatus === "email_sent") {
      writes.push(
        appendEvidenceEvent({
          eventType: "WARNING_DELIVERED",
          userId: result.userId,
          locationId: rule.location.id,
          riskScore: result.score ?? null,
          riskLevel: result.level ?? null,
          modelLabel: "derived-v2",
          channel: "EMAIL",
          deliveryState: "delivered",
          metadata: {
            alertId: result.alertId,
            threshold: result.threshold,
          },
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
