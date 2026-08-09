import type { AppLocale } from "@/lib/i18n/config";
import type { ActionGuidance, ActionGuidanceInput } from "@/lib/action-guidance";

const ROLE_ACTIONS: Record<Exclude<AppLocale, "en">, Record<string, Record<"monitor" | "prepare" | "act", string[]>>> = {
  pcm: {
    HOUSEHOLD: {
      monitor: ["Keep emergency contacts, medicine and important documents where you fit reach dem quick.", "Keep alerts on and follow official information."],
      prepare: ["Check drainage around your house where e safe.", "Put medicine, documents, charger and small emergency bag where you fit carry quick.", "Agree where your family go meet if una need leave."],
      act: ["People first before property. Follow official evacuation instruction now if dem give am.", "Carry medicine, ID, water and phone/power bank.", "No walk or drive enter flood water."],
    },
    FARMER: {
      monitor: ["Keep watch on farm drainage, low land and access road."],
      prepare: ["Know which livestock, machine, seed, fertiliser and harvested produce you fit move first.", "Check higher ground and safer storage."],
      act: ["Move livestock, machinery and produce from low areas where e safe.", "Protect seed, fertiliser, chemicals and farm records from water.", "No send workers enter rising flood water."],
    },
    BUSINESS: {
      monitor: ["Keep staff contacts and important business records ready."],
      prepare: ["Check stock and equipment wey dey ground level.", "Review staff contacts and another road to reach or leave the site."],
      act: ["Move water-sensitive stock and important equipment higher where possible.", "Tell staff and suppliers about possible disruption.", "Close unsafe access and protect staff first."],
    },
    AGENCY: {
      monitor: ["Continue monitoring and keep situational awareness."],
      prepare: ["Review vulnerable communities, response contacts and communication readiness."],
      act: ["Escalate for authorised review.", "Prioritise life-safety messaging, evacuation support and access-route checks.", "Track who receive warning and field reports."],
    },
  },
  ha: {
    HOUSEHOLD: {
      monitor: ["Ajiye lambobin gaggawa, magunguna da muhimman takardu a wuri mai saukin dauka.", "Ci gaba da kunna sanarwa kuma ka bi bayanan hukuma."],
      prepare: ["Duba magudanar ruwa a kusa da gida inda hakan yake da aminci.", "Ajiye magunguna, takardu, caja da karamin jakar gaggawa a wuri mai saukin dauka.", "Ku yanke shawarar inda iyali za su hadu idan dole ne ku fita."],
      act: ["Rayukan mutane sun fi kaya muhimmanci. Bi umarnin ficewa na hukuma idan an bayar.", "Dauki magunguna, shaida, ruwa da waya/power bank.", "Kada ka yi tafiya ko tuki cikin ruwan ambaliya."],
    },
    FARMER: {
      monitor: ["Ci gaba da sa ido kan magudanar gona, wuraren kasa da hanyoyin shiga."],
      prepare: ["Gano dabbobi, injuna, iri, taki da amfanin gona da za a iya motsawa da farko.", "Duba wuri mai tsayi da wurin ajiya mafi aminci."],
      act: ["Motsa dabbobi, injuna da amfanin gona daga wuraren kasa idan yana da aminci.", "Kare iri, taki, sinadarai da takardun gona daga ruwa.", "Kada a tura ma'aikata cikin ruwa mai tashi."],
    },
    BUSINESS: {
      monitor: ["Ajiye lambobin ma'aikata da muhimman bayanan kasuwanci a shirye."],
      prepare: ["Duba kaya da na'urorin da suke kusa da kasa.", "Duba lambobin ma'aikata da madadin hanyar shiga ko fita."],
      act: ["Daga kaya masu lalacewa da ruwa da muhimman na'urori sama idan zai yiwu.", "Sanar da ma'aikata da masu kaya game da yiwuwar tsaiko.", "Rufe wuraren shiga marasa aminci kuma kare ma'aikata da farko."],
    },
    AGENCY: {
      monitor: ["Ci gaba da sa ido da fahimtar halin da ake ciki."],
      prepare: ["Duba al'ummomin da ke cikin hadari, lambobin amsa da shirye-shiryen sadarwa."],
      act: ["Daga lamarin zuwa matakin duba na hukuma.", "Ba fifiko ga sakon kare rai, taimakon ficewa da tabbatar da hanyoyin shiga.", "Bibiyi isar gargadi da rahotannin fili."],
    },
  },
  yo: {
    HOUSEHOLD: {
      monitor: ["Pa nọ́mbà pajawiri, oogun àti ìwé pataki síbi tó rọrùn láti dé.", "Jẹ́ kí ìkìlọ̀ ṣiṣẹ́ kí o sì tẹ̀lé alaye ìjọba."],
      prepare: ["Ṣàyẹ̀wò ìṣàn omi ní ayíká ilé níbi tí ó ti léwu kéré.", "Fi oogun, ìwé, ṣaja àti àpò pajawiri kékeré síbi tó rọrùn láti gbé.", "Ẹ pinnu ibi tí ìdílé yóò pàdé bí ẹ bá ní láti kúrò."],
      act: ["Ààbò ènìyàn ni akọkọ ju ohun-ini lọ. Tẹ̀lé ìtọ́sọ́nà ìkúrò níbi ewu ti ìjọba bá fi sílẹ̀.", "Gbé oogun, ìdánimọ̀, omi àti fóònù/power bank.", "Má rìn tàbí wakọ sínú omi ìkún."],
    },
    FARMER: {
      monitor: ["Máa ṣọ́ra sí ìṣàn omi oko, ilẹ̀ kéré àti ọ̀nà wọlé."],
      prepare: ["Mọ ẹranko, ẹrọ, irúgbìn, ajile àti irugbin tí o lè gbé kọ́kọ́.", "Ṣàyẹ̀wò ilẹ̀ gíga àti ibi ìpamọ́ tó dáa jù."],
      act: ["Gbé ẹranko, ẹrọ àti irugbin kúrò ní ilẹ̀ kéré níbi tí ó bá lè ṣe láìléwu.", "Dáàbò bo irúgbìn, ajile, kemika àti àkọsílẹ̀ oko kúrò ní omi.", "Má rán òṣìṣẹ́ sínú omi tó ń ga."],
    },
    BUSINESS: {
      monitor: ["Pa nọ́mbà òṣìṣẹ́ àti àkọsílẹ̀ iṣowo pataki mọ́ sílẹ̀."],
      prepare: ["Ṣàyẹ̀wò ọjà àti ẹrọ tó wà lẹ́gbẹ̀ẹ́ ilẹ̀.", "Ṣàyẹ̀wò nọ́mbà òṣìṣẹ́ àti ọ̀nà míì láti wọlé tàbí jáde."],
      act: ["Gbé ọjà tí omi lè bà jẹ́ àti ẹrọ pataki sí ibi gíga bí ó bá ṣeé ṣe.", "Kìlọ̀ fún òṣìṣẹ́ àti alábàáṣiṣẹ́ nípa ìdènà tó ṣeé ṣe.", "Pa ibi wọlé tí kò ní ààbò, kí o sì dáàbò bo òṣìṣẹ́ akọkọ."],
    },
    AGENCY: {
      monitor: ["Máa tọ́pa ipo kí o sì pa ìmọ̀ ipo mọ́."],
      prepare: ["Ṣàyẹ̀wò àwọn agbègbè tó rọrùn láti ní ewu, àwọn olubasọrọ àti ìmúrasílẹ̀ ibanisọrọ."],
      act: ["Gbé ọ̀ràn lọ sí ìpele ìtúpalẹ̀ aláṣẹ.", "Fi ààbò ẹ̀mí, ìrànlọ́wọ́ ìkúrò níbi ewu àti ìmúdájú ọ̀nà síwájú.", "Tọ́pa ìfiránṣẹ́ ìkìlọ̀ àti ìròyìn láti pápá."],
    },
  },
  ig: {
    HOUSEHOLD: {
      monitor: ["Debe emergency contacts, ọgwụ na akwụkwọ dị mkpa ebe a ga-erute ngwa ngwa.", "Mee ka alerts dị on ma soro ozi gọọmenti."],
      prepare: ["Lelee drainage gburugburu ụlọ ebe ọ dị nchebe.", "Debe ọgwụ, akwụkwọ, charger na obere emergency bag ebe a ga-eburu ngwa ngwa.", "Kpebie ebe ezinụlọ ga-ezukọ ma ọ bụrụ na unu ga-apụ."],
      act: ["Ndụ mmadụ ka ihe onwunwe mkpa. Soro official evacuation instruction ma e nye ya.", "Were ọgwụ, ID, mmiri na phone/power bank.", "Ejegharịla ma ọ bụ gbaa ụgbọala n'ime flood water."],
    },
    FARMER: {
      monitor: ["Na-eleba anya na drainage ubi, ala dị ala na ụzọ mbata."],
      prepare: ["Mara livestock, igwe, mkpụrụ, fatịlaịza na harvest ị ga-ebuga mbụ.", "Lelee higher ground na ebe nchekwa ka mma."],
      act: ["Bugharịa livestock, igwe na harvest pụọ na ala dị ala ma ọ bụrụ na ọ dị nchebe.", "Chebe mkpụrụ, fatịlaịza, chemicals na farm records pụọ na mmiri.", "Ezila ndị ọrụ n'ime mmiri na-arị elu."],
    },
    BUSINESS: {
      monitor: ["Debe staff contacts na business records dị mkpa ready."],
      prepare: ["Lelee stock na equipment dị nso n'ala.", "Lelee staff contacts na ụzọ ọzọ isi banye ma ọ bụ pụọ."],
      act: ["Bulie stock mmiri nwere ike imebi na equipment dị mkpa elu ma ọ bụrụ na o kwere omume.", "Gwa staff na suppliers maka disruption nwere ike ime.", "Mechie unsafe access ma chebe staff mbụ."],
    },
    AGENCY: {
      monitor: ["Na-aga n'ihu na monitoring na situational awareness."],
      prepare: ["Lelee vulnerable communities, response contacts na communication readiness."],
      act: ["Bulie incident maka authorised review.", "Tinye life-safety messaging, evacuation support na access-route verification n'ihu.", "Soro warning delivery na field reports."],
    },
  },
};

