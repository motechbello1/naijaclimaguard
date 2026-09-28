import type { AppLocale } from "./config";

export const PRESENTATION_LABEL_COPY: Partial<Record<AppLocale, Record<string, string>>> = {
  pcm: {
    "Flood intelligence for people": "Flood information for everybody",
    "How it works": "How e dey work",
    "Before a flood": "Before flood", "During a flood": "When flood dey", "After a flood": "After flood",
    "Your area": "Your area", "Weather coverage": "Places we dey check weather",
    "Built for people and organisations": "For people and organisations",
    "Welcome back": "Welcome back", "Made for Nigeria": "Made for Nigeria", "Getting ready": "E dey get ready",
  },
  ha: {
    "Flood intelligence for people": "Bayanan ambaliya ga kowa",
    "How it works": "Yadda yake aiki",
    "Before a flood": "Kafin ambaliya", "During a flood": "Lokacin ambaliya", "After a flood": "Bayan ambaliya",
    "Your area": "Yankinka", "Weather coverage": "Yankunan da muke duba yanayi",
    "Built for people and organisations": "Ga mutane da kungiyoyi",
    "Welcome back": "Barka da dawowa", "Made for Nigeria": "An yi don Najeriya", "Getting ready": "Ana shiri",
  },
  yo: {
    "Flood intelligence for people": "Ìmọ̀ nípa ìkún omi fún gbogbo ènìyàn",
    "How it works": "Bí ó ṣe ń ṣiṣẹ́",
    "Before a flood": "Ṣáájú ìkún omi", "During a flood": "Nígbà ìkún omi", "After a flood": "Lẹ́yìn ìkún omi",
    "Your area": "Agbègbè rẹ", "Weather coverage": "Àwọn ibi tí a ń ṣàyẹ̀wò ojú ọjọ́",
    "Built for people and organisations": "Fún àwọn ènìyàn àti àjọ",
    "Welcome back": "Káàbọ̀ padà", "Made for Nigeria": "A ṣe fún Nàìjíríà", "Getting ready": "Ó ń múra sílẹ̀",
  },
  ig: {
    "Flood intelligence for people": "Ozi ide mmiri maka onye ọ bụla",
    "How it works": "Otu o si arụ ọrụ",
    "Before a flood": "Tupu ide mmiri", "During a flood": "Mgbe ide mmiri na-eme", "After a flood": "Mgbe ide mmiri gasịrị",
    "Your area": "Mpaghara gị", "Weather coverage": "Ebe anyị na-enyocha ihu igwe",
    "Built for people and organisations": "Maka ndị mmadụ na ụlọ ọrụ",
    "Welcome back": "Nnọọ ọzọ", "Made for Nigeria": "E mere maka Naịjirịa", "Getting ready": "A na-akwado",
  },
};

// Presentation labels retain the established translations when their English captions change.
export const PRESENTATION_LABEL_SOURCES: Record<string, string> = {
  "Your daily brief": "THE DAILY BRIEF / YOUR PLACE",
  "Weather coverage": "CONNECTED WEATHER CONTEXT",
  "Why NaijaClimaGuard": "THE REASON WE EXIST",
  "The flood record": "THE FLOOD RECORD",
  "What this record means": "NOT A PROMISE OF PAYMENT",
  "Keep exploring": "YOU HAVE REACHED THE END / KEEP EXPLORING",
  "Check a flood record": "THE FLOOD RECORD / OPEN CHECK",
  "Your safety comes first": "PEOPLE FIRST",
  "Membership": "MEMBERSHIP / THE MODEL",
  "Your account": "NAIJACLIMAGUARD / ACCOUNT",
  "The places we protect": "01 / THE PLACES WE PROTECT",
  "Create your account": "START FREE / ONE ACCOUNT",
  "New account": "NEW ACCOUNT"
};

export function sentenceCaseLabel(value: string): string {
  if (value !== value.toLocaleUpperCase()) return value;
  const text = value.toLocaleLowerCase();
  return (text.charAt(0).toLocaleUpperCase() + text.slice(1))
    .replace(/naijaclimaguard/gi, "NaijaClimaGuard")
    .replace(/floodpass/gi, "FloodPass")
    .replace(/\b(lga|fct|sms|ussd|nema|nihsa|nimet)\b/gi, (word) => word.toUpperCase());
}
