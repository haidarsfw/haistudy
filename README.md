# haistudy

**All-in-one study platform for BINUS students** — course materials, AI-graded practice exams, flashcards, quizzes, and a study community, in one fast, installable web app.

> Materi, quiz, AI, dan komunitas dalam satu tempat.

---

## Features

- **📚 Materi & Rangkuman** — structured course notes and summaries per subject.
- **⚡ Belajar Kilat** — swipe-through, card-based learning with an AI helper on every card.
- **🧠 Drill** — flashcards and timed quizzes to lock in the concepts.
- **📝 Latihan Soal** — full timed practice exams with AI grading, per-question feedback, answer keys, and rubrics.
- **🤖 haistudy AI** — a contextual study assistant grounded in the course material.
- **💬 Community** — cohort chat, discussion forum, and live voice rooms.
- **🗓️ Schedule & Countdown** — weekly timetable and exam countdowns.
- **🎨 Personalization** — light/dark mode, themes, font choices, and a built-in music player.
- **📱 PWA** — installable on mobile and desktop, with push notifications.

## Tech stack

- **Framework:** Next.js (App Router) + React + TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Realtime)
- **AI:** large language model via an OpenAI-compatible API
- **Hosting:** Vercel

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
#    Create a .env.local with your Supabase and AI provider credentials.

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build (fails on type errors) |
| `npm run lint` | Lint the source |
| `npx tsc --noEmit` | Type-check without emitting |

## Project structure

```
src/
  app/         # routes (App Router): landing, the scoped app, admin, API
  components/  # UI and feature components
  data/        # in-repo course content (materials, quizzes, exams)
  lib/         # domain logic, helpers, integrations
  types/       # shared TypeScript types
supabase/
  migrations/  # database schema migrations
public/        # static assets
```

## Status

Actively developed. Built and maintained by the haistudy team.

---

© haistudy. All rights reserved. Course content and branding are proprietary.
