import type { AppLocale } from "@/lib/i18n/config";

export type AssistantTopic =
  | "platform"
  | "flood_definition"
  | "causes"
  | "types"
  | "warning"
  | "preparedness"
  | "during"
  | "after"
  | "history"
  | "current"
  | "farmer"
  | "business"
  | "report"
  | "alerts"
  | "model"
  | "limitations"
  | "fallback";

type StaticTopic = Exclude<AssistantTopic, "current">;

const RESPONSES: Record<AppLocale, Record<StaticTopic, string>> = {
  en: {
    platform: "NaijaClimaGuard is a Nigeria-focused flood-risk and early-action platform. It combines live location risk checks, saved locations, role-specific action guidance, official advisory overlays, community reports, alert delivery and auditable operational evidence. The public live score currently uses the disclosed derived-v2 engine. Model v5 is still being validated and does not control public alerts.",
    flood_definition: "A flood happens when water covers land that is normally dry. It can come from heavy rain, rivers overflowing, coastal or tidal water, dam releases, blocked drainage, saturated ground, or several of these at the same time. Flood risk depends on both how much water arrives and how easily the area can drain or move that water away.",
    causes: "Common flood causes include intense or long-lasting rainfall, rivers rising after rain upstream, saturated soil, blocked or undersized drainage, high tide or storm surge near the coast, dam or reservoir releases, and building on natural floodplains. In many Nigerian river locations, what happens upstream can matter more than rain falling directly at the location.",
    types: "The main flood types are river flooding, flash flooding, urban or surface-water flooding, coastal flooding, and flooding linked to dam or reservoir releases. One event can combine more than one type. For example, high river flow plus heavy local rain plus poor drainage can make impacts much worse.",
    warning: "If an official flood warning is active, treat it as more important than a low app score. Check who issued it, read the affected area and timing, prepare to move people and important items, avoid flooded roads and flowing water, and follow evacuation instructions from the responsible authority. NaijaClimaGuard shows official warnings separately so they cannot be hidden by the model score.",
    preparedness: "Before flooding, know a safer route and higher place you can reach, keep important documents and medicines easy to carry, move valuables and stock above likely water level, charge phones and power banks, keep emergency contacts available, and plan for children, older people, people with disabilities, livestock and anyone who may need help.",
    during: "If flooding is already happening, prioritise people over property. Move away from rising or fast-moving water, do not walk or drive through flooded roads when the depth or current is uncertain, keep away from damaged electrical equipment, and follow official evacuation instructions. If water is entering your building, move to a safer higher place only when the route itself is safe.",
    after: "After floodwater begins to fall, do not assume the area is immediately safe. Watch for damaged roads, contaminated water, unstable buildings, exposed electrical hazards and hidden debris. Photograph damage only when it is safe, keep records for insurance or assistance, and follow local authority guidance before returning to evacuated areas.",
    history: "NaijaClimaGuard keeps historical flood evidence separate from current warnings. Historical records can show when flooding was documented, what river or rainfall conditions existed, and how earlier alerts performed. They are useful for learning and validation, but an old event is not evidence that a flood is happening now.",
    farmer: "For farms, flood preparation should focus on people first, then livestock, inputs, machinery and harvest. Keep animals away from low-lying channels where possible, move seed, fertiliser and chemicals above likely water level, protect records, identify access routes that may be cut off, and use the farm risk and rain outlook pages to watch changing conditions.",
    business: "For a business, use flood information to protect people, access, stock, equipment and continuity. Identify which sites can be cut off first, move critical stock or electronics above likely water level, back up important records, define who can close or relocate operations, and keep an evidence trail of warnings and actions for later review.",
    report: "Use Report Flood to submit what you are actually seeing at a location. A community report should be treated as an observation that may need review, not automatic ground truth. Reports are most useful when the location, time, water level description and supporting evidence are clear.",
    alerts: "Alerts are the delivery layer for a location. You can configure a risk threshold and supported delivery channels. Official advisories remain separate from model-threshold alerts and should take precedence when active. Platform language and preferred alert language are independent settings.",
    model: "The public live engine and the Model v5 candidate are different. The public live engine is the disclosed derived-v2 decision-support score. Model v5 is an independently evaluated candidate using archived operational data and walk-forward testing. It should not be described as production validated until its final evidence exists and the freeze decision is complete.",
    limitations: "NaijaClimaGuard still has limits. A low score must never override an official warning or visible local flooding. Modelled river discharge is not the same as a physical local gauge, drainage condition is difficult to observe nationally, and source coverage can fail. The platform should narrow each limitation only when the corresponding production data path is live and reproducible.",
    fallback: "I am not sure which part you mean. Ask me one specific thing, for example: What is a flood? What causes floods? What should I do during a flood? What is my current risk? How do alerts work? Or tell me the place or feature you want explained.",
  },
  pcm: {
    platform: "NaijaClimaGuard na Nigeria flood-risk and early-action platform. E dey help people check location risk, save places, know wetin to do, see official warning, send alerts, collect community reports and keep evidence. Public live score still dey use derived-v2. Model v5 still dey validation and e never dey control public alerts.",
    flood_definition: "Flood na when water cover land wey normally dry. Heavy rain, river wey overflow, high tide, dam release, blocked drainage or ground wey don full with water fit cause am. Sometimes na plenty of these things join together.",
    causes: "Things wey fit cause flood include heavy or long rain, river wey rise because rain fall upstream, blocked drainage, soil wey don soak full, high tide for coastal area and dam release. For many river areas, wetin happen upstream fit matter pass rain wey fall for that exact place.",
    types: "Main flood types na river flood, flash flood, town or surface-water flood, coastal flood and flood wey dam or reservoir release fit worsen. One flood event fit get more than one type at the same time.",
    warning: "If official flood warning dey active, take am pass low app score. Check who issue am, read the place and time wey e concern, prepare people and important things, no enter flooded road or moving water, and follow evacuation instruction from authority.",
    preparedness: "Before flood, know safer road and higher place, keep document and medicine where you fit carry quick, move valuable things and stock up, charge phone and power bank, keep emergency contacts, and plan for children, old people, people wey need help and livestock.",
    during: "If flood don start, save people before property. Move away from rising or fast water, no waka or drive enter flooded road if you no know depth or current, avoid damaged electrical things, and follow official evacuation instruction.",
    after: "After water go down, no assume say everywhere don safe. Road fit damage, water fit dirty, building fit weak and electric danger fit still dey. Take pictures only if e safe, keep records, and follow authority instruction before you return to evacuated place.",
    history: "NaijaClimaGuard dey separate old flood evidence from current warning. Old records fit show when flood happen and wetin source data show that time, but old event no mean say flood dey happen now.",
    farmer: "For farm, protect people first, then livestock, inputs, machine and harvest. Move animals from low area if e safe, carry seed, fertiliser and chemicals go higher place, protect records and check road wey flood fit cut off.",
    business: "For business, protect people, access road, stock, equipment and how work go continue. Know which site fit cut off first, move important stock or electronics up, back up records and decide who fit close or move operations when risk rise.",
    report: "Use Report Flood tell the platform wetin you actually see. Community report na observation wey may still need review, e no automatically become ground truth. Clear location, time and water description make report more useful.",
    alerts: "Alert na how warning reach you for saved location. You fit set threshold and supported channels. Official advisory dey separate from model-threshold alert and e suppose get priority. Platform language and alert language fit different.",
    model: "Public live engine and Model v5 no be the same thing. Public score use derived-v2. Model v5 na candidate wey still dey independent walk-forward validation with archived operational data. We no suppose call am production validated until final evidence and freeze decision land.",
    limitations: "NaijaClimaGuard still get limits. Low score no fit cancel official warning or flood wey you dey see. Modelled river discharge no be local physical gauge, drainage condition hard to know everywhere, and data source fit fail. We only reduce limitation when the real production data path dey live and reproducible.",
    fallback: "I no sure which part you mean. Ask one clear question, like: Wetin be flood? Wetin dey cause flood? Wetin I do during flood? Wetin be my current risk? How alert dey work? Or tell me the place or feature wey you want make I explain.",
  },
  ha: {
    platform: "NaijaClimaGuard dandali ne na Najeriya domin bayanin hadarin ambaliya da daukar mataki da wuri. Yana taimaka wa mai amfani duba hadari, ajiye wurare, samun shawarwarin mataki, ganin gargadin hukuma, samun sanarwa da adana shaidar aiki. Makin jama'a har yanzu derived-v2 ne. Model v5 yana karkashin tantancewa kuma bai fara sarrafa gargadin jama'a ba.",
    flood_definition: "Ambaliya tana faruwa idan ruwa ya rufe kasa da yawanci take bushe. Ruwan sama mai yawa, koguna da suka cika, tudu na teku, sakin ruwa daga madatsar ruwa, magudanan ruwa da suka toshe ko kasa da ta riga ta jike sosai na iya haddasa ta.",
    causes: "Dalilan ambaliya sun hada da ruwan sama mai yawa ko mai tsawo, tashin kogi saboda ruwan sama a sama, kasa mai cike da ruwa, magudanan ruwa marasa kyau, hawan teku da sakin ruwa daga madatsar ruwa. A wuraren kogi, abin da ya faru a sama na iya fi ruwan sama na wurin tasiri.",
    types: "Manyan nau'ikan ambaliya sun hada da ambaliyar kogi, ambaliya mai saurin zuwa, ambaliyar birni ko saman kasa, ambaliyar bakin teku da ambaliyar da sakin madatsar ruwa ya taimaka. Abu daya na iya hada nau'i fiye da daya.",
    warning: "Idan gargadin ambaliya na hukuma yana aiki, ka dauke shi da muhimmanci fiye da karamin makin app. Ka tabbatar da wanda ya fitar da gargadin, ka duba wurin da lokacin, ka shirya mutane da muhimman kaya, ka guji hanyoyin da ruwa ya rufe, ka bi umarnin ficewa daga hukuma.",
    preparedness: "Kafin ambaliya, ka san hanyar tsira da wuri mafi tsayi, ka ajiye takardu da magunguna inda za a dauke su da sauri, ka daga kaya masu muhimmanci sama, ka caji waya da power bank, ka ajiye lambobin gaggawa kuma ka shirya taimakon yara, tsofaffi, masu bukatar taimako da dabbobi.",
    during: "Idan ambaliya ta fara, ka fifita rayuka fiye da kaya. Ka nisanci ruwa mai tashi ko gudu, kada ka bi ta hanyar da ruwa ya rufe idan ba ka san zurfi ko karfinsa ba, ka guji kayan lantarki da suka lalace kuma ka bi umarnin hukuma.",
    after: "Bayan ruwa ya ragu, kada ka dauka cewa wurin ya zama lafiya nan take. Hanyoyi na iya lalacewa, ruwa na iya gurbata, gini na iya rauni kuma hadarin lantarki na iya kasancewa. Ka dauki hoto ne kawai idan lafiya ne, ka adana bayanai kuma ka bi umarnin hukuma kafin komawa.",
    history: "NaijaClimaGuard yana raba bayanan ambaliya na tarihi da gargadin yanzu. Tarihi yana taimakawa fahimtar abin da ya faru da yadda bayanan wancan lokacin suka kasance, amma tsohon lamari ba hujjar cewa ambaliya tana faruwa yanzu ba ne.",
    farmer: "Ga manomi, a fara da kare mutane, sannan dabbobi, kayan noma, injuna da amfanin gona. A motsa dabbobi daga wuraren kasa idan lafiya ne, a daga iri, taki da sinadarai sama, a kare takardu kuma a duba hanyoyin da ambaliya za ta iya rufewa.",
    business: "Ga kasuwanci, a kare mutane, hanyoyin shiga, haja, kayan aiki da ci gaban aiki. A gano wuraren da za su iya yankewa da wuri, a daga kayan lantarki da haja mai muhimmanci, a yi madadin bayanai kuma a fayyace wanda zai iya dakatar ko matsar da aiki.",
    report: "Yi amfani da Report Flood don bayyana abin da ka gani a wurin. Rahoton al'umma abin lura ne da zai iya bukatar bita, ba gaskiyar karshe kai tsaye ba. Wuri, lokaci da bayanin matakin ruwa masu kyau suna sa rahoton ya fi amfani.",
    alerts: "Sanarwa ita ce hanyar isar da gargadi ga wurin da aka adana. Za ka iya saita matakin hadari da hanyoyin isarwa da ake tallafawa. Gargadin hukuma ya bambanta da gargadin da makin model ya haifar kuma ya fi muhimmanci idan yana aiki. Harshen dandali da harshen gargadi na iya bambanta.",
    model: "Injin jama'a na live da Model v5 ba abu daya ba ne. Makin jama'a yana amfani da derived-v2. Model v5 dan takara ne da ake tantancewa da archived operational data da walk-forward testing. Kada a kira shi production validated har sai sakamakon karshe da hukuncin freeze sun kammala.",
    limitations: "NaijaClimaGuard yana da iyaka. Karamin maki bai kamata ya soke gargadin hukuma ko ambaliyar da ake gani ba. Modelled river discharge ba local physical gauge ba ne, yanayin magudanar ruwa ba a samun sa ko'ina, kuma tushen data na iya kasa. Ana rage iyaka ne kawai idan production data path ya zama live kuma ana iya maimaita shi daga code.",
    fallback: "Ban tabbatar da wane bangare kake nufi ba. Ka tambayi abu daya kai tsaye, misali: Menene ambaliya? Me ke haddasa ta? Me zan yi yayin ambaliya? Menene hadarina yanzu? Yaya alerts suke aiki? Ko ka fada min wurin ko feature da kake son bayani.",
  },
  yo: {
    platform: "NaijaClimaGuard jẹ́ pẹpẹ Nàìjíríà fún ìmọ̀ ewu ìkún omi àti ìgbésẹ̀ kíákíá. Ó ń jẹ́ kí o ṣàyẹ̀wò ewu ibi, fi ibi pamọ́, gba ìtọ́sọ́nà ìgbésẹ̀, rí ìkìlọ̀ ìjọba, gba alerts àti pa ẹ̀rí iṣẹ́ mọ́. Mákì live ti gbogbo ènìyàn ṣì ń lo derived-v2. Model v5 ṣì wà ní ìdánwò, kò sì ń darí public alerts.",
    flood_definition: "Ìkún omi ni igba tí omi bá bo ilẹ̀ tí ó máa ń gbẹ. Òjò púpọ̀, odò tó kún ju etí rẹ̀ lọ, high tide, dam release, drainage tó di tàbí ilẹ̀ tó ti kún fún omi lè fa a. Nígbà míì, ọ̀pọ̀ nǹkan wọ̀nyí máa ń ṣiṣẹ́ pọ̀.",
    causes: "Àwọn ohun tó lè fa ìkún omi ni òjò tó pọ̀ tàbí tó pẹ́, odò tó ga nítorí òjò lókè odò, ilẹ̀ tó ti kún fún omi, drainage tí kò ṣiṣẹ́ dáadáa, high tide àti dam release. Ní ọ̀pọ̀ ibi lẹ́gbẹ̀ẹ́ odò, ohun tó ṣẹlẹ̀ lókè odò lè ṣe pataki ju òjò ibi náà lọ.",
    types: "Àwọn irú ìkún omi pàtàkì ni river flooding, flash flooding, urban surface-water flooding, coastal flooding àti flooding tó ní ìbáṣepọ̀ pẹ̀lú dam release. Ìṣẹ̀lẹ̀ kan lè ní ju irú kan lọ ní akoko kan.",
    warning: "Tí ìkìlọ̀ ìjọba bá ń ṣiṣẹ́, gba a ni pataki ju mákì app tó kéré lọ. Mọ ẹni tó fi ìkìlọ̀ náà sílẹ̀, ka ibi àti akoko tó kan, mura ènìyàn àti ohun pataki, yago fún opopona tí omi bo, kí o sì tẹ̀lé ìtọ́sọ́nà ìkúrò níbi ewu.",
    preparedness: "Kí ìkún omi tó dé, mọ ọ̀nà ààbò àti ibi gíga, pa ìwé pataki àti oogun síbi tó rọrùn láti gbé, gbe ohun iyebíye àti ọjà sórí, gba fóònù àti power bank, pa nọ́mbà pajawiri mọ́, kí o sì gbero fún ọmọde, àgbàlagbà, ẹni tó nílò ìrànlọ́wọ́ àti ẹranko.",
    during: "Tí ìkún omi bá ti bẹ̀rẹ̀, fi ènìyàn ṣáájú ohun-ini. Yàgò fún omi tó ń ga tàbí tó ń ṣàn kíákíá, má rìn tàbí wakọ̀ lórí opopona tí omi bo tí o kò bá mọ ijinle tàbí agbara omi, yago fún ohun èlò ina tó bajẹ́, kí o tẹ̀lé ìtọ́sọ́nà ìjọba.",
    after: "Lẹ́yìn tí omi bá rọ̀, má ṣe ro pé ibi ti di ailewu lesekese. Opopona lè bajẹ́, omi lè doti, ile lè rọ, ewu ina sì lè wa. Ya fọ́tò nikan tí ó bá safe, pa records mọ́, kí o sì tẹ̀lé ìtọ́sọ́nà aláṣẹ kí o tó padà sí ibi tí a ti kó ènìyàn kúrò.",
    history: "NaijaClimaGuard yà ìtàn ìkún omi sílẹ̀ kúrò ní ìkìlọ̀ lọwọlọwọ. Ìtàn lè fi hàn igba tí a ṣe àkọsílẹ̀ ìkún omi àti bí data ṣe rí nígbà náà, ṣùgbọ́n ìṣẹ̀lẹ̀ atijọ́ kì í jẹ́ ẹ̀rí pé ìkún omi ń ṣẹlẹ̀ báyìí.",
    farmer: "Fún agbẹ, dáàbò bo ènìyàn kọ́kọ́, lẹ́yìn náà ẹranko, inputs, ẹrọ àti irugbin. Gbe ẹranko kúrò ní ibi kekere tí ó bá safe, gbe irugbin, ajile àti kemika sórí, dáàbò bo records, kí o sì ṣàyẹ̀wò ọ̀nà tí omi lè ge.",
    business: "Fún business, dáàbò bo ènìyàn, access, stock, equipment àti continuity. Mọ site tí omi lè ge kọ́kọ́, gbe stock àti electronics pataki sórí, ṣe backup records, kí o sì pinnu ẹni tó lè pa tàbí gbe operations nígbà ewu.",
    report: "Lo Report Flood láti sọ ohun tí o rí gan-an. Community report jẹ́ observation tó lè nílò review, kì í di ground truth laifọwọyi. Ibi, akoko àti apejuwe ipele omi tó ye jẹ́ kí report wúlò síi.",
    alerts: "Alert ni ọna tí warning fi dé ọdọ rẹ fún ibi tí o fi pamọ́. O lè ṣeto threshold àti supported channels. Official advisory yàtọ̀ sí model-threshold alert, ó sì gbọdọ̀ ga ju rẹ lọ tí ó bá active. Platform language àti alert language lè yàtọ̀.",
    model: "Public live engine àti Model v5 kì í ṣe ohun kan naa. Public score n lo derived-v2. Model v5 jẹ́ candidate tí a ń ṣe independent walk-forward validation pẹ̀lú archived operational data. A kò gbọdọ̀ pe e ni production validated títí final evidence àti freeze decision fi pari.",
    limitations: "NaijaClimaGuard ní àwọn limitations. Mákì kéré kò gbọdọ̀ fagile official warning tàbí flood tí o rí. Modelled river discharge kì í ṣe local physical gauge, drainage condition kò rọrùn láti mọ káàkiri, data source sì lè fail. A máa dín limitation kù nikan tí production data path bá live tí a sì lè reproduce láti code.",
    fallback: "Mi ò dájú apá wo ni o túmọ̀ sí. Béèrè ohun kan pato, fun apẹẹrẹ: Kí ni ìkún omi? Kí ló ń fa a? Kí ni kí n ṣe nigba ìkún omi? Kí ni ewu mi báyìí? Báwo ni alerts ṣe ń ṣiṣẹ́? Tàbí sọ ibi tàbí feature tí o fẹ́ kí n ṣàlàyé.",
  },
  ig: {
    platform: "NaijaClimaGuard bụ usoro Naịjirịa maka ịmata ihe ize ndụ idei mmiri na ime ihe n'oge. Ọ na-enyere gị lelee risk ebe, chekwaa ebe, nweta action guidance, hụ official warnings, nweta alerts ma chekwaa operational evidence. Public live score ka na-eji derived-v2. Model v5 ka a na-enyocha ma ọ naghị achị public alerts.",
    flood_definition: "Idei mmiri bụ mgbe mmiri kpuchiri ala na-adịkarị akọrọ. Oke mmiri ozuzo, osimiri juputara, high tide, dam release, drainage mechiri emechi ma ọ bụ ala jupụtara na mmiri nwere ike ịkpata ya. Mgbe ụfọdụ ọtụtụ ihe ndị a na-eme n'otu oge.",
    causes: "Ihe na-akpata idei mmiri gụnyere oke mmiri ozuzo ma ọ bụ mmiri na-ezo ogologo oge, osimiri na-arị elu n'ihi mmiri ozuzo upstream, ala jupụtara na mmiri, drainage na-adịghị arụ ọrụ nke ọma, high tide na dam release. N'ebe osimiri dị, ihe mere upstream nwere ike ịdị mkpa karịa mmiri ozuzo n'ebe ahụ kpọmkwem.",
    types: "Ụdị idei mmiri bụ river flooding, flash flooding, urban surface-water flooding, coastal flooding na flooding metụtara dam release. Otu event nwere ike ijikọta ụdị karịrị otu.",
    warning: "Ọ bụrụ na official flood warning dị active, were ya kpọrọ ihe karịa low app score. Hụ onye nyere ya, gụọ ebe na oge ọ metụtara, kwadebe mmadụ na ihe dị mkpa, zere ụzọ mmiri kpuchiri, soro evacuation instructions nke authority.",
    preparedness: "Tupu idei mmiri, mara ụzọ nchekwa na ebe dị elu, debe akwụkwọ dị mkpa na ọgwụ ebe a ga-eburu ngwa ngwa, bulie ihe bara uru na stock elu, chajịa ekwentị na power bank, debe emergency contacts, ma mee atụmatụ maka ụmụaka, ndị agadi, ndị chọrọ enyemaka na anụ ụlọ.",
    during: "Ọ bụrụ na idei mmiri amalitela, chebe mmadụ tupu ihe onwunwe. Pụọ na mmiri na-arị elu ma ọ bụ na-agba ọsọ, abanyela ma ọ bụ kpọga ụgbọala n'ụzọ mmiri kpuchiri ma ị maghị omimi ma ọ bụ ike mmiri, zere electrical equipment mebiri emebi, soro official evacuation instructions.",
    after: "Mgbe mmiri belatara, echela na ebe ahụ adịla safe ozugbo. Ụzọ nwere ike imebi, mmiri nwere ike merụọ, ụlọ nwere ike adịghị ike, electrical hazards nwekwara ike ịdị. Were foto naanị ma ọ bụrụ na ọ dị safe, debe records, soro authority guidance tupu ịlaghachi.",
    history: "NaijaClimaGuard na-ekewa historical flood evidence na current warnings. Akụkọ gara aga nwere ike igosi mgbe e dere flood na otú source data si dị n'oge ahụ, mana old event abụghị ihe akaebe na flood na-eme ugbu a.",
    farmer: "Maka farmer, chebe mmadụ mbụ, mgbe ahụ livestock, inputs, machinery na harvest. Bugharịa anụ ụlọ pụọ n'ala dị ala ma ọ bụrụ na ọ dị safe, bulie seed, fertiliser na chemicals elu, chekwaa records, lelee ụzọ flood nwere ike mechie.",
    business: "Maka business, chebe mmadụ, access, stock, equipment na continuity. Chọpụta site nwere ike ịkpụpụ mbụ, bulie stock ma ọ bụ electronics dị mkpa, backup records, kọwaa onye nwere ikike imechi ma ọ bụ bugharịa operations mgbe risk na-arị elu.",
    report: "Jiri Report Flood kọwaa ihe ị hụrụ n'ezie. Community report bụ observation nke nwere ike ịchọ review, ọ bụghị automatic ground truth. Ebe, oge na water-level description doro anya na-eme ka report baa uru.",
    alerts: "Alert bụ ụzọ warning si eru gị maka saved location. Ị nwere ike set threshold na supported channels. Official advisory dị iche na model-threshold alert ma kwesịrị inwe priority mgbe ọ active. Platform language na alert language nwere ike ịdị iche.",
    model: "Public live engine na Model v5 abụghị otu ihe. Public score na-eji derived-v2. Model v5 bụ candidate ka a na-eme independent walk-forward validation na archived operational data. A gaghị akpọ ya production validated ruo mgbe final evidence na freeze decision zuru ezu.",
    limitations: "NaijaClimaGuard ka nwere limitations. Low score agaghị emeri official warning ma ọ bụ flood ị na-ahụ. Modelled river discharge abụghị local physical gauge, drainage condition siri ike ịmata n'ebe niile, source data nwekwara ike fail. A na-eme ka limitation dị ntakịrị naanị mgbe production data path dị live ma reproducible site na code.",
    fallback: "Amaghị m kpọmkwem akụkụ ị na-ekwu. Jụọ otu ajụjụ doro anya, dịka: Gịnị bụ idei mmiri? Gịnị na-akpata ya? Gịnị ka m mee mgbe idei mmiri na-eme? Gịnị bụ current risk m? Kedu ka alerts si arụ ọrụ? Ma ọ bụ gwa m ebe ma ọ bụ feature ịchọrọ ka m kọwaa.",
  },
};

