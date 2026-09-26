/**
 * Every message FloodPass sends, in plain words.
 * Rules: short sentences, no markdown asterisks (WhatsApp shows them raw on
 * some phones), always say who said it, never say "safe".
 * Pidgin text should be read by a native speaker before launch; Hausa, Yoruba
 * and Igbo must be written by native speakers, not machine-translated.
 */

export type FpLang = "en" | "pcm";

export const SUPPORTED_LANGS: FpLang[] = ["en", "pcm"];

export function asLang(value: unknown): FpLang {
  return value === "pcm" ? "pcm" : "en";
}

type Vars = Record<string, string | number>;

const TEXT: Record<FpLang, Record<string, string>> = {
  en: {
    welcome: "Welcome to FloodPass. We warn you before floods on your street, and give you proof when a flood hits you, so help can reach you. We keep your phone number, the place you share, and photos you send as flood proof. Reply YES to agree. Reply STOP any time to leave and delete it all.",
    consentAgain: "To start, reply YES. To leave, reply STOP.",
    language: "Which language? Reply 1 for English. Reply 2 for Pidgin. Hausa, Yoruba and Igbo are coming.",
    location: "Please share the place you want us to watch, like your home or shop. Tap the paperclip or plus button, choose Location, then send your current location.",
    locationTyped: "Please send the location pin, not the name. Tap the paperclip or plus button, choose Location, then send your current location.",
    ready: "Done. We are watching {place}. If you see flood water, send WATER or a photo of it. Send a FloodPass code to check it. Send HELP for the menu.",
    moved: "Got it. We are now watching {place}.",
    askDepth: "How deep is the water? Reply 1 for ankle, 2 for knee, 3 for waist, 4 for car roof.",
    askDepthAgain: "Please reply with a number: 1 ankle, 2 knee, 3 waist, 4 car roof.",
    photoSaved: "Photo saved. How deep is the water? Reply 1 for ankle, 2 for knee, 3 for waist, 4 for car roof.",
    verified: "Thank you. Your report is VERIFIED. Your FloodPass is {code}. Show this code to your bank, insurer, landlord or a charity. Anyone can check it at {url}. Forward this to your street group so your neighbours stay alert.",
    likely: "Thank you. We are checking your report ({score} of 100 points). When a neighbour confirms it, we will send your FloodPass code. If you can, send a photo of the water.",
    unconfirmed: "Thank you. We saved your report ({score} of 100 points). We cannot confirm it yet. A photo and reports from neighbours help. If water is rising, move people and valuables to high ground now.",
    neighbourVerified: "Good news. Your earlier flood report is now VERIFIED. Your FloodPass is {code}. Anyone can check it at {url}.",
    checkFound: "FloodPass {code}: VERIFIED. {place}, {date}. Water {depth}. Checks passed: {passed} of {total}.",
    checkRevoked: "FloodPass {code} was CANCELLED and is not valid.",
    checkMissing: "We found no FloodPass with the code {code}. Please check the code and try again.",
    help: "FloodPass menu. Send WATER to report a flood, or a photo of the water. Send a FloodPass code to check it. Send a new location pin to change your place. Send DRAIN to report a blocked drain and earn Hero points. Send SAFE to tell your family you are safe. Send PLANS for extras. Send LANGUAGE to change language. Send STOP to leave.",
    stop: "You have left FloodPass. We deleted your number and your place. Send HI any time to join again.",
    notReady: "FloodPass is being switched on. Please try again soon.",
    error: "Sorry, something went wrong on our side. Please try again in a minute.",
    forward: "Forward this to your street group.",
    replyOne: "Reply 1 if water enters your house.",
    locationSms: "Reply with your area and state, for example: Gudu Abuja, or Kosofe Lagos.",
    placeNotFound: "We could not find \"{text}\". Please send your area and state, for example: Gudu Abuja.",
    helpSms: "FloodPass: send WATER to report a flood. Send a FloodPass code to check it. Send your area and state to change your place. Send SAFE to tell family you are safe. Send STOP to leave.",
    drainAsk: "Drain Heroes: send a photo of the blocked drain. If you are not at home, send your location pin first. Send CANCEL to stop.",
    drainNeedsPhoto: "A blocked drain needs a photo. Please use FloodPass on WhatsApp or the website: {url}",
    drainSaved: "Thank you. Blocked drain {code} is saved at {place}. When it is cleaned, send CLEANED {code} with a photo. Neighbours can send CONFIRM {code}.",
    cleanAsk: "Now send a photo of drain {code} after cleaning. Send CANCEL to stop.",
    cleanSaved: "Thank you. Drain {code} is marked cleaned. When 2 neighbours send CONFIRM {code}, it is verified and the cleaner gets {points} Hero points.",
    drainVerified: "Drain {code} is VERIFIED clean. Well done, Drain Hero. You earned {points} points. Send POINTS to see your total.",
    confirmSaved: "Thank you for checking drain {code}. You earned {points} points.",
    confirmOwn: "You cannot confirm a drain you reported or cleaned. Ask a neighbour.",
    confirmFar: "You must be near drain {code} to confirm it. Send your location pin there, then send CONFIRM {code} again.",
    confirmLimit: "You have confirmed enough drains for today. Thank you. Try again tomorrow.",
    drainMissing: "We found no drain with the code {code}.",
    drainState: "Drain {code} is {status} right now.",
    points: "You have {points} Hero points. {per} points buy N{naira} airtime. Send REWARD to ask for airtime.",
    rewardAsked: "Your request for N{naira} airtime ({points} points) is saved. A person checks it first, then it is sent to this number.",
    rewardTooFew: "You need {min} points for airtime. You have {points}. Clean and confirm drains to earn more.",
    rewardPending: "You already have an airtime request waiting. We will send it soon.",
    safeSent: "Done. We told {count} family member(s) that you are safe.",
    safeNoFamily: "Add your family first. Send FAMILY and their number, for example: FAMILY 08031234567",
    safeMessage: "FloodPass: {name} says they are SAFE. Sent {time}.",
    planNeeded: "This is part of Family Plus (about N500 a month). Warnings and proof stay free. See {url}",
    familyAdded: "Added {phone}. When you send SAFE, we will tell them you are safe.",
    familyFull: "You can add up to {max} family numbers.",
    familyBadPhone: "That number does not look right. Example: FAMILY 08031234567",
    addPlaceAsk: "Send the location pin of the extra place to watch (like your parents' house or your farm), or type its area and state. Send CANCEL to stop.",
    placeAdded: "We are now also watching {place}. You watch {count} of {max} places.",
    placesFull: "You already watch {max} places.",
    placesList: "Your places: {list}. Send ADD PLACE to add one.",
    cancelled: "Cancelled. Send HELP for the menu.",
    plansInfo: "Warnings and FloodPass proof are free forever. Extras like 5 places, a night call when danger is close, and SAFE messages to family are in Family Plus. See {url}",
    warningFooter: "Official warnings come first. Emergency: call 112.",
    vaultAsk: "Photo vault: send photos of your things (TV, fridge, shop stock, papers). They stay private and help you prove a loss. Send DONE when finished.",
    vaultSaved: "Saved to your private vault ({count} photos). Send more, or DONE.",
    vaultDone: "Your vault is saved. Send MY VAULT any time to see your photos.",
    vaultLinks: "Your vault photos (links work for 30 minutes): {links}",
    vaultEmpty: "Your vault is empty. Send VAULT to add photos.",
  },
  pcm: {
    welcome: "Welcome to FloodPass. We go warn you before flood reach your street, and we go give you proof when flood hit you, so help fit reach you. We dey keep your phone number, the place wey you share, and the pictures wey you send as flood proof. Reply YES if you agree. Reply STOP any time wey you wan comot and make we delete everything.",
    consentAgain: "To start, reply YES. To comot, reply STOP.",
    language: "Which language? Reply 1 for English. Reply 2 for Pidgin. Hausa, Yoruba and Igbo dey come.",
    location: "Abeg share the place wey you want make we watch, like your house or shop. Tap the paperclip or plus button, choose Location, then send your current location.",
    locationTyped: "Abeg send the location pin, no be the name. Tap the paperclip or plus button, choose Location, then send your current location.",
    ready: "E don set. We dey watch {place}. If you see flood water, send WATER or snap am send. Send FloodPass code to check am. Send HELP for menu.",
    moved: "We don hear. Now we dey watch {place}.",
    askDepth: "How deep the water be? Reply 1 for ankle, 2 for knee, 3 for waist, 4 reach motor roof.",
    askDepthAgain: "Abeg reply with number: 1 ankle, 2 knee, 3 waist, 4 motor roof.",
    photoSaved: "We don save the picture. How deep the water be? Reply 1 for ankle, 2 for knee, 3 for waist, 4 reach motor roof.",
    verified: "Thank you. Your report don VERIFY. Your FloodPass na {code}. Show this code to your bank, insurance, landlord or charity. Anybody fit check am for {url}. Forward this message give your street group make neighbours dey shine eye.",
    likely: "Thank you. We dey check your report ({score} of 100 points). When one neighbour confirm am, we go send your FloodPass code. If you fit, snap the water send.",
    unconfirmed: "Thank you. We don save your report ({score} of 100 points). We never fit confirm am yet. Picture and report from neighbours dey help. If water dey rise, move people and your things go high ground now.",
    neighbourVerified: "Good news. Your flood report don VERIFY. Your FloodPass na {code}. Anybody fit check am for {url}.",
    checkFound: "FloodPass {code}: VERIFIED. {place}, {date}. Water {depth}. Checks wey pass: {passed} of {total}.",
    checkRevoked: "FloodPass {code} don CANCEL. E no valid.",
    checkMissing: "We no see any FloodPass with code {code}. Abeg check the code again.",
    help: "FloodPass menu. Send WATER to report flood, or snap the water send. Send FloodPass code to check am. Send new location pin to change your place. Send DRAIN to report gutter wey block and collect Hero points. Send SAFE to tell your family say you dey okay. Send PLANS for extra. Send LANGUAGE to change language. Send STOP to comot.",
    stop: "You don comot from FloodPass. We don delete your number and your place. Send HI any time to join again.",
    notReady: "FloodPass never fully on yet. Abeg try again small time.",
    error: "Sorry, something spoil for our side. Abeg try again after one minute.",
    forward: "Forward this message give your street group.",
    replyOne: "Reply 1 if water enter your house.",
    locationSms: "Reply with your area and state, like: Gudu Abuja, or Kosofe Lagos.",
    placeNotFound: "We no see \"{text}\". Abeg send your area and state, like: Gudu Abuja.",
    helpSms: "FloodPass: send WATER to report flood. Send FloodPass code to check am. Send your area and state to change place. Send SAFE to tell family say you dey okay. Send STOP to comot.",
    drainAsk: "Drain Heroes: snap the gutter wey block send. If you no dey house, send your location pin first. Send CANCEL to stop.",
    drainNeedsPhoto: "Gutter wey block need picture. Abeg use FloodPass for WhatsApp or the website: {url}",
    drainSaved: "Thank you. Gutter {code} don save for {place}. When dem clean am, send CLEANED {code} with picture. Neighbours fit send CONFIRM {code}.",
    cleanAsk: "Now snap gutter {code} after cleaning send. Send CANCEL to stop.",
    cleanSaved: "Thank you. Gutter {code} don mark as clean. When 2 neighbours send CONFIRM {code}, e go verify and the person wey clean am go get {points} Hero points.",
    drainVerified: "Gutter {code} don VERIFY clean. Well done, Drain Hero. You don get {points} points. Send POINTS to see your total.",
    confirmSaved: "Thank you for checking gutter {code}. You don get {points} points.",
    confirmOwn: "You no fit confirm gutter wey you report or clean. Ask your neighbour.",
    confirmFar: "You must dey near gutter {code} to confirm am. Send your location pin from there, then send CONFIRM {code} again.",
    confirmLimit: "You don confirm enough gutter for today. Thank you. Try again tomorrow.",
    drainMissing: "We no see any gutter with code {code}.",
    drainState: "Gutter {code} dey {status} now.",
    points: "You get {points} Hero points. {per} points na N{naira} airtime. Send REWARD to collect airtime.",
    rewardAsked: "Your request for N{naira} airtime ({points} points) don save. Person go check am first, then we send am to this number.",
    rewardTooFew: "You need {min} points for airtime. You get {points}. Clean and confirm gutter to get more.",
    rewardPending: "Your airtime request still dey wait. We go send am soon.",
    safeSent: "E don go. We don tell {count} family member(s) say you dey okay.",
    safeNoFamily: "Add your family first. Send FAMILY and their number, like: FAMILY 08031234567",
    safeMessage: "FloodPass: {name} talk say dem dey SAFE. Sent {time}.",
    planNeeded: "This one na for Family Plus (about N500 for month). Warning and proof still free. See {url}",
    familyAdded: "We don add {phone}. When you send SAFE, we go tell dem say you dey okay.",
    familyFull: "You fit add only {max} family numbers.",
    familyBadPhone: "That number no correct. Example: FAMILY 08031234567",
    addPlaceAsk: "Send the location pin of the other place wey you want make we watch (like your papa and mama house or your farm), or type the area and state. Send CANCEL to stop.",
    placeAdded: "Now we dey watch {place} too. You dey watch {count} of {max} places.",
    placesFull: "You don already dey watch {max} places.",
    placesList: "Your places: {list}. Send ADD PLACE to add another one.",
    cancelled: "E don cancel. Send HELP for menu.",
    plansInfo: "Warning and FloodPass proof na free forever. Extra like 5 places, night call when danger near, and SAFE message to family dey for Family Plus. See {url}",
    warningFooter: "Official warning first. Emergency: call 112.",
    vaultAsk: "Photo vault: snap your things send (TV, fridge, shop goods, papers). Na only you fit see dem, and dem go help you prove wetin you lose. Send DONE when you finish.",
    vaultSaved: "E don enter your vault ({count} pictures). Send more, or DONE.",
    vaultDone: "Your vault don save. Send MY VAULT any time to see your pictures.",
    vaultLinks: "Your vault pictures (the links go work for 30 minutes): {links}",
    vaultEmpty: "Nothing dey your vault. Send VAULT to add pictures.",
  },
};

