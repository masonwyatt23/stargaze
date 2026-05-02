# Stargaze

> **Swipe right. Star repos. Boost makers.**

A swipe-deck for indie GitHub side projects. Right-swipe = save **and** auto-star
the repo on GitHub. Left-swipe = skip. The leaderboard ranks creators by real
GitHub influence delivered, not vanity points.

Built for the vibe-coded era — when shipping is easy and **distribution is the bottleneck**.

## Stack

- **Framework:** Next.js 16 (App Router, RSC, Turbopack) + React 19
- **Styling:** Tailwind CSS v4 + shadcn-style primitives + Lucide icons + Geist font
- **Backend:** Supabase (Postgres + Auth + RLS + Realtime + Storage + Edge Functions)
- **Auth:** Supabase Auth via GitHub OAuth (`public_repo` + `read:user`)
- **Animation:** Framer Motion (drag gestures, swipe physics)
- **Email:** Resend
- **Deploy:** Vercel

## Local development

```bash
# 1. install deps
bun install

# 2. set up env
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.

# 3. (optional) start a local Supabase for offline dev
supabase start
# applies supabase/migrations/* to a local Postgres

# 4. dev server
bun run dev
# open http://localhost:3000
```

## Project layout

```
app/                    # Next.js App Router
├── (marketing)/        # public landing surfaces
├── api/                # route handlers (auto-star, README fetch, access requests)
├── auth/callback/      # OAuth callback handler
├── feed/               # the swipe deck
├── saves/              # right-swipe history
├── leaderboard/        # weekly top creators
├── projects/new/       # project creation form
├── settings/           # user preferences (auto-star toggle, etc.)
├── p/[slug]/           # public share page (og:image-rich)
└── u/[username]/       # public creator profile

components/             # UI components
├── ui/                 # shadcn-style primitives
├── swipe-deck.tsx      # Framer Motion drag deck
└── project-card.tsx    # the card itself

lib/
├── supabase/           # client + server + middleware Supabase clients
├── github.ts           # GitHub API (star, unstar, README, repo metadata)
├── markdown.ts         # server-side markdown render + sanitize
└── utils.ts            # cn(), slugify(), parseGithubRepo(), formatCount()

supabase/
├── migrations/         # SQL migrations
├── functions/          # Edge Functions (Deno)
└── config.toml
```

## Roadmap

- **v0.1 (current)** — web app: feed, swipe + auto-star, saves, leaderboard, share pages, project create
- **v0.2** — search, categories, creator analytics dashboard, in-app push, follow creators
- **v0.5** — native mobile via Expo (same Supabase backend)
- **v1.0** — personalized feed (collaborative filter), curated weekly drops, sponsored boosts

See `~/.claude/plans/this-is-a-brand-joyful-tulip.md` for the full plan.
