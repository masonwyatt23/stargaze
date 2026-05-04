"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Globe,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAutoCover } from "@/lib/hooks/use-auto-cover";
import { cn } from "@/lib/utils";
import {
  deleteProject,
  setProjectStatus,
  updateProject,
} from "./actions";

type Initial = {
  title: string;
  tagline: string;
  description_md: string;
  github_repo_url: string;
  cta_url: string;
  is_open_source: boolean;
  category:
    | "ai-tool"
    | "dev-utility"
    | "game"
    | "saas"
    | "other"
    | null;
  demo_video_url: string;
  screenshots: string[];
};

const CATEGORIES: Array<{ value: NonNullable<Initial["category"]>; label: string }> = [
  { value: "ai-tool", label: "AI tool" },
  { value: "dev-utility", label: "Dev utility" },
  { value: "saas", label: "SaaS" },
  { value: "game", label: "Game" },
  { value: "other", label: "Other" },
];

export function EditForm({
  projectId,
  slug,
  status,
  initial,
}: {
  projectId: string;
  slug: string;
  status: "live" | "hidden" | "flagged";
  initial: Initial;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [statusPending, startStatusTransition] = React.useTransition();
  const [deletePending, startDeleteTransition] = React.useTransition();

  const [form, setForm] = React.useState<Initial>(initial);
  const [confirmTitle, setConfirmTitle] = React.useState("");
  const [showDelete, setShowDelete] = React.useState(false);

  const set = <K extends keyof Initial>(k: K, v: Initial[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addScreenshot = () =>
    set("screenshots", [...form.screenshots, ""]);
  const removeScreenshot = (i: number) =>
    set(
      "screenshots",
      form.screenshots.filter((_, idx) => idx !== i),
    );
  const moveScreenshot = (i: number, dir: -1 | 1) => {
    const next = [...form.screenshots];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("screenshots", next);
  };

  const { busy: autoGenBusy, run: runAutoGen } = useAutoCover({
    liveUrl: form.cta_url,
    githubUrl: form.github_repo_url,
    onResolved: (url) => set("screenshots", [...form.screenshots, url]),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedShots = form.screenshots
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (cleanedShots.length === 0) {
      toast.error("Add at least one cover image.", {
        description:
          "Paste an image URL, generate one from your live URL, or use the GitHub social preview.",
      });
      return;
    }
    startTransition(async () => {
      const res = await updateProject({
        projectId,
        title: form.title.trim(),
        tagline: form.tagline.trim(),
        description_md: form.description_md.trim() || null,
        github_repo_url: form.github_repo_url.trim() || null,
        cta_url: form.cta_url.trim() || null,
        is_open_source: form.is_open_source,
        category: form.category,
        demo_video_url: form.demo_video_url.trim() || null,
        screenshots: cleanedShots,
      });

      if (res.ok) {
        toast.success("Saved.");
        router.push(`/p/${res.slug}`);
        router.refresh();
      } else {
        toast.error("Save failed", { description: res.error });
      }
    });
  };

  const toggleHidden = () =>
    startStatusTransition(async () => {
      const next = status === "live" ? "hidden" : "live";
      const res = await setProjectStatus(projectId, next);
      if (res.ok) {
        toast.success(`Listing is now ${next}.`);
        router.refresh();
      } else {
        toast.error("Status update failed", { description: res.error });
      }
    });

  const handleDelete = () =>
    startDeleteTransition(async () => {
      const res = await deleteProject(projectId, confirmTitle);
      if (res.ok) {
        toast.success("Deleted.");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error("Delete failed", { description: res.error });
      }
    });

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* CORE FIELDS */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">
              Tagline{" "}
              <span className="text-xs text-muted-foreground">
                ({form.tagline.length}/100)
              </span>
            </Label>
            <Input
              id="tagline"
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value.slice(0, 100))}
              maxLength={100}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="repo">GitHub repo URL</Label>
              <Input
                id="repo"
                type="url"
                placeholder="https://github.com/owner/repo"
                value={form.github_repo_url}
                onChange={(e) => set("github_repo_url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta">CTA URL (where right-swipe goes)</Label>
              <Input
                id="cta"
                type="url"
                placeholder="https://your-app.com"
                value={form.cta_url}
                onChange={(e) => set("cta_url", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={form.category ?? ""}
                onChange={(e) =>
                  set("category", (e.target.value || null) as Initial["category"])
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Uncategorized</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border border-input px-3 py-2 text-sm">
              <div>
                <Label htmlFor="oss" className="cursor-pointer">
                  Open source
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Right-swipe stars the repo
                </p>
              </div>
              <Switch
                id="oss"
                checked={form.is_open_source}
                onCheckedChange={(v) => set("is_open_source", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MEDIA */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="text-base font-semibold">Media</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              First screenshot becomes the card thumbnail. Demo video plays
              auto-muted on the top deck card.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">Demo video URL (YouTube embed, MP4, Loom, etc.)</Label>
            <Input
              id="video"
              type="url"
              placeholder="https://www.youtube.com/embed/..."
              value={form.demo_video_url}
              onChange={(e) => set("demo_video_url", e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>
                Cover image ({form.screenshots.length}){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addScreenshot}
                disabled={form.screenshots.length >= 20}
                className="gap-1.5"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Add screenshot
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={autoGenBusy !== null}
                onClick={() => runAutoGen("live")}
                className="gap-1.5"
              >
                {autoGenBusy === "live" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                Auto-generate from live URL
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={autoGenBusy !== null}
                onClick={() => runAutoGen("github")}
                className="gap-1.5"
              >
                {autoGenBusy === "github" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <GithubIcon className="h-3.5 w-3.5" />
                )}
                Use GitHub social preview
              </Button>
            </div>

            {form.screenshots.length === 0 ? (
              <p className="rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center text-xs text-muted-foreground">
                A cover image is required. Add one above — paste an image URL,
                generate from your live site, or pull GitHub&apos;s social
                preview.
              </p>
            ) : (
              <ul className="space-y-2">
                {form.screenshots.map((url, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-border/60 bg-card/40 p-2"
                  >
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveScreenshot(i, -1)}
                        disabled={i === 0}
                        className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveScreenshot(i, 1)}
                        disabled={i === form.screenshots.length - 1}
                        className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={url}
                        alt=""
                        className="h-16 w-24 shrink-0 rounded object-cover bg-muted"
                      />
                    ) : (
                      <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                        preview
                      </div>
                    )}

                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const next = [...form.screenshots];
                        next[i] = e.target.value;
                        set("screenshots", next);
                      }}
                      placeholder="https://..."
                      className="flex-1"
                    />

                    <button
                      type="button"
                      onClick={() => removeScreenshot(i)}
                      className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DESCRIPTION */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-end justify-between">
            <div>
              <Label htmlFor="desc">Description (markdown)</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Renders on the share page and detail sheet.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {form.description_md.length.toLocaleString()} chars
            </span>
          </div>
          <Textarea
            id="desc"
            value={form.description_md}
            onChange={(e) => set("description_md", e.target.value)}
            rows={14}
            className="font-mono text-xs leading-relaxed"
            placeholder="# Why this exists&#10;&#10;A few paragraphs about the project. Markdown supported — h1/h2, bullet lists, code, links, blockquotes."
          />
        </CardContent>
      </Card>

      {/* SUBMIT + STATUS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={pending} className="gap-2">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/p/${slug}`)}
          >
            Cancel
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={toggleHidden}
            disabled={statusPending}
            className={cn(
              "gap-2",
              status === "live"
                ? "text-muted-foreground"
                : "text-primary",
            )}
          >
            {statusPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {status === "live" ? "Hide listing" : "Restore to live"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowDelete((v) => !v)}
            className="text-destructive hover:text-destructive"
          >
            Delete
          </Button>
        </div>
      </div>

      {showDelete ? (
        <div
          role="region"
          aria-label="Delete confirmation"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        >
          <p className="text-sm text-destructive">
            This permanently removes the listing, all swipes, and access
            requests. To confirm, type the project title exactly:
          </p>
          <p className="mt-2 font-mono text-xs text-foreground">
            {form.title}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Input
              value={confirmTitle}
              onChange={(e) => setConfirmTitle(e.target.value)}
              placeholder="Type the title to confirm"
              className="flex-1"
            />
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={
                deletePending || confirmTitle.trim() !== form.title.trim()
              }
              className="gap-2"
            >
              {deletePending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete project
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