const DEPTH_TEXT: Record<FpLang, Record<string, string>> = {
  en: { ANKLE: "ankle deep", KNEE: "knee deep", WAIST: "waist deep", CAR_ROOF: "up to a car roof", UNKNOWN: "depth not given" },
  pcm: { ANKLE: "reach ankle", KNEE: "reach knee", WAIST: "reach waist", CAR_ROOF: "reach motor roof", UNKNOWN: "depth no dey" },
};

/** SMS, USSD and voice users cannot send pins or photos, so some replies have a text-only version. */
const TEXT_ONLY_VARIANT: Record<string, string> = { location: "locationSms", locationTyped: "locationSms", help: "helpSms" };

export function tFor(channel: string, lang: FpLang, key: string, vars: Vars = {}) {
  const textOnly = channel === "sms" || channel === "ussd" || channel === "voice";
  return t(lang, textOnly && TEXT_ONLY_VARIANT[key] ? TEXT_ONLY_VARIANT[key] : key, vars);
}

export function t(lang: FpLang, key: string, vars: Vars = {}): string {
  const template = TEXT[lang][key] ?? TEXT.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (vars[name] !== undefined ? String(vars[name]) : `{${name}}`));
}

export function depthText(lang: FpLang, depth: string) {
  return DEPTH_TEXT[lang][depth] ?? DEPTH_TEXT[lang].UNKNOWN;
}

