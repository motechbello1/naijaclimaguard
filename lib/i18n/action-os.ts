import type { AppLocale } from "./config";

/**
 * Exact-copy language pack for the Action OS surfaces. Official advisory text,
 * user-entered place names and live source data are intentionally not rewritten.
 */
const en = {
  "Action OS": "Action OS",
  "Know the next move, not just the next number.": "Know the next move, not just the next number.",
  "NaijaClimaGuard turns the same risk and official-warning evidence into a practical plan for your role. Your role changes the actions — never the underlying risk score.": "NaijaClimaGuard turns the same risk and official-warning evidence into a practical plan for your role. Your role changes the actions — never the underlying risk score.",
  "Offline emergency pack": "Offline emergency pack",
  "Evidence": "Evidence",
  "Current decision state": "Current decision state",
  "Current location": "Current location",
  "Use my location": "Use my location",
  "Preparedness": "Preparedness",
  "Readiness checklist": "Readiness checklist",
  "This is a preparation score based only on the checklist below. It is not a flood probability or safety guarantee.": "This is a preparation score based only on the checklist below. It is not a flood probability or safety guarantee.",
  "Role-specific early action": "Role-specific early action",
  "Home & family action plan": "Home & family action plan",
  "Turn a flood signal into a simple family plan before water reaches your door.": "Turn a flood signal into a simple family plan before water reaches your door.",
  "Farm protection plan": "Farm protection plan",
  "Prioritise people, livestock, inputs and movable farm assets before losses compound.": "Prioritise people, livestock, inputs and movable farm assets before losses compound.",
  "Business continuity plan": "Business continuity plan",
  "Protect staff first, then the operations and assets that keep the business alive.": "Protect staff first, then the operations and assets that keep the business alive.",
  "Early-action operations plan": "Early-action operations plan",
  "Convert warning evidence into accountable decisions without editing or impersonating the issuing authority.": "Convert warning evidence into accountable decisions without editing or impersonating the issuing authority.",
  "Do first": "Do first",
  "Prepare": "Prepare",
  "Escalate": "Escalate",
  "Coordinate": "Coordinate",
  "Close the loop": "Close the loop",
  "Now": "Now",
  "Next 24 hours": "Next 24 hours",
  "If conditions worsen": "If conditions worsen",
  "Next operational cycle": "Next operational cycle",
  "After action": "After action",
  "Official warning active": "Official warning active",
  "Act now": "Act now",
  "Prepare now": "Prepare now",
  "Get ready": "Get ready",
  "Keep watching": "Keep watching",
  "Share risk snapshot": "Share risk snapshot",
  "Ground truth loop": "Ground truth loop",
  "Report conditions": "Report conditions",
  "Automatic warning delivery": "Automatic warning delivery",
  "Continue": "Continue",
  "Simulation only": "Simulation only",
  "Flood Drill Mode": "Flood Drill Mode",
  "Practice the response before the warning is real.": "Practice the response before the warning is real.",
  "Start 5-minute readiness drill": "Start 5-minute readiness drill",
  "practice timer": "practice timer",
  "This mode never creates or sends a real warning.": "This mode never creates or sends a real warning.",
  "NaijaClimaGuard Emergency Pack": "NaijaClimaGuard Emergency Pack",
  "Useful when the network is not.": "Useful when the network is not.",
  "Official warning first": "Official warning first",
  "Avoid floodwater": "Avoid floodwater",
  "Keep communication ready": "Keep communication ready",
  "Protect essentials": "Protect essentials",
  "Move valuables higher": "Move valuables higher",
  "Prioritise people": "Prioritise people",
  "Before heavy rain, prepare these offline": "Before heavy rain, prepare these offline",
  "Print / save as PDF": "Print / save as PDF",
  "Check live conditions": "Check live conditions",
  "Online": "Online",
  "Offline": "Offline",
  "Open pack": "Open pack",
  "Action Center": "Action Center",
} as const;

type Key = keyof typeof en;

