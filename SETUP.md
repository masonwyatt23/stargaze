# Stargaze — manual setup checklist

The code is shipped. A few external accounts can't be created via API, so
here's the short list of things to do once. Estimated time: **20 minutes total**.

## 1. GitHub OAuth app (5 min) — required for sign-in

GitHub doesn't expose an API to register OAuth apps, so this is manual.

1. Visit https://github.com/settings/developers → **New OAuth App**
2. Fill in:
   - **Application name:** Stargaze
   - **Homepage URL:** `https://stargaze.vercel.app` (or your custom domain)
   - **Authorization callback URL:** `https://<YOUR_SUPABASE_PROJECT>.supabase.co/auth/v1/callback`
     - You'll get the Supabase URL after step 2 — come back to fill this in.
3. Hit **Register application**
4. On the next screen, hit **Generate a new client secret**
5. Copy:
   - `Client ID` → save for step 2
   - `Client Secret` → save for step 2 (only shown once)

## 2. Supabase Auth provider config (3 min)

Once the Supabase project is created (I'll handle that part once you authorize the MCP):

1. In Supabase dashboard → **Authentication → Providers → GitHub**
2. Enable it
3. Paste the `Client ID` + `Client Secret` from step 1
4. Required scopes (in **Scopes** field): `public_repo read:user user:email`
5. Save

## 3. Resend (5 min) — for email notifications (optional v0.1, required for access requests)

1. Sign up at https://resend.com (free tier: 3k emails/mo, 100/day)
2. Verify a sending domain (or use the default `onboarding@resend.dev` for testing)
3. Create an API key at https://resend.com/api-keys
4. Add to Vercel env vars:
   - `RESEND_API_KEY=re_...`
   - `RESEND_FROM_EMAIL="Stargaze <hello@yourdomain.com>"`

## 4. Domain (5 min) — once you're ready to ship

Recommended (in priority order):
- `stargaze.dev` — most on-brand, dev-targeted TLD (~$15/yr at Cloudflare)
- `stargaze.gg` — playful, indie vibe (~$30/yr)
- `stargaze.so` — minimalist, slightly hipster (~$30/yr)

Quick checks:
```bash
whois stargaze.dev | grep -i 'no match\|not found'   # available
whois stargaze.gg  | grep -i 'no match\|not found'
whois stargaze.so  | grep -i 'no match\|not found'
```

Buy at Cloudflare Registrar (cheapest, no markup). Then in Vercel: **Project → Settings → Domains** → add the domain → follow the DNS steps.

## 5. Production env vars (2 min)

Set these in Vercel project settings or via CLI:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add GITHUB_TOKEN_ENCRYPTION_KEY production
# After step 3:
vercel env add RESEND_API_KEY production
vercel env add RESEND_FROM_EMAIL production
# After step 4:
vercel env add NEXT_PUBLIC_SITE_URL production   # value: https://stargaze.dev
```

Then redeploy: `vercel --prod`

## 6. First seed projects (founder hustle, 1–2 hours)

Per the cold-start plan: aim for ~80 quality projects in the feed by launch day.

- Personally onboard 10–15 power-creators (Twitter / Indie Hackers / Lovable Discord)
- Self-post 5–10 of your own/curated projects via `/projects/new`
- Manually import GitHub Trending picks: post under your account with creator attribution noted in the description, invite original creators to claim ownership

## 7. Disable Vercel Authentication on the project (1 min)

The project was linked under your `evero` Vercel team, which has Vercel
Authentication enabled by default — meaning preview deployments are gated
behind a login wall. Public visitors hit a 401.

1. Visit https://vercel.com/evero/stargaze/settings/deployment-protection
2. Under **Vercel Authentication**, toggle it **off** for Production (and Preview if you want public link sharing).
3. Save.

Alternative: move the project to your personal scope (no team gating). In Vercel dashboard → Settings → General → Transfer Project.

## 8. Bulk-import your projects (whenever you're ready)

You have a list of projects you want to seed Stargaze with. Use the import
script — it handles GitHub enrichment (stars, language, README), creator
user creation, dedup against existing rows, and rate-limit bypass.

1. Create a JSON file (start from `scripts/projects.example.json`):
   ```json
   {
     "default_creator_github_username": "masonwyatt23",
     "default_creator_display_name": "Mason Wyatt",
     "projects": [
       {
         "title": "My cool tool",
         "tagline": "One-liner under 100 chars",
         "github_repo_url": "https://github.com/masonwyatt23/my-tool",
         "is_open_source": true,
         "category": "ai-tool",
         "screenshots": ["https://...png"],
         "demo_video_url": "https://youtube.com/embed/..."
       }
     ]
   }
   ```

2. Run:
   ```bash
   set -a; source .env.local; set +a
   bun scripts/import-projects.ts ./my-projects.json
   ```

3. Each project is inserted, GitHub stars/language are auto-fetched if you
   provided a repo URL, the README is rendered to HTML, and a unique slug
   like `/p/my-tool-a3f7b2` is generated. Re-running is safe — duplicates
   are skipped by `github_repo_url`.

## What I've already done for you

- ✅ Code shipped at https://github.com/masonwyatt23/stargaze
- ✅ Production build passes (17 routes, tsc + lint clean)
- ✅ Stargaze brand applied (yellow `#FACC15` on navy `#0B1426`, dark mode default, Geist fonts)
- ✅ Auto-star on right-swipe wired end-to-end (server-only, encrypted token)
- ✅ Supabase migration ready to apply (`supabase/migrations/0001_init.sql`)
- ✅ Vercel project linked + first deploy live at https://stargaze-evero.vercel.app (gated by Vercel Auth until step 7)
- ⏳ Supabase project + migration push (waiting on your one-time MCP authorization)
