"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import type { FeedProject } from "@/lib/types/db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AccessRequestModalProps = {
  /** When non-null, the modal is open for this project. null = closed. */
  project: FeedProject | null;
  prefilledEmail?: string;
  onSubmit: (data: { email: string; message?: string }) => Promise<void>;
  /** Called when the user dismisses or completes the modal. The swipe still
   * counts as a save regardless of whether they hit Submit or Cancel. */
  onClose: () => void;
};

/**
 * Slides up when right-swiping a CLOSED-source project. Pre-fills the user's
 * email; optional message; "Request access" submit. Built on top of Radix
 * Dialog for keyboard / focus management.
 */
export function AccessRequestModal({
  project,
  prefilledEmail,
  onSubmit,
  onClose,
}: AccessRequestModalProps) {
  const open = project !== null;
  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Keep the email in sync if the prop changes (e.g. user logs in mid-deck).
  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

  // Reset the message body each time we open for a new project.
  useEffect(() => {
    if (open) {
      setMessage("");
    }
  }, [open, project?.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      toast.error("Please enter a valid email.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        email: trimmedEmail,
        message: message.trim() ? message.trim() : undefined,
      });
      toast.success("Access requested", {
        description: project
          ? `${project.creator.display_name ?? project.creator.github_username} will get back to you.`
          : undefined,
      });
      onClose();
    } catch (err) {
      toast.error("Couldn't send your request", {
        description: err instanceof Error ? err.message : "Try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Lock className="h-3.5 w-3.5" />
            </span>
            <DialogTitle>Request access</DialogTitle>
          </div>
          <DialogDescription>
            {project ? (
              <>
                <span className="font-medium text-foreground">{project.title}</span>{" "}
                is closed source. The creator will see your request and can
                share access if it&apos;s a fit.
              </>
            ) : (
              "This project is closed source. Send the creator a note to request access."
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="access-email"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Your email
            </label>
            <input
              id="access-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={cn(
                "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground/60",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="access-message"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Message{" "}
              <span className="font-normal normal-case text-muted-foreground/60">
                (optional)
              </span>
            </label>
            <textarea
              id="access-message"
              rows={3}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you want to use it for?"
              className={cn(
                "w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground/60",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
              )}
            />
            <div className="text-right text-[10px] text-muted-foreground/60">
              {message.length}/500
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Skip
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Request access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
