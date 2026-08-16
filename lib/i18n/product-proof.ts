import type { AppLocale } from "./config";

export type ProofRole = "household" | "farm" | "business" | "agency";

type ProductProofCopy = {
  nav: {
    product: string;
    evidence: string;
    investor: string;
    pilot: string;
    signIn: string;
    register: string;
    dashboard: string;
  };
  investor: {
    eyebrow: string;
    title: string;
    lead: string;
    openProduct: string;
    openDashboard: string;
    inspectEvidence: string;
    readinessLabel: string;
    readinessTitle: string;
    readinessBody: string;
    liveProduct: string;
    liveProductNote: string;
    shadowEvidence: string;
    shadowEvidenceNote: string;
    nationalFactory: string;
    nationalFactoryNote: string;
    demoEyebrow: string;
    demoTitle: string;
    demoBody: string;
    demoNotice: string;
    signalDetail: string;
    roleLabel: string;
    roles: Record<ProofRole, string>;
    fields: {
      signal: string;
      exposure: string;
      decision: string;
      delivery: string;
      proof: string;
    };
    scenarios: Record<ProofRole, {
      exposure: string;
      decision: string;
      delivery: string;
      proof: string;
    }>;
    moatEyebrow: string;
    moatTitle: string;
    moatBody: string;
    moatItems: Array<{ title: string; body: string }>;
    comparisonTitle: string;
    comparisonBody: string;
    forecastQuestion: string;
    forecastAnswer: string;
    networkQuestion: string;
    networkAnswer: string;
    economicsTitle: string;
    economicsBody: string;
    damageReference: string;
    populationReference: string;
    sensitivity: string;
    sensitivityNote: string;
    fundingTitle: string;
    fundingBody: string;
    fundingLabels: string[];
    output: string;
    boundaryTitle: string;
    boundaryBody: string;
    claimedNow: string;
    notClaimed: string;
    claimedList: string[];
    blockedList: string[];
  };
  evidence: {
    eyebrow: string;
    title: string;
    lead: string;
    status: string;
    statusBody: string;
    publicEngine: string;
    publicEngineBody: string;
    shadowEngine: string;
    shadowEngineBody: string;
    metric: string;
    result: string;
    meaning: string;
    metricsTitle: string;
    metricsBody: string;
    eligibleEvents: string;
    eligibleEventsMeaning: string;
    detectedEvents: string;
    detectedEventsMeaning: string;
    precision: string;
    precisionMeaning: string;
    falseAlerts: string;
    falseAlertsMeaning: string;
    ranking: string;
    rankingMeaning: string;
    sourceReplay: string;
    sourceReplayMeaning: string;
    claimsTitle: string;
    claimsBody: string;
    supported: string;
    blocked: string;
    supportedClaims: string[];
    blockedClaims: string[];
    nextTitle: string;
    nextBody: string;
    steps: Array<{ title: string; body: string }>;
    openDashboard: string;
    runPilot: string;
  };
};

