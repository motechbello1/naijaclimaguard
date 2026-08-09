import type { AppLocale } from "./config";

export type MessageKey =
  | "language"
  | "myArea"
  | "mySafety"
  | "myAlerts"
  | "myHistory"
  | "reportFlood"
  | "myFarmRisk"
  | "farmAlerts"
  | "rainOutlook"
  | "farmHistory"
  | "riskOverview"
  | "alertsActions"
  | "riskIntelligence"
  | "operationalEvidence"
  | "operations"
  | "commandQueue"
  | "intelligence"
  | "locationAnalysis"
  | "outlook"
  | "alertRules"
  | "fieldReports"
  | "modelEvidence"
  | "profile"
  | "signOut"
  | "simple"
  | "detailed"
  | "technical"
  | "assistant"
  | "askAnything"
  | "assistantPlaceholder"
  | "liveData"
  | "historicalInfo"
  | "floodSafety"
  | "platformHelp"
  | "officialWarning"
  | "actNow"
  | "prepareNow"
  | "getReady"
  | "keepWatching"
  | "whatToDoNow"
  | "lowRisk"
  | "highRisk"
  | "loading"
  | "send"
  | "close"
  | "newChat"
  | "assistantDisclaimer";

const en: Record<MessageKey, string> = {
  language: "Language",
  myArea: "My Area",
  mySafety: "My Safety",
  myAlerts: "My Alerts",
  myHistory: "My History",
  reportFlood: "Report Flood",
  myFarmRisk: "My Farm Risk",
  farmAlerts: "Farm Alerts",
  rainOutlook: "Rain Outlook",
  farmHistory: "Farm History",
  riskOverview: "Risk Overview",
  alertsActions: "Alerts & Actions",
  riskIntelligence: "Risk Intelligence",
  operationalEvidence: "Operational Evidence",
  operations: "Operations",
  commandQueue: "Command Queue",
  intelligence: "Intelligence",
  locationAnalysis: "Location Analysis",
  outlook: "Outlook",
  alertRules: "Alert Rules",
  fieldReports: "Field Reports",
  modelEvidence: "Model Evidence",
  profile: "Profile",
  signOut: "Sign Out",
  simple: "Simple",
  detailed: "Detailed",
  technical: "Technical",
  assistant: "ClimaGuard Assistant",
  askAnything: "Ask about flooding or NaijaClimaGuard",
  assistantPlaceholder: "Ask a question…",
  liveData: "Live data",
  historicalInfo: "Historical information",
  floodSafety: "Flood safety",
  platformHelp: "Platform help",
  officialWarning: "OFFICIAL WARNING ACTIVE",
  actNow: "ACT NOW",
  prepareNow: "PREPARE NOW",
  getReady: "GET READY",
  keepWatching: "KEEP WATCHING",
  whatToDoNow: "What to do now",
  lowRisk: "Risk looks low",
  highRisk: "Risk is high",
  loading: "Loading…",
  send: "Send",
  close: "Close",
  newChat: "New chat",
  assistantDisclaimer: "For safety, follow official warnings and visible local conditions over chatbot advice.",
};

const pcm: Record<MessageKey, string> = {
  language: "Language",
  myArea: "My Area",
  mySafety: "My Safety",
  myAlerts: "My Alerts",
  myHistory: "My History",
  reportFlood: "Report Flood",
  myFarmRisk: "My Farm Risk",
  farmAlerts: "Farm Alerts",
  rainOutlook: "Rain Outlook",
  farmHistory: "Farm History",
  riskOverview: "Risk Overview",
  alertsActions: "Alerts & Wetin To Do",
  riskIntelligence: "Risk Information",
  operationalEvidence: "Operation Record",
  operations: "Operations",
  commandQueue: "Command Queue",
  intelligence: "Information",
  locationAnalysis: "Check Location",
  outlook: "Outlook",
  alertRules: "Alert Settings",
  fieldReports: "Field Reports",
  modelEvidence: "Model Evidence",
  profile: "My Profile",
  signOut: "Sign Out",
  simple: "Simple",
  detailed: "More Detail",
  technical: "Technical",
  assistant: "ClimaGuard Assistant",
  askAnything: "Ask anything about flood or NaijaClimaGuard",
  assistantPlaceholder: "Ask your question…",
  liveData: "Live information",
  historicalInfo: "Old flood information",
  floodSafety: "How to stay safe",
  platformHelp: "How to use the platform",
  officialWarning: "OFFICIAL FLOOD WARNING DEY ACTIVE",
  actNow: "ACT NOW",
  prepareNow: "PREPARE NOW",
  getReady: "GET READY",
  keepWatching: "KEEP WATCH",
  whatToDoNow: "Wetin you suppose do now",
  lowRisk: "Risk low for now",
  highRisk: "Risk high",
  loading: "E dey load…",
  send: "Send",
  close: "Close",
  newChat: "New chat",
  assistantDisclaimer: "For your safety, follow official warning and wetin you see for your area before chatbot advice.",
};

