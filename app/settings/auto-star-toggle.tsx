"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AutoStarExplainer } from "@/components/auto-star-explainer";
import { Label } from "@/components/ui/label";

type AutoStarToggleProps = {
  initial: boolean;
};

export function AutoStarToggle({ initial }: AutoStarToggleProps) {
  const [enabled, setEnabled] = useState(initial);
  const [pending, setPending] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  async function persist(next: boolean) {
    setPending(true);
    setEnabled(next);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ auto_star_enabled: next }),
      });
      if (!res.ok) {
        // revert
        setEnabled(!next);
        const body = await res.json().catch(() => ({}));
        toast.error("Couldn't update auto-star.", {
          description: body?.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      toast.success(
        next ? "Auto-star is on" : "Auto-star is off",
        {
          description: next
            ? "Right-swipes will star repos on GitHub."
            : "We'll save without starring.",
        },
      );
    } catch (err) {
      setEnabled(!next);
      toast.error("Network blip.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="flex-1">
        <Label htmlFor="auto-star-switch" className="text-sm font-medium">
          Auto-star on right-swipe
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          When you right-swipe an open-source project, we star the repo on
          GitHub for you.{" "}
          <button
            type="button"
            onClick={() => setExplainerOpen(true)}
            className="text-primary underline-offset-2 hover:underline"
          >
            Learn more
          </button>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 -ml-2 gap-1.5 text-xs"
          onClick={() => setExplainerOpen(true)}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Re-open the explainer
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : null}
        <Switch
          id="auto-star-switch"
          checked={enabled}
          disabled={pending}
          onCheckedChange={persist}
        />
      </div>

      <AutoStarExplainer
        open={explainerOpen}
        onOpenChange={setExplainerOpen}
      />
    </div>
  );
}
