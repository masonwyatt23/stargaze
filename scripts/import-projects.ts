#!/usr/bin/env bun
/**
 * Bulk-import projects from a JSON file into Stargaze.
 *
 * Usage:
 *   bun scripts/import-projects.ts ./my-projects.json
 *
 * Input format (./my-projects.json):
 *   {
 *     "default_creator_github_username": "masonwyatt23",      // optional fallback
 *     "default_creator_display_name": "Mason Wyatt",          // optional
 *     "default_creator_avatar_url": "https://...",            // optional
 *     "projects": [
 *       {
 *         "title": "My cool tool",                            // required
 *         "tagline": "A one-liner under 100 chars",           // required
 *         "github_repo_url": "https://github.com/me/repo",    // optional; auto-fetches stars/lang/README
 *         "is_open_source": true,                             // required
 *         "category": "ai-tool",                              // ai-tool | dev-utility | game | saas | other
 *         "cta_url": "https://my-app.com",                    // optional
 *         "screenshots": ["https://...", "https://..."],      // optional
 *         "demo_video_url": "https://...",                    // optional (YouTube/Loom/MP4)
 *         "description_md": "# Long form\\n...",              // optional; falls back to README
 *         "creator_github_username": "other-user"             // optional override
 *       }
 *     ]
 *   }
 *
 * What it does:
 *   1. For each unique creator_github_username, ensures a Stargaze user exists
 *      (creates one with github_id=0 — bypasses rate limits, treated as system).
 *   2. For each project: skips if github_repo_url already imported. Else:
 *      - If github_repo_url is set, calls GitHub API to enrich (stars, language, README).
 *      - Renders README → sanitized HTML.
 *      - Generates a slug.
 *      - Inserts the project + media rows.
 *
 * Requirements:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   - gh CLI installed + authenticated (used for GitHub API calls)
 */

import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { slugify, parseGithubRepo } from "../lib/utils";
import { renderMarkdown } from "../lib/markdown";

type InputProject = {
  title: string;
  tagline: string;
  github_repo_url?: string;
  is_open_source: boolean;
  category?: "ai-tool" | "dev-utility" | "game" | "saas" | "other";
  cta_url?: string;
  screenshots?: string[];
  demo_video_url?: string;
  description_md?: string;
  creator_github_username?: string;
  creator_display_name?: string;
  creator_avatar_url?: string;
};

type InputFile = {
  default_creator_github_username?: string;
  default_creator_display_name?: string;
  default_creator_avatar_url?: string;
  projects: InputProject[];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
  console.error("Run with:  set -a; source .env.local; set +a; bun scripts/import-projects.ts <file>");
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: bun scripts/import-projects.ts <projects.json>");
  process.exit(1);
}

const raw = readFileSync(resolve(inputPath), "utf-8");
const input = JSON.parse(raw) as InputFile;

if (!Array.isArray(input.projects) || input.projects.length === 0) {
  console.error("No projects in the input file.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ------------------------------------------------------------------------ */

async function ensureCreator(
  username: string,
  displayName?: string,
  avatarUrl?: string,
): Promise<string> {
  const handle = username.toLowerCase().trim();
  const { data: existing } = await sb
    .from("users")
    .select("id")
    .eq("github_username", handle)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  // Create a Supabase auth.users entry — required for the FK
  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email: `${handle}@import.stargaze.local`,
    email_confirm: true,
    user_metadata: { imported_creator: true, display_name: displayName ?? handle },
  });
  if (authErr || !authData.user) {
    throw new Error(`auth.admin.createUser failed for ${handle}: ${authErr?.message}`);
  }

  const { error: insertErr } = await sb.from("users").insert({
    id: authData.user.id,
    github_username: handle,
    github_id: 0, // sentinel — bypasses rate limits, never collides with real GH
    display_name: displayName ?? handle,
    avatar_url: avatarUrl ?? null,
    bio: "Imported by Stargaze. Sign in with the matching GitHub account to claim this profile and your projects.",
    auto_star_enabled: false,
  });
  if (insertErr) throw new Error(`users insert failed for ${handle}: ${insertErr.message}`);

  console.log(`  + created creator @${handle}`);
  return authData.user.id;
}

type GitHubRepo = {
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
  default_branch: string;
};

function ghApi<T>(path: string): T | null {
  try {
    const out = execSync(`gh api ${JSON.stringify(path)}`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });
    return JSON.parse(out) as T;
  } catch {
    return null;
  }
}

