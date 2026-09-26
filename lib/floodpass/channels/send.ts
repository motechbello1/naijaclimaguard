import { atConfigured, makeCall, sendSms } from "@/lib/floodpass/channels/africastalking";
import { isNigerianPhone, smsSafe } from "@/lib/floodpass/channels/phone";
import { insideServiceWindow, sendWhatsAppTemplate, sendWhatsAppText, whatsappConfigured } from "@/lib/floodpass/whatsapp";

/**
 * One way to reach a person, whatever channel they joined on.
 *   WhatsApp: free text inside 24 hours of their last message, otherwise an
 *             approved template (Meta's rule), otherwise SMS as a fallback.
 *   SMS and USSD users: SMS (USSD cannot push messages).
 *   Voice users: a phone call; the voice callback reads the waiting message.
 */

export type DeliveryStatus = "SENT" | "FAILED" | "DRY_RUN";
export type DeliveryChannel = "whatsapp" | "whatsapp_template" | "sms" | "voice" | "none";
export type Delivery = { channel: DeliveryChannel; status: DeliveryStatus; error?: string };

export type Reachable = {
  channel: string;
  address: string;
  phone: string | null;
  language: string;
  lastInboundAt: Date | null;
};

export type TemplateKey = "warning" | "pass_ready" | "safe" | "drain_verified";

/** Template names as submitted to Meta. Pidgin uses a separate template written in Pidgin (language code "en"). */
export function templateName(key: TemplateKey, lang: string) {
  const envName = `WHATSAPP_TEMPLATE_${key.toUpperCase()}`;
  const base = process.env[envName]?.trim() || `floodpass_${key}`;
  return lang === "pcm" ? `${base}_pcm` : base;
}

function outcome(channel: DeliveryChannel, result: { sent: boolean; dryRun: boolean; error?: string }): Delivery {
  if (result.dryRun) return { channel, status: "DRY_RUN" };
  return result.sent ? { channel, status: "SENT" } : { channel, status: "FAILED", error: result.error };
}

export async function sendToContact(contact: Reachable, text: string, template?: { key: TemplateKey; params: string[] }): Promise<Delivery> {
  const phone = contact.phone ?? (contact.channel === "whatsapp" ? `+${contact.address.replace(/[^0-9]/g, "")}` : null);
  switch (contact.channel) {
    case "whatsapp": {
      if (!phone) return { channel: "none", status: "FAILED", error: "No phone number." };
      if (insideServiceWindow(contact.lastInboundAt)) return outcome("whatsapp", await sendWhatsAppText(phone, text));
      if (template && whatsappConfigured()) {
        const sent = await sendWhatsAppTemplate(phone, templateName(template.key, contact.language), "en", template.params);
        if (sent.sent || !atConfigured() || !isNigerianPhone(phone)) return outcome("whatsapp_template", sent);
      }
      if (atConfigured() && isNigerianPhone(phone)) return outcome("sms", await sendSms(phone, smsSafe(text)));
      if (!whatsappConfigured()) return { channel: "whatsapp", status: "DRY_RUN" };
      return { channel: "whatsapp", status: "FAILED", error: "Outside WhatsApp's 24-hour window and no template or SMS available." };
    }
    case "sms":
    case "ussd": {
      if (!phone) return { channel: "none", status: "FAILED", error: "No phone number." };
      return outcome("sms", await sendSms(phone, smsSafe(text)));
    }
    case "voice": {
      if (!phone) return { channel: "none", status: "FAILED", error: "No phone number." };
      return outcome("voice", await makeCall(phone));
    }
    default:
      return { channel: "none", status: "DRY_RUN" };
  }
}

/** For people who are not FloodPass contacts, like family numbers: SMS first (works on every phone), else WhatsApp template. */
export async function sendToPhone(phone: string, text: string, template?: { key: TemplateKey; params: string[]; lang?: string }): Promise<Delivery> {
  if (atConfigured() && isNigerianPhone(phone)) return outcome("sms", await sendSms(phone, smsSafe(text)));
  if (template && whatsappConfigured()) return outcome("whatsapp_template", await sendWhatsAppTemplate(phone, templateName(template.key, template.lang ?? "en"), "en", template.params));
  return { channel: "none", status: "DRY_RUN" };
}

/** Rings a number (Family Plus night call). The voice callback reads the waiting warning. */
export async function callPhone(phone: string): Promise<Delivery> {
  return outcome("voice", await makeCall(phone));
}