const pcm: Record<Key, string> = {
  ...en,
  "Know the next move, not just the next number.": "Know wetin you go do next, no be only the next number.",
  "NaijaClimaGuard turns the same risk and official-warning evidence into a practical plan for your role. Your role changes the actions — never the underlying risk score.": "NaijaClimaGuard dey turn the same risk and official warning into clear action for your role. Your role fit change wetin you do — e no dey change the real risk score.",
  "Offline emergency pack": "Emergency pack wey work offline",
  "Current decision state": "Wetin the situation mean now",
  "Current location": "Where I dey now",
  "Use my location": "Use where I dey",
  "Preparedness": "How ready you be",
  "Readiness checklist": "Things to check before flood",
  "This is a preparation score based only on the checklist below. It is not a flood probability or safety guarantee.": "This score only show how many preparation steps you don do. E no be flood probability and e no guarantee safety.",
  "Role-specific early action": "Early action for your own role",
  "Home & family action plan": "Home and family action plan",
  "Turn a flood signal into a simple family plan before water reaches your door.": "Turn flood warning into simple family plan before water reach your house.",
  "Farm protection plan": "Farm protection plan",
  "Prioritise people, livestock, inputs and movable farm assets before losses compound.": "Protect people first, then livestock, farm inputs and things wey you fit move before loss plenty.",
  "Business continuity plan": "Business continuity plan",
  "Protect staff first, then the operations and assets that keep the business alive.": "Protect staff first, then protect the work and assets wey keep the business running.",
  "Early-action operations plan": "Early-action operations plan",
  "Convert warning evidence into accountable decisions without editing or impersonating the issuing authority.": "Turn warning evidence into clear accountable action without changing or pretending to be the authority wey issue am.",
  "Do first": "Do this first", "Prepare": "Prepare", "Escalate": "Raise action", "Coordinate": "Coordinate", "Close the loop": "Complete and record am",
  "Now": "Now", "Next 24 hours": "Next 24 hours", "If conditions worsen": "If things worse", "Next operational cycle": "Next operation round", "After action": "After action",
  "Official warning active": "Official warning dey active", "Act now": "Act now", "Prepare now": "Prepare now", "Get ready": "Get ready", "Keep watching": "Keep watch",
  "Share risk snapshot": "Share risk summary", "Ground truth loop": "Report wetin you see", "Report conditions": "Report condition", "Automatic warning delivery": "Automatic warning delivery", "Continue": "Continue",
  "Simulation only": "Na practice only", "Flood Drill Mode": "Flood Practice Mode", "Practice the response before the warning is real.": "Practice wetin you go do before real warning come.", "Start 5-minute readiness drill": "Start 5-minute readiness practice", "practice timer": "practice timer", "This mode never creates or sends a real warning.": "This practice mode no dey create or send real warning.",
  "NaijaClimaGuard Emergency Pack": "NaijaClimaGuard Emergency Pack", "Useful when the network is not.": "E still useful when network no dey.", "Official warning first": "Official warning come first", "Avoid floodwater": "No enter floodwater", "Keep communication ready": "Keep communication ready", "Protect essentials": "Protect important things", "Move valuables higher": "Carry valuables go higher place", "Prioritise people": "People come first", "Before heavy rain, prepare these offline": "Before heavy rain, prepare these things offline", "Print / save as PDF": "Print / save as PDF", "Check live conditions": "Check live condition", "Online": "Online", "Offline": "Offline", "Open pack": "Open pack", "Action Center": "Action Center",
};

