import { NextResponse } from "next/server";
import { fetchDerivedV2Risk } from "@/lib/risk/derived-v2";
import { findOfficialSafetyState } from "@/lib/intelligence/official-advisory";
import { classifyAssistantQuestion, getStaticAssistantAnswer } from "@/lib/assistant/knowledge";
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

  if (topic === "current") {
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      const prompts: Record<AppLocale, string> = {
        en: "I can explain live risk, but I need a location. Use the ‘Check risk near me’ button so your browser can share your coordinates for this one check.",
        pcm: "I fit explain live risk, but I need location. Tap ‘Check risk near me’ make your browser share your location for this one check.",
        ha: "Zan iya bayyana hadarin yanzu, amma ina bukatar wuri. Danna ‘Check risk near me’ domin browser ya ba da wurinka don wannan binciken kawai.",
        yo: "Mo lè ṣàlàyé ewu lọwọlọwọ, ṣùgbọ́n mo nílò ibi. Tẹ ‘Check risk near me’ kí browser rẹ fi ipo rẹ fún ìyẹ̀wò yìí nìkan.",
        ig: "Enwere m ike ịkọwa current risk, mana achọrọ m ebe. Pịa ‘Check risk near me’ ka browser kesaa location gị maka check a naanị.",
      };
      return NextResponse.json({ answer: prompts[locale], sourceClass: "live-data-needs-location" });
    }

    try {
      const [risk, official] = await Promise.all([
        fetchDerivedV2Risk(latitude, longitude),
        findOfficialSafetyState(latitude, longitude),
      ]);
      return NextResponse.json({
        answer: currentRiskAnswer(locale, risk.risk.score, risk.risk.level, official),
        sourceClass: "live-platform-data",
        live: { risk: risk.risk, safety_state: official ?? { active: false, level: "NONE" } },
      });
    } catch {
      return NextResponse.json({
        answer: locale === "pcm" ? "Live weather feed no answer now. Try again small time; if official warning dey or you see flood for ground, follow that first." : "The live weather feed is unavailable right now. Try again shortly; if an official warning is active or you can see flooding locally, follow that first.",
        sourceClass: "live-data-unavailable",
      });
    }
  }

  return NextResponse.json({
    answer: getStaticAssistantAnswer(locale, topic),
    sourceClass: topic === "history" ? "curated-historical-context" : topic === "platform" ? "platform-knowledge" : "approved-guidance",
  });
}
