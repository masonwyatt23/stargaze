"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

export type AutoCoverSource = "live" | "github";

type Inputs = {
  /** URL to screenshot — typically the user's CTA URL or live site. */
  liveUrl: string | undefined;
  /** GitHub repo URL — used both as the screenshot target fallback and the
   *  source for `opengraph.githubassets.com` social previews. */
  githubUrl: string | undefined;
  /** Called with the resolved cover-image URL once the API returns it. */
  onResolved: (url: string) => void;
};

/**
 * Shared client hook used by both the create- and edit-project forms to fetch
 * a cover image without leaving the page. Wraps `/api/cover/auto` with the
 * busy-state machine, toast handling, and source-selection logic that would
 * otherwise duplicate across both forms.
 */
export function useAutoCover({ liveUrl, githubUrl, onResolved }: Inputs) {
  const [busy, setBusy] = useState<null | AutoCoverSource>(null);

  const run = useCallback(
    async (source: AutoCoverSource) => {
      const url =
        source === "github"
          ? githubUrl?.trim()
          : liveUrl?.trim() || githubUrl?.trim() || "";
      if (!url) {
        toast.error(
          source === "github"
            ? "Add a GitHub repo URL first."
            : "Add a live URL or GitHub repo URL first.",
        );
        return;
      }
      setBusy(source);
      try {
        const res = await fetch("/api/cover/auto", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url, source }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toast.error("Couldn't generate a cover.", {
            description: body?.error ?? `HTTP ${res.status}`,
          });
          return;
        }
        const body = (await res.json()) as { url: string };
        onResolved(body.url);
        toast.success(
          source === "github"
            ? "Pulled the GitHub social preview."
            : "Generated a live screenshot.",
        );
      } catch (err) {
        toast.error("Network error.", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setBusy(null);
      }
    },
    [liveUrl, githubUrl, onResolved],
  );

  return { busy, run };
}
