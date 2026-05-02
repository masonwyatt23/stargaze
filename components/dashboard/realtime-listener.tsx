"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /**
   * Map of project_id -> project title. Lets us show a friendly toast
   * without a round-trip on each event. Pass the full set of the
   * creator's live projects from the server.
   */
  projectTitles: Record<string, string>;
};

/**
 * Subscribes to Supabase Realtime on the `swipes` table for new
 * right-swipes (INSERT) on any of this user's projects, and pops a
 * sonner toast — "Someone just starred {title}!" — for that wow-moment
 * feedback when their work hits.
 *
 * Mount once at the top of the dashboard. Cleans up on unmount.
 *
 * Implementation notes:
 *   - The Realtime `filter` string supports a single column + operator
 *     pair, so we filter on `project_id=in.(...)` which limits rows to
 *     this creator. The `direction='right'` check is done client-side
 *     to keep the filter simple (and we already pay the bandwidth for
 *     the row, the toast is the only visible side-effect).
 *   - Toasts are deduped by id so a fast double-fire (rare) won't
 *     stack the same notification.
 */
export function RealtimeListener({ projectTitles }: Props) {
  // Stash the latest map in a ref so the effect doesn't tear down + re-
  // subscribe on every render of the parent (which would be wasteful).
  const titlesRef = useRef(projectTitles);
  useEffect(() => {
    titlesRef.current = projectTitles;
  }, [projectTitles]);

  useEffect(() => {
    const projectIds = Object.keys(projectTitles);
    if (projectIds.length === 0) return;

    const supabase = createClient();

    const channel = supabase
      .channel("dashboard-swipes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "swipes",
          filter: `project_id=in.(${projectIds.join(",")})`,
        },
        (payload) => {
          const row = payload.new as
            | { project_id?: string; direction?: string; id?: string }
            | undefined;
          if (!row || row.direction !== "right" || !row.project_id) return;
          const title = titlesRef.current[row.project_id] ?? "your project";
          toast.success(`Someone just starred ${title}!`, {
            id: `swipe-${row.id ?? Date.now()}`,
            description: "A new right-swipe just landed.",
            icon: "★",
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // We intentionally only re-subscribe when the *set* of project ids
    // changes — JSON-stringify is the cheapest stable check here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(Object.keys(projectTitles).sort())]);

  return null;
}

export default RealtimeListener;
