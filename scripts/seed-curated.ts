#!/usr/bin/env bun
/**
 * Seed Stargaze with ~30 curated GitHub Trending projects.
 *
 * Creates a `@stargaze-curator` user (one-time, idempotent) and inserts
 * project rows attributed to them. Each project links to the original
 * GitHub repo and credits the original owner in the description.
 *
 * Run with:
 *   bun scripts/seed-curated.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   gh CLI authenticated (used to query the GitHub Search API)
 */

import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { slugify } from "../lib/utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CURATOR_USERNAME = "stargaze-curator";
const CURATOR_EMAIL = "curator@stargaze.dev";

// Curated query batches — each pulls a different angle of indie work.
const QUERIES: Array<{
  q: string;
  category: "ai-tool" | "dev-utility" | "game" | "saas" | "other";
  count: number;
}> = [
  {
    q: "ai created:>2026-01-01 stars:50..2000 language:typescript",
    category: "ai-tool",
    count: 6,
  },
  {
    q: "agent created:>2026-01-01 stars:50..2000",
    category: "ai-tool",
    count: 6,
  },
  {
    q: "cli created:>2026-01-01 stars:30..1500 language:rust",
    category: "dev-utility",
    count: 5,
  },
  {
    q: "saas created:>2026-01-01 stars:30..1000",
    category: "saas",
    count: 5,
  },
  {
    q: "game created:>2026-01-01 stars:30..1500",
    category: "game",
    count: 4,
  },
  {
    q: "tool created:>2026-01-01 stars:50..1500 language:python",
    category: "dev-utility",
    count: 4,
  },
];

type GitHubRepo = {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  owner: { login: string; avatar_url: string };
  topics?: string[];
};

async function ensureCurator(): Promise<string> {
  console.log("→ Ensuring @stargaze-curator user exists...");

  // Check if curator already exists by github_username
  const { data: existing } = await sb
    .from("users")
    .select("id")
    .eq("github_username", CURATOR_USERNAME)
    .maybeSingle();

  if (existing?.id) {
    console.log(`  ✓ Curator exists: ${existing.id}`);
    return existing.id;
  }

  // Create auth.users entry via admin API
  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email: CURATOR_EMAIL,
    email_confirm: true,
    user_metadata: {
      curator: true,
      display_name: "Stargaze Editorial",
    },
  });
  if (authErr || !authData.user) {
    throw new Error(`auth.admin.createUser failed: ${authErr?.message}`);
  }

  const userId = authData.user.id;

  // Insert public.users row
  const { error: insertErr } = await sb.from("users").insert({
    id: userId,
    github_username: CURATOR_USERNAME,
    github_id: 0, // sentinel; real users have real GH ids
    display_name: "Stargaze Editorial",
    avatar_url: null,
    bio: "Hand-picked indie projects from across GitHub. Sign in to claim a project as your own.",
    auto_star_enabled: false,
  });
  if (insertErr) {
    throw new Error(`users insert failed: ${insertErr.message}`);
  }

  console.log(`  ✓ Created curator: ${userId}`);
  return userId;
}

function ghSearch(q: string, perPage: number): GitHubRepo[] {
  const cmd = `gh api -X GET "search/repositories" -f q="${q}" -f sort=stars -f order=desc -f per_page=${perPage}`;
  const out = execSync(cmd, { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
  const data = JSON.parse(out);
  return data.items as GitHubRepo[];
}

function buildSlug(repo: GitHubRepo): string {
  const base = slugify(repo.full_name.split("/")[1] ?? repo.full_name);
  const suffix = randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}

function buildDescription(repo: GitHubRepo): string {
  const description = repo.description ?? "";
  const trimmed = description.length > 500 ? description.slice(0, 497) + "..." : description;
  return [
    trimmed,
    "",
    "---",
    `_Featured by Stargaze Editorial. Original repo by [@${repo.owner.login}](https://github.com/${repo.owner.login}). If you're the maintainer, sign in to claim this project._`,
  ].join("\n");
}

async function seedRepos(curatorId: string) {
  const seen = new Set<string>();
  const queued: Array<{ repo: GitHubRepo; category: string }> = [];

  for (const { q, category, count } of QUERIES) {
    console.log(`→ Searching: ${q}`);
    let items: GitHubRepo[] = [];
    try {
      items = ghSearch(q, count * 2);
    } catch (err) {
      console.warn(`  ⚠ search failed: ${(err as Error).message}`);
      continue;
    }
    let added = 0;
    for (const repo of items) {
      if (added >= count) break;
      if (seen.has(repo.html_url)) continue;
      if (!repo.description) continue; // skip un-described repos
      seen.add(repo.html_url);
      queued.push({ repo, category });
      added++;
    }
    console.log(`  ✓ queued ${added} from this batch`);
  }

  console.log(`\n→ Inserting ${queued.length} projects...`);

  let inserted = 0;
  let skipped = 0;
  for (const { repo, category } of queued) {
    // Avoid duplicates if seed runs twice
    const { data: existing } = await sb
      .from("projects")
      .select("id")
      .eq("github_repo_url", repo.html_url)
      .maybeSingle();
    if (existing?.id) {
      skipped++;
      continue;
    }

    const tagline = (repo.description ?? "").slice(0, 100);
    const slug = buildSlug(repo);

    const { error } = await sb.from("projects").insert({
      slug,
      user_id: curatorId,
      title: repo.full_name.split("/").pop() ?? repo.full_name,
      tagline,
      description_md: buildDescription(repo),
      github_repo_url: repo.html_url,
      github_stars: repo.stargazers_count,
      github_language: repo.language,
      is_open_source: true,
      cta_url: repo.html_url,
      category,
      status: "live",
    });

    if (error) {
      console.warn(`  ⚠ ${repo.full_name}: ${error.message}`);
    } else {
      inserted++;
      console.log(`  ✓ ${repo.full_name} (${repo.stargazers_count}★)`);
    }
  }

  console.log(`\nDone. Inserted: ${inserted}. Skipped (already present): ${skipped}.`);
}

async function main() {
  const curatorId = await ensureCurator();
  await seedRepos(curatorId);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