const en: ProductProofCopy = {
  nav: {
    product: "Live product",
    evidence: "Evidence",
    investor: "Investor proof",
    pilot: "Institutional pilot",
    signIn: "Sign in",
    register: "Create account",
    dashboard: "Open dashboard",
  },
  investor: {
    eyebrow: "Integrated product and investment case",
    title: "Nigeria's flood decision network.",
    lead: "NaijaClimaGuard connects hazard evidence to the exposed asset, the responsible person, the required action, proof of delivery and the verified outcome. The forecast is an input. The closed decision loop is the product.",
    openProduct: "Use the live product",
    openDashboard: "Open the dashboard",
    inspectEvidence: "Inspect the evidence",
    readinessLabel: "Readiness position",
    readinessTitle: "Working software. Honest evidence. Not TRL 6 yet.",
    readinessBody: "The product, accounts, dashboard and public risk workflow are operational. Riverine Watch v1 has limited retrospective evidence in two locations. National and prospective proof is still being built.",
    liveProduct: "Public product",
    liveProductNote: "Accounts, saved locations, role-based actions, alerts, reports and evidence history.",
    shadowEvidence: "Shadow evidence",
    shadowEvidenceNote: "4 of 5 eligible historical onset events detected in Lokoja and Makurdi. Retrospective only.",
    nationalFactory: "National evidence factory",
    nationalFactoryNote: "36 states and the FCT registered. Events and features must pass review before a national score is published.",
    demoEyebrow: "Product mechanism",
    demoTitle: "See the decision network complete one loop.",
    demoBody: "Change the user role. The same preserved signal becomes a different asset decision, owner, delivery route and proof requirement.",
    demoNotice: "Demonstration workflow using a preserved model replay and sample assets. This is not a live warning.",
    signalDetail: "NASA IMERG and GloFAS · preserved 10 August 2026 replay · Makurdi WATCH 85.03%",
    roleLabel: "Decision owner",
    roles: { household: "Household", farm: "Farm", business: "Business", agency: "Agency" },
    fields: { signal: "Hazard evidence", exposure: "Exposed asset", decision: "Assigned action", delivery: "Last-mile delivery", proof: "Receipt and outcome" },
    scenarios: {
      household: { exposure: "Sample family home near a river corridor", decision: "Move documents and medicines above the marked level. Check the official warning.", delivery: "Pidgin voice plus SMS to the verified household contact", proof: "Acknowledgement requested. Outcome remains unverified until the user records it." },
      farm: { exposure: "Sample maize store and livestock pen", decision: "Move bagged stock to the raised store. Assign livestock movement to the farm lead.", delivery: "Hausa voice plus WhatsApp task card", proof: "Owner, completion time and protected stock value recorded after verification." },
      business: { exposure: "Sample depot, stock and access road", decision: "Pause inbound deliveries. Move priority stock. Escalate road closure to operations.", delivery: "Operations dashboard, email and manager acknowledgement", proof: "Decision, owner, delivery receipt and verified disruption cost joined in one record." },
      agency: { exposure: "Sample ward, clinic and access route", decision: "Review the source, assign field verification and publish only through authorised channels.", delivery: "Command queue with escalation and immutable source provenance", proof: "Received, acknowledged, escalated and resolved actions remain auditable." },
    },
    moatEyebrow: "Why this compounds",
    moatTitle: "A forecast can be copied. Decision-performance history cannot.",
    moatBody: "The defensible asset is the permissioned record linking evidence, exposure, policy, language, delivery, action and economic outcome across Nigerian operating conditions.",
    moatItems: [
      { title: "Evidence router", body: "Select the strongest authorised signal while preserving issue time, freshness, failure state and provenance." },
      { title: "Nigeria Impact Graph", body: "Map each customer's assets, people, stock, facilities, roads and dependencies." },
      { title: "Decision Policy Compiler", body: "Turn operating procedures into role-specific owners, actions, deadlines and escalation rules." },
      { title: "Outcome Ledger", body: "Join the signal to delivery, completed action and independently verified operational or financial outcome." },
    ],
    comparisonTitle: "The difference must be visible in the product.",
    comparisonBody: "NaijaClimaGuard does not need to pretend that national agencies or global forecasting systems do not exist. It must make their strongest authorised signals more usable for each Nigerian decision, then prove the result.",
    forecastQuestion: "A forecast product asks",
    forecastAnswer: "Where and when could flooding occur?",
    networkQuestion: "NaijaClimaGuard must answer",
    networkAnswer: "Which asset is exposed, who owns the next action, did the warning reach them in a usable language, was the action completed, and what value was actually protected?",
    economicsTitle: "Economic value is measured after action, not invented before it.",
    economicsBody: "The national baseline is a reference for market exposure. It is not NaijaClimaGuard revenue and it is not a savings claim.",
    damageReference: "World Bank 2022 median direct flood-damage reference",
    populationReference: "WorldPop 2025 population baseline across 36 states and the FCT",
    sensitivity: "Illustrative protected-value sensitivity",
    sensitivityNote: "0.5%, 1%, 2% and 5% scenarios are planning sensitivities only. A customer outcome is claimed only after verification.",
    fundingTitle: "What £150,000 is buying",
    fundingBody: "Not another generic flood map. The round funds a procurement-grade closed loop and the evidence required to sell it responsibly.",
    fundingLabels: ["Product and engineering", "Data and infrastructure", "Government and partnerships", "Sales and customer proof", "Legal and compliance", "Contingency"],
    output: "Acceptance output",
    boundaryTitle: "The claim boundary is part of the product.",
    boundaryBody: "An investor should see ambition and control at the same time. Unsupported certainty destroys trust and procurement readiness.",
    claimedNow: "Defensible now",
    notClaimed: "Blocked until evidence exists",
    claimedList: ["A working public product with accounts and role-based dashboard workflows.", "A frozen Riverine Watch v1 retrospective result for Lokoja and Makurdi.", "A reproducible national evidence architecture with guarded denominators."],
    blockedList: ["TRL 6 product readiness.", "Nationwide flood-prediction accuracy.", "Autonomous public warning authority.", "Verified avoided loss without customer outcome evidence."],
  },
  evidence: {
    eyebrow: "Public evidence room",
    title: "What works, what is limited, and what comes next.",
    lead: "This page separates the live public product from the Riverine Watch v1 shadow model. It does not turn a repository check into field evidence.",
    status: "Current status: pre-TRL6",
    statusBody: "The software works, but the present evidence does not yet establish a product operating in a relevant field environment at TRL 6.",
    publicEngine: "Live public engine",
    publicEngineBody: "The derived-v2 decision-support engine powers public risk checks and authenticated dashboard workflows. It is not Riverine Watch v1.",
    shadowEngine: "Riverine Watch v1",
    shadowEngineBody: "A frozen 14-day riverine WATCH shadow candidate for Lokoja and Makurdi. It is not authorised to replace the public engine or issue autonomous warnings.",
    metric: "Metric",
    result: "Frozen result",
    meaning: "What it means",
    metricsTitle: "Frozen retrospective evidence",
    metricsBody: "These numbers describe one narrow historical experiment. They are displayed together so the 80% event-detection headline cannot hide precision or false-alert performance.",
    eligibleEvents: "Eligible onset events",
    eligibleEventsMeaning: "Five documented events in the two-location retrospective scope.",
    detectedEvents: "Events detected",
    detectedEventsMeaning: "Four of five events crossed the frozen WATCH threshold. This is not 80% accuracy.",
    precision: "Alert-episode precision",
    precisionMeaning: "About one in four deduplicated WATCH episodes matched an eligible event window.",
    falseAlerts: "False alert episodes",
    falseAlertsMeaning: "Frozen retrospective estimate per supported location-year.",
    ranking: "PR-AUC / ROC-AUC",
    rankingMeaning: "Issue-row ranking metrics. PR-AUC shows the class-imbalance challenge that still requires improvement.",
    sourceReplay: "Operational-source replay",
    sourceReplayMeaning: "A preserved NASA and GloFAS bundle scored deterministically after the issue date. It proves compatibility, not prospective validation.",
    claimsTitle: "Claim ledger",
    claimsBody: "Every sales statement must stay inside this boundary until prospective and field evidence changes it.",
    supported: "Supported",
    blocked: "Not supported",
    supportedClaims: ["4 of 5 eligible historical events detected retrospectively in Lokoja and Makurdi.", "Frozen 14-day WATCH horizon and 0.70 WATCH threshold.", "Deterministic scoring of a preserved operational-source bundle."],
    blockedClaims: ["80% accuracy or 80% national accuracy.", "Prospectively validated public-warning performance.", "TRL 6 product readiness.", "Autonomous evacuation or warning authority."],
    nextTitle: "The shortest honest route to stronger readiness",
    nextBody: "Substituting disciplined prospective shadow evidence for a long wait does not manufacture TRL 6. It creates a faster, auditable path to the field proof that investors and institutions can inspect.",
    steps: [
      { title: "1. Preserve every issue", body: "Store source time, source age, probability, state and WATCH episode before outcomes are known." },
      { title: "2. Run beside existing systems", body: "Use institutional shadow pilots without replacing official authority or public warnings." },
      { title: "3. Record the decision loop", body: "Capture owner, delivery channel, language, acknowledgement, action and verified outcome." },
      { title: "4. Promote only after review", body: "Require prospective performance, failure analysis, field usability and independent sign-off." },
    ],
    openDashboard: "Open the working dashboard",
    runPilot: "Design an institutional pilot",
  },
};

