"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  /** Origin without trailing slash, e.g. https://stargaze.ashlr.ai */
  origin: string;
  className?: string;
};

/**
 * Embeddable Stargaze badge widget. Shows the live SVG inline plus three
 * one-tap copy buttons (Markdown, HTML, raw URL) so makers can drop the
 * badge into a README, a docs page, or a custom site in seconds.
 *
 * The badge itself is rendered by /api/badge/[slug] — this component is
 * pure UX around it.
 */
export function EmbedBadge({ slug, origin, className }: Props) {
  const badgeUrl = `${origin}/api/badge/${slug}.svg`;
  const projectUrl = `${origin}/p/${slug}`;

  const markdown = `[![Stargaze](${badgeUrl})](${projectUrl})`;
  const html = `<a href="${projectUrl}"><img src="${badgeUrl}" alt="Stargaze" /></a>`;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/40 p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          ★ Embed badge
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badgeUrl}
          alt=""
          className="h-5"
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Paste it in your README. Updates live as you collect right-swipes.
      </p>
      <div className="mt-3 grid gap-2">
        <CopyRow label="Markdown" value={markdown} />
        <CopyRow label="HTML" value={html} />
        <CopyRow label="URL" value={badgeUrl} />
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      toast.success(`Copied ${label.toLowerCase()}`);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy — select the text manually.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <code className="flex-1 truncate rounded-md bg-secondary px-2 py-1.5 font-mono text-[11px] text-foreground">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
