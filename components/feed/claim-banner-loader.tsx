"use client";

/**
 * Mounts the claim banner above the feed without modifying the
 * feed page (which is owned by the personalized-feed agent).
 *
 * Fetches /api/claim/count on the client; renders nothing until we know
 * there's actually something to claim.
 */
import { useEffect, useState } from "react";
import { ClaimBanner } from "./claim-banner";

type ClaimCountResponse = {
  count: number;
  sample?: string[];
};

export function ClaimBannerLoader({ className }: { className?: string }) {
  const [data, setData] = useState<ClaimCountResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetch("/api/claim/count", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: ClaimCountResponse | null) => {
        if (!cancelled && json && json.count > 0) {
          setData(json);
        }
      })
      .catch(() => {
        // Network/abort — banner just doesn't show.
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (!data || data.count <= 0) return null;

  return (
    <ClaimBanner
      count={data.count}
      sample={data.sample}
      className={className}
    />
  );
}