const pcm: ProductProofCopy = {
  nav: { product: "Live product", evidence: "Evidence", investor: "Investor proof", pilot: "Institution pilot", signIn: "Sign in", register: "Create account", dashboard: "Open dashboard" },
  investor: {
    eyebrow: "Product and investment case wey join together",
    title: "Nigeria flood decision network.",
    lead: "NaijaClimaGuard dey connect flood evidence to the asset wey dey risk, the person wey responsible, the action wey dem must do, proof say warning reach, and the outcome wey dem verify. Forecast na input. The complete decision loop na the product.",
    openProduct: "Use the live product", openDashboard: "Open dashboard", inspectEvidence: "Check the evidence",
    readinessLabel: "Readiness position", readinessTitle: "Software dey work. Evidence clear. E never reach TRL 6.", readinessBody: "The product, account, dashboard and public risk workflow dey work. Riverine Watch v1 get limited past evidence for only two locations. National and live future proof still dey build.",
    liveProduct: "Public product", liveProductNote: "Account, saved locations, action by role, alerts, reports and evidence history.",
    shadowEvidence: "Shadow evidence", shadowEvidenceNote: "E detect 4 of 5 eligible past flood-onset events for Lokoja and Makurdi. Na retrospective only.",
    nationalFactory: "National evidence factory", nationalFactoryNote: "36 states plus FCT don register. Events and features must pass review before we publish national score.",
    demoEyebrow: "How the product dey work", demoTitle: "See the decision network complete one loop.", demoBody: "Change the user role. The same preserved signal go become different asset decision, owner, delivery route and proof requirement.", demoNotice: "Na demonstration with preserved model replay and sample assets. E no be live warning.", signalDetail: "NASA IMERG and GloFAS · replay wey we preserve for 10 August 2026 · Makurdi WATCH 85.03%", roleLabel: "Person wey own the decision",
    roles: { household: "Household", farm: "Farm", business: "Business", agency: "Agency" },
    fields: { signal: "Flood evidence", exposure: "Asset wey dey risk", decision: "Action wey dem assign", delivery: "How warning reach", proof: "Receipt and outcome" },
    scenarios: {
      household: { exposure: "Sample family house near river corridor", decision: "Carry document and medicine go above the marked level. Check official warning.", delivery: "Pidgin voice plus SMS to verified household contact", proof: "We ask for acknowledgement. Outcome no verify until user record am." },
      farm: { exposure: "Sample maize store and livestock pen", decision: "Move bagged stock go raised store. Give livestock movement to farm lead.", delivery: "Hausa voice plus WhatsApp task card", proof: "Owner, finish time and protected stock value go enter record after verification." },
      business: { exposure: "Sample depot, stock and access road", decision: "Pause incoming delivery. Move priority stock. Escalate road closure to operations.", delivery: "Operations dashboard, email and manager acknowledgement", proof: "Decision, owner, delivery receipt and verified disruption cost join for one record." },
      agency: { exposure: "Sample ward, clinic and access route", decision: "Review source, assign field verification and publish only through authorised channels.", delivery: "Command queue with escalation and source provenance wey no change", proof: "Received, acknowledged, escalated and resolved actions remain auditable." },
    },
    moatEyebrow: "Why the advantage dey grow", moatTitle: "Person fit copy forecast. Dem no fit quickly copy decision-performance history.", moatBody: "The strong asset na the permissioned record wey join evidence, exposure, policy, language, delivery, action and economic outcome across Nigerian operating conditions.",
    moatItems: [
      { title: "Evidence router", body: "Choose the strongest authorised signal and keep issue time, freshness, failure state and source proof." },
      { title: "Nigeria Impact Graph", body: "Map each customer assets, people, stock, facilities, roads and dependencies." },
      { title: "Decision Policy Compiler", body: "Turn operating procedure into owner, action, deadline and escalation rule for each role." },
      { title: "Outcome Ledger", body: "Join signal to delivery, completed action and verified operational or money outcome." },
    ],
    comparisonTitle: "The difference must show inside the product.", comparisonBody: "NaijaClimaGuard no need pretend say national agencies or global forecast systems no dey. We must make their strongest authorised signals useful for each Nigerian decision, then prove the result.",
    forecastQuestion: "Forecast product dey ask", forecastAnswer: "Where and when flood fit happen?", networkQuestion: "NaijaClimaGuard must answer", networkAnswer: "Which asset dey risk, who own the next action, warning reach am for language wey e understand, dem complete the action, and how much value dem truly protect?",
    economicsTitle: "We measure economic value after action. We no invent am before action.", economicsBody: "National baseline na market exposure reference. E no be NaijaClimaGuard revenue and e no be savings claim.", damageReference: "World Bank 2022 median direct flood-damage reference", populationReference: "WorldPop 2025 population baseline for 36 states and FCT", sensitivity: "Example protected-value sensitivity", sensitivityNote: "0.5%, 1%, 2% and 5% scenarios na planning sensitivity only. We claim customer outcome only after verification.",
    fundingTitle: "Wetin £150,000 dey buy", fundingBody: "E no be another ordinary flood map. The round dey fund procurement-grade closed loop and the evidence we need to sell am responsibly.", fundingLabels: ["Product and engineering", "Data and infrastructure", "Government and partnership", "Sales and customer proof", "Legal and compliance", "Contingency"], output: "Acceptance output",
    boundaryTitle: "Claim boundary na part of the product.", boundaryBody: "Investor suppose see ambition and control together. Unsupported certainty dey destroy trust and procurement readiness.", claimedNow: "Wetin we fit defend now", notClaimed: "Blocked until evidence dey",
    claimedList: ["Working public product with accounts and role-based dashboard workflows.", "Frozen Riverine Watch v1 retrospective result for Lokoja and Makurdi.", "Reproducible national evidence architecture with guarded denominator."],
    blockedList: ["TRL 6 product readiness.", "Nationwide flood-prediction accuracy.", "Autonomous public warning authority.", "Verified avoided loss without customer outcome evidence."],
  },
  evidence: {
    eyebrow: "Public evidence room", title: "Wetin dey work, where limit dey, and wetin come next.", lead: "This page separate the live public product from Riverine Watch v1 shadow model. E no turn repository check into field evidence.", status: "Current status: pre-TRL6", statusBody: "Software dey work, but present evidence never prove say the product don operate for relevant field environment at TRL 6.",
    publicEngine: "Live public engine", publicEngineBody: "The derived-v2 decision-support engine dey power public risk check and signed-in dashboard workflow. E no be Riverine Watch v1.", shadowEngine: "Riverine Watch v1", shadowEngineBody: "Frozen 14-day riverine WATCH shadow candidate for Lokoja and Makurdi. E no get authority to replace public engine or send autonomous warning.",
    metric: "Metric", result: "Frozen result", meaning: "Wetin e mean", metricsTitle: "Frozen retrospective evidence", metricsBody: "These numbers describe one narrow past experiment. We show all together so 80% event-detection headline no go hide precision or false-alert performance.",
    eligibleEvents: "Eligible onset events", eligibleEventsMeaning: "Five documented events for the two-location retrospective scope.", detectedEvents: "Events detected", detectedEventsMeaning: "Four of five events cross the frozen WATCH threshold. E no be 80% accuracy.", precision: "Alert-episode precision", precisionMeaning: "About one from four deduplicated WATCH episodes match eligible event window.", falseAlerts: "False alert episodes", falseAlertsMeaning: "Frozen retrospective estimate per supported location-year.", ranking: "PR-AUC / ROC-AUC", rankingMeaning: "Issue-row ranking metrics. PR-AUC show the class-imbalance problem we still need improve.", sourceReplay: "Operational-source replay", sourceReplayMeaning: "Preserved NASA and GloFAS bundle score the same way after issue date. E prove compatibility, no be prospective validation.",
    claimsTitle: "Claim ledger", claimsBody: "Every sales statement must stay inside this boundary until prospective and field evidence change am.", supported: "Supported", blocked: "Not supported", supportedClaims: ["4 of 5 eligible past events detected retrospectively for Lokoja and Makurdi.", "Frozen 14-day WATCH horizon and 0.70 WATCH threshold.", "Deterministic scoring of preserved operational-source bundle."], blockedClaims: ["80% accuracy or 80% national accuracy.", "Prospectively validated public-warning performance.", "TRL 6 product readiness.", "Autonomous evacuation or warning authority."],
    nextTitle: "The shortest honest road to stronger readiness", nextBody: "Use disciplined prospective shadow evidence instead of waiting without evidence. This no manufacture TRL 6. E create faster, auditable path to field proof investors and institutions fit inspect.", steps: [
      { title: "1. Preserve every issue", body: "Store source time, source age, probability, state and WATCH episode before outcome dey known." },
      { title: "2. Run beside existing systems", body: "Use institution shadow pilots without replacing official authority or public warning." },
      { title: "3. Record the decision loop", body: "Capture owner, delivery channel, language, acknowledgement, action and verified outcome." },
      { title: "4. Promote only after review", body: "Require prospective performance, failure analysis, field usability and independent sign-off." },
    ], openDashboard: "Open the working dashboard", runPilot: "Design institution pilot",
  },
};