const ha: Record<MessageKey, string> = {
  language: "Harshe",
  myArea: "Yankina",
  mySafety: "Tsarona",
  myAlerts: "Sanarwata",
  myHistory: "Tarihina",
  reportFlood: "Bayar da Rahoton Ambaliya",
  myFarmRisk: "Hadarin Gonata",
  farmAlerts: "Sanarwar Gona",
  rainOutlook: "Hasashen Ruwan Sama",
  farmHistory: "Tarihin Gona",
  riskOverview: "Takaitaccen Hadari",
  alertsActions: "Sanarwa da Matakai",
  riskIntelligence: "Bayanan Hadari",
  operationalEvidence: "Shaidar Aiki",
  operations: "Ayyuka",
  commandQueue: "Jerin Umarnin Aiki",
  intelligence: "Bayanan Hankali",
  locationAnalysis: "Binciken Wuri",
  outlook: "Hasashe",
  alertRules: "Ka'idojin Sanarwa",
  fieldReports: "Rahoton Fili",
  modelEvidence: "Shaidar Samfuri",
  profile: "Bayanan Asusuna",
  signOut: "Fita",
  simple: "Sauki",
  detailed: "Cikakken Bayani",
  technical: "Na Fasaha",
  assistant: "Mataimakin ClimaGuard",
  askAnything: "Tambayi game da ambaliya ko NaijaClimaGuard",
  assistantPlaceholder: "Rubuta tambayarka…",
  liveData: "Bayanan kai tsaye",
  historicalInfo: "Bayanan tarihi",
  floodSafety: "Tsaron ambaliya",
  platformHelp: "Taimakon manhaja",
  officialWarning: "SANARWAR HUKUMA TANA AIKI",
  actNow: "YI MATAKI YANZU",
  prepareNow: "SHIRYA YANZU",
  getReady: "KA SHIRYA",
  keepWatching: "CI GABA DA SA IDO",
  whatToDoNow: "Abin da za ka yi yanzu",
  lowRisk: "Hadari ya yi kasa",
  highRisk: "Hadari ya yi yawa",
  loading: "Ana lodawa…",
  send: "Aika",
  close: "Rufe",
  newChat: "Sabuwar hira",
  assistantDisclaimer: "Don tsaro, bi gargadin hukuma da abin da kake gani a wurinka kafin shawarar chatbot.",
};

