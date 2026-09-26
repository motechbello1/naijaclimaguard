# FloodPass: what is on this branch and how to switch it on

Branch: `floodpass-v1` (made from `main` on 25 September 2026). `main` is untouched.

FloodPass turns a flood into proof, and proof into help. People get warnings and a locked
proof code for free. Banks, insurers, charities and government pay to check the codes.

## What this branch adds

| Part | Where | What it does |
| --- | --- | --- |
| Safety and security fixes | `lib/founder-auth.ts`, `lib/auth-secret.ts`, `middleware.ts`, `app/api/cron/flood-intelligence`, `.github/workflows/live-flood-scan.yml` | No built-in founder login or auth secret. The scan job needs `CRON_SECRET`. One shared list of protected pages. Safety pages are public. |
| Official warnings first | `lib/intelligence/official-advisory.ts`, `app/api/v1/risk` | A warning reported for the state beats a low rain score. New `public_status`: `DANGER`, `BE_CAREFUL` or `NO_WARNING_YET`. Never "safe", never "NORMAL". |
| Better news reading | `lib/intelligence/live-flood-feed.ts` | Tags every state in a headline, drops foreign floods, treats "states at risk" lists as warnings. |
| Truth Engine | `lib/floodpass/truth-engine.ts` | Six checks (sky, neighbours, photo, official, history, ruler). 70 of 100 points = Verified. Pure and tested. |
| Flood Record | `lib/floodpass/ledger.ts` | Every FloodPass is chained by SHA-256 fingerprint. Changing or removing one breaks the chain. |
| Service and APIs | `lib/floodpass/service.ts`, `app/api/floodpass/*` | Report water, check a code, re-check the whole record, recent floods, partner keys. |
| WhatsApp | `lib/floodpass/conversation*.ts`, `lib/floodpass/whatsapp.ts`, `app/api/channels/whatsapp` | Hi, consent, language, location pin, WATER or photo, depth, FloodPass code, STOP. English and Pidgin. |
| New screens | `app/page.tsx`, `app/floodpass/*`, `app/check`, `app/pass/[code]`, `app/partners`, `components/floodpass/*` | Light, simple, phone-first. Old home moved to `/classic`. |
| Demo backup | `/floodpass/demo`, `app/api/channels/simulate` | Founder-only screen that runs the real WhatsApp conversation, for the stage. |
| Hotspots | `lib/floodpass/hotspots.ts` | 18 Abuja flood spots from news reports. Coordinates are approximate until checked with GPS. |
| FloodPass AI (5 jobs) | `lib/floodpass/ai/*`, `lib/floodpass/street-memory*.ts`, `lib/floodpass/photo-intake.ts` | Photo Checker, News Reader, Chat Helper, Warning Writer, and Street Memory (our own learner). Every job has a safe non-AI fallback. |
| All 36 states and the FCT | `lib/floodpass/places.ts`, `lib/floodpass/coverage.ts`, `/floodpass/coverage`, `/api/floodpass/coverage` | Any point in Nigeria gets a place and a state (hotspot, then nearest of 774 LGAs, then state capital). Coverage page shows each state's numbers. |
| Warning preview | `app/api/floodpass/warnings/preview` | Founder only. Shows the warning a street would get, with Street Memory. Sends nothing. |
| Warning broadcasts | `lib/floodpass/warnings.ts`, `app/api/floodpass/warnings/*`, `/floodpass/founder` | Official warnings only, a person approves, then batches go out on WhatsApp, SMS and calls. Drafts are made automatically from NiMet, NIHSA and NEMA warnings in the news. |
| SMS, USSD and phone calls | `lib/floodpass/channels/*`, `lib/floodpass/ussd*.ts`, `lib/floodpass/voice-runner.ts`, `app/api/channels/sms`, `/ussd`, `/voice` | Africa's Talking. Works on any phone. People type their area instead of sending a pin. |
| Private photos | `lib/floodpass/photos.ts`, `app/api/floodpass/photos/[id]` | Photos kept as proof with consent, shown only through links that expire, deleted on STOP or after 2 years. Photo vault for Family Plus. |
| Paid plans | `lib/floodpass/billing/*`, `app/api/floodpass/billing/*`, `/floodpass/plans` | Paystack checkout, webhook, repeating plans, Family Plus extras (5 places, night call, SAFE, vault), Diaspora Guardian, Farmer Season Pass, Protect waiting list. |
| Rent and Land Check | `lib/floodpass/address-check.ts`, `/floodpass/address-check` | Pay once, get the known flood history of one address. |
| Wallet cards | `lib/floodpass/wallet/*`, `lib/floodpass/card-image.tsx`, `app/api/floodpass/wallet/*`, `app/api/floodpass/card/[code]` | Save to Google Wallet, Add to Apple Wallet, and a picture of the pass for any phone (also the WhatsApp link preview). |
| Drain Heroes | `lib/floodpass/drain*.ts`, `app/api/floodpass/drains`, `app/api/floodpass/rewards`, `/floodpass/drain-heroes` | Report a blocked drain, clean it, neighbours confirm, earn points, ask for airtime; a person approves every payout. |
| Founder desk | `/floodpass/founder` | Warnings, airtime approvals, plans and money, demo loader, in one place. |

