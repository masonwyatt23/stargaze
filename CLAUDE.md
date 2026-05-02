# Stargaze — agent guide

@AGENTS.md

## What this is
A swipe-deck for indie GitHub side projects. Right-swipe = save + auto-star the
repo on GitHub via the user's stored OAuth token. Left-swipe = skip. Leaderboard
ranks creators by real GitHub stars delivered.

## Conventions
- **Package manager:** Bun (`bun install`, `bun add`, `bun run`).
- **Imports:** alias `@/*` resolves to project root. Never use deep relative paths (`../../../`).
- **Styling:** Tailwind v4 with HSL CSS variables (`--primary`, `--background`, etc.) defined in `app/globals.css`. Use `cn()` from `@/lib/utils` to merge classes. Stargaze brand color is yellow `--primary` (`#FACC15`) on deep navy `--background` (`#0B1426`). App defaults to dark mode.
- **Components:** colocate UI in `components/` (kebab-case files, PascalCase exports). Keep server components by default; only `"use client"` when interactivity demands it.
- **Server-side data:** use `createServerClient` from `lib/supabase/server.ts` in route handlers + RSCs. Use `createClient` from `lib/supabase/client.ts` in client components.
- **Auth:** GitHub OAuth via Supabase. The user's `provider_token` is captured in the OAuth callback and stored encrypted in `users.github_token_encrypted` so server routes can star repos on their behalf.
- **Database:** schema in `supabase/migrations/0001_init.sql`. RLS is **on**. All client-side queries must respect policies. Server-role key is only for cron jobs / Edge Functions, never exposed to the browser.

## Key invariants
- Never call the GitHub star API from the client. Always go through `app/api/github/star/route.ts` so the user's token never touches the browser.
- Never log `provider_token`, `github_token_encrypted`, or any secret.
- Never bypass RLS from the server unless explicitly using the service-role key for a system task.
- The swipe deck must work with mouse drag, touch, and keyboard arrows (← / →). Accessibility is a launch requirement.

## Next.js 16 caveats
This project uses Next.js 16, which differs from older docs. Read `node_modules/next/dist/docs/01-app/` before reaching for an API. Notable items: `cookies()` and `headers()` are async; route handler types changed; `params` and `searchParams` in pages are async (`Promise<{...}>`).

## Useful commands
```bash
bun run dev              # Next dev server (Turbopack)
bun run build            # production build
bun run lint             # ESLint
supabase start           # local Supabase (Docker)
supabase db reset        # reapply migrations to local
supabase functions serve # run Edge Functions locally
```
