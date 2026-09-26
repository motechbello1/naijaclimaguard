/**
 * The USSD menu (for example *384*1234#), as a pure function.
 *
 * USSD works on every phone, even without data or a smartphone. The network
 * sends us everything the person typed in this session joined by "*", for
 * example "1*2" means they chose 1, then 2. We work out the screen from that
 * text and from how the person started the session (had they agreed yet, did
 * we know their place yet), which the runner saves when a session begins.
 */

export type UssdStart = { consented: boolean; hasPlace: boolean };

export type UssdScreen =
  | { kind: "consent" }
  | { kind: "declined" }
  | { kind: "ask_place"; reason: "first" | "change" }
  | { kind: "set_place"; text: string }
  | { kind: "main" }
  | { kind: "depth" }
  | { kind: "submit"; depth: "ANKLE" | "KNEE" | "WAIST" | "CAR_ROOF" }
  | { kind: "warnings" }
  | { kind: "ask_code" }
  | { kind: "check_code"; text: string }
  | { kind: "language" }
  | { kind: "ask_drain" }
  | { kind: "confirm_drain"; text: string }
  | { kind: "points" }
  | { kind: "stop" }
  | { kind: "invalid" };

export type UssdParse = { screen: UssdScreen; consentNow: boolean };

const DEPTHS = { "1": "ANKLE", "2": "KNEE", "3": "WAIST", "4": "CAR_ROOF" } as const;

function consentedMenu(segs: string[], hasPlace: boolean): UssdScreen {
  if (!hasPlace) {
    if (!segs.length) return { kind: "ask_place", reason: "first" };
    return { kind: "set_place", text: segs[0] };
  }
  if (!segs.length) return { kind: "main" };
  const [choice, next] = segs;
  switch (choice) {
    case "1":
      if (segs.length === 1) return { kind: "depth" };
      return next in DEPTHS ? { kind: "submit", depth: DEPTHS[next as keyof typeof DEPTHS] } : { kind: "invalid" };
    case "2":
      return { kind: "warnings" };
    case "3":
      return segs.length === 1 ? { kind: "ask_code" } : { kind: "check_code", text: next };
    case "4":
      return segs.length === 1 ? { kind: "ask_place", reason: "change" } : { kind: "set_place", text: next };
    case "5":
      return { kind: "language" };
    case "6":
      return segs.length === 1 ? { kind: "ask_drain" } : { kind: "confirm_drain", text: next };
    case "7":
      return { kind: "points" };
    case "0":
      return { kind: "stop" };
    default:
      return { kind: "invalid" };
  }
}

export function parseUssd(text: string, start: UssdStart): UssdParse {
  const segs = String(text ?? "").trim() === "" ? [] : String(text).split("*").map((s) => s.trim());
  if (start.consented) return { screen: consentedMenu(segs, start.hasPlace), consentNow: false };
  if (!segs.length) return { screen: { kind: "consent" }, consentNow: false };
  if (segs[0] === "2") return { screen: { kind: "declined" }, consentNow: false };
  if (segs[0] !== "1") return { screen: { kind: "invalid" }, consentNow: false };
  return { screen: consentedMenu(segs.slice(1), start.hasPlace), consentNow: true };
}

type Lang = "en" | "pcm";