Tests: `npm test` (66 tests). Type check: `npx tsc --noEmit`.

## Where the data comes from

| Source | What it gives | How often | Status |
| --- | --- | --- | --- |
| Open-Meteo weather model | Rain that fell and rain coming, for the centre of every one of the 774 LGAs | Every 15 minutes (GitHub scan job) | Live. Free tier is non-commercial; buy a plan (`OPEN_METEO_API_KEY`) before earning money. |
| GDELT news index | Nigerian flood news, tagged by state | Every 15 minutes | Live |
| Google News RSS, including NiMet, NEMA and NIHSA site searches | Flood news and official warnings as reported | Every 15 minutes | Live |
| People on WhatsApp and the web | Flood reports with depth and photos | Any time | Live on web; WhatsApp needs Meta approval |
| LGA list (774 LGAs with centre points) | Place names and states for any point | Once a day | Live, from a public GitHub list with no stated licence. Replace with the official boundaries on HDX (COD-AB Nigeria) before scale. |
| Abuja hotspots | 18 named flood spots | By hand | Live, approximate coordinates |
| NiMet, NIHSA and NEMA direct feeds | Official forecasts and warnings | When issued | Planned, needs agreements |
| Google Flood Hub | River flood forecasts, up to 7 days | Daily | Planned, needs API access |
| Sentinel-1 radar (Copernicus) | Flood water seen through cloud | Every 6 to 12 days | Planned |
| NASA IMERG, GloFAS, ERA5-Land | Satellite rain, river forecasts, soil wetness | Research only today | Used to test the model, not yet in the app |

## FloodPass AI

| Job | Where it runs | What happens without AI |
| --- | --- | --- |
| 1. Photo Checker | Every photo sent on the web form or WhatsApp. Looks once, keeps only a SHA-256 fingerprint and the verdict. Catches screenshots and one photo sent by many people. | The photo still counts, with fewer points. |
| 2. News Reader | The 15-minute scan reads up to 40 new headlines (never on a public page load). Corrects state, place and "real flood or not" when it is 70% sure or more. | Keyword rules decide alone. |
| 3. Chat Helper | WhatsApp questions like "what should I do if water enters my house?" Uses only fixed safety facts and the person's current warning. | The menu is sent. |
| 4. Warning Writer | Writes a short warning for one street. Rejected unless it keeps the place and the source, and never says "safe". | The fixed five-part template. |
| 5. Street Memory | Learns how much rain floods each spot from verified FloodPasses. Our own model, no outside AI. | Says nothing until it has seen a flood there. |