export function shortDate(iso: string, lang: FpLang = "en") {
  const date = new Date(iso);
  return date.toLocaleString(lang === "pcm" ? "en-NG" : "en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });
}

export type WarningParts = {
  /** What the danger is, for example "Heavy rain". */
  hazard: string;
  /** Where, for example "Gudu". */
  place: string;
  /** When, for example "from 4pm to 7pm today". */
  window: string;
  /** Who says so, for example "NiMet". */
  source: string;
  /** Why this street matters, for example "Ebeano-Gudu Road flooded in rain like this before." Optional. */
  history?: string;
  /** What to do, for example "Move your car to high ground before 4pm." */
  action: string;
  /** Where not to go, for example "the Gaduwa-Durumi bridge". Optional. */
  avoid?: string;
};

/**
 * A warning with the five parts research says every alert needs:
 * the danger, where, what to do, how much time, and who says so.
 */
export function buildWarning(lang: FpLang, parts: WarningParts) {
  const lines =
    lang === "pcm"
      ? [
          `FloodPass: ${parts.hazard} dey come for ${parts.place} ${parts.window} (${parts.source}).`,
          parts.history,
          parts.action,
          parts.avoid ? `No pass ${parts.avoid}.` : undefined,
          t(lang, "replyOne"),
          t(lang, "forward"),
        ]
      : [
          `FloodPass: ${parts.hazard} expected in ${parts.place} ${parts.window} (${parts.source}).`,
          parts.history,
          parts.action,
          parts.avoid ? `Avoid ${parts.avoid}.` : undefined,
          t(lang, "replyOne"),
          t(lang, "forward"),
        ];
  return lines.filter(Boolean).join("\n");
}
