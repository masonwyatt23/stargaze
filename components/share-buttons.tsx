"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Inline X (formerly Twitter) glyph. lucide-react dropped its brand-mark
 * exports, so we ship our own — same pattern as `<GithubIcon>`.
 */
function XIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      aria-label="X"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      {...props}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export type ShareButtonsProps = {
  url: string;
  text: string;
  /** Tailwind classes applied to the wrapper div. */
  className?: string;
  /** Button size — defaults to "default". */
  size?: "default" | "sm" | "lg";
};

/**
 * Share affordances for the public project page. Twitter button opens a
 * new-tab tweet composer; "copy link" uses navigator.clipboard with a sonner
 * toast confirmation. Both are progressive — they no-op gracefully if the
 * APIs aren't available (e.g. clipboard in non-secure contexts).
 */
export function ShareButtons({
  url,
  text,
  className,
  size = "default",
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(url)}`;

  async function copy() {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for old browsers / insecure contexts.
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      toast.success("Link copied to clipboard");
      // Reset the icon after a tick so repeated copies still feel responsive.
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — try selecting the URL manually.");
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button asChild variant="outline" size={size} className="gap-2">
        <a
          href={tweetHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X (formerly Twitter)"
        >
          <XIcon className="h-4 w-4" />
          Share on X
        </a>
      </Button>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={copy}
        className="gap-2"
        aria-label="Copy link to clipboard"
      >
        {copied ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}

export default ShareButtons;