const ha: Record<Key, string> = {
  ...en,
  "Know the next move, not just the next number.": "San mataki na gaba, ba lamba kawai ba.",
  "NaijaClimaGuard turns the same risk and official-warning evidence into a practical plan for your role. Your role changes the actions — never the underlying risk score.": "NaijaClimaGuard yana juya hadari da gargadin hukuma zuwa tsarin mataki da ya dace da rawarka. Rawarka tana canza matakan da za ka dauka — ba a canza ainihin makin hadari.",
  "Offline emergency pack": "Kunshin gaggawa na offline", "Current decision state": "Halin yanke shawara yanzu", "Current location": "Wurin da nake", "Use my location": "Yi amfani da wurina", "Preparedness": "Shiri", "Readiness checklist": "Jerin duba shiri",
  "This is a preparation score based only on the checklist below. It is not a flood probability or safety guarantee.": "Wannan makin shiri ne daga jerin da ke kasa kawai. Ba yiwuwar ambaliya ba ce kuma ba garantin tsaro ba ne.",
  "Role-specific early action": "Matakin farko bisa rawarka", "Home & family action plan": "Tsarin mataki na gida da iyali", "Turn a flood signal into a simple family plan before water reaches your door.": "Mayar da alamar ambaliya zuwa saukin tsarin iyali kafin ruwa ya iso gida.",
  "Farm protection plan": "Tsarin kare gona", "Prioritise people, livestock, inputs and movable farm assets before losses compound.": "Fara da mutane, dabbobi, kayan noma da kadarorin da za a iya motsawa kafin asara ta karu.",
  "Business continuity plan": "Tsarin ci gaba da kasuwanci", "Protect staff first, then the operations and assets that keep the business alive.": "Kare ma'aikata da farko, sannan ayyuka da kadarorin da ke ci gaba da kasuwanci.",
  "Early-action operations plan": "Tsarin aikin matakin farko", "Convert warning evidence into accountable decisions without editing or impersonating the issuing authority.": "Mayar da shaidar gargadi zuwa hukunci mai alhaki ba tare da canza sakon hukuma ko kwaikwayon hukumar ba.",
  "Do first": "Fara da wannan", "Prepare": "Shirya", "Escalate": "Daukaka mataki", "Coordinate": "Daidaita aiki", "Close the loop": "Kammala zagaye", "Now": "Yanzu", "Next 24 hours": "Awanni 24 masu zuwa", "If conditions worsen": "Idan hali ya tsananta", "Next operational cycle": "Zagaye na aiki na gaba", "After action": "Bayan mataki",
  "Official warning active": "Gargadin hukuma yana aiki", "Act now": "Yi mataki yanzu", "Prepare now": "Shirya yanzu", "Get ready": "Ka shirya", "Keep watching": "Ci gaba da sa ido", "Share risk snapshot": "Raba takaitaccen hadari", "Ground truth loop": "Rahoton abin da ke faruwa", "Report conditions": "Bayar da rahoton hali", "Automatic warning delivery": "Isar da gargadi ta atomatik", "Continue": "Ci gaba",
  "Simulation only": "Gwaji kawai", "Flood Drill Mode": "Yanayin atisayen ambaliya", "Practice the response before the warning is real.": "Yi atisayen martani kafin gargadin ya zama na gaske.", "Start 5-minute readiness drill": "Fara atisayen shiri na minti 5", "practice timer": "lokacin atisaye", "This mode never creates or sends a real warning.": "Wannan yanayin ba ya kirkiro ko aika gargadi na gaske.",
  "NaijaClimaGuard Emergency Pack": "Kunshin Gaggawa na NaijaClimaGuard", "Useful when the network is not.": "Yana da amfani ko da babu network.", "Official warning first": "Gargadin hukuma da farko", "Avoid floodwater": "Guji ruwan ambaliya", "Keep communication ready": "Kiyaye sadarwa a shirye", "Protect essentials": "Kare muhimman abubuwa", "Move valuables higher": "Daga kayan daraja sama", "Prioritise people": "Mutane su fara", "Before heavy rain, prepare these offline": "Kafin ruwan sama mai yawa, shirya wadannan offline", "Print / save as PDF": "Buga / ajiye PDF", "Check live conditions": "Duba halin yanzu", "Online": "Kan layi", "Offline": "Babu network", "Open pack": "Bude kunshi", "Action Center": "Cibiyar Mataki",
};

