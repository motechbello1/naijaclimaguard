# NaijaClimaGuard

**The Climate Intelligence Operating System for Nigeria.**

Live: [naijaclimaguard.vercel.app](https://naijaclimaguard.vercel.app)
API: [naijaclimaguard-ml-api.onrender.com](https://naijaclimaguard-ml-api.onrender.com)

## What it does

NaijaClimaGuard turns freely available satellite-derived weather data into actionable flood risk intelligence — for citizens, businesses, and institutions.

Google Flood Hub predicts floods for free. We own everything that happens before, during, and after the water rises: the grandmother who needs a yes/no answer, the operator who needs a command view, the API a bank can sign a contract against.

## Live capabilities

- **My Area** — one-tap flood risk for any location in Nigeria, plain language
- **Intelligence Center** — 16 monitored stations across Nigeria with live risk scores
- **Extended Outlook** — upstream basin watch across 4 corridors (Benue, Niger, Chad, Southwest) providing 2–6 week lead time
- **Citizen Reporting** — geotagged flood reports with operator verification
- **Alert Engine** — threshold-based rules evaluated against live data, email + SMS dispatch
- **Predict** — live precipitation chart with simulation overlay
- **Prove** — 2022 Lokoja Megaflood archive replay from real Open-Meteo data
- **Public Risk API** — `GET /api/v1/risk?latitude=7.80&longitude=6.73`
- **Live Reports** — situation reports generated from live station data at click time

## Tech stack

- **Frontend:** Next.js 14, React, Tailwind CSS, Recharts
- **Backend:** Next.js API routes, Prisma ORM, PostgreSQL (Supabase)
- **ML:** XGBoost flood risk model trained on 10,955 real samples (5 stations, 2018–2023, Open-Meteo archive), deployed as FastAPI on Render
- **Data:** Open-Meteo (NASA GPM IMERG derived) — live, no cached or synthetic values
- **Auth:** NextAuth.js with credential provider
- **Payments:** Paystack (live test integration)
- **Alerts:** Resend (email) + Termii (SMS) — activate with API keys

## Validation

The model architecture was validated against the October 2022 Lokoja megaflood — the Niger-Benue confluence event that affected 1.4 million people. The system flagged critical risk 48 hours before official NEMA advisories, using the same rainfall-accumulation signals the live platform monitors today.

## Honesty model

Every screen follows a strict 4-state framework:

- **LIVE** — real data, real API, working now
- **CONNECTED** — architecture complete, activates when a credential is supplied
- **DEPLOYABLE** — architecture complete, activates when a partner (insurer, telco, sensor network) connects
- **FUTURE** — only if impossible with today's technology

No fake dashboards. No fabricated metrics. No simulated data. Every displayed value traces to a live upstream source.

## Author

**Bello Muhammad Mustapha**
MSc Computer Science, Middlesex University London
ML Engineer & AI Instructor, National Centre for AI and Robotics (NCAIR)
GitHub: [motechbello1](https://github.com/motechbello1)

## License

Proprietary. All rights reserved.