function ghReadme(owner: string, repo: string): string | null {
  try {
    const out = execSync(
      `gh api ${JSON.stringify(`/repos/${owner}/${repo}/readme`)} -H "Accept: application/vnd.github.raw"`,
      { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 },
    );
    return out;
  } catch {
    return null;
  }
}

function buildSlug(title: string): string {
  const base = slugify(title) || "project";
  return `${base}-${randomUUID().slice(0, 6)}`;
}

/* ------------------------------------------------------------------------ */

async function main() {
  const defaults = {
    creator: input.default_creator_github_username,
    displayName: input.default_creator_display_name,
    avatarUrl: input.default_creator_avatar_url,
  };

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const p of input.projects) {
    const handle = p.creator_github_username ?? defaults.creator;
    if (!handle) {
      console.warn(
        `  ! skipping "${p.title}": no creator_github_username and no default set.`,
      );
      errors++;
      continue;
    }

    try {
      // Skip duplicates by github_repo_url
      if (p.github_repo_url) {
        const { data: dup } = await sb
          .from("projects")
          .select("id")
          .eq("github_repo_url", p.github_repo_url)
          .maybeSingle();
        if (dup?.id) {
          console.log(`  ~ skip (already imported): ${p.title}`);
          skipped++;
          continue;
        }
      }

      const userId = await ensureCreator(
        handle,
        p.creator_display_name ?? defaults.displayName,
        p.creator_avatar_url ?? defaults.avatarUrl,
      );

      // GitHub enrichment
      let stars: number | null = null;
      let language: string | null = null;
      let descriptionFromRepo: string | null = null;
      let descriptionMd = p.description_md ?? null;

      if (p.github_repo_url) {
        const parsed = parseGithubRepo(p.github_repo_url);
        if (parsed) {
          const repo = ghApi<GitHubRepo>(`/repos/${parsed.owner}/${parsed.repo}`);
          if (repo) {
            stars = repo.stargazers_count;
            language = repo.language;
            descriptionFromRepo = repo.description;
          }
          if (!descriptionMd) {
            const readme = ghReadme(parsed.owner, parsed.repo);
            if (readme) {
              descriptionMd =
                readme.length > 50_000 ? readme.slice(0, 50_000) + "\n\n…" : readme;
            }
          }
        }
      }

      const finalDescription =
        descriptionMd ??
        (descriptionFromRepo
          ? `${descriptionFromRepo}\n\n_Imported from GitHub._`
          : null);
      const description_html = finalDescription
        ? renderMarkdown(finalDescription)
        : null;

      const slug = buildSlug(p.title);

      const { data: project, error: insertErr } = await sb
        .from("projects")
        .insert({
          slug,
          user_id: userId,
          title: p.title,
          tagline: p.tagline.slice(0, 100),
          description_md: finalDescription,
          description_html,
          github_repo_url: p.github_repo_url ?? null,
          github_stars: stars,
          github_language: language,
          is_open_source: p.is_open_source,
          cta_url: p.cta_url ?? p.github_repo_url ?? null,
          category: p.category ?? null,
          status: "live",
        })
        .select("id, slug")
        .single();

      if (insertErr || !project) {
        console.error(`  ! ${p.title}: ${insertErr?.message ?? "unknown"}`);
        errors++;
        continue;
      }

      // Media rows
      const mediaRows = [];
      let order = 0;
      for (const url of p.screenshots ?? []) {
        mediaRows.push({
          project_id: project.id,
          type: "screenshot",
          url,
          order_index: order++,
        });
      }
      if (p.demo_video_url) {
        mediaRows.unshift({
          project_id: project.id,
          type: "video",
          url: p.demo_video_url,
          order_index: -1,
        });
      }
      if (mediaRows.length > 0) {
        const { error: mediaErr } = await sb.from("project_media").insert(mediaRows);
        if (mediaErr) {
          console.warn(
            `  ! media insert failed for ${p.title}: ${mediaErr.message}`,
          );
        }
      }

      console.log(`  + ${p.title}  /p/${project.slug}  ${stars ? `(${stars}★)` : ""}`);
      inserted++;
    } catch (err) {
      console.error(`  ! ${p.title}: ${(err as Error).message}`);
      errors++;
    }
  }

  console.log(
    `\nDone. Inserted: ${inserted}. Skipped (duplicates): ${skipped}. Errors: ${errors}.`,
  );
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
