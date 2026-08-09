import { prisma } from "@/lib/db";
import { fetchDerivedV2Risk } from "@/lib/risk/derived-v2";
import { findOfficialSafetyState, OfficialSafetyState } from "@/lib/intelligence/official-advisory";
import { DeliveryChannel, sendLastMileMessage } from "@/lib/delivery/provider";

const NOTIFICATION_COOLDOWN_MS = 12 * 60 * 60 * 1000;

interface DeliveryPreferenceForAlert {
  phoneE164: string | null;
  phoneVerifiedAt: Date | null;
  preferredLanguage: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  voiceEnabled: boolean;
}

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
    deliveryPreference?: DeliveryPreferenceForAlert | null;
  };
}

export type LastMileStatus =
  | "sent"
  | "failed"
  | "not_configured"
  | "not_selected"
  | "unverified_phone"
  | "disabled_by_preference";

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
    | "email_disabled_by_preference"
    | "email_not_selected";
  smsStatus?: LastMileStatus;
  whatsappStatus?: LastMileStatus;
  voiceStatus?: LastMileStatus;
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
        `Current NaijaClimaGuard risk is ${score}/100, above your warning level of ${threshold}.`,
        "Check the app for the action steps for this place.",
        "Always follow official emergency instructions and visible local conditions.",
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

function lastMileText(
  locationName: string,
  score: number,
  official: OfficialSafetyState | null,
) {
  if (official) {
    return `${official.headline} for ${locationName}. ${official.instruction} Authority: ${official.authority}. Follow official emergency instructions now.`;
  }
  return `NaijaClimaGuard flood warning for ${locationName}. Risk is ${score}/100. Open NaijaClimaGuard for your action steps and follow official emergency instructions.`;
}

async function deliverPhoneChannel(input: {
  selected: boolean;
  enabled: boolean;
  channel: DeliveryChannel;
  preference?: DeliveryPreferenceForAlert | null;
  message: string;
  location: string;
  triggerReason: "model_threshold" | "official_advisory";
}): Promise<LastMileStatus> {
  if (!input.selected) return "not_selected";
  if (!input.enabled) return "disabled_by_preference";
  const phone = input.preference?.phoneE164;
  if (!phone || !input.preference?.phoneVerifiedAt) return "unverified_phone";

  const result = await sendLastMileMessage({
    channel: input.channel,
    to: phone,
    message: input.message,
    language: input.preference.preferredLanguage,
    metadata: {
      purpose: "flood_alert",
      location: input.location,
      triggerReason: input.triggerReason,
      templateLanguage: "ENGLISH",
      preferredLanguage: input.preference.preferredLanguage,
    },
  });
  return result.status;
}

function coordinateKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

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

    const preference = alert.user.deliveryPreference;
    const wantsEmail = channels.includes("EMAIL");
    const emailAllowed = preference?.emailEnabled ?? true;
    const emailStatus = !wantsEmail
      ? "email_not_selected"
      : !emailAllowed
        ? "email_disabled_by_preference"
        : await sendEmail(alert.user.email, alert.location.name, score, alert.threshold, official);

    const message = lastMileText(alert.location.name, score, official);
    const smsStatus = await deliverPhoneChannel({
      selected: channels.includes("SMS"),
      enabled: preference?.smsEnabled ?? false,
      channel: "SMS",
      preference,
      message,
      location: alert.location.name,
      triggerReason,
    });
    const whatsappStatus = await deliverPhoneChannel({
      selected: channels.includes("WHATSAPP"),
      enabled: preference?.whatsappEnabled ?? false,
      channel: "WHATSAPP",
      preference,
      message,
      location: alert.location.name,
      triggerReason,
    });
    const voiceStatus = await deliverPhoneChannel({
      selected: channels.includes("VOICE"),
      enabled: preference?.voiceEnabled ?? false,
      channel: "VOICE",
      preference,
      message,
      location: alert.location.name,
      triggerReason,
    });

    const deliveryRecorded =
      emailStatus === "email_sent" ||
      smsStatus === "sent" ||
      whatsappStatus === "sent" ||
      voiceStatus === "sent";

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
      whatsappStatus,
      voiceStatus,
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
      deliveryPreference: true,
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
    user: { id: user.id, email: user.email, deliveryPreference: user.deliveryPreference },
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
    include: { location: true, user: { include: { deliveryPreference: true } } },
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
      user: {
        id: alert.user.id,
        email: alert.user.email,
        deliveryPreference: alert.user.deliveryPreference,
      },
    })),
  };
}