export function localizeActionGuidance(
  english: ActionGuidance,
  input: ActionGuidanceInput,
  locale: AppLocale,
): ActionGuidance {
  if (locale === "en") return english;

  const urgency = english.urgency;
  const role = input.role;
  const location = input.locationName;
  const actions = ROLE_ACTIONS[locale][role]?.[urgency] || english.actions;

  const headline: Record<Exclude<AppLocale, "en">, Record<typeof urgency, string>> = {
    pcm: { monitor: `Keep watch ${location}`, prepare: `Prepare now for ${location}`, act: `Act now for ${location}` },
    ha: { monitor: `Ci gaba da sa ido a ${location}`, prepare: `Shirya yanzu domin ${location}`, act: `Yi mataki yanzu domin ${location}` },
    yo: { monitor: `Máa ṣọ́ra ní ${location}`, prepare: `Múra báyìí fún ${location}`, act: `Gbé ìgbésẹ̀ báyìí fún ${location}` },
    ig: { monitor: `Nọgide na nche na ${location}`, prepare: `Jikere ugbu a maka ${location}`, act: `Mee ihe ugbu a maka ${location}` },
  };

  const simple: Record<Exclude<AppLocale, "en">, Record<typeof urgency, string>> = {
    pcm: {
      monitor: `No urgent action dey show for ${location} now. Keep alerts on and keep watch.`,
      prepare: `Risk dey rise around ${location}. Prepare now so you fit move quick if things worsen.`,
      act: `Risk high around ${location}. Do the safety steps now and follow official instruction if e come.`,
    },
    ha: {
      monitor: `Babu matakin gaggawa da ake nuna wa ${location} yanzu. Ci gaba da kunna sanarwa da sa ido.`,
      prepare: `Hadari yana karuwa a ${location}. Shirya yanzu domin ka iya daukar mataki da sauri idan hali ya tsananta.`,
      act: `Hadari ya yi yawa a ${location}. Dauki matakan kariya yanzu kuma ka bi umarnin hukuma idan an bayar.`,
    },
    yo: {
      monitor: `Kò sí ìgbésẹ̀ pajawiri tí a ń fi hàn fún ${location} báyìí. Jẹ́ kí ìkìlọ̀ ṣiṣẹ́, kí o sì máa ṣọ́ra.`,
      prepare: `Ewu ń pọ̀ sí i ní ${location}. Múra báyìí kí o lè gbé ìgbésẹ̀ kíákíá tí ipo bá buru.`,
      act: `Ewu ga ní ${location}. Ṣe àwọn ìgbésẹ̀ ààbò báyìí, kí o sì tẹ̀lé ìtọ́sọ́nà ìjọba tí ó bá dé.`,
    },
    ig: {
      monitor: `Enweghị urgent action egosiri maka ${location} ugbu a. Mee ka alerts dị on ma nọgide na nche.`,
      prepare: `Risk na-arị elu na ${location}. Jikere ugbu a ka i nwee ike ime ngwa ngwa ma ọnọdụ ka njọ.`,
      act: `Risk dị elu na ${location}. Mee safety steps ugbu a ma soro official instruction ma ọ bịa.`,
    },
  };

  return {
    ...english,
    headline: headline[locale][urgency],
    actions,
    simple: simple[locale][urgency],
    detailed: simple[locale][urgency],
    technical: english.technical,
  };
}