const TEXT: Record<Lang, Record<string, string>> = {
  en: {
    consent: "FloodPass: free flood warnings and flood proof. We keep your number and area to warn you by SMS.\n1 I agree\n2 No thanks",
    declined: "No problem. Dial again any time to join FloodPass.",
    askPlaceFirst: "Type your area and state.\nExample: Gudu Abuja",
    askPlaceChange: "Type your new area and state.\nExample: Kosofe Lagos",
    placeSet: "Done. We watch {place}. Warnings come by SMS. Dial again to report flood water.",
    placeMissing: "We could not find \"{text}\". Dial again and type area and state, like Gudu Abuja.",
    main: "FloodPass {place}\n1 Report flood water\n2 Warnings here\n3 Check a FloodPass\n4 Change area\n5 Pidgin\n6 Confirm a drain\n7 My points\n0 Stop",
    depth: "How deep is the water?\n1 Ankle\n2 Knee\n3 Waist\n4 Car roof",
    verified: "VERIFIED. Your FloodPass is {code}. We sent it by SMS. Show it to your bank, insurer or a charity.",
    checking: "Saved ({score} of 100). When neighbours confirm, we SMS your FloodPass. If water is rising, move to high ground now.",
    warningOn: "{authority}: {headline}. Follow their advice. Emergency: 112.",
    warningNone: "No official warning for {place} yet. We never say safe: if water rises, move to high ground. Emergency: 112.",
    askCode: "Type the FloodPass code.\nExample: FPABJ7K2Q",
    codeFound: "{code} is VERIFIED. {place}, {date}. Water {depth}.",
    codeRevoked: "{code} was CANCELLED. Not valid.",
    codeMissing: "No FloodPass with code {code}.",
    language: "Language set to Pidgin.",
    askDrain: "Type the drain code to confirm it is clean.\nExample: D7K2Q",
    drainOk: "Thank you. You checked drain {code} and earned {points} points.",
    drainNo: "Could not confirm {code}: {why}.",
    points: "You have {points} Hero points. {per} points = N{naira} airtime. Send REWARD by SMS to ask.",
    stop: "You left FloodPass. We deleted your number and area.",
    invalid: "That choice is not on the menu. Please dial again.",
    notReady: "FloodPass is being switched on. Please try again soon.",
    error: "Sorry, something went wrong. Please dial again.",
  },
  pcm: {
    consent: "FloodPass: free flood warning and flood proof. We go keep your number and area to warn you by SMS.\n1 I agree\n2 No thanks",
    declined: "No wahala. Dial again any time to join FloodPass.",
    askPlaceFirst: "Type your area and state.\nLike: Gudu Abuja",
    askPlaceChange: "Type your new area and state.\nLike: Kosofe Lagos",
    placeSet: "E don set. We dey watch {place}. Warning go come by SMS. Dial again to report flood.",
    placeMissing: "We no see \"{text}\". Dial again and type area and state, like Gudu Abuja.",
    main: "FloodPass {place}\n1 Report flood\n2 Warning here\n3 Check FloodPass\n4 Change area\n5 English\n6 Confirm gutter\n7 My points\n0 Stop",
    depth: "How deep the water be?\n1 Ankle\n2 Knee\n3 Waist\n4 Motor roof",
    verified: "VERIFIED. Your FloodPass na {code}. We don SMS am. Show am to your bank, insurance or charity.",
    checking: "E don save ({score} of 100). When neighbours confirm, we go SMS your FloodPass. If water dey rise, go high ground now.",
    warningOn: "{authority}: {headline}. Follow wetin dem talk. Emergency: 112.",
    warningNone: "No official warning for {place} yet. We no dey talk say e safe: if water rise, go high ground. Emergency: 112.",
    askCode: "Type the FloodPass code.\nLike: FPABJ7K2Q",
    codeFound: "{code} don VERIFY. {place}, {date}. Water {depth}.",
    codeRevoked: "{code} don CANCEL. E no valid.",
    codeMissing: "No FloodPass with code {code}.",
    language: "Language don change to English.",
    askDrain: "Type the gutter code to confirm say dem don clean am.\nLike: D7K2Q",
    drainOk: "Thank you. You don check gutter {code} and you get {points} points.",
    drainNo: "We no fit confirm {code}: {why}.",
    points: "You get {points} Hero points. {per} points = N{naira} airtime. Send REWARD by SMS to collect.",
    stop: "You don comot from FloodPass. We don delete your number and area.",
    invalid: "That choice no dey the menu. Abeg dial again.",
    notReady: "FloodPass never fully on yet. Try again small time.",
    error: "Sorry, something spoil. Abeg dial again.",
  },
};

export function ussdText(lang: Lang, key: string, vars: Record<string, string | number> = {}) {
  const template = TEXT[lang][key] ?? TEXT.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (vars[name] !== undefined ? String(vars[name]) : ""));
}

/** USSD screens must start with CON (keep going) or END (finish), and stay short. */
export function con(text: string) {
  return `CON ${text}`.slice(0, 182);
}

export function end(text: string) {
  return `END ${text}`.slice(0, 182);
}