export function classifyAssistantQuestion(message: string): AssistantTopic {
  const q = message.toLowerCase().replace(/\s+/g, " ").trim();

  if (/current|today|right now|my risk|near me|live risk|risk here|risk in my|yanzu|lọwọlọwọ|ugbu a/.test(q)) return "current";
  if (/naijaclimaguard|platform|how.*work|what.*app|feature|account|plan|dashboard/.test(q)) return "platform";
  if (/what is (a )?flood|what's a flood|define (a )?flood|meaning of flood|what does flood mean|tell me .*flood|anything .*flood|menene ambaliya|kí ni ìkún omi|gịnị bụ idei mmiri/.test(q)) return "flood_definition";
  if (/cause|why.*flood|reason.*flood|what makes.*flood|haddasa|fa ìkún|na-akpata/.test(q)) return "causes";
  if (/type.*flood|kind.*flood|different flood|nau.*ambaliya|irú.*ìkún|ụdị.*idei/.test(q)) return "types";
  if (/during flood|flooding now|water.*enter|already flooding|while flooding|yayin ambaliya|nigba ìkún|mgbe idei/.test(q)) return "during";
  if (/after flood|after flooding|water.*gone|return home|bayan ambaliya|lẹ́yìn.*ìkún|mgbe mmiri belatara/.test(q)) return "after";
  if (/warning|official advisory|evacuat|gargadi|ìkìlọ|ịdọ/.test(q)) return "warning";
  if (/prepare|prepared|prevent|safe|what should|before flood|shiry|ààbò|nchekwa/.test(q)) return "preparedness";
  if (/farm|farmer|crop|livestock|agri|manomi|agbẹ|ugbo/.test(q)) return "farmer";
  if (/business|warehouse|company|office|stock|shop|kasuwanci|ile ise/.test(q)) return "business";
  if (/report flood|community report|submit report|field report|rahoto|ìròyìn/.test(q)) return "report";
  if (/alert|notification|sms|whatsapp|voice|email alert/.test(q)) return "alerts";
  if (/model v5|model v4|derived-v2|model|xgboost|glofas/.test(q)) return "model";
  if (/limitation|disclaimer|what.*not.*use|missing data|river gauge|drainage|tide|dam data/.test(q)) return "limitations";
  if (/history|histor|lokoja|2022|past flood|tarihi|ìtàn|akụkọ/.test(q)) return "history";
  return "fallback";
}

export function getStaticAssistantAnswer(locale: AppLocale, topic: StaticTopic) {
  return RESPONSES[locale]?.[topic] || RESPONSES.en[topic];
}

export function getAssistantSuggestions(locale: AppLocale, topic: AssistantTopic): string[] {
  const common: Record<AppLocale, string[]> = {
    en: ["What causes floods?", "What should I do during a flood?", "Check my current risk"],
    pcm: ["Wetin dey cause flood?", "Wetin I do during flood?", "Check my current risk"],
    ha: ["Me ke haddasa ambaliya?", "Me zan yi yayin ambaliya?", "Duba hadarina yanzu"],
    yo: ["Kí ló ń fa ìkún omi?", "Kí ni kí n ṣe nigba ìkún omi?", "Ṣàyẹ̀wò ewu mi báyìí"],
    ig: ["Gịnị na-akpata idei mmiri?", "Gịnị ka m mee mgbe idei mmiri na-eme?", "Lelee current risk m"],
  };
  if (topic === "platform") {
    return locale === "en" ? ["How do alerts work?", "What are the platform limitations?", "What is Model v5?"] : common[locale];
  }
  return common[locale];
}
