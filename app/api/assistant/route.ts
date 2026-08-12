import { NextResponse } from "next/server";
import { fetchDerivedV2Risk } from "@/lib/risk/derived-v2";
import { findOfficialSafetyState } from "@/lib/intelligence/official-advisory";
import { classifyAssistantQuestion, getAssistantSuggestions, getStaticAssistantAnswer, type AssistantTopic } from "@/lib/assistant/knowledge";
import { isAppLocale, type AppLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

type AssistantRequest = {
  message?: string;
  locale?: AppLocale;
  latitude?: number;
  longitude?: number;
};

function currentRiskAnswer(locale: AppLocale, score: number, level: string, official: any) {
  const officialActive = Boolean(official?.active);
  const prefix: Record<AppLocale, string> = {
    en: officialActive ? "An official warning is active near this location. Follow the issuing authority now." : "I did not find a fresh connected official advisory near this location.",
    pcm: officialActive ? "Official warning dey active near this place. Follow wetin the authority talk now." : "I no see fresh connected official warning near this place.",
    ha: officialActive ? "Akwai gargadin hukuma mai aiki kusa da wannan wurin. Bi umarnin hukumar yanzu." : "Ban samu sabon gargadin hukuma da aka hada kusa da wannan wurin ba.",
    yo: officialActive ? "Ìkìlọ̀ ìjọba ń ṣiṣẹ́ nítòsí ibi yìí. Tẹ̀lé ìtọ́sọ́nà aláṣẹ báyìí." : "Mi ò rí ìkìlọ̀ ìjọba tuntun tí a so mọ́ ibi yìí.",
    ig: officialActive ? "Ịdọ aka ná ntị gọọmenti dị irè nso ebe a. Soro ntuziaka nke authority ugbu a." : "Ahụghị m official warning ọhụrụ ejikọrọ nso ebe a.",
  };

  const body: Record<AppLocale, string> = {
    en: `The current NaijaClimaGuard derived-v2 risk index is ${score}/100 (${level}). This is a rainfall-based decision-support score, not a guarantee that flooding will or will not happen. Visible local flooding and official instructions always take priority.`,
    pcm: `Current NaijaClimaGuard derived-v2 risk index na ${score}/100 (${level}). Na rainfall-based decision-support score be this; e no mean say flood must happen or no fit happen. Wetin you see for ground and official instruction get priority.`,
    ha: `Makin hadarin NaijaClimaGuard derived-v2 na yanzu shi ne ${score}/100 (${level}). Wannan maki ne na taimakon yanke shawara da ya dogara da ruwan sama; ba tabbacin cewa ambaliya za ta faru ko ba za ta faru ba. Abin da ake gani a wurin da umarnin hukuma sun fi muhimmanci.`,
    yo: `Mákì ewu NaijaClimaGuard derived-v2 lọwọlọwọ jẹ́ ${score}/100 (${level}). Mákì yìí dá lórí òjò fún ìrànlọ́wọ́ ìpinnu; kò jẹ́ ìdánilójú pé ìkún omi yóò ṣẹlẹ̀ tàbí kò ní ṣẹlẹ̀. Ohun tí o rí ní agbègbè àti ìtọ́sọ́nà ìjọba ló ga jù.`,
    ig: `Current NaijaClimaGuard derived-v2 risk index bụ ${score}/100 (${level}). Nke a bụ rainfall-based decision-support score; ọ bụghị nkwa na idei mmiri ga-eme ma ọ bụ agaghị eme. Ihe ị na-ahụ n'ebe ahụ na official instructions ka mkpa.`,
  };

  return `${prefix[locale]}\n\n${body[locale]}`;
}

function riverineWatchAnswer(locale: AppLocale, topic: "platform" | "model") {
  const model: Record<AppLocale, string> = {
    en: "Riverine Watch v1 is NaijaClimaGuard's separate 14-day riverine flood-onset shadow model for Lokoja and Makurdi. It uses the 30 complete NASA GPM IMERG Early rainfall days before the issue date plus matching Copernicus CEMS GloFAS operational river-discharge forecasts at +24, +48 and +72 hours. It returns NORMAL, MONITOR or WATCH, with a frozen WATCH threshold of 0.70. In retrospective testing it detected 4 of 5 eligible historical flood-onset events, an 80% event-detection rate. That is not 80% accuracy, not a national result, and not yet prospective public-warning validation. The general public live risk score remains the separate derived-v2 engine. Official warnings and visible flooding always take priority.",
    pcm: "Riverine Watch v1 na separate 14-day river-flood onset shadow model for Lokoja and Makurdi. E use 30 complete NASA IMERG Early rainfall days before issue date plus matching GloFAS operational river-discharge forecast for +24, +48 and +72 hours. E return NORMAL, MONITOR or WATCH, and WATCH threshold na 0.70. For retrospective test, e detect 4 out of 5 eligible historical flood-onset events, meaning 80% event detection. No call am 80% accuracy, e no be national result, and e never be prospective public-warning validation. General public live score still use separate derived-v2 engine. Official warning and flood wey you see for ground get priority.",
    ha: "Riverine Watch v1 wani shadow model ne daban na kwanaki 14 domin gano yiwuwar fara ambaliyar kogi a Lokoja da Makurdi. Yana amfani da cikakkun kwanaki 30 na NASA GPM IMERG Early kafin ranar fitar da model da kuma GloFAS operational river-discharge forecasts na +24, +48 da +72 hours. Yana bada NORMAL, MONITOR ko WATCH, tare da WATCH threshold 0.70. A gwajin tarihi ya gano 4 daga cikin 5 eligible flood-onset events, wato 80% event detection. Wannan ba 80% accuracy ba ne, ba sakamakon kasa baki daya ba ne, kuma ba prospective public-warning validation ba ne tukuna. Public live score har yanzu derived-v2 ne daban. Gargadin hukuma da ambaliyar da ake gani sun fi muhimmanci.",
    yo: "Riverine Watch v1 jẹ́ shadow model ọ̀tọ̀ fún ọjọ́ 14 láti tọ́pa ààmì ìbẹ̀rẹ̀ ìkún omi odò ní Lokoja àti Makurdi. Ó lo ọjọ́ 30 tí ó pé ti NASA GPM IMERG Early ṣáájú ọjọ́ model àti GloFAS operational river-discharge forecasts fún +24, +48 àti +72 hours. Ó ń dá NORMAL, MONITOR tàbí WATCH padà, pẹ̀lú WATCH threshold 0.70. Nínú retrospective testing, ó rí 4 nínú 5 eligible historical flood-onset events, ìyẹn 80% event detection. Èyí kì í ṣe 80% accuracy, kì í ṣe national result, kò sì tíì jẹ́ prospective public-warning validation. Public live score ṣi jẹ́ derived-v2 tó yàtọ̀. Ìkìlọ̀ ìjọba àti ìkún omi tí a rí níbi gidi ló ga jù.",
    ig: "Riverine Watch v1 bụ shadow model dị iche maka ụbọchị 14 iji chọpụta ihe ngosi flood onset n'osimiri na Lokoja na Makurdi. Ọ na-eji ụbọchị 30 zuru ezu nke NASA GPM IMERG Early rainfall tupu issue date yana GloFAS operational river-discharge forecasts nke +24, +48 na +72 hours. Ọ na-enye NORMAL, MONITOR ma ọ bụ WATCH, na WATCH threshold bụ 0.70. Na retrospective testing, ọ chọpụtara 4 n'ime 5 eligible historical flood-onset events, ya bụ 80% event detection. Nke a abụghị 80% accuracy, ọ bụghị national result, ma ọ bụghịkwa prospective public-warning validation ugbu a. Public live score ka bụ derived-v2 engine dị iche. Official warnings na flood ị na-ahụ n'ebe ahụ ka mkpa.",
  };

  if (topic === "model") return model[locale];

  const platformLead: Record<AppLocale, string> = {
    en: "NaijaClimaGuard is a Nigeria-focused flood-risk and early-action platform. It combines the derived-v2 public live risk engine, saved-location monitoring, official-advisory safety overlays, alerts, Action OS guidance, reporting and auditable evidence. ",
    pcm: "NaijaClimaGuard na Nigeria flood-risk and early-action platform. E combine derived-v2 public live risk, saved-location monitoring, official warning overlay, alerts, Action OS guidance, reports and evidence. ",
    ha: "NaijaClimaGuard dandali ne na Najeriya domin bayanin hadarin ambaliya da daukar mataki da wuri. Yana hada derived-v2 public live risk, saved-location monitoring, gargadin hukuma, alerts, Action OS guidance, reports da auditable evidence. ",
    yo: "NaijaClimaGuard jẹ́ pẹpẹ Nàìjíríà fún ewu ìkún omi àti ìgbésẹ̀ kíákíá. Ó darapọ̀ derived-v2 public live risk, saved-location monitoring, ìkìlọ̀ ìjọba, alerts, Action OS guidance, reports àti auditable evidence. ",
    ig: "NaijaClimaGuard bụ platform Nigeria maka flood risk na early action. Ọ jikọtara derived-v2 public live risk, saved-location monitoring, official advisory overlays, alerts, Action OS guidance, reports na auditable evidence. ",
  };
  return `${platformLead[locale]}${model[locale]}`;
}

function sourceClassFor(topic: AssistantTopic) {
  if (topic === "history") return "curated historical context";
  if (["platform", "report", "alerts", "model", "limitations"].includes(topic)) return "platform knowledge";
  if (["flood_definition", "causes", "types"].includes(topic)) return "flood education";
  if (topic === "fallback") return "needs clarification";
  return "approved guidance";
}

export async function POST(req: Request) {
  let body: AssistantRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = String(body.message || "").trim().slice(0, 1200);
  const locale: AppLocale = isAppLocale(body.locale) ? body.locale : "en";
  if (!message) return NextResponse.json({ error: "Ask a question first." }, { status: 400 });

  const topic = classifyAssistantQuestion(message);

  if (topic === "platform" || topic === "model") {
    return NextResponse.json({
      answer: riverineWatchAnswer(locale, topic),
      sourceClass: "platform knowledge",
      topic,
      suggestions: getAssistantSuggestions(locale, topic),
    });
  }

  if (topic === "current") {
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      const prompts: Record<AppLocale, string> = {
        en: "I can explain live risk, but I need a location. Use Check risk near me so your browser can share your coordinates for this one check.",
        pcm: "I fit explain live risk, but I need location. Tap Check risk near me make your browser share your location for this one check.",
        ha: "Zan iya bayyana hadarin yanzu, amma ina bukatar wuri. Danna Check risk near me domin browser ya ba da wurinka don wannan binciken kawai.",
        yo: "Mo lè ṣàlàyé ewu lọwọlọwọ, ṣùgbọ́n mo nílò ibi. Tẹ Check risk near me kí browser rẹ fi ipo rẹ fún ìyẹ̀wò yìí nìkan.",
        ig: "Enwere m ike ịkọwa current risk, mana achọrọ m ebe. Pịa Check risk near me ka browser kesaa location gị maka check a naanị.",
      };
      return NextResponse.json({ answer: prompts[locale], sourceClass: "live data needs location", topic, suggestions: getAssistantSuggestions(locale, topic) });
    }

    try {
      const [risk, official] = await Promise.all([
        fetchDerivedV2Risk(latitude, longitude),
        findOfficialSafetyState(latitude, longitude),
      ]);
      return NextResponse.json({
        answer: currentRiskAnswer(locale, risk.risk.score, risk.risk.level, official),
        sourceClass: "live platform data",
        topic,
        suggestions: getAssistantSuggestions(locale, topic),
        live: { risk: risk.risk, safety_state: official ?? { active: false, level: "NONE" } },
      });
    } catch {
      const unavailable: Record<AppLocale, string> = {
        en: "The live weather feed is unavailable right now. Try again shortly. If an official warning is active or you can see flooding locally, follow that first.",
        pcm: "Live weather feed no answer now. Try again small time. If official warning dey or you see flood for ground, follow that first.",
        ha: "Bayanan yanayi na live ba su samuwa yanzu. Sake gwadawa nan gaba kadan. Idan akwai gargadin hukuma ko kana ganin ambaliya a wurinka, bi wannan da farko.",
        yo: "Live weather feed kò sí ní akoko yìí. Tún gbìyànjú laipẹ. Tí ìkìlọ̀ ìjọba bá wà tàbí o rí ìkún omi ní agbègbè rẹ, tẹ̀lé èyí kọ́kọ́.",
        ig: "Live weather feed adịghị ugbu a. Nwaa ọzọ obere oge. Ọ bụrụ na official warning dị ma ọ bụ ị na-ahụ flood n'ebe gị, soro nke ahụ mbụ.",
      };
      return NextResponse.json({ answer: unavailable[locale], sourceClass: "live data unavailable", topic, suggestions: getAssistantSuggestions(locale, topic) });
    }
  }

  return NextResponse.json({
    answer: getStaticAssistantAnswer(locale, topic),
    sourceClass: sourceClassFor(topic),
    topic,
    suggestions: getAssistantSuggestions(locale, topic),
  });
}