const yo: Record<MessageKey, string> = {
  language: "Èdè",
  myArea: "Agbègbè Mi",
  mySafety: "Ààbò Mi",
  myAlerts: "Ìkìlọ̀ Mi",
  myHistory: "Ìtàn Mi",
  reportFlood: "Jábọ̀ Ìkún Omi",
  myFarmRisk: "Ewu Oko Mi",
  farmAlerts: "Ìkìlọ̀ Oko",
  rainOutlook: "Àfojúsùn Òjò",
  farmHistory: "Ìtàn Oko",
  riskOverview: "Àkótán Ewu",
  alertsActions: "Ìkìlọ̀ àti Ìgbésẹ̀",
  riskIntelligence: "Ìmọ̀ Ewu",
  operationalEvidence: "Ẹ̀rí Ìṣiṣẹ́",
  operations: "Ìṣiṣẹ́",
  commandQueue: "Àtòjọ Àṣẹ",
  intelligence: "Ìmọ̀",
  locationAnalysis: "Ìtúpalẹ̀ Ibi",
  outlook: "Àfojúsùn",
  alertRules: "Òfin Ìkìlọ̀",
  fieldReports: "Ìròyìn Lórí Pápá",
  modelEvidence: "Ẹ̀rí Mọ́dẹ́lì",
  profile: "Àkọsílẹ̀ Mi",
  signOut: "Jáde",
  simple: "Rọrùn",
  detailed: "Alaye Kíkún",
  technical: "Ti Imọ̀ Ẹ̀rọ",
  assistant: "Olùrànlọ́wọ́ ClimaGuard",
  askAnything: "Béèrè nípa ìkún omi tàbí NaijaClimaGuard",
  assistantPlaceholder: "Kọ ìbéèrè rẹ…",
  liveData: "Alaye lọwọlọwọ",
  historicalInfo: "Alaye ìtàn",
  floodSafety: "Ààbò ìkún omi",
  platformHelp: "Ìrànlọ́wọ́ pẹpẹ",
  officialWarning: "ÌKÌLỌ̀ ÌJỌBA WÀ NÍPÒ",
  actNow: "GBÉ ÌGBÉSẸ̀ NÍSINSIN YÌÍ",
  prepareNow: "MÚRA NÍSINSIN YÌÍ",
  getReady: "MÚRA SÍLẸ̀",
  keepWatching: "MÁA ṢỌ́RA",
  whatToDoNow: "Ohun tí o yẹ kí o ṣe báyìí",
  lowRisk: "Ewu kéré",
  highRisk: "Ewu ga",
  loading: "Ń rù…",
  send: "Firanṣẹ́",
  close: "Pa",
  newChat: "Ìjíròrò tuntun",
  assistantDisclaimer: "Fún ààbò, tẹ̀lé ìkìlọ̀ ìjọba àti ohun tí o rí ní agbègbè rẹ ju ìmọ̀ràn chatbot lọ.",
};

const ig: Record<MessageKey, string> = {
  language: "Asụsụ",
  myArea: "Mpaghara M",
  mySafety: "Nchekwa M",
  myAlerts: "Ọkwa M",
  myHistory: "Akụkọ M",
  reportFlood: "Kọwaa Idei Mmiri",
  myFarmRisk: "Ihe Ize Ndụ Ubi M",
  farmAlerts: "Ọkwa Ubi",
  rainOutlook: "Atụmatụ Mmiri Ozuzo",
  farmHistory: "Akụkọ Ubi",
  riskOverview: "Nchịkọta Ihe Ize Ndụ",
  alertsActions: "Ọkwa na Ihe A Ga-eme",
  riskIntelligence: "Ozi Ihe Ize Ndụ",
  operationalEvidence: "Ihe Akaebe Ọrụ",
  operations: "Ọrụ",
  commandQueue: "Ndepụta Iwu",
  intelligence: "Ozi",
  locationAnalysis: "Nyocha Ebe",
  outlook: "Atụmatụ",
  alertRules: "Iwu Ọkwa",
  fieldReports: "Akụkọ Ebe",
  modelEvidence: "Ihe Akaebe Model",
  profile: "Profaịlụ M",
  signOut: "Pụọ",
  simple: "Dị Mfe",
  detailed: "Nkọwa Zuru Ezu",
  technical: "Teknụzụ",
  assistant: "Onye Enyemaka ClimaGuard",
  askAnything: "Jụọ maka idei mmiri ma ọ bụ NaijaClimaGuard",
  assistantPlaceholder: "Jụọ ajụjụ gị…",
  liveData: "Ozi ugbu a",
  historicalInfo: "Ozi akụkọ ihe mere eme",
  floodSafety: "Nchekwa idei mmiri",
  platformHelp: "Enyemaka platform",
  officialWarning: "ỊDỌ AKA NÁ NTỊ GỌVANMENTI DỊ IRÈ",
  actNow: "MEE IHE UGBUA",
  prepareNow: "JIKERE UGBUA",
  getReady: "JIKERE",
  keepWatching: "NỌRỌ NA NCHE",
  whatToDoNow: "Ihe ị ga-eme ugbu a",
  lowRisk: "Ihe ize ndụ dị ala",
  highRisk: "Ihe ize ndụ dị elu",
  loading: "Na-ebunye…",
  send: "Zipu",
  close: "Mechie",
  newChat: "Mkparịta ụka ọhụrụ",
  assistantDisclaimer: "Maka nchekwa, soro ịdọ aka ná ntị gọọmenti na ọnọdụ ị na-ahụ n'ebe gị karịa ndụmọdụ chatbot.",
};

export const MESSAGES: Record<AppLocale, Record<MessageKey, string>> = { en, pcm, ha, yo, ig };