Settings: `FLOODPASS_AI_API_KEY` (or `ANTHROPIC_API_KEY`), optional `FLOODPASS_AI_PROVIDER`
(`anthropic` by default, or `openai-compatible`), `FLOODPASS_AI_MODEL` (default `claude-haiku-4-5-20251001`),
`FLOODPASS_AI_BASE_URL` (only for openai-compatible). Without a key, AI is off and everything still works.
Rough cost with the default model: well under $5 a day at pilot size (mostly the News Reader).

## What needs your yes before it touches anything live

1. **Database update.** Two migrations: `20260925120000_add_floodpass` (reports, passes, partners,
   checks, contacts) and `20260926090000_floodpass_channels_plans_drains` (warnings, deliveries,
   photos, plans, payments, places, family, waiting list, address checks, drains, points, payouts).
   Both only ADD tables and columns; nothing that existed before FloodPass changes. Until they are
   applied, FloodPass screens load but say "storage is not switched on yet".
2. **Demo data.** The founder desk has a "Load demo floods" button (or run
   `scripts/floodpass-seed-abuja.ts`). It rebuilds the 16 August 2026 Abuja floods from news
   reports. Every record is marked "rebuilt from news". Run it only after step 1.
3. **Preview deployments.** Vercel builds a preview of this branch using the preview settings,
   which point at the production database. The new code only reads existing tables and writes to
   the new FloodPass tables, but you should know.

## Settings to add in Vercel (Production and Preview)

| Setting | Why |
| --- | --- |
| `NEXTAUTH_SECRET` | Already set. There is no fallback any more. |
| `CRON_SECRET` | Also add the same value as a GitHub repository secret called `CRON_SECRET`. Without it the 15-minute scan and the alert checker stop. |
| `NCG_FOUNDER_USERNAME`, `NCG_FOUNDER_PASSWORD_HASH` | Founder login. Make the hash with bcrypt (cost 12). Without them founder login is off. |
| `FLOODPASS_KEY_PEPPER` | A long random string. Makes reporter keys impossible to reverse. Required in production. |
| `OPEN_METEO_API_KEY` | Open-Meteo's free service is for non-commercial use only. Buy a plan before FloodPass earns money. |
| `NEXT_PUBLIC_APP_URL` | Already set. Used in FloodPass links and QR codes. |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | The WhatsApp Business number. Without them the bot runs in dry-run and the webhook refuses calls. |
| `NEXT_PUBLIC_FLOODPASS_WHATSAPP` | The public WhatsApp number (digits only, for example 2348012345678) for the "Get warnings on WhatsApp" button. |
| `FLOODPASS_DEMO_KEY` | Optional. Lets the demo screen run without a founder login. |
| `FLOODPASS_AI_API_KEY` | Switches on the five AI jobs. See "FloodPass AI" above. |
| `AT_USERNAME`, `AT_API_KEY`, `AT_SMS_FROM`, `AT_VOICE_NUMBER`, `AT_CALLBACK_SECRET` | Africa's Talking for SMS, calls, USSD and airtime. See "SMS, USSD and phone calls". |
| `NEXT_PUBLIC_FLOODPASS_USSD`, `NEXT_PUBLIC_FLOODPASS_SMS`, `NEXT_PUBLIC_FLOODPASS_VOICE` | The USSD code, SMS number and phone line shown on the home page. |
| `WHATSAPP_TEMPLATE_WARNING` (and `_PASS_READY`, `_SAFE`, `_DRAIN_VERIFIED`) | Optional. Names of the approved WhatsApp templates if different from the defaults below. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FLOODPASS_PHOTO_BUCKET` | Optional. Keeps photos in a private Supabase Storage bucket instead of the database. |
| `PAYSTACK_SECRET_KEY` | Switches on payments. Add the webhook URL in Paystack too. |
| `PAYSTACK_PLAN_FAMILY_MONTHLY`, `PAYSTACK_PLAN_FAMILY_WEEKLY`, `PAYSTACK_PLAN_DIASPORA_MONTHLY` | Optional. Makes those plans renew by themselves. The founder desk can create them for you. |
| `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SA_EMAIL`, `GOOGLE_WALLET_SA_PRIVATE_KEY` | Google Wallet button. |
| `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_PASS_CERT_PEM`, `APPLE_PASS_KEY_PEM`, `APPLE_WWDR_CERT_PEM`, `APPLE_PASS_KEY_PASSPHRASE` | Apple Wallet button. |
| `DRAIN_POINTS_PER_UNIT`, `DRAIN_NAIRA_PER_UNIT`, `DRAIN_MAX_NAIRA_30D` | Optional. Drain Heroes rewards (defaults: 100 points = N200, up to N1,000 in 30 days). |

Also mark `DATABASE_URL` and `NEXTAUTH_SECRET` as **Sensitive** in Vercel (Vercel flags them as readable today).

## Connecting WhatsApp (about 1 to 3 days, most of it waiting for Meta)

1. Create a Meta Business account and a WhatsApp Business Platform app.
2. Add and verify a phone number that is not already used on normal WhatsApp.
3. Set the webhook URL to `https://<your site>/api/channels/whatsapp` with your `WHATSAPP_VERIFY_TOKEN`,
   and subscribe to `messages`.
