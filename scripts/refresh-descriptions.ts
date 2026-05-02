#!/usr/bin/env bun
/**
 * Backfill rich descriptions on imported projects.
 *
 * For each project where description_html is null/empty AND github_repo_url is
 * set, fetch the repo's README via gh CLI, render to sanitized HTML server-
 * side, and UPDATE the row.
 *
 * Run:
 *   set -a; source .env.local; set +a
 *   bun scripts/refresh-descriptions.ts
 *
 * Safe to re-run — only touches rows missing description_html.
 */

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { parseGithubRepo } from "../lib/utils";
import { renderMarkdown } from "../lib/markdown";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing env. set -a; source .env.local; set +a; bun scripts/refresh-descriptions.ts");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function ghReadme(owner: string, repo: string): string | null {
  // Validate owner/repo defensively — only call gh if they match GitHub's
  // legal slug shape. Belt-and-suspenders alongside execFileSync (no shell).
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
  try {
    return execFileSync(
      "gh",
      ["api", `/repos/${owner}/${repo}/readme`, "-H", "Accept: application/vnd.github.raw"],
      { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    return null;
  }
}

async function main() {
  const { data: rows, error } = await sb
    .from("projects")
    .select("id, title, github_repo_url, description_html, description_md")
    .or("description_html.is.null,description_html.eq.")
    .not("github_repo_url", "is", null);

  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }

  console.log(`→ ${rows?.length ?? 0} projects need descriptions.`);

  let updated = 0;
  let missingReadme = 0;

  for (const r of rows ?? []) {
    const parsed = parseGithubRepo(r.github_repo_url ?? "");
    if (!parsed) continue;

    const md = ghReadme(parsed.owner, parsed.repo);
    if (!md) {
      console.log(`  ~ ${r.title}: no README (likely private or missing)`);
      missingReadme++;
      continue;
    }

    // Truncate giant READMEs before rendering
    const trimmed = md.length > 50_000 ? md.slice(0, 50_000) + "\n\n…" : md;
    const html = renderMarkdown(trimmed);

    const { error: updErr } = await sb
      .from("projects")
      .update({ description_md: trimmed, description_html: html })
      .eq("id", r.id);

    if (updErr) {
      console.warn(`  ! ${r.title}: ${updErr.message}`);
    } else {
      console.log(`  + ${r.title}  (${md.length} chars)`);
      updated++;
    }
  }

  console.log(`\nDone. Updated: ${updated}. Missing README: ${missingReadme}.`);
}

main().catch((err) => {
  console.error("Refresh failed:", err);
  process.exit(1);
});
