export type DeliveryChannel = "SMS" | "WHATSAPP" | "VOICE";
export type DeliveryResult =
  | { status: "sent"; provider: string; externalId?: string }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

function envFor(channel: DeliveryChannel) {
  const prefix = channel === "WHATSAPP" ? "WHATSAPP" : channel;
  return {
    url: process.env[`${prefix}_PROVIDER_URL`],
    token: process.env[`${prefix}_PROVIDER_TOKEN`],
    provider: process.env[`${prefix}_PROVIDER_NAME`] || "configured-webhook",
  };
}

/**
 * Provider-neutral delivery contract. A configured provider receives a POST with
 * channel, destination and message. NaijaClimaGuard only reports `sent` when the
 * provider returns 2xx. No provider credentials means `not_configured`, never a
 * fake success.
 */
export async function sendLastMileMessage(input: {
  channel: DeliveryChannel;
  to: string;
  message: string;
  language?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<DeliveryResult> {
  const config = envFor(input.channel);
  if (!config.url || !config.token) return { status: "not_configured" };

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: input.channel,
        to: input.to,
        message: input.message,
        language: input.language || "ENGLISH",
        metadata: input.metadata || {},
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { status: "failed", error: `Provider returned HTTP ${response.status}` };
    }

    let externalId: string | undefined;
    try {
      const data = await response.json();
      if (data && typeof data === "object") {
        const candidate = (data as Record<string, unknown>).id ?? (data as Record<string, unknown>).messageId;
        if (candidate != null) externalId = String(candidate);
      }
    } catch {
      // A 2xx provider response without JSON still counts as accepted.
    }

    return { status: "sent", provider: config.provider, externalId };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Delivery provider request failed",
    };
  }
}