const ha: ProductProofCopy = {
  ...en,
  nav: { product: "Samfurin kai tsaye", evidence: "Shaida", investor: "Shaidar masu zuba jari", pilot: "Gwajin hukuma", signIn: "Shiga", register: "Ƙirƙiri asusu", dashboard: "Buɗe dashboard" },
  investor: {
    ...en.investor,
    eyebrow: "Samfuri da hujjar zuba jari a wuri guda", title: "Cibiyar yanke shawarar ambaliya ta Najeriya.", lead: "NaijaClimaGuard yana haɗa shaidar haɗari da kadarar da ke fuskantar haɗari, wanda ke da alhakin aiki, matakin da ake buƙata, shaidar isarwa da sakamakon da aka tabbatar. Hasashe bayanin shigarwa ne. Cikakken tsarin yanke shawara shi ne samfurin.",
    openProduct: "Yi amfani da samfurin kai tsaye", openDashboard: "Buɗe dashboard", inspectEvidence: "Duba shaidar", readinessLabel: "Matsayin shiri", readinessTitle: "Manhajar tana aiki. Shaida a bayyane take. Har yanzu ba TRL 6 ba.", readinessBody: "Samfuri, asusu, dashboard da tsarin duba haɗari na jama'a suna aiki. Riverine Watch v1 yana da iyakantacciyar shaidar baya a wurare biyu. Har yanzu ana gina shaidar ƙasa da ta gaba.",
    liveProduct: "Samfurin jama'a", liveProductNote: "Asusu, wuraren da aka ajiye, matakai bisa rawar mai amfani, faɗakarwa, rahoto da tarihin shaida.", shadowEvidence: "Shaidar shadow", shadowEvidenceNote: "An gano 4 daga cikin 5 na abubuwan fara ambaliya na tarihi a Lokoja da Makurdi. Gwajin baya kawai.", nationalFactory: "Masana'antar shaidar ƙasa", nationalFactoryNote: "Jihohi 36 da FCT sun yi rajista. Dole a duba abubuwan da siffofi kafin a buga maki na ƙasa.",
    demoEyebrow: "Yadda samfurin ke aiki", demoTitle: "Ga yadda cibiyar yanke shawara ke kammala zagaye guda.", demoBody: "Canja rawar mai amfani. Alamar da aka adana za ta zama wata shawarar kadara, mai alhaki, hanyar isarwa da bukatar shaida.", demoNotice: "Wannan gwaji ne da bayanan model da aka adana da kadarorin misali. Ba gargadi kai tsaye ba ne.", signalDetail: "NASA IMERG da GloFAS · sake gwajin 10 Agusta 2026 da aka adana · Makurdi WATCH 85.03%", roleLabel: "Mai alhakin shawara", roles: { household: "Iyali", farm: "Gona", business: "Kasuwanci", agency: "Hukuma" }, fields: { signal: "Shaidar haɗari", exposure: "Kadara mai haɗari", decision: "Matakin da aka ba da", delivery: "Isarwa zuwa mai amfani", proof: "Tabbacin isarwa da sakamako" },
    scenarios: {
      household: { exposure: "Gidan iyali na misali kusa da hanyar kogi", decision: "Ɗaga takardu da magunguna sama da alamar da aka sa. Duba gargadin hukuma.", delivery: "Saƙon murya na Pidgin da SMS ga lambar iyali da aka tabbatar", proof: "Ana neman amincewa. Ba a tabbatar da sakamako sai mai amfani ya rubuta shi." },
      farm: { exposure: "Ma'ajiyar masara da wurin dabbobi na misali", decision: "Kai buhunan amfanin gona ma'ajiyar da aka ɗaga. Ba shugaban gona aikin motsa dabbobi.", delivery: "Saƙon murya na Hausa da katin aiki na WhatsApp", proof: "Za a rubuta mai alhaki, lokacin kammalawa da darajar kayan da aka kare bayan tabbatarwa." },
      business: { exposure: "Rumbun kaya, haja da hanyar shiga na misali", decision: "Dakatar da kaya masu shigowa. Matsar da haja mai muhimmanci. Tura batun rufe hanya ga sashen aiki.", delivery: "Dashboard na aiki, imel da amincewar manaja", proof: "Shawara, mai alhaki, tabbacin isarwa da kuɗin cikas da aka tabbatar suna cikin rikodi guda." },
      agency: { exposure: "Unguwa, asibiti da hanyar shiga na misali", decision: "Duba tushe, ba da aikin tabbatarwa a fili, sannan a buga ta hanyoyin da aka ba izini kawai.", delivery: "Jerin umarni tare da matakin gaggawa da asalin bayanan da ba a canzawa", proof: "Ayyukan karɓa, amincewa, ɗagawa da warwarewa suna ci gaba da kasancewa abin dubawa." },
    },
    moatEyebrow: "Dalilin da ya sa fa'ida ke ƙaruwa", moatTitle: "Ana iya kwafin hasashe. Ba a iya kwafin tarihin aikin shawara nan take.", moatBody: "Babbar kadara ita ce rikodi mai izini da ke haɗa shaida, kadara, ƙa'ida, harshe, isarwa, aiki da sakamakon tattalin arziki a yanayin Najeriya.", moatItems: [
      { title: "Mai zaɓar shaida", body: "Zaɓi alama mafi ƙarfi da aka ba izini tare da adana lokacin fitowa, sabo, gazawa da asali." },
      { title: "Taswirar Tasirin Najeriya", body: "Haɗa kadarori, mutane, haja, wurare, hanyoyi da dogaro na kowane abokin ciniki." },
      { title: "Mai gina ƙa'idar shawara", body: "Mayar da tsarin aiki zuwa masu alhaki, matakai, wa'adi da dokokin ɗagawa bisa rawar mai amfani." },
      { title: "Littafin sakamako", body: "Haɗa alama da isarwa, aikin da aka kammala da sakamakon aiki ko kuɗi da aka tabbatar." },
    ],
    comparisonTitle: "Dole bambancin ya bayyana a cikin samfurin.", comparisonBody: "NaijaClimaGuard ba ya buƙatar yin kamar hukumomin ƙasa ko tsarin hasashen duniya ba su wanzu. Dole ya sa alamominsu mafi ƙarfi da aka ba izini su zama masu amfani ga shawarar Najeriya, sannan ya tabbatar da sakamakon.", forecastQuestion: "Samfurin hasashe yana tambaya", forecastAnswer: "A ina kuma yaushe ambaliya za ta iya faruwa?", networkQuestion: "NaijaClimaGuard dole ya amsa", networkAnswer: "Wace kadara ce ke haɗari, wa ke da aikin gaba, shin gargadin ya isa cikin harshen da aka fahimta, an kammala aikin, kuma wace daraja aka kare da gaske?",
    economicsTitle: "Ana auna darajar tattalin arziki bayan aiki, ba a ƙirƙira ta kafin aiki ba.", economicsBody: "Bayanan ƙasa ma'aunin girman kasuwa ne. Ba kuɗin shiga na NaijaClimaGuard ba ne kuma ba ikirarin tanadi ba ne.", damageReference: "Ma'aunin lalacewar ambaliya kai tsaye na Bankin Duniya na 2022", populationReference: "Ma'aunin yawan jama'a na WorldPop 2025 a jihohi 36 da FCT", sensitivity: "Misalin yiwuwar darajar da aka kare", sensitivityNote: "0.5%, 1%, 2% da 5% tsare-tsare ne kawai. Ana ikirarin sakamakon abokin ciniki bayan tabbatarwa.", fundingTitle: "Abin da £150,000 zai saya", fundingBody: "Ba wata taswirar ambaliya ta gama-gari ba. Kuɗin zai gina cikakken tsarin da ya dace da sayen hukuma da shaidar sayarwa cikin alhaki.", fundingLabels: ["Samfuri da injiniya", "Bayanai da kayayyakin aiki", "Gwamnati da haɗin gwiwa", "Talla da shaidar abokin ciniki", "Doka da bin ƙa'ida", "Ajiyar gaggawa"], output: "Sakamakon karɓa", boundaryTitle: "Iyakar ikirari wani ɓangare ne na samfurin.", boundaryBody: "Mai zuba jari ya ga buri da iko a lokaci guda. Tabbacin da ba shi da shaida yana lalata amana.", claimedNow: "Abin da za a iya karewa yanzu", notClaimed: "An toshe har sai shaida ta samu", claimedList: ["Samfurin jama'a mai aiki da asusu da dashboard bisa rawar mai amfani.", "Sakamakon gwajin baya na Riverine Watch v1 a Lokoja da Makurdi.", "Tsarin shaidar ƙasa mai maimaituwa da adadin da ake tsarewa."], blockedList: ["Shirin samfurin TRL 6.", "Daidaiton hasashen ambaliya na ƙasa.", "Ikon gargadin jama'a ta atomatik.", "Asarar da aka kauce wa ba tare da shaidar sakamakon abokin ciniki ba."],
  },
  evidence: {
    ...en.evidence,
    eyebrow: "Dakin shaidar jama'a", title: "Abin da ke aiki, abin da ke da iyaka, da mataki na gaba.", lead: "Wannan shafin yana raba samfurin jama'a mai aiki da Riverine Watch v1 shadow model. Ba ya mayar da gwajin repository ya zama shaidar fili.", status: "Matsayi yanzu: kafin TRL 6", statusBody: "Manhajar tana aiki, amma shaidar yanzu ba ta tabbatar da samfurin yana aiki a yanayin fili mai dacewa a TRL 6 ba.", publicEngine: "Engine na jama'a mai aiki", publicEngineBody: "derived-v2 decision-support engine yana ba da duba haɗari na jama'a da dashboard na masu shiga. Ba Riverine Watch v1 ba ne.", shadowEngine: "Riverine Watch v1", shadowEngineBody: "Frozen 14-day riverine WATCH shadow candidate ne ga Lokoja da Makurdi. Ba shi da izinin maye gurbin public engine ko aika gargadi kai tsaye.", metric: "Ma'auni", result: "Sakamakon da aka kulle", meaning: "Ma'anarsa", metricsTitle: "Shaidar gwajin baya da aka kulle", metricsBody: "Waɗannan lambobin gwaji ɗaya ne mai iyaka. Ana nuna su tare domin 80% event detection kada ya ɓoye precision ko false alerts.", eligibleEvents: "Eligible onset events", eligibleEventsMeaning: "Abubuwa biyar da aka rubuta a gwajin baya na wurare biyu.", detectedEvents: "Abubuwan da aka gano", detectedEventsMeaning: "Huɗu daga biyar sun wuce frozen WATCH threshold. Wannan ba 80% accuracy ba ne.", precision: "Alert-episode precision", precisionMeaning: "Kusan ɗaya daga cikin WATCH episodes huɗu ya dace da eligible event window.", falseAlerts: "False alert episodes", falseAlertsMeaning: "Frozen retrospective estimate ga kowane supported location-year.", ranking: "PR-AUC / ROC-AUC", rankingMeaning: "Ma'aunin ranking na issue rows. PR-AUC yana nuna matsalar rashin daidaiton aji da har yanzu ake gyarawa.", sourceReplay: "Operational-source replay", sourceReplayMeaning: "NASA da GloFAS bundle da aka adana ya samu deterministic score bayan issue date. Yana tabbatar da compatibility, ba prospective validation ba.", claimsTitle: "Littafin ikirari", claimsBody: "Dole kowace magana ta tallace-tallace ta tsaya a wannan iyaka har prospective da field evidence su canza ta.", supported: "An goyi bayan", blocked: "Ba a goyi bayan ba", supportedClaims: ["An gano 4 daga 5 eligible historical events a gwajin baya na Lokoja da Makurdi.", "Frozen 14-day WATCH horizon da 0.70 WATCH threshold.", "Deterministic scoring na preserved operational-source bundle."], blockedClaims: ["80% accuracy ko 80% national accuracy.", "Prospectively validated public-warning performance.", "Shirin samfurin TRL 6.", "Ikon evacuation ko warning ta atomatik."], nextTitle: "Hanya mafi gajarta kuma gaskiya zuwa shiri mafi ƙarfi", nextBody: "Amfani da disciplined prospective shadow evidence maimakon jira ba tare da shaida ba ba ya ƙirƙirar TRL 6. Yana gina hanya mai sauri da auditable zuwa field proof.", steps: [
      { title: "1. Ajiye kowane issue", body: "Ajiye source time, source age, probability, state da WATCH episode kafin a san outcome." },
      { title: "2. Yi aiki tare da tsarin da ke akwai", body: "Yi institution shadow pilots ba tare da maye gurbin official authority ko public warning ba." },
      { title: "3. Rubuta decision loop", body: "Ajiye owner, delivery channel, language, acknowledgement, action da verified outcome." },
      { title: "4. Ɗaga matsayi bayan review", body: "Bukaci prospective performance, failure analysis, field usability da independent sign-off." },
    ], openDashboard: "Buɗe dashboard mai aiki", runPilot: "Tsara gwajin hukuma",
  },
};

