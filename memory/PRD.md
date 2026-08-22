# StudyBridge — PRD

## Original Problem Statement
Non-profit K–12 learning platform with AI-guided lessons, personalized curriculum, tutor/student matching (locked until 10k users), gamified tutor ranks, and school-safe controls. V1 = core learning platform only.

## Architecture
- Frontend: React (JS) + Tailwind, dark maroon (#380101) + orange (#FA8720), Michroma/Outfit fonts, collapsible sidebar, auto-hiding banner.
- Backend: FastAPI, all routes under `/api`, Bearer-token JWT auth (token in localStorage `sb_token`).
- DB: MongoDB (users, chapter_content cache, progress, chat_messages, feedback, password_resets).
- AI: Emergent Universal Key via emergentintegrations — Gemini 3 Flash (helper/chat), Gemini 3.1 Pro (lesson generation). LLM calls serialized via asyncio lock + retry to respect shared-key concurrency.

## User Personas
- Students grades 6–12 (self signup)
- Parents of K–5 (parent-led COPPA signup)
- Homeschoolers, Admin

## Core Requirements (static)
COPPA parent-led flow, onboarding assessments (grade 5+), AI cached lessons, "discuss don't answer" helper, Focus Mode, feedback survey, 10k-user feature gating.

## Implemented (2026-06-21) — V1 core slice
- JWT auth: student self-signup (grade 6+), parent-led K-5 signup with **mocked** consent link, login, forgot/reset (mocked link), admin seed.
- 3 onboarding assessments (English/Overall/Career gated to 6+) with scoring + curriculum weighting.
- Learn module: 4 subjects × 4 chapters; AI-generated + DB-cached lessons/exercises/glossary; exercise scoring (80% pass / 100% mastery) with best-score persistence + visual states.
- AI Helper sidebar: kid-safe "discuss don't answer", image upload, thinking states.
- Focus Mode timer overlay (in-app only, 10–120 min).
- Parental controls panel + feedback survey (6-month cookie/DB cooldown).
- Landing page (founder story, registered-user teaser), collapsible sidebar, auto-hiding banner, locked-feature placeholders (Tutors/Contests) shown as "unlocks at 10k".

## Validation
- Backend: 20/21 automated (the 1 failure was shared-key concurrency, now fixed via serialization lock; image path manually confirmed 200).
- Frontend: signup→onboarding→dashboard→learn→chapter→exercises→glossary→focus mode all PASS. AI helper wiring correct; blocked only by key budget cap during test.

## Known limitations / MOCKED
- Emails (parental consent, password reset) are **MOCKED** — link returned in API response / logged, not actually sent. Wire Resend later.
- AI lesson generation + helper require Universal Key balance (budget cap hit during testing — needs top-up).

## Backlog (post-V1 / locked until 10k users)
- P1: Real Resend emails; embedded videos & science labs per chapter; certificate PDFs.
- P2 (locked): Tutor/student matching + chat + moderation, tutor ranks & certificates, contests, shop.
