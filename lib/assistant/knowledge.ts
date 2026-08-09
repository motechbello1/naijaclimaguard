import type { AppLocale } from "@/lib/i18n/config";

export type AssistantTopic = "platform" | "warning" | "preparedness" | "history" | "current" | "fallback";

const RESPONSES: Record<AppLocale, Record<Exclude<AssistantTopic, "current">, string>> = {
  en: {
    platform: "NaijaClimaGuard is a Nigeria-focused flood-risk and early-action platform. It combines live risk monitoring, saved locations, role-specific action guidance, official advisory overlays, community reports, source-health information, alert delivery, and operational evidence. The live public risk score is still derived-v2; Model v5 is being validated separately and is not used for public alerts yet.",
    warning: "If you receive an official flood warning, treat it as more important than a low app score. Read the instruction, check who issued it, prepare to move people and important items, avoid flooded roads and flowing water, and follow evacuation directions from the responsible authority. NaijaClimaGuard keeps official warnings separate from the numeric model score so one cannot hide the other.",
    preparedness: "Before flooding: know your safest route, keep important documents and medicines easy to carry, move valuables and stock above likely water level, charge phones and power banks, keep emergency contacts available, and check on children, older people, people with disabilities, livestock, and anyone who may need help. Never enter fast-moving floodwater just to protect property.",
    history: "NaijaClimaGuard keeps historical flood information separate from current warnings. For example, the Lokoja 2022 case is being reconstructed from documented flood dates, official hydrological records and archived forecast inputs. Historical records help explain patterns, but they are not the same thing as a current forecast.",
    fallback: "I can help with NaijaClimaGuard, flood warnings, preparedness, historical flood information, current risk explanations, reports, alerts, and how to use the platform. For a live safety decision, use the current risk view and follow any official warning or visible local flooding over chatbot advice.",
  },
  pcm: {
    platform: "NaijaClimaGuard na Nigeria flood-risk and early-action platform. E dey help you check risk for place, save locations, know wetin to do, see official warnings, send alerts, collect community reports and keep record of wetin happen. The live public risk score still dey use derived-v2; Model v5 still dey validation and e never dey control public alerts.",
    warning: "If official flood warning reach you, take am serious even if app score low. Read wetin dem talk, check who send am, prepare people and important things, no drive or waka enter flood water, and follow evacuation instruction from the authority. NaijaClimaGuard no mix official warning inside model score, so one no fit hide the other.",
    preparedness: "Before flood come: know safe road to use, keep documents and medicine where you fit carry quick, move valuable things and stock go higher place, charge phone and power bank, keep emergency contacts, and check children, old people, people wey need help and livestock. No enter fast-moving flood water because of property.",
    history: "NaijaClimaGuard dey separate old flood information from current warning. For example, Lokoja 2022 case dey under proper reconstruction with documented flood dates, official hydrology records and archived forecast data. Old records fit teach us pattern, but dem no be current forecast.",
    fallback: "You fit ask me about NaijaClimaGuard, flood warning, how to prepare, old flood information, current risk explanation, reports, alerts and how to use the platform. For live safety matter, follow official warning and wetin you dey see for your area before chatbot advice.",
  },
  ha: {
    platform: "NaijaClimaGuard dandali ne na Najeriya domin bayanin hadarin ambaliya da daukar mataki da wuri. Yana taimaka wa mai amfani duba hadari, ajiye wurare, samun shawarwarin mataki, ganin sanarwar hukuma, samun gargadi da adana shaidar aiki. Makin hadari na jama'a har yanzu derived-v2 ne; Model v5 yana karkashin tantancewa kuma bai fara aika gargadin jama'a ba.",
    warning: "Idan ka samu gargadin ambaliya daga hukuma, ka dauke shi da muhimmanci ko da makin app ya yi kasa. Karanta umarnin, tabbatar da wanda ya fitar da shi, shirya mutane da muhimman kayayyaki, ka guji hanyoyin da ruwa ya rufe, kuma ka bi umarnin ficewa daga hukumomi. NaijaClimaGuard yana raba gargadin hukuma da makin model domin kada daya ya boye dayan.",
    preparedness: "Kafin ambaliya: san hanyar tsira, ajiye takardu da magunguna a wuri mai saukin dauka, daga kayayyaki masu muhimmanci sama, caji waya da power bank, ajiye lambobin gaggawa, sannan ka duba yara, tsofaffi, masu bukatar taimako da dabbobi. Kada ka shiga ruwa mai gudu domin kare kaya.",
    history: "NaijaClimaGuard yana raba bayanan ambaliya na tarihi da gargadin yanzu. Misali, ana sake nazarin lamarin Lokoja na 2022 ta amfani da ranakun ambaliya da aka tabbatar, bayanan ruwa na hukuma da bayanan hasashe da aka adana. Tarihi yana taimakawa fahimtar tsari, amma ba hasashen yanzu ba ne.",
    fallback: "Za ka iya tambayata game da NaijaClimaGuard, gargadin ambaliya, shiri, bayanan tarihi, bayanin hadarin yanzu, rahoto, sanarwa da yadda ake amfani da dandali. Don yanke shawarar tsaro kai tsaye, bi gargadin hukuma da abin da kake gani a wurinka kafin shawarar chatbot.",
  },
  yo: {
    platform: "NaijaClimaGuard jẹ́ pẹpẹ Nàìjíríà fún ìmọ̀ ewu ìkún omi àti ìgbésẹ̀ kíákíá. Ó ń jẹ́ kí o tọ́pa ewu, fi àwọn ibi pamọ́, gba ìtọ́sọ́nà ìgbésẹ̀, rí ìkìlọ̀ ìjọba, gba ìkìlọ̀, àti pa ẹ̀rí iṣẹ́ mọ́. Mákì ewu ti gbogbo ènìyàn ṣì ń lo derived-v2; Model v5 ṣì wà ní ìdánwò, kò sì ń darí ìkìlọ̀ gbogbo ènìyàn.",
    warning: "Tí o bá gba ìkìlọ̀ ìkún omi láti ọ̀dọ̀ ìjọba, gba a ní pataki paapaa tí mákì app bá kéré. Ka ìtọ́sọ́nà, mọ ẹni tó fi ìkìlọ̀ náà sílẹ̀, mú àwọn ènìyàn àti ohun pataki ṣetan, yago fún opopona tí omi ti bo, kí o sì tẹ̀lé ìtọ́sọ́nà ìkúrò níbi ewu. NaijaClimaGuard yà ìkìlọ̀ ìjọba sílẹ̀ kúrò ní mákì model kí ọ̀kan má bà a bò ekeji.",
    preparedness: "Kí ìkún omi tó dé: mọ ọ̀nà ààbò rẹ, pa ìwé pataki àti oogun síbi tó rọrùn láti gbé, gbe ohun iyebíye àti ọjà sórí ibi gíga, gba fóònù àti power bank, pa nọ́mbà pajawiri mọ́, kí o sì rántí ọmọde, àgbàlagbà, ẹni tó nílò ìrànlọ́wọ́ àti ẹranko. Má wọ omi tó ń ṣàn kíákíá nítorí ohun-ini.",
    history: "NaijaClimaGuard yà ìtàn ìkún omi sílẹ̀ kúrò ní ìkìlọ̀ lọwọlọwọ. Àpẹẹrẹ ni Lokoja 2022, tí a ń tún ṣe ìtúpalẹ̀ rẹ̀ pẹ̀lú ọjọ́ ìkún omi tí a fọwọ́sí, àkọsílẹ̀ omi ìjọba àti data àsọtẹ́lẹ̀ tí a pamọ́. Ìtàn lè kọ́ wa nípa àṣà, ṣùgbọ́n kì í ṣe àsọtẹ́lẹ̀ lọwọlọwọ.",
    fallback: "O lè béèrè lọ́wọ́ mi nípa NaijaClimaGuard, ìkìlọ̀ ìkún omi, bí a ṣe ń mura, ìtàn ìkún omi, ìtumọ̀ ewu lọwọlọwọ, ìròyìn, ìkìlọ̀ àti bí a ṣe ń lo pẹpẹ. Fún ipinnu ààbò gidi, tẹ̀lé ìkìlọ̀ ìjọba àti ohun tí o rí ní agbègbè rẹ ju ìmọ̀ràn chatbot lọ.",
  },
  ig: {
    platform: "NaijaClimaGuard bụ usoro Naịjirịa maka ịmata ihe ize ndụ idei mmiri na ime ihe tupu nsogbu abawanye. Ọ na-enyere gị nyochaa ebe, chekwaa ebe, nweta ndụmọdụ dabere na ụdị onye ọrụ, hụ ịdọ aka ná ntị gọọmenti, nweta ozi ịdọ aka ná ntị ma chekwaa ihe akaebe ọrụ. Public live risk score ka bụ derived-v2; Model v5 ka a na-enyocha ma ọ naghị eziga public alerts ugbu a.",
    warning: "Ọ bụrụ na ị nweta ịdọ aka ná ntị idei mmiri sitere n'aka gọọmenti, were ya kpọrọ ihe ọbụna ma app score dị ala. Gụọ ntuziaka, hụ onye nyere ya, kwadebe mmadụ na ihe dị mkpa, zere ụzọ mmiri kpuchiri, soro ntuziaka ịpụ n'ebe egwu. NaijaClimaGuard na-edobe official warning iche na model score ka otu ghara izochi nke ọzọ.",
    preparedness: "Tupu idei mmiri: mara ụzọ nchekwa, debe akwụkwọ dị mkpa na ọgwụ ebe a ga-eburu ngwa ngwa, bulie ihe bara uru na stock n'elu, chajịa ekwentị na power bank, debe emergency contacts, ma leba anya n'ụmụaka, ndị agadi, ndị chọrọ enyemaka na anụ ụlọ. Abanyela n'ime mmiri na-agba ọsọ iji chekwaa ihe onwunwe.",
    history: "NaijaClimaGuard na-ekewa ozi idei mmiri gara aga na ịdọ aka ná ntị ugbu a. Dịka ọmụmaatụ, a na-enyocha Lokoja 2022 site na ụbọchị idei mmiri edere, hydrology records gọọmenti na archived forecast inputs. Akụkọ gara aga na-enyere nghọta, mana ọ bụghị current forecast.",
    fallback: "Ị nwere ike ịjụ m maka NaijaClimaGuard, flood warnings, nkwadebe, akụkọ idei mmiri, nkọwa current risk, reports, alerts na otu esi eji platform. Maka mkpebi nchekwa ugbu a, soro official warning na ọnọdụ ị na-ahụ n'ebe gị karịa chatbot advice.",
  },
};

export function classifyAssistantQuestion(message: string): AssistantTopic {
  const q = message.toLowerCase();
  if (/current|today|now|my risk|near me|live|yanzu|lọwọlọwọ|ugbu a/.test(q)) return "current";
  if (/warning|alert|evacuat|message|gargadi|ìkìlọ|ịdọ/.test(q)) return "warning";
  if (/prepare|prevent|safe|what should|before flood|shiry|ààbò|nchekwa/.test(q)) return "preparedness";
  if (/history|histor|lokoja|2022|past flood|tarihi|ìtàn|akụkọ/.test(q)) return "history";
  if (/platform|naijaclimaguard|how.*work|feature|account|plan|dashboard/.test(q)) return "platform";
  return "fallback";
}

export function getStaticAssistantAnswer(locale: AppLocale, topic: Exclude<AssistantTopic, "current">) {
  return RESPONSES[locale]?.[topic] || RESPONSES.en[topic];
}