const yo: ProductProofCopy = {
  ...ha,
  nav: { product: "Ọjà tó ń ṣiṣẹ́", evidence: "Ẹ̀rí", investor: "Ẹ̀rí olùdókòwò", pilot: "Àdánwò ilé-iṣẹ́", signIn: "Wọlé", register: "Ṣẹ̀dá àkọọlẹ̀", dashboard: "Ṣí dashboard" },
  investor: {
    ...ha.investor,
    eyebrow: "Ọjà àti ẹ̀rí ìdókòwò ní ojú kan", title: "Nẹ́tíwọ̀ọ̀kì ìpinnu ìkún omi Nàìjíríà.", lead: "NaijaClimaGuard ń so ẹ̀rí ewu pọ̀ mọ́ ohun-ìní tó wà nínú ewu, ẹni tó ni ojúṣe, ìgbésẹ̀ tó yẹ, ẹ̀rí pé ìkìlọ̀ dé, àti èsì tí a fìdí rẹ̀ múlẹ̀. Àsọtẹ́lẹ̀ jẹ́ input. Ìyíká ìpinnu tó pé ni ọjà náà.",
    openProduct: "Lo ọjà tó ń ṣiṣẹ́", openDashboard: "Ṣí dashboard", inspectEvidence: "Ṣàyẹ̀wò ẹ̀rí", readinessLabel: "Ipo ìmúrasílẹ̀", readinessTitle: "Software ń ṣiṣẹ́. Ẹ̀rí hàn gbangba. Kò tíì jẹ́ TRL 6.", readinessBody: "Ọjà, àkọọlẹ̀, dashboard àti ọ̀nà ewu gbogbo ènìyàn ń ṣiṣẹ́. Riverine Watch v1 ní ẹ̀rí ìtàn tó lopin ní ibi méjì. A ṣì ń kọ́ ẹ̀rí orílẹ̀-èdè àti prospective.",
    liveProduct: "Ọjà gbogbo ènìyàn", liveProductNote: "Àkọọlẹ̀, ibi tí a fipamọ́, ìgbésẹ̀ gẹ́gẹ́ bí ipa, ìkìlọ̀, ìròyìn àti itan ẹ̀rí.", shadowEvidence: "Ẹ̀rí shadow", shadowEvidenceNote: "Ó rí 4 nínú 5 eligible historical onset events ní Lokoja àti Makurdi. Retrospective nìkan.", nationalFactory: "Ilé-iṣẹ́ ẹ̀rí orílẹ̀-èdè", nationalFactoryNote: "Ìpínlẹ̀ 36 àti FCT ti forúkọ sílẹ̀. Events àti features gbọdọ̀ kọjá review kí a tó tẹ national score jáde.",
    demoEyebrow: "Bí ọjà ṣe ń ṣiṣẹ́", demoTitle: "Wo nẹ́tíwọ̀ọ̀kì ìpinnu parí ìyíká kan.", demoBody: "Yí ipa olùlò padà. Signal kan náà yóò di ìpinnu ohun-ìní, ẹni tó ni ojúṣe, ọ̀nà ìfiránṣẹ́ àti ẹ̀rí tó yàtọ̀.", demoNotice: "Àfihàn ni yìí pẹ̀lú model replay tí a fipamọ́ àti sample assets. Kì í ṣe live warning.", signalDetail: "NASA IMERG àti GloFAS · replay ọjọ́ 10 August 2026 tí a fipamọ́ · Makurdi WATCH 85.03%", roleLabel: "Ẹni tó ni ìpinnu", roles: { household: "Ìdílé", farm: "Oko", business: "Iṣòwò", agency: "Ilé-iṣẹ́" }, fields: { signal: "Ẹ̀rí ewu", exposure: "Ohun-ìní tó wà nínú ewu", decision: "Ìgbésẹ̀ tí a yàn", delivery: "Bí ìkìlọ̀ ṣe dé", proof: "Ìmúdájú àti èsì" },
    scenarios: {
      household: { exposure: "Ilé ìdílé àpẹẹrẹ lẹ́gbẹ̀ẹ́ ọ̀nà odò", decision: "Gbé ìwé àti òògùn sókè ju àmì lọ. Ṣàyẹ̀wò ìkìlọ̀ ìjọba.", delivery: "Ohùn Pidgin àti SMS sí olubasọrọ ìdílé tí a fìdí múlẹ̀", proof: "A béèrè ìmúdájú. A kò fìdí èsì múlẹ̀ títí olùlò fi kọ ọ́ sílẹ̀." },
      farm: { exposure: "Ibi ìpamọ́ àgbàdo àti àgọ́ ẹran àpẹẹrẹ", decision: "Gbé àpò irúgbìn sí ibi ìpamọ́ tó ga. Fi gbigbe ẹran lé olórí oko lọ́wọ́.", delivery: "Ohùn Hausa àti WhatsApp task card", proof: "A kọ ẹni tó ni ojúṣe, àkókò ìparí àti iye ohun tí a dáàbò bo lẹ́yìn verification." },
      business: { exposure: "Depot, stock àti ọ̀nà iwọlé àpẹẹrẹ", decision: "Dá incoming delivery dúró. Gbé priority stock. Gbé road closure lọ sí operations.", delivery: "Operations dashboard, email àti manager acknowledgement", proof: "Ìpinnu, owner, delivery receipt àti verified disruption cost wà nínú record kan." },
      agency: { exposure: "Ward, clinic àti ọ̀nà iwọlé àpẹẹrẹ", decision: "Ṣàyẹ̀wò source, yan field verification, kí o sì tẹ̀jáde nípasẹ̀ authorised channels nìkan.", delivery: "Command queue pẹ̀lú escalation àti source provenance tí kò yí padà", proof: "Received, acknowledged, escalated àti resolved actions wà fún audit." },
    },
    moatEyebrow: "Ìdí tí àǹfààní fi ń pọ̀", moatTitle: "A lè da forecast kọ. A kò lè da decision-performance history kọ ní kíákíá.", moatBody: "Ohun-ìní tó lágbára ni permissioned record tó so evidence, exposure, policy, language, delivery, action àti economic outcome pọ̀ ní ipò iṣẹ́ Nàìjíríà.", moatItems: [
      { title: "Evidence router", body: "Yan authorised signal tó lágbára jù, kí o pa issue time, freshness, failure state àti provenance mọ́." },
      { title: "Nigeria Impact Graph", body: "Ṣe àwòrán assets, people, stock, facilities, roads àti dependencies ti oníbàárà." },
      { title: "Decision Policy Compiler", body: "Yí operating procedure padà sí owners, actions, deadlines àti escalation rules fún ipa kọọkan." },
      { title: "Outcome Ledger", body: "So signal pọ̀ mọ́ delivery, completed action àti verified operational tàbí financial outcome." },
    ],
    comparisonTitle: "Ìyàtọ̀ gbọdọ̀ hàn nínú ọjà.", comparisonBody: "NaijaClimaGuard kò nílò láti sọ pé national agencies tàbí global forecast systems kò sí. Ó gbọdọ̀ jẹ́ kí authorised signals wọn wúlò fún ìpinnu Nàìjíríà, kí ó sì fi èsì hàn.", forecastQuestion: "Forecast product ń béèrè", forecastAnswer: "Níbo àti ìgbà wo ni ìkún omi lè ṣẹlẹ̀?", networkQuestion: "NaijaClimaGuard gbọdọ̀ dáhùn", networkAnswer: "Ohun-ìní wo ló wà nínú ewu, ta ni ó ni ìgbésẹ̀ tó kàn, ṣé ìkìlọ̀ dé ní èdè tó ye e, ṣé wọ́n parí ìgbésẹ̀, iye wo ni wọ́n dáàbò bo?",
    economicsTitle: "A ń wọn iye ọrọ̀-ajé lẹ́yìn ìgbésẹ̀, a kò dá a sílẹ̀ ṣáájú.", economicsBody: "National baseline jẹ́ reference fún market exposure. Kì í ṣe revenue NaijaClimaGuard, kì í sì ṣe savings claim.", damageReference: "World Bank 2022 median direct flood-damage reference", populationReference: "WorldPop 2025 population baseline fún ìpínlẹ̀ 36 àti FCT", sensitivity: "Illustrative protected-value sensitivity", sensitivityNote: "0.5%, 1%, 2% àti 5% jẹ́ planning scenarios nìkan. A sọ customer outcome lẹ́yìn verification.", fundingTitle: "Ohun tí £150,000 ń rà", fundingBody: "Kì í ṣe flood map míì. Owó náà ń kọ procurement-grade closed loop àti ẹ̀rí láti tà á pẹ̀lú ojúṣe.", fundingLabels: ["Ọjà àti engineering", "Data àti infrastructure", "Ìjọba àti partnership", "Sales àti customer proof", "Legal àti compliance", "Contingency"], output: "Acceptance output", boundaryTitle: "Ààlà claim jẹ́ apá ọjà.", boundaryBody: "Olùdókòwò gbọdọ̀ rí ambition àti control pọ̀. Certainty tí kò ní evidence ń ba trust jẹ́.", claimedNow: "Ohun tí a lè fi ẹ̀rí gbè nísinsìnyí", notClaimed: "A dí i títí ẹ̀rí fi wà", claimedList: ["Working public product pẹ̀lú accounts àti role-based dashboard workflows.", "Frozen Riverine Watch v1 retrospective result fún Lokoja àti Makurdi.", "Reproducible national evidence architecture pẹ̀lú guarded denominator."], blockedList: ["TRL 6 product readiness.", "Nationwide flood-prediction accuracy.", "Autonomous public warning authority.", "Verified avoided loss láìsí customer outcome evidence."],
  },
  evidence: {
    ...ha.evidence,
    eyebrow: "Yàrá ẹ̀rí gbogbo ènìyàn", title: "Ohun tó ń ṣiṣẹ́, ibi tí ààlà wà, àti ohun tó kàn.", lead: "Ojúewé yìí ya live public product sọ́tọ̀ kúrò ní Riverine Watch v1 shadow model. Kò yí repository check padà sí field evidence.", status: "Ipo lọwọlọwọ: kí TRL 6 tó dé", statusBody: "Software ń ṣiṣẹ́, ṣùgbọ́n ẹ̀rí lọwọlọwọ kò tíì fi hàn pé ọjà ń ṣiṣẹ́ ní relevant field environment ní TRL 6.", publicEngine: "Live public engine", publicEngineBody: "derived-v2 decision-support engine ń ṣiṣẹ́ fún public risk checks àti signed-in dashboard workflows. Kì í ṣe Riverine Watch v1.", shadowEngine: "Riverine Watch v1", shadowEngineBody: "Frozen 14-day riverine WATCH shadow candidate fún Lokoja àti Makurdi. Kò ní aṣẹ láti rọ́pò public engine tàbí fi autonomous warning ránṣẹ́.", metric: "Ìwọ̀n", result: "Frozen result", meaning: "Ìtumọ̀ rẹ̀", metricsTitle: "Frozen retrospective evidence", metricsBody: "Àwọn nọ́mbà wọ̀nyí ṣàlàyé narrow historical experiment kan. A fi gbogbo wọn hàn kí 80% event detection má bàa bo precision tàbí false alerts.", eligibleEvents: "Eligible onset events", eligibleEventsMeaning: "Events márùn-ún tí a kọ sílẹ̀ fún two-location retrospective scope.", detectedEvents: "Events tí a rí", detectedEventsMeaning: "Mẹ́rin nínú márùn-ún kọjá frozen WATCH threshold. Kì í ṣe 80% accuracy.", precision: "Alert-episode precision", precisionMeaning: "Nǹkan bí ọkan nínú WATCH episodes mẹ́rin ló bá eligible event window mu.", falseAlerts: "False alert episodes", falseAlertsMeaning: "Frozen retrospective estimate fún supported location-year kọọkan.", ranking: "PR-AUC / ROC-AUC", rankingMeaning: "Issue-row ranking metrics. PR-AUC fi class-imbalance challenge tó ṣì nílò ìmúdára hàn.", sourceReplay: "Operational-source replay", sourceReplayMeaning: "Preserved NASA àti GloFAS bundle gba deterministic score lẹ́yìn issue date. Ó fi compatibility hàn, kì í ṣe prospective validation.", claimsTitle: "Claim ledger", claimsBody: "Gbogbo sales statement gbọdọ̀ dúró nínú ààlà yìí títí prospective àti field evidence fi yí i padà.", supported: "A lè fi ẹ̀rí gbè", blocked: "A kò lè fi ẹ̀rí gbè", supportedClaims: ["4 nínú 5 eligible historical events detected retrospectively ní Lokoja àti Makurdi.", "Frozen 14-day WATCH horizon àti 0.70 WATCH threshold.", "Deterministic scoring ti preserved operational-source bundle."], blockedClaims: ["80% accuracy tàbí 80% national accuracy.", "Prospectively validated public-warning performance.", "TRL 6 product readiness.", "Autonomous evacuation tàbí warning authority."], nextTitle: "Ọ̀nà tó kuru àti tòótọ́ sí readiness tó lágbára", nextBody: "Lílo disciplined prospective shadow evidence dípò dídúró láìsí evidence kò dá TRL 6 sílẹ̀. Ó ń kọ́ faster, auditable path sí field proof.", steps: [
      { title: "1. Pa gbogbo issue mọ́", body: "Store source time, source age, probability, state àti WATCH episode kí outcome tó hàn." },
      { title: "2. Ṣiṣẹ́ lẹ́gbẹ̀ẹ́ existing systems", body: "Lo institution shadow pilots láì rọ́pò official authority tàbí public warning." },
      { title: "3. Kọ decision loop sílẹ̀", body: "Capture owner, delivery channel, language, acknowledgement, action àti verified outcome." },
      { title: "4. Promote lẹ́yìn review nìkan", body: "Require prospective performance, failure analysis, field usability àti independent sign-off." },
    ], openDashboard: "Ṣí dashboard tó ń ṣiṣẹ́", runPilot: "Ṣe institutional pilot",
  },
};

