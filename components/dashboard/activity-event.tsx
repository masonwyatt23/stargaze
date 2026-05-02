import Link from "next/link";
import { Inbox, KeyRound, Star, UserCheck, UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ActivityEvent =
  | {
      kind: "swipe";
      id: string;
      createdAt: string;
      projectTitle: string;
      projectSlug: string;
      /**
       * Anonymized handle of the swiper. We deliberately collapse this
       * to a viewer-style label ("@indie-maker-7") on the UI side to
       * avoid leaking who exactly starred a project — keeps the feed
       * delightful without becoming a stalking surface.
       */
      viewerHandle: string;
      starred: boolean;
    }
  | {
      kind: "access_request";
      id: string;
      createdAt: string;
      projectTitle: string;
      projectSlug: string;
      requesterUsername: string | null;
      requesterAvatarUrl: string | null;
      status: "pending" | "approved" | "declined";
    };

type Props = { event: ActivityEvent };

/**
 * One row in the recent-activity feed. Server-rendered. Designed to
 * scan top-to-bottom: icon on the left, action text in the middle,
 * timestamp on the right.
 */
export function ActivityEventRow({ event }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-border/60 hover:bg-card/40">
      <EventIcon event={event} />
      <div className="min-w-0 flex-1">
        <EventText event={event} />
        <div className="mt-0.5 text-[11px] text-muted-foreground/80">
          {formatRelative(event.createdAt)}
        </div>
      </div>
    </div>
  );
}

function EventIcon({ event }: Props) {
  if (event.kind === "swipe") {
    return (
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          event.starred
            ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/30"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Star
          className={cn("h-4 w-4", event.starred ? "fill-primary" : "")}
        />
      </div>
    );
  }

  if (event.requesterAvatarUrl) {
    return (
      <Avatar className="h-8 w-8 ring-1 ring-border">
        <AvatarImage
          src={event.requesterAvatarUrl}
          alt={event.requesterUsername ?? "requester"}
        />
        <AvatarFallback>
          {(event.requesterUsername ?? "??").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <KeyRound className="h-4 w-4" />
    </div>
  );
}

function EventText({ event }: Props) {
  if (event.kind === "swipe") {
    return (
      <div className="text-sm leading-snug">
        <span className="font-medium text-foreground">
          {event.viewerHandle}
        </span>
        <span className="text-muted-foreground"> saved your </span>
        <Link
          href={`/p/${event.projectSlug}`}
          className="font-medium text-foreground hover:text-primary"
        >
          {event.projectTitle}
        </Link>
        {event.starred ? null : (
          <Badge
            variant="outline"
            className="ml-2 text-[10px] text-muted-foreground"
          >
            no star
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm leading-snug">
      <span className="font-medium text-foreground">
        {event.requesterUsername ? `@${event.requesterUsername}` : "Someone"}
      </span>
      <span className="text-muted-foreground"> requested access to </span>
      <Link
        href={`/p/${event.projectSlug}`}
        className="font-medium text-foreground hover:text-primary"
      >
        {event.projectTitle}
      </Link>
      <span className="ml-2">
        {event.status === "pending" ? (
          <Badge variant="warning" className="gap-1 text-[10px]">
            <Inbox className="h-2.5 w-2.5" />
            pending
          </Badge>
        ) : event.status === "approved" ? (
          <Badge variant="success" className="gap-1 text-[10px]">
            <UserCheck className="h-2.5 w-2.5" />
            approved
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <UserX className="h-2.5 w-2.5" />
            declined
          </Badge>
        )}
      </span>
    </div>
  );
}

/**
 * Lightweight relative-time formatter — Intl.RelativeTimeFormat would
 * be heavier and we want server-rendered output that doesn't shift on
 * hydration. Static "Xm ago" / "Xh ago" / "Xd ago" / date.
 */
function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default ActivityEventRow;
