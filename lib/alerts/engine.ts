import { prisma } from "@/lib/db";
import { fetchDerivedV2Risk } from "@/lib/risk/derived-v2";

const NOTIFICATION_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export interface AlertRuleForEvaluation {
  id: string;
  threshold: number;
  channels: string;
  lastNotifiedAt: Date | null;
  location: {
    id: string;
    name: string;
    state: string;
    latitude: number;
    longitude: number;
  };
  user: {
    id: string;
    email: string;
  };
}

export interface AlertEvaluationResult {
  alertId: string;
  userId: string;
  location: string;
  score?: number;
  level?: string;
  threshold: number;
  status:
    | "triggered"
    | "already_notified"
    | "below_threshold"
    | "feed_unreachable";
  emailStatus?:
    | "email_sent"
    | "email_failed"
    | "email_pending_credential"
    | "email_not_selected";
  smsStatus?: "sms_disabled_phone_not_collected" | "sms_not_selected";
  deliveryRecorded?: boolean;
}

function parseChannels(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((channel): channel is string => typeof channel === "string")
      .map((channel) => channel.trim().toUpperCase());
  } catch {
    return [];
  }
}

async function sendEmail(
  to: string,
  locationName: string,
  score: number,
  threshold: number
): Promise<"email_sent" | "email_failed" | "email_pending_credential"> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "email_pending_credential";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.ALERT_FROM_EMAIL ?? "NaijaClimaGuard <onboarding@resend.dev>",
        to: [to],
        subject: `Flood-risk threshold crossed at ${locationName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px">
            <h2 style="color:#EF4444">Flood-Risk Alert — ${locationName}</h2>
            <p>The current NaijaClimaGuard risk index is <strong>${score}/100</strong>, crossing your configured threshold of ${threshold}.</p>
            <p style="color:#555">This index is calculated from current Open-Meteo precipitation, recent rainfall intensity, and evapotranspiration context using the disclosed derived-v2 model.</p>
            <p><a href="https://naijaclimaguard.vercel.app/my-area" style="color:#10B981;font-weight:bold">Open NaijaClimaGuard →</a></p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
            <p style="font-size:12px;color:#999">Decision-support signal only. Follow official NiHSA, NiMet, NEMA, SEMA, and local emergency guidance where applicable.</p>
          </div>`,
      }),
      signal: AbortSignal.timeout(8000),
    });

    return res.ok ? "email_sent" : "email_failed";
  } catch {
    return "email_failed";
  }
}

function coordinateKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

/**
 * Evaluate alert rules against the exact same derived-v2 model used by the
 * public risk API. Weather requests are deduplicated by coordinate for the
 * duration of this evaluation batch.
 */
export async function evaluateAlertRules(
  rules: AlertRuleForEvaluation[],
  now = new Date()
): Promise<AlertEvaluationResult[]> {
  const weatherByCoordinate = new Map<string, ReturnType<typeof fetchDerivedV2Risk>>();

  const riskFor = (latitude: number, longitude: number) => {
    const key = coordinateKey(latitude, longitude);
    let request = weatherByCoordinate.get(key);
    if (!request) {
      request = fetchDerivedV2Risk(latitude, longitude);
      weatherByCoordinate.set(key, request);
    }
    return request;
  };

  const results: AlertEvaluationResult[] = [];

  for (const alert of rules) {
    const channels = parseChannels(alert.channels);
    let risk;

    try {
      risk = await riskFor(alert.location.latitude, alert.location.longitude);
    } catch {
      results.push({
        alertId: alert.id,
        userId: alert.user.id,
        location: alert.location.name,
        threshold: alert.threshold,
        status: "feed_unreachable",
      });
      continue;
    }

    const score = risk.risk.score;
    const crossed = score >= alert.threshold;
    const recentlyNotified = Boolean(
      alert.lastNotifiedAt && now.getTime() - alert.lastNotifiedAt.getTime() < NOTIFICATION_COOLDOWN_MS
    );

    if (!crossed) {
      results.push({
        alertId: alert.id,
        userId: alert.user.id,
        location: alert.location.name,
        score,
        level: risk.risk.level,
        threshold: alert.threshold,
        status: "below_threshold",
      });
      continue;
    }

    if (recentlyNotified) {
      results.push({
        alertId: alert.id,
        userId: alert.user.id,
        location: alert.location.name,
        score,
        level: risk.risk.level,
        threshold: alert.threshold,
        status: "already_notified",
      });
      continue;
    }

    const wantsEmail = channels.includes("EMAIL");
    const wantsSms = channels.includes("SMS");
    const emailStatus = wantsEmail
      ? await sendEmail(alert.user.email, alert.location.name, score, alert.threshold)
      : "email_not_selected";
    const smsStatus = wantsSms
      ? "sms_disabled_phone_not_collected"
      : "sms_not_selected";

    // Only claim a notification happened when a real delivery channel succeeded.
    // This prevents a missing/failed email credential from suppressing retries for 12h.
    const deliveryRecorded = emailStatus === "email_sent";
    if (deliveryRecorded) {
      await prisma.alert.update({
        where: { id: alert.id },
        data: { lastNotifiedAt: now },
      });
    }

    results.push({
      alertId: alert.id,
      userId: alert.user.id,
      location: alert.location.name,
      score,
      level: risk.risk.level,
      threshold: alert.threshold,
      status: "triggered",
      emailStatus,
      smsStatus,
      deliveryRecorded,
    });
  }

  return results;
}

export async function getActiveAlertRulesForUser(email: string): Promise<AlertRuleForEvaluation[]> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      alerts: {
        where: { active: true },
        include: { location: true },
      },
    },
  });

  if (!user) return [];
  return user.alerts.map((alert) => ({
    id: alert.id,
    threshold: alert.threshold,
    channels: alert.channels,
    lastNotifiedAt: alert.lastNotifiedAt,
    location: alert.location,
    user: { id: user.id, email: user.email },
  }));
}

export async function getActiveAlertRulesForBackground(limit = 250): Promise<AlertRuleForEvaluation[]> {
  const alerts = await prisma.alert.findMany({
    where: { active: true },
    orderBy: { updatedAt: "asc" },
    take: Math.max(1, Math.min(limit, 1000)),
    include: { location: true, user: true },
  });

  return alerts.map((alert) => ({
    id: alert.id,
    threshold: alert.threshold,
    channels: alert.channels,
    lastNotifiedAt: alert.lastNotifiedAt,
    location: alert.location,
    user: { id: alert.user.id, email: alert.user.email },
  }));
}
