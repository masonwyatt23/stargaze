/**
 * Server-side GitHub API client for Stargaze.
 *
 * Do NOT import this from client components — it consumes user OAuth tokens.
 * Every call uses the v3 REST API at https://api.github.com with the
 * `2022-11-28` API version pin and `application/vnd.github+json` accept header.
 *
 * Errors are normalized to typed subclasses so callers can map them to UX
 * outcomes (force-reauth on 401, retry-later on 429, mark missing on 404, etc).
 */

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_ACCEPT = "application/vnd.github+json";
const _GITHUB_RAW_ACCEPT = "application/vnd.github.raw+json";
const USER_AGENT = "stargaze-app";

/** Default per-request timeout. Swipe path overrides this with 4s. */
const DEFAULT_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

export class GitHubAuthError extends GitHubError {
  constructor(message = "GitHub auth failed (token invalid or revoked)") {
    super(message, 401);
    this.name = "GitHubAuthError";
  }
}

export class GitHubRateLimitError extends GitHubError {
  resetAt: Date | null;
  constructor(message = "GitHub rate limit exceeded", resetAt: Date | null = null) {
    super(message, 429);
    this.name = "GitHubRateLimitError";
    this.resetAt = resetAt;
  }
}

export class GitHubNotFoundError extends GitHubError {
  constructor(message = "GitHub resource not found") {
    super(message, 404);
    this.name = "GitHubNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// Internal request helper
// ---------------------------------------------------------------------------

interface GitHubRequestInit {
  method?: string;
  token?: string | null;
  accept?: string;
  body?: unknown;
  /** Per-call timeout (ms). Default 8s. Star calls override to 4s. */
  timeoutMs?: number;
}

async function githubRequest(
  path: string,
  init: GitHubRequestInit = {},
): Promise<Response> {
  const { method = "GET", token, accept = GITHUB_ACCEPT, body, timeoutMs = DEFAULT_TIMEOUT_MS } = init;

  const headers: Record<string, string> = {
    Accept: accept,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": USER_AGENT,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${GITHUB_API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Disable Next's fetch caching for user-scoped GH calls.
      cache: "no-store",
      signal: ctrl.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new GitHubError(`GitHub request timed out after ${timeoutMs}ms`, 408);
    }
    throw new GitHubError(
      `GitHub network error: ${err instanceof Error ? err.message : String(err)}`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  // Detect rate-limit even when status looks "ok" (e.g. secondary limits return 403).
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (
    res.status === 429 ||
    (res.status === 403 && remaining === "0")
  ) {
    const resetSec = Number(res.headers.get("x-ratelimit-reset"));
    const resetAt = Number.isFinite(resetSec) && resetSec > 0 ? new Date(resetSec * 1000) : null;
    throw new GitHubRateLimitError("GitHub rate limit exceeded", resetAt);
  }

  if (res.status === 401) throw new GitHubAuthError();
  if (res.status === 404) throw new GitHubNotFoundError();

  return res;
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.clone().json()) as { message?: string };
    if (data && typeof data.message === "string") return data.message;
  } catch {
    /* fall through to text */
  }
  try {
    return (await res.text()) || res.statusText;
  } catch {
    return res.statusText;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RepoIdentity {
  owner: string;
  repo: string;
  token: string;
}

/** PUT /user/starred/:owner/:repo — 204 = success. */
export async function starRepo({ owner, repo, token }: RepoIdentity): Promise<void> {
  const res = await githubRequest(
    `/user/starred/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { method: "PUT", token, timeoutMs: 4_000 },
  );
  if (res.status !== 204) {
    throw new GitHubError(
      `Failed to star ${owner}/${repo}: ${await readErrorMessage(res)}`,
      res.status,
    );
  }
}

/** DELETE /user/starred/:owner/:repo — 204 = success. */
export async function unstarRepo({ owner, repo, token }: RepoIdentity): Promise<void> {
  const res = await githubRequest(
    `/user/starred/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { method: "DELETE", token, timeoutMs: 4_000 },
  );
  if (res.status !== 204) {
    throw new GitHubError(
      `Failed to unstar ${owner}/${repo}: ${await readErrorMessage(res)}`,
      res.status,
    );
  }
}

export interface GitHubRepoMetadata {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  license: { key: string; name: string; spdx_id: string | null } | null;
  private: boolean;
  archived: boolean;
  fork: boolean;
}

/**
 * GET /repos/:owner/:repo — public repos don't need a token; pass one for
 * higher rate limits (5000/hr authed vs 60/hr anon).
 */
export async function fetchRepoMetadata({
  owner,
  repo,
  token,
}: {
  owner: string;
  repo: string;
  token?: string | null;
}): Promise<GitHubRepoMetadata> {
  const res = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { token: token ?? null },
  );
  if (!res.ok) {
    throw new GitHubError(
      `Failed to fetch repo metadata for ${owner}/${repo}: ${await readErrorMessage(res)}`,
      res.status,
    );
  }
  const data = (await res.json()) as Record<string, unknown>;
  return {
    name: String(data.name ?? repo),
    full_name: String(data.full_name ?? `${owner}/${repo}`),
    description: typeof data.description === "string" ? data.description : null,
    html_url: String(data.html_url ?? `https://github.com/${owner}/${repo}`),
    homepage: typeof data.homepage === "string" && data.homepage ? data.homepage : null,
    default_branch: String(data.default_branch ?? "main"),
    language: typeof data.language === "string" ? data.language : null,
    stargazers_count: Number(data.stargazers_count ?? 0),
    forks_count: Number(data.forks_count ?? 0),
    open_issues_count: Number(data.open_issues_count ?? 0),
    topics: Array.isArray(data.topics) ? (data.topics as string[]) : [],
    license:
      data.license && typeof data.license === "object"
        ? {
            key: String((data.license as Record<string, unknown>).key ?? ""),
            name: String((data.license as Record<string, unknown>).name ?? ""),
            spdx_id:
              typeof (data.license as Record<string, unknown>).spdx_id === "string"
                ? ((data.license as Record<string, unknown>).spdx_id as string)
                : null,
          }
        : null,
    private: Boolean(data.private),
    archived: Boolean(data.archived),
    fork: Boolean(data.fork),
  };
}

/**
 * GET /repos/:owner/:repo/readme — returns base64-decoded markdown.
 * We request the JSON form so we can detect non-existence cleanly via 404.
 */
export async function fetchReadme({
  owner,
  repo,
  token,
}: {
  owner: string;
  repo: string;
  token?: string | null;
}): Promise<string> {
  const res = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
    { token: token ?? null },
  );
  if (!res.ok) {
    throw new GitHubError(
      `Failed to fetch README for ${owner}/${repo}: ${await readErrorMessage(res)}`,
      res.status,
    );
  }
  const data = (await res.json()) as { content?: string; encoding?: string };
  if (!data.content) return "";
  if (data.encoding && data.encoding !== "base64") {
    // GitHub currently always returns base64; future-proof.
    return data.content;
  }
  // Strip whitespace/newlines GitHub inserts inside base64.
  const cleaned = data.content.replace(/\s+/g, "");
  try {
    // atob exists in Node 18+ globally; Buffer fallback for safety.
    if (typeof atob === "function") {
      const binary = atob(cleaned);
      // Treat as UTF-8.
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    }
    return Buffer.from(cleaned, "base64").toString("utf-8");
  } catch {
    return "";
  }
}
