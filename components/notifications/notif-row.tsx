import Link from "next/link";
import { Inbox, Lock, Sparkles, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Variant-driven inbox row.
 *
 * Visual: 40x40 left-side icon/avatar slot + title + subtle meta + right-aligned
 * timestamp / status. Server component — no event handlers, just renders.
 */

type BaseRowProps = {
  href?: string;
  unread?: boolean;
};

type SwipeRowProps = BaseRowProps & {
  variant: "swipe";
  projectTitle: string;
  projectSlug: string;
  count: number;
  /** ISO timestamp of the most recent swipe in this group. */
  latestAt: string;
  /** Optional preview avatars — first 3 swipers. */
  swipers?: Array<{
    githubUsername: string;
    avatarUrl: string | null;
  }>;
};

type AccessRequestRowProps = BaseRowProps & {
  variant: "access-request";
  projectTitle: string;
  projectSlug: string;
  requesterUsername: string | null;
  requesterAvatarUrl: string | null;
  requesterEmail: string;
  status: "pending" | "approved" | "declined";
  message: string | null;
  createdAt: string;
};

type ClaimRowProps = BaseRowProps & {
  variant: "claim";
  count: number;
  sample?: string[];
};

type WelcomeRowProps = BaseRowProps & {
  variant: "welcome";
  username: string;
};

export type NotifRowProps =
  | SwipeRowProps
  | AccessRequestRowProps
  | ClaimRowProps
  | WelcomeRowProps;

export function NotifRow(props: NotifRowProps) {
  const inner = renderInner(props);
  const wrapperClass = cn(
    "group flex gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors",
    props.href && "hover:border-border hover:bg-card/70",
    props.unread && "border-primary/40 bg-primary/[0.04]",
  );

  if (props.href) {
    return (
      <Link href={props.href} className={wrapperClass}>
        {inner}
      </Link>
    );
  }
  return <div className={wrapperClass}>{inner}</div>;
}

function renderInner(props: NotifRowProps) {
  switch (props.variant) {
    case "swipe":
      return <SwipeBody {...props} />;
    case "access-request":
      return <AccessRequestBody {...props} />;
    case "claim":
      return <ClaimBody {...props} />;
    case "welcome":
      return <WelcomeBody {...props} />;
  }
}

function SwipeBody(props: SwipeRowProps) {
  const noun = props.count === 1 ? "person" : "people";
  return (
    <>
      <IconBubble tone="primary">
        <Star className="h-4 w-4" />
      </IconBubble>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm leading-snug">
          <span className="font-medium text-primary">{props.count}</span>{" "}
          {noun} right-swiped{" "}
          <span className="font-medium text-foreground">
            {props.projectTitle}
          </span>
        </p>
        {props.swipers && props.swipers.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <AvatarStack swipers={props.swipers} />
            {props.count > props.swipers.length ? (
              <span className="text-xs text-muted-foreground">
                +{props.count - props.swipers.length} more
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <RelativeTime iso={props.latestAt} />
    </>
  );
}

function AccessRequestBody(props: AccessRequestRowProps) {
  const tone =
    props.status === "approved"
      ? "emerald"
      : props.status === "declined"
        ? "muted"
        : "amber";
  const statusLabel =
    props.status === "approved"
      ? "Approved"
      : props.status === "declined"
        ? "Declined"
        : "Pending";
  const requesterLabel = props.requesterUsername
    ? `@${props.requesterUsername}`
    : props.requesterEmail;

  return (
    <>
      <IconBubble tone="amber">
        <Lock className="h-4 w-4" />
      </IconBubble>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm leading-snug">
          <span className="font-medium text-foreground">{requesterLabel}</span>{" "}
          requested access to{" "}
          <span className="font-medium text-foreground">
            {props.projectTitle}
          </span>
        </p>
        {props.message ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            “{props.message}”
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No message attached.</p>
        )}
        <div className="pt-0.5">
          <StatusBadge tone={tone}>{statusLabel}</StatusBadge>
        </div>
      </div>
      <RelativeTime iso={props.createdAt} />
    </>
  );
}

function ClaimBody(props: ClaimRowProps) {
  const noun = props.count === 1 ? "project" : "projects";
  return (
    <>
      <IconBubble tone="primary">
        <Sparkles className="h-4 w-4" />
      </IconBubble>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm leading-snug">
          <span className="font-medium text-primary">
            {props.count} {noun}
          </span>{" "}
          imported by Stargaze Editorial look like yours.
        </p>
        {props.sample && props.sample.length > 0 ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {props.sample.slice(0, 3).join(", ")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Claim them to add to your dashboard.
          </p>
        )}
      </div>
      <span className="text-xs font-medium text-primary">Claim →</span>
    </>
  );
}

function WelcomeBody(props: WelcomeRowProps) {
  return (
    <>
      <IconBubble tone="primary">
        <Inbox className="h-4 w-4" />
      </IconBubble>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium leading-snug">
          Welcome to Stargaze, @{props.username}.
        </p>
        <p className="text-xs text-muted-foreground">
          This is your inbox. Right-swipes on your projects, access requests,
          and claim suggestions land here.
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Sub-components                                                           */
/* ------------------------------------------------------------------------ */

function IconBubble({
  tone,
  children,
}: {
  tone: "primary" | "amber" | "emerald" | "muted";
  children: React.ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        tone === "primary" && "bg-primary/15 text-primary",
        tone === "amber" && "bg-amber-500/15 text-amber-300",
        tone === "emerald" && "bg-emerald-500/15 text-emerald-300",
        tone === "muted" && "bg-muted/40 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "amber" | "emerald" | "muted";
  children: React.ReactNode;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-border/60 text-[10px] font-medium uppercase tracking-wider",
        tone === "amber" && "border-amber-500/40 text-amber-300",
        tone === "emerald" && "border-emerald-500/40 text-emerald-300",
        tone === "muted" && "border-muted-foreground/30 text-muted-foreground",
      )}
    >
      {children}
    </Badge>
  );
}

function AvatarStack({
  swipers,
}: {
  swipers: Array<{ githubUsername: string; avatarUrl: string | null }>;
}) {
  return (
    <div className="flex -space-x-1.5">
      {swipers.slice(0, 3).map((s) => (
        <Avatar
          key={s.githubUsername}
          className="h-5 w-5 ring-2 ring-card"
        >
          {s.avatarUrl ? (
            <AvatarImage src={s.avatarUrl} alt={s.githubUsername} />
          ) : null}
          <AvatarFallback className="text-[8px]">
            {s.githubUsername.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}

function RelativeTime({ iso }: { iso: string }) {
  const label = formatRelative(iso);
  return (
    <time
      dateTime={iso}
      className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80"
    >
      {label}
    </time>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  if (diffD < 30) return `${Math.floor(diffD / 7)}w`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
