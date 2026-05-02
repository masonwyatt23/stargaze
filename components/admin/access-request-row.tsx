"use client";

import * as React from "react";
import Link from "next/link";
import { Check, X, MailQuestion, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setAccessRequestStatus } from "@/app/admin/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AccessReq = {
  id: string;
  status: "pending" | "approved" | "declined";
  message: string | null;
  requester_email: string;
  created_at: string;
  project: { id: string; title: string; slug: string } | null;
  requester: { github_username: string; avatar_url: string | null } | null;
};

export function AccessRequestRow({ request }: { request: AccessReq }) {
  const [pending, startTransition] = React.useTransition();

  const decide = (next: "approved" | "declined") => {
    startTransition(async () => {
      try {
        await setAccessRequestStatus(request.id, next);
        toast.success(`Marked ${next}`);
      } catch (err) {
        toast.error("Update failed", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          {request.requester?.avatar_url ? (
            <AvatarImage
              src={request.requester.avatar_url}
              alt={request.requester.github_username}
            />
          ) : null}
          <AvatarFallback>
            {request.requester?.github_username.slice(0, 2).toUpperCase() ?? "??"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              @{request.requester?.github_username ?? "?"}
            </span>
            <span className="text-xs text-muted-foreground">requested access to</span>
            {request.project ? (
              <Link
                href={`/p/${request.project.slug}`}
                className="text-sm font-semibold hover:text-primary"
              >
                {request.project.title}
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">
                (deleted project)
              </span>
            )}
            <StatusPill status={request.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <MailQuestion className="mr-1 inline h-3 w-3" />
            {request.requester_email} ·{" "}
            {new Date(request.created_at).toLocaleString()}
          </p>
          {request.message ? (
            <p className="mt-2 line-clamp-3 rounded-md border border-border/60 bg-background/50 p-2 text-xs leading-relaxed text-muted-foreground">
              {request.message}
            </p>
          ) : null}
        </div>
      </div>

      {request.status === "pending" ? (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => decide("approved")}
            disabled={pending}
            className="gap-1 text-green-300 hover:text-green-300"
            title="Mark approved"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => decide("declined")}
            disabled={pending}
            className="gap-1 text-destructive hover:text-destructive"
            title="Mark declined"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            Decline
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: AccessReq["status"] }) {
  if (status === "pending") {
    return <Badge variant="warning">pending</Badge>;
  }
  if (status === "approved") {
    return <Badge variant="success">approved</Badge>;
  }
  return <Badge variant="destructive">declined</Badge>;
}