const yo: Record<Key, string> = {
  ...en,
  "Know the next move, not just the next number.": "Mọ ìgbésẹ̀ tó kàn, kì í ṣe nọ́mbà tó kàn nìkan.",
  "NaijaClimaGuard turns the same risk and official-warning evidence into a practical plan for your role. Your role changes the actions — never the underlying risk score.": "NaijaClimaGuard ń yí ewu àti ẹ̀rí ìkìlọ̀ ìjọba padà sí ètò ìgbésẹ̀ tó bá ipa rẹ mu. Ipa rẹ lè yí ìgbésẹ̀ padà — kò yí iye ewu gidi padà.",
  "Offline emergency pack": "Àpò pajawiri tí ń ṣiṣẹ́ láìsí ìnítánẹ́ẹ̀tì", "Current decision state": "Ipo ìpinnu lọ́wọ́lọ́wọ́", "Current location": "Ibi tí mo wà", "Use my location": "Lo ibi tí mo wà", "Preparedness": "Ìmúrasílẹ̀", "Readiness checklist": "Àtòjọ ìmúrasílẹ̀",
  "This is a preparation score based only on the checklist below. It is not a flood probability or safety guarantee.": "Èyí jẹ́ iye ìmúrasílẹ̀ láti inú àtòjọ yìí nìkan. Kì í ṣe ìṣeeṣe ìkún omi tàbí ìdánilójú ààbò.",
  "Role-specific early action": "Ìgbésẹ̀ kutukutu fún ipa rẹ", "Home & family action plan": "Ètò ìgbésẹ̀ ilé àti ẹbí", "Turn a flood signal into a simple family plan before water reaches your door.": "Yí àmì ìkún omi padà sí ètò ẹbí tó rọrùn kí omi tó dé ilé.",
  "Farm protection plan": "Ètò ààbò oko", "Prioritise people, livestock, inputs and movable farm assets before losses compound.": "Fi ènìyàn ṣáájú, lẹ́yìn náà ẹran-ọ̀sìn, ohun èlò oko àti ohun-ini tí a lè gbe kí adánù má bàa pọ̀.",
  "Business continuity plan": "Ètò ìtẹ̀síwájú iṣowo", "Protect staff first, then the operations and assets that keep the business alive.": "Dáàbò bo òṣìṣẹ́ kọ́kọ́, lẹ́yìn náà iṣẹ́ àti ohun-ini tó ń jẹ́ kí iṣowo tẹ̀síwájú.",
  "Early-action operations plan": "Ètò iṣẹ́ ìgbésẹ̀ kutukutu", "Convert warning evidence into accountable decisions without editing or impersonating the issuing authority.": "Yí ẹ̀rí ìkìlọ̀ padà sí ìpinnu tó ṣeé ṣàyẹ̀wò láì yí ọ̀rọ̀ aláṣẹ padà tàbí ṣe bí ẹni pé ẹ ni aláṣẹ.",
  "Do first": "Ṣe èyí kọ́kọ́", "Prepare": "Múra", "Escalate": "Gbé ìgbésẹ̀ ga", "Coordinate": "Ṣe àkóso pọ̀", "Close the loop": "Parí ìlànà", "Now": "Báyìí", "Next 24 hours": "Wákàtí 24 tó ń bọ̀", "If conditions worsen": "Tí ipo bá burú síi", "Next operational cycle": "Ìpele iṣẹ́ tó kàn", "After action": "Lẹ́yìn ìgbésẹ̀",
  "Official warning active": "Ìkìlọ̀ ìjọba wà nípò", "Act now": "Gbé ìgbésẹ̀ báyìí", "Prepare now": "Múra báyìí", "Get ready": "Múra sílẹ̀", "Keep watching": "Máa ṣọ́ra", "Share risk snapshot": "Pín àkótán ewu", "Ground truth loop": "Jábọ̀ ohun tí o rí", "Report conditions": "Jábọ̀ ipo", "Automatic warning delivery": "Ìfiránṣẹ́ ìkìlọ̀ aládàáṣiṣẹ́", "Continue": "Tẹ̀síwájú",
  "Simulation only": "Àdánwò nìkan", "Flood Drill Mode": "Ipo ìdánilẹ́kọ̀ọ́ ìkún omi", "Practice the response before the warning is real.": "Ṣe ìdánilẹ́kọ̀ọ́ ìdáhùn kí ìkìlọ̀ gidi tó dé.", "Start 5-minute readiness drill": "Bẹ̀rẹ̀ ìdánilẹ́kọ̀ọ́ ìmúrasílẹ̀ ìṣẹ́jú 5", "practice timer": "aago ìdánilẹ́kọ̀ọ́", "This mode never creates or sends a real warning.": "Ipo yìí kò ṣẹ̀dá tàbí fi ìkìlọ̀ gidi ránṣẹ́.",
  "NaijaClimaGuard Emergency Pack": "Àpò Pajawiri NaijaClimaGuard", "Useful when the network is not.": "Ó wúlò nígbà tí nẹ́tíwọ́ọ̀kì kò sí.", "Official warning first": "Ìkìlọ̀ ìjọba kọ́kọ́", "Avoid floodwater": "Yàgò fún omi ìkún", "Keep communication ready": "Mú ìbánisọ̀rọ̀ ṣetán", "Protect essentials": "Dáàbò bo ohun pàtàkì", "Move valuables higher": "Gbe ohun iyebíye sókè", "Prioritise people": "Fi ènìyàn ṣáájú", "Before heavy rain, prepare these offline": "Kí òjò líle tó dé, mú àwọn wọ̀nyí ṣetán offline", "Print / save as PDF": "Tẹ̀ / fi pamọ́ sí PDF", "Check live conditions": "Ṣàyẹ̀wò ipo lọwọlọwọ", "Online": "Lórí ayélujára", "Offline": "Láìsí ayélujára", "Open pack": "Ṣí àpò", "Action Center": "Ibùdó Ìgbésẹ̀",
};

