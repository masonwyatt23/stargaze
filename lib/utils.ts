import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Slugify a string for project share URLs (`/p/[slug]`).
 * Lowercases, strips non-alphanumeric, collapses whitespace to single hyphens.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Parse owner/repo out of a GitHub URL. Returns null if not a valid GH URL.
 * Accepts: https://github.com/owner/repo[/...], git@github.com:owner/repo.git
 */
export function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  if (!url) return null;
  const cleaned = url.trim();
  const httpsMatch = cleaned.match(/^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)(?:[/?#]|$)/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2].replace(/\.git$/, "") };
  }
  const sshMatch = cleaned.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }
  return null;
}

/** Format a number compactly: 1234 → "1.2k", 1_500_000 → "1.5M" */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