4. Copy the permanent token, phone number id and app secret into Vercel.
5. Send "Hi" to the number.

Costs: Meta charges Nigerian businesses per message (about N14 per utility message from 1 October 2026).
Warnings should go out only when they matter.

## SMS, USSD and phone calls (Africa's Talking)

One provider covers all three, plus airtime for Drain Heroes, on MTN, Airtel, Glo and 9mobile.

1. Open an Africa's Talking account, choose Nigeria, and top up the wallet.
2. SMS: register a sender ID (free, up to 11 letters, company papers needed). To reach numbers on
   the Do-Not-Disturb list it must be registered as **transactional**, which takes about 2 weeks.
   For two-way SMS, get a short code or long number and set its callback to
   `https://<site>/api/channels/sms?key=<AT_CALLBACK_SECRET>`.
3. USSD: ask for a shared code (ready in 1 to 2 days) or a dedicated one. Callback:
   `https://<site>/api/channels/ussd?key=<AT_CALLBACK_SECRET>`.
4. Voice: get a phone number and set its callback to
   `https://<site>/api/channels/voice?key=<AT_CALLBACK_SECRET>`.
5. Put `AT_USERNAME`, `AT_API_KEY`, `AT_SMS_FROM`, `AT_VOICE_NUMBER` and a long random
   `AT_CALLBACK_SECRET` in Vercel. Africa's Talking does not sign its callbacks, so the secret in the
   URL is the lock; without it the callbacks refuse every call.

Without keys everything runs in dry-run: nothing is sent and nothing is charged.

How it feels to use:
- SMS: the same conversation as WhatsApp. People type their area and state ("Gudu Abuja") instead of a pin.
- USSD: a menu (report water, warnings here, check a FloodPass, change area, language, confirm a drain, points, stop).
- Calls: press 1 to hear the warning for your area, 2 to report water, 3 for flood safety advice.
  Warnings and Family Plus night calls ring people and read the warning twice.

One phone number is one person across WhatsApp, SMS, USSD and calls, so nobody can be two
"neighbours" at once. Reports from a typed place are marked as approximate on the pass.

## Warnings (founder desk)

- The NiMet Act 2022 makes NiMet the voice of weather warnings, so FloodPass never invents one.
  Every warning names the official source and links to it, and a person approves it.
- Every 15 minutes, official warnings (NiMet, NIHSA, NEMA) found in the news become DRAFTS.
- On the founder desk: check the words in English and Pidgin, see how many people are in the area,
  then "Approve and send". Batches of 80 go out at once; the 15-minute job sends the rest.
- A Family Plus member also gets a phone call when the warning is DANGER at night (10pm to 6am).

WhatsApp only allows free text within 24 hours of a person's last message. After that it needs
templates approved by Meta (category: Utility). Submit these (and a Pidgin copy of each, named with
`_pcm` at the end, language English):