const ig: Record<Key, string> = {
  ...en,
  "Know the next move, not just the next number.": "Mara ihe ị ga-eme ọzọ, ọ bụghị naanị nọmba ọzọ.",
  "NaijaClimaGuard turns the same risk and official-warning evidence into a practical plan for your role. Your role changes the actions — never the underlying risk score.": "NaijaClimaGuard na-agbanwe ihe ize ndụ na ịdọ aka ná ntị gọọmenti ka ọ bụrụ atụmatụ dabara n'ọrụ gị. Ọrụ gị na-agbanwe ihe ị ga-eme — ọ naghị agbanwe akara ihe ize ndụ n'onwe ya.",
  "Offline emergency pack": "Ngwugwu mberede offline", "Current decision state": "Ọnọdụ mkpebi ugbu a", "Current location": "Ebe m nọ ugbu a", "Use my location": "Jiri ebe m nọ", "Preparedness": "Nkwadebe", "Readiness checklist": "Ndepụta nkwadebe",
  "This is a preparation score based only on the checklist below. It is not a flood probability or safety guarantee.": "Nke a bụ akara nkwadebe sitere naanị na ndepụta dị n'okpuru. Ọ bụghị ohere idei mmiri ma ọ bụ nkwa nchekwa.",
  "Role-specific early action": "Ihe mbụ dabere n'ọrụ gị", "Home & family action plan": "Atụmatụ ụlọ na ezinụlọ", "Turn a flood signal into a simple family plan before water reaches your door.": "Gbanwee akara idei mmiri ka ọ bụrụ atụmatụ ezinụlọ dị mfe tupu mmiri eruo ụlọ.",
  "Farm protection plan": "Atụmatụ ichekwa ubi", "Prioritise people, livestock, inputs and movable farm assets before losses compound.": "Buru ụzọ chebe mmadụ, mgbe ahụ anụ ụlọ, ihe ubi na ihe a pụrụ ibugharị tupu mfu abawanye.",
  "Business continuity plan": "Atụmatụ ka azụmahịa gaa n'ihu", "Protect staff first, then the operations and assets that keep the business alive.": "Chebe ndị ọrụ mbụ, mgbe ahụ ọrụ na akụ na-eme ka azụmahịa gaa n'ihu.",
  "Early-action operations plan": "Atụmatụ ọrụ ngwa ngwa", "Convert warning evidence into accountable decisions without editing or impersonating the issuing authority.": "Gbanwee ihe akaebe ịdọ aka ná ntị ka ọ bụrụ mkpebi a pụrụ ịza ajụjụ maka ya, na-enweghị ịgbanwe ozi ma ọ bụ ime ka ị bụ ụlọ ọrụ nyere ya.",
  "Do first": "Mee nke a mbụ", "Prepare": "Kwadebe", "Escalate": "Welie nzaghachi", "Coordinate": "Hazie ọnụ", "Close the loop": "Mechie usoro", "Now": "Ugbu a", "Next 24 hours": "Awa 24 na-abịa", "If conditions worsen": "Ọ bụrụ na ọnọdụ ka njọ", "Next operational cycle": "Usoro ọrụ na-esote", "After action": "Mgbe emechara ihe",
  "Official warning active": "Ịdọ aka ná ntị gọọmenti dị irè", "Act now": "Mee ihe ugbu a", "Prepare now": "Kwadebe ugbu a", "Get ready": "Jikere", "Keep watching": "Nọrọ na nche", "Share risk snapshot": "Kekọrịta nchịkọta ihe ize ndụ", "Ground truth loop": "Kọwaa ihe ị hụrụ", "Report conditions": "Kọwaa ọnọdụ", "Automatic warning delivery": "Izipu ịdọ aka ná ntị n'akpaghị aka", "Continue": "Gaa n'ihu",
  "Simulation only": "Nnwale naanị", "Flood Drill Mode": "Ụdị ọzụzụ idei mmiri", "Practice the response before the warning is real.": "Mụọ ihe ị ga-eme tupu ịdọ aka ná ntị bụrụ nkeจริง.", "Start 5-minute readiness drill": "Bido ọzụzụ nkwadebe nke nkeji 5", "practice timer": "oge ọzụzụ", "This mode never creates or sends a real warning.": "Ụdị a anaghị emepụta ma ọ bụ zipu ịdọ aka ná ntị n'ezie.",
  "NaijaClimaGuard Emergency Pack": "Ngwugwu Mberede NaijaClimaGuard", "Useful when the network is not.": "Ọ bara uru ọbụna mgbe network adịghị.", "Official warning first": "Ịdọ aka ná ntị gọọmenti mbụ", "Avoid floodwater": "Zere mmiri idei", "Keep communication ready": "Debe nkwukọrịta njikere", "Protect essentials": "Chebe ihe dị mkpa", "Move valuables higher": "Bugharịa ihe bara uru elu", "Prioritise people": "Buru mmadụ ụzọ", "Before heavy rain, prepare these offline": "Tupu oke mmiri ozuzo, kwadebe ihe ndị a offline", "Print / save as PDF": "Bipụta / chekwaa PDF", "Check live conditions": "Lelee ọnọdụ ugbu a", "Online": "Online", "Offline": "Offline", "Open pack": "Mepee ngwugwu", "Action Center": "Ebe Ihe Omume",
};

export const ACTION_OS_COPY: Record<AppLocale, Record<Key, string>> = { en, pcm, ha, yo, ig };

const REVERSE = new Map<string, Key>();
for (const key of Object.keys(en) as Key[]) {
  REVERSE.set(key, key);
  for (const pack of [pcm, ha, yo, ig]) REVERSE.set(pack[key], key);
}

export function translateActionOSExact(value: string, locale: AppLocale) {
  const key = REVERSE.get(value) as Key | undefined;
  return key ? ACTION_OS_COPY[locale][key] : value;
}