const ig: ProductProofCopy = {
  ...yo,
  nav: { product: "Ngwaahịa live", evidence: "Evidence", investor: "Investor proof", pilot: "Institutional pilot", signIn: "Banye", register: "Mepụta account", dashboard: "Mepee dashboard" },
  investor: {
    ...yo.investor,
    eyebrow: "Ngwaahịa na investment case jikọtara", title: "Nigeria flood decision network.", lead: "NaijaClimaGuard na-ejikọ hazard evidence na asset nọ n'ihe ize ndụ, onye nwere ọrụ, action achọrọ, proof of delivery na outcome a kwadoro. Forecast bụ input. Closed decision loop bụ ngwaahịa ahụ.", openProduct: "Jiri live product", openDashboard: "Mepee dashboard", inspectEvidence: "Lelee evidence", readinessLabel: "Readiness position", readinessTitle: "Software na-arụ ọrụ. Evidence doro anya. Ọ kabeghị TRL 6.", readinessBody: "Product, accounts, dashboard na public risk workflow na-arụ ọrụ. Riverine Watch v1 nwere limited retrospective evidence n'ebe abụọ. A ka na-ewu national na prospective proof.",
    liveProduct: "Public product", liveProductNote: "Accounts, saved locations, role-based actions, alerts, reports na evidence history.", shadowEvidence: "Shadow evidence", shadowEvidenceNote: "Ọ chọpụtara 4 n'ime 5 eligible historical onset events na Lokoja na Makurdi. Retrospective naanị.", nationalFactory: "National evidence factory", nationalFactoryNote: "States 36 na FCT edebanyela. Events na features ga-agafe review tupu national score apụta.", demoEyebrow: "Otu product si arụ ọrụ", demoTitle: "Lee decision network mechaa otu loop.", demoBody: "Gbanwee user role. Otu preserved signal ahụ ga-abụ asset decision, owner, delivery route na proof requirement dị iche.", demoNotice: "Nke a bụ demonstration na preserved model replay na sample assets. Ọ bụghị live warning.", signalDetail: "NASA IMERG na GloFAS · replay 10 August 2026 e debere · Makurdi WATCH 85.03%", roleLabel: "Onye nwere decision", roles: { household: "Ezinụlọ", farm: "Ubi", business: "Business", agency: "Agency" }, fields: { signal: "Hazard evidence", exposure: "Asset nọ n'ihe ize ndụ", decision: "Action e kenyere", delivery: "Last-mile delivery", proof: "Receipt na outcome" },
    scenarios: {
      household: { exposure: "Sample family house nso river corridor", decision: "Bulie documents na medicines elu karịa akara. Lelee official warning.", delivery: "Pidgin voice na SMS nye verified household contact", proof: "A rịọrọ acknowledgement. Outcome anaghị enweta verification ruo mgbe user dekọrọ ya." },
      farm: { exposure: "Sample maize store na livestock pen", decision: "Bugharịa bagged stock gaa raised store. Nye farm lead ọrụ livestock movement.", delivery: "Hausa voice na WhatsApp task card", proof: "A na-edekọ owner, completion time na protected stock value mgbe verification gasịrị." },
      business: { exposure: "Sample depot, stock na access road", decision: "Kwụsị inbound deliveries. Bugharịa priority stock. Escalate road closure nye operations.", delivery: "Operations dashboard, email na manager acknowledgement", proof: "Decision, owner, delivery receipt na verified disruption cost nọ n'otu record." },
      agency: { exposure: "Sample ward, clinic na access route", decision: "Review source, assign field verification ma bipụta naanị site na authorised channels.", delivery: "Command queue na escalation na immutable source provenance", proof: "Received, acknowledged, escalated na resolved actions ka dị auditable." },
    },
    moatEyebrow: "Ihe mere advantage ji eto", moatTitle: "Enwere ike iṅomi forecast. Enweghị ike iṅomi decision-performance history ngwa ngwa.", moatBody: "Asset siri ike bụ permissioned record jikọtara evidence, exposure, policy, language, delivery, action na economic outcome n'okpuru Nigerian operating conditions.", moatItems: [
      { title: "Evidence router", body: "Họrọ strongest authorised signal ma debe issue time, freshness, failure state na provenance." },
      { title: "Nigeria Impact Graph", body: "Map assets, people, stock, facilities, roads na dependencies nke customer ọ bụla." },
      { title: "Decision Policy Compiler", body: "Gbanwee operating procedure ka ọ bụrụ owners, actions, deadlines na escalation rules maka role ọ bụla." },
      { title: "Outcome Ledger", body: "Jikọta signal na delivery, completed action na verified operational ma ọ bụ financial outcome." },
    ],
    comparisonTitle: "Difference ga-apụta n'ime product.", comparisonBody: "NaijaClimaGuard achọghị ime ka national agencies ma ọ bụ global forecast systems adịghị. Ọ ga-eme ka strongest authorised signals ha baa uru maka Nigerian decision ọ bụla ma gosi result.", forecastQuestion: "Forecast product na-ajụ", forecastAnswer: "Ebee na mgbe flood nwere ike ime?", networkQuestion: "NaijaClimaGuard ga-aza", networkAnswer: "Kedu asset nọ n'ihe ize ndụ, onye nwere next action, warning ruru ya n'asụsụ ọ ghọtara, emechara action, gịnị ka e chebere n'ezie?",
    economicsTitle: "A na-atụ economic value mgbe action gasịrị, anaghị emepụta ya tupu action.", economicsBody: "National baseline bụ market exposure reference. Ọ bụghị NaijaClimaGuard revenue ma ọ bụghị savings claim.", damageReference: "World Bank 2022 median direct flood-damage reference", populationReference: "WorldPop 2025 population baseline maka states 36 na FCT", sensitivity: "Illustrative protected-value sensitivity", sensitivityNote: "0.5%, 1%, 2% na 5% bụ planning scenarios naanị. A na-claim customer outcome mgbe verification gasịrị.", fundingTitle: "Ihe £150,000 na-azụta", fundingBody: "Ọ bụghị generic flood map ọzọ. Round a na-ewu procurement-grade closed loop na evidence iji ree ya responsibly.", fundingLabels: ["Product na engineering", "Data na infrastructure", "Government na partnerships", "Sales na customer proof", "Legal na compliance", "Contingency"], output: "Acceptance output", boundaryTitle: "Claim boundary bụ akụkụ product.", boundaryBody: "Investor kwesịrị ịhụ ambition na control ọnụ. Unsupported certainty na-emebi trust.", claimedNow: "Ihe anyị nwere ike ịkwado ugbu a", notClaimed: "Blocked ruo mgbe evidence dị", claimedList: ["Working public product na accounts na role-based dashboard workflows.", "Frozen Riverine Watch v1 retrospective result maka Lokoja na Makurdi.", "Reproducible national evidence architecture na guarded denominator."], blockedList: ["TRL 6 product readiness.", "Nationwide flood-prediction accuracy.", "Autonomous public warning authority.", "Verified avoided loss na-enweghị customer outcome evidence."],
  },
  evidence: {
    ...yo.evidence,
    eyebrow: "Public evidence room", title: "Ihe na-arụ ọrụ, ebe limit dị, na ihe na-esote.", lead: "Page a na-ekewa live public product na Riverine Watch v1 shadow model. Ọ naghị agbanwe repository check ka ọ bụrụ field evidence.", status: "Current status: pre-TRL6", statusBody: "Software na-arụ ọrụ, mana present evidence egosibeghị na product na-arụ ọrụ n'ime relevant field environment na TRL 6.", publicEngine: "Live public engine", publicEngineBody: "derived-v2 decision-support engine na-arụ public risk checks na signed-in dashboard workflows. Ọ bụghị Riverine Watch v1.", shadowEngine: "Riverine Watch v1", shadowEngineBody: "Frozen 14-day riverine WATCH shadow candidate maka Lokoja na Makurdi. Enweghị ikike dochie public engine ma ọ bụ izipu autonomous warning.", metric: "Metric", result: "Frozen result", meaning: "Ihe ọ pụtara", metricsTitle: "Frozen retrospective evidence", metricsBody: "Numbers ndị a bụ otu narrow historical experiment. A na-egosi ha ọnụ ka 80% event detection ghara izochi precision ma ọ bụ false alerts.", eligibleEvents: "Eligible onset events", eligibleEventsMeaning: "Events ise edekọtara n'ime two-location retrospective scope.", detectedEvents: "Events detected", detectedEventsMeaning: "Anọ n'ime ise gafere frozen WATCH threshold. Ọ bụghị 80% accuracy.", precision: "Alert-episode precision", precisionMeaning: "Ihe dị ka otu n'ime WATCH episodes anọ dabara eligible event window.", falseAlerts: "False alert episodes", falseAlertsMeaning: "Frozen retrospective estimate kwa supported location-year.", ranking: "PR-AUC / ROC-AUC", rankingMeaning: "Issue-row ranking metrics. PR-AUC na-egosi class-imbalance challenge ka chọrọ improvement.", sourceReplay: "Operational-source replay", sourceReplayMeaning: "Preserved NASA na GloFAS bundle nwetara deterministic score mgbe issue date gasịrị. Ọ na-egosi compatibility, ọ bụghị prospective validation.", claimsTitle: "Claim ledger", claimsBody: "Sales statement ọ bụla ga-anọ n'ime boundary a ruo mgbe prospective na field evidence gbanwere ya.", supported: "Supported", blocked: "Not supported", supportedClaims: ["4 n'ime 5 eligible historical events detected retrospectively na Lokoja na Makurdi.", "Frozen 14-day WATCH horizon na 0.70 WATCH threshold.", "Deterministic scoring nke preserved operational-source bundle."], blockedClaims: ["80% accuracy ma ọ bụ 80% national accuracy.", "Prospectively validated public-warning performance.", "TRL 6 product readiness.", "Autonomous evacuation ma ọ bụ warning authority."], nextTitle: "Ụzọ kacha mkpụmkpụ na eziokwu ruo stronger readiness", nextBody: "Iji disciplined prospective shadow evidence kama ichere na-enweghị evidence anaghị emepụta TRL 6. Ọ na-ewu faster, auditable path ruo field proof.", steps: [
      { title: "1. Debe issue ọ bụla", body: "Store source time, source age, probability, state na WATCH episode tupu outcome amata." },
      { title: "2. Gbaa n'akụkụ existing systems", body: "Jiri institution shadow pilots na-enweghị dochie official authority ma ọ bụ public warning." },
      { title: "3. Dekọọ decision loop", body: "Capture owner, delivery channel, language, acknowledgement, action na verified outcome." },
      { title: "4. Promote naanị mgbe review gasịrị", body: "Require prospective performance, failure analysis, field usability na independent sign-off." },
    ], openDashboard: "Mepee dashboard na-arụ ọrụ", runPilot: "Hazie institutional pilot",
  },
};

export const PRODUCT_PROOF_COPY: Record<AppLocale, ProductProofCopy> = { en, pcm, ha, yo, ig };