| Template name | Text |
| --- | --- |
| `floodpass_warning` | FloodPass alert for {{1}}: {{2}} {{3}} (source: {{4}}). What to do: {{5}} Reply 1 if water enters your house. Emergency: call 112. |
| `floodpass_pass_ready` | Good news. Your flood report is now verified. Your FloodPass code is {{1}}. Anyone can check it at {{2}} |
| `floodpass_safe` | FloodPass: {{1}} says they are safe. Sent {{2}}. |
| `floodpass_drain_verified` | Drain {{1}} is verified clean. You earned {{2}} Hero points. Send POINTS to see your total. |

If a template is missing, a Nigerian number gets the message by SMS instead.

## Photos

- Web: the person ticks "keep my photo as private proof" (not ticked by default). WhatsApp: the
  consent message says photos are kept as flood proof.
- Nobody gets a public link. Partners checking a FloodPass with their key see the photos through
  links that stop working after 15 minutes. People open their own vault with MY VAULT.
- STOP deletes the person's contact and every photo they sent. All photos are deleted after 2 years.
- Photos live in the database by default (shrunk to about 100 KB). For scale, create a PRIVATE
  bucket called `floodpass-photos` in Supabase Storage and add `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY`.

## Paid plans (Paystack)

1. Add `PAYSTACK_SECRET_KEY` to Vercel.
2. In Paystack, set the webhook URL to `https://<site>/api/floodpass/billing/webhook`.
3. On the founder desk, "Create repeating plans on Paystack", then add the PLN_ codes it shows.
4. Test with a `sk_test_` key first.

Rules: warnings and proof stay free forever; paying never makes warnings come earlier. Paystack takes
naira (and US dollars for approved merchants), not pounds, so Diaspora Guardian is priced in naira
and paid with any international card. Protect (cash cover) waits for a licensed insurance partner;
until then it collects a waiting list.

## Wallet cards

- A picture of every pass is always available (Save as a picture) and shows as the preview when a
  pass link is shared on WhatsApp.
- Google Wallet: create an issuer account in the Google Pay and Wallet console, a Google Cloud
  service account with the Wallet API, then add the three `GOOGLE_WALLET_*` settings. Until Google
  approves the issuer, only test accounts can save passes.
- Apple Wallet: in an Apple Developer account, make a Pass Type ID and its certificate, download
  Apple's WWDR (G4) certificate, then add the `APPLE_*` settings (PEM text or base64 of it).

## Drain Heroes

1. Send DRAIN on WhatsApp with a photo (or use the web page). The drain gets a code like D-7K2Q.
2. Clean it, then send CLEANED D-7K2Q with a photo after.
3. Two neighbours (living within 500 m, or in the same area if they joined by SMS or USSD) send
   CONFIRM D-7K2Q. With a confident AI photo check one is enough; if the AI doubts it, three.
4. Verified: cleaner 50 points, reporter 5, each confirmer 2. The same photo twice is rejected.
5. REWARD asks for airtime (100 points = N200, up to N1,000 in 30 days). A person approves each
   payout on the founder desk; approving sends airtime through Africa's Talking. Sponsors fund it.

## Not built yet (next steps)

- Accounts with the providers: Meta (WhatsApp), Africa's Talking, Paystack, Google Wallet, Apple Developer.
- A licensed insurance partner for Protect (cash cover).
- Hausa, Yoruba and Igbo, written and recorded by native speakers (voice calls can then play recordings).
- NiMet agreement for passing on forecasts directly (legal step, see the NiMet Act 2022).
- NDPA 2023 registration with the Nigeria Data Protection Commission once FloodPass holds data on more than 200 people.

## Before merging into main

1. Add the settings above, including `CRON_SECRET` in both Vercel and GitHub.
2. Approve and apply the database update.
3. Open the Vercel preview and walk through: home, report, check, a pass card, partners, plans,
   Drain Heroes, Rent and Land Check, and the founder desk.
4. Merge.
