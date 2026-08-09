import { prisma } from "@/lib/db";
import { fetchDerivedV2Risk } from "@/lib/risk/derived-v2";
import { findOfficialSafetyState, OfficialSafetyState } from "@/lib/intelligence/official-advisory";

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
  triggerReason?: "model_threshold" | "official_advisory";
  officialSafety?: {
    level: string;
    headline: string;
    authority: string;
    sourceName: string;
    observedAt: string;
  };
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

export interface BackgroundAlertBatch {
  totalActive: number;
  page: number;
  pageCount: number;
  offset: number;
  limit: number;
  rules: AlertRuleForEvaluation[];
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
  threshold: number,
  official: OfficialSafetyState | null,
): Promise<"email_sent" | "email_failed" | "email_pending_credential"> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "email_pending_credential";

  const subject = official
    ? `${official.headline} — ${locationName}`
    : `Flood-risk threshold crossed at ${locationName}`;

  const text = official
    ? [
        `${official.headline} — ${locationName}`,
        official.instruction,
        `Authority: ${official.authority}`,
        `Official level: ${official.rawLevel}`,
        `NaijaClimaGuard model score remains ${score}/100 (configured threshold ${threshold}). The official warning is a separate safety overlay and does not alter that score.`,
        "Follow the issuing authority and verified local emergency instructions.",
      ].join("\n\n")
    : [
        `Flood-risk alert — ${locationName}`,
        `The current NaijaClimaGuard risk index is ${score}/100, crossing your configured threshold of ${threshold}.`,
        "This index is calculated from current Open-Meteo precipitation, recent rainfall intensity, and evapotranspiration context using the disclosed derived-v2 model.",
        "Follow official NiHSA, NiMet, NEMA, SEMA, and local emergency guidance where applicable.",
      ].join("\n\n");

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
        subject,
        text,
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
 * Evaluate alert rules against derived-v2 plus an independent official-safety
 * overlay. An official advisory may trigger a user warning even when the model
 * threshold is not crossed; it never changes the underlying model score.
 */
export async function evaluateAlertRules(
  rules: AlertRuleForEvaluation[],
  now = new Date()
): Promise<AlertEvaluationResult[]> {
  const weatherByCoordinate = new Map<string, ReturnType<typeof fetchDerivedV2Risk>>();
  const officialByCoordinate = new Map<string, ReturnType<typeof findOfficialSafetyState>>();

  const riskFor = (latitude: number, longitude: number) => {
    const key = coordinateKey(latitude, longitude);
    let request = weatherByCoordinate.get(key);
    if (!request) {
      request = fetchDerivedV2Risk(latitude, longitude);
      weatherByCoordinate.set(key, request);
    }
    return request;
  };

  const officialFor = (latitude: number, longitude: number) => {
    const key = coordinateKey(latitude, longitude);
    let request = officialByCoordinate.get(key);
    if (!request) {
      request = findOfficialSafetyState(latitude, longitude);
      officialByCoordinate.set(key, request);
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

    const official = await officialFor(alert.location.latitude, alert.location.longitude).catch(() => null);
    const score = risk.risk.score;
    const crossed = score >= alert.threshold;
    const officialActive = Boolean(official?.active);
    const recentlyNotified = Boolean(
      alert.lastNotifiedAt &&
        now.getTime() - alert.lastNotifiedAt.getTime() < NOTIFICATION_COOLDOWN_MS
    );

    if (!crossed && !officialActive) {
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

    const triggerReason: "model_threshold" | "official_advisory" = officialActive ? "official_advisory" : "model_threshold";
    const officialSafety = official
      ? {
          level: official.level,
          headline: official.headline,
          authority: official.authority,
          sourceName: official.sourceName,
          observedAt: official.observedAt,
        }
      : undefined;

    if (recentlyNotified) {
      results.push({
        alertId: alert.id,
        userId: alert.user.id,
        location: alert.location.name,
        score,
        level: risk.risk.level,
        threshold: alert.threshold,
        triggerReason,
        officialSafety,
        status: "already_notified",
      });
      continue;
    }

    const wantsEmail = channels.includes("EMAIL");
    const wantsSms = channels.includes("SMS");
    const emailStatus = wantsEmail
      ? await sendEmail(alert.user.email, alert.location.name, score, alert.threshold, official)
      : "email_not_selected";
    const smsStatus = wantsSms
      ? "sms_disabled_phone_not_collected"
      : "sms_not_selected";

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
      triggerReason,
      officialSafety,
      status: "triggered",
      emailStatus,
      smsStatus,
      deliveryRecorded,
    });
  }

  return results;
}

export async function getActiveAlertRulesForUser(
  email: string
): Promise<AlertRuleForEvaluation[]> {
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

export async function getBackgroundAlertBatch(
  limit = 250,
  now = new Date()
): Promise<BackgroundAlertBatch> {
  const safeLimit = Math.max(1, Math.min(limit, 1000));
  const totalActive = await prisma.alert.count({ where: { active: true } });
  const pageCount = Math.max(1, Math.ceil(totalActive / safeLimit));
  const hourBucket = Math.floor(now.getTime() / (60 * 60 * 1000));
  const page = hourBucket % pageCount;
  const offset = page * safeLimit;

  const alerts = await prisma.alert.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
    skip: offset,
    take: safeLimit,
    include: { location: true, user: true },
  });

  return {
    totalActive,
    page,
    pageCount,
    offset,
    limit: safeLimit,
    rules: alerts.map((alert) => ({
      id: alert.id,
      threshold: alert.threshold,
      channels: alert.channels,
      lastNotifiedAt: alert.lastNotifiedAt,
      location: alert.location,
      user: { id: alert.user.id, email: alert.user.email },
    })),
  };
}
