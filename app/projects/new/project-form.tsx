"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Globe,
  ImagePlus,
  Loader2,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAutoCover } from "@/lib/hooks/use-auto-cover";
import { createClient } from "@/lib/supabase/client";
import { parseGithubRepo } from "@/lib/utils";

const formSchema = z.object({
  title: z
    .string()
    .min(2, "At least 2 characters")
    .max(80, "Keep it under 80 characters"),
  tagline: z
    .string()
    .min(8, "At least 8 characters")
    .max(100, "Taglines are capped at 100 characters"),
  is_open_source: z.boolean(),
  github_repo_url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  cta_url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  category: z.enum(["ai-tool", "dev-utility", "game", "saas", "other"]),
  description_md: z.string().max(8000).optional().or(z.literal("")),
  demo_video_url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

type CurrentUser = {
  github_username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Screenshot = {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
};

const CATEGORY_OPTIONS = [
  { value: "ai-tool", label: "AI tool" },
  { value: "dev-utility", label: "Dev utility" },
  { value: "game", label: "Game" },
  { value: "saas", label: "SaaS" },
  { value: "other", label: "Other" },
] as const;

export function ProjectForm({ currentUser }: { currentUser: CurrentUser }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      tagline: "",
      is_open_source: true,
      github_repo_url: "",
      cta_url: "",
      category: "ai-tool",
      description_md: "",
      demo_video_url: "",
    },
  });

  const values = watch();

  /* ---------------- GitHub repo auto-fill ---------------- */
  const [repoStatus, setRepoStatus] = useState<
    | { state: "idle" }
    | { state: "loading" }
    | { state: "ok"; stars: number; language: string | null }
    | { state: "error"; message: string }
  >({ state: "idle" });
  const lastUrlRef = useRef<string>("");

  useEffect(() => {
    const url = (values.github_repo_url ?? "").trim();
    if (!url) {
      setRepoStatus({ state: "idle" });
      lastUrlRef.current = "";
      return;
    }
    if (url === lastUrlRef.current) return;

    const parsed = parseGithubRepo(url);
    if (!parsed) return;

    const handle = setTimeout(async () => {
      lastUrlRef.current = url;
      setRepoStatus({ state: "loading" });
      try {
        const res = await fetch("/api/github/repo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ githubRepoUrl: url }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setRepoStatus({
            state: "error",
            message: body?.error ?? "GitHub didn't reply.",
          });
          return;
        }
        const body = (await res.json()) as {
          description?: string;
          stars?: number;
          language?: string | null;
        };

        setRepoStatus({
          state: "ok",
          stars: body.stars ?? 0,
          language: body.language ?? null,
        });

        // Auto-fill title from repo name if empty.
        if (!values.title.trim()) {
          setValue("title", parsed.repo, { shouldValidate: false });
        }
        // Auto-fill tagline from repo description if empty.
        if (body.description && !values.tagline.trim()) {
          setValue("tagline", body.description.slice(0, 100));
        }
      } catch {
        setRepoStatus({ state: "error", message: "Network error" });
      }
    }, 500);

    return () => clearTimeout(handle);
    // We intentionally don't depend on values.title/tagline — only the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.github_repo_url, setValue]);

  /* ---------------- Screenshots ---------------- */
  const [shots, setShots] = useState<Screenshot[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onAddFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const next: Screenshot[] = Array.from(files).map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        uploading: true,
      }));
      setShots((prev) => [...prev, ...next]);

      // Kick off uploads in parallel.
      await Promise.all(
        next.map(async (shot) => {
          const ext = shot.file.name.split(".").pop() || "png";
          const path = `screenshots/${currentUser.github_username}/${shot.id}.${ext}`;

          const { error } = await supabase.storage
            .from("project-media")
            .upload(path, shot.file, {
              contentType: shot.file.type,
              upsert: false,
            });

          if (error) {
            setShots((prev) =>
              prev.map((s) =>
                s.id === shot.id
                  ? { ...s, uploading: false, error: error.message }
                  : s,
              ),
            );
            return;
          }

          const { data: pub } = supabase.storage
            .from("project-media")
            .getPublicUrl(path);

          setShots((prev) =>
            prev.map((s) =>
              s.id === shot.id
                ? { ...s, uploading: false, uploadedUrl: pub.publicUrl }
                : s,
            ),
          );
        }),
      );
    },
    [supabase, currentUser.github_username],
  );

  const removeShot = useCallback((id: string) => {
    setShots((prev) => {
      const found = prev.find((s) => s.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  /** Append an externally-hosted cover image (microlink, opengraph) directly,
   *  bypassing the Storage upload path since the URL is already public. */
  const addExternalCover = useCallback((url: string) => {
    const id = `ext-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setShots((prev) => [
      ...prev,
      {
        id,
        // Synthetic File so the type stays consistent — we never upload it.
        file: new File([], "external"),
        previewUrl: url,
        uploadedUrl: url,
        uploading: false,
      },
    ]);
  }, []);

  const { busy: autoGenBusy, run: runAutoGen } = useAutoCover({
    liveUrl: values.cta_url,
    githubUrl: values.github_repo_url,
    onResolved: addExternalCover,
  });

  /* ---------------- Submit ---------------- */
  const onSubmit = handleSubmit(async (data) => {
    const stillUploading = shots.some((s) => s.uploading);
    if (stillUploading) {
      toast.error("Wait for screenshots to finish uploading.");
      return;
    }
    const usable = shots.filter((s) => s.uploadedUrl && !s.error);
    if (usable.length === 0) {
      toast.error("Add at least one cover image.", {
        description:
          "Upload a screenshot, paste your live URL to auto-generate one, or use the GitHub social preview.",
      });
      return;
    }

    try {
      const payload = {
        title: data.title.trim(),
        tagline: data.tagline.trim(),
        is_open_source: data.is_open_source,
        github_repo_url: data.github_repo_url || null,
        cta_url: data.cta_url || null,
        category: data.category,
        description_md: data.description_md || null,
        demo_video_url: data.demo_video_url || null,
        screenshots: shots
          .filter((s) => s.uploadedUrl)
          .map((s) => s.uploadedUrl!),
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("Couldn't ship that.", {
          description: body?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      const body = (await res.json()) as { slug: string; warning?: string };
      if (body.warning === "go_live_failed") {
        toast.warning("Saved as hidden.", {
          description:
            "Couldn't flip the listing live — open the dashboard to unhide.",
        });
        router.push(`/dashboard`);
        return;
      }
      if (body.warning === "media_failed") {
        toast.warning("Saved without media.", {
          description: "Re-upload your cover from the dashboard.",
        });
        router.push(`/dashboard`);
        return;
      }
      toast.success("Live on the deck.", {
        description: "Sharing it boosts your placement.",
      });
      router.push(`/p/${body.slug}`);
    } catch (err) {
      toast.error("Network error.", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ---- Left: form ---- */}
      <div className="space-y-6">
        {/* GitHub URL — top because it auto-fills the rest */}
        <FieldRow>
          <Label htmlFor="github_repo_url">GitHub repo URL</Label>
          <div className="relative">
            <GithubIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="github_repo_url"
              placeholder="https://github.com/owner/repo"
              className="pl-9"
              {...register("github_repo_url")}
            />
            {repoStatus.state === "loading" ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          {repoStatus.state === "ok" ? (
            <p className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Pulled {repoStatus.stars} stars
              {repoStatus.language ? ` · ${repoStatus.language}` : null}
            </p>
          ) : repoStatus.state === "error" ? (
            <p className="mt-1 text-xs text-destructive">
              {repoStatus.message}
            </p>
          ) : null}
          <ErrorMessage error={errors.github_repo_url?.message} />
        </FieldRow>

        <FieldRow>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Stargaze"
            maxLength={80}
            {...register("title")}
          />
          <ErrorMessage error={errors.title?.message} />
        </FieldRow>

        <FieldRow>
          <Label htmlFor="tagline">
            Tagline
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {values.tagline.length}/100
            </span>
          </Label>
          <Input
            id="tagline"
            placeholder="A swipe-deck for indie GitHub side projects."
            maxLength={100}
            {...register("tagline")}
          />
          <ErrorMessage error={errors.tagline?.message} />
        </FieldRow>

        <FieldRow>
          <Label>Category</Label>
          <Select
            defaultValue="ai-tool"
            {...register("category")}
            aria-label="Category"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <ErrorMessage error={errors.category?.message} />
        </FieldRow>

        <FieldRow>
          <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-card/40 p-4">
            <div>
              <Label htmlFor="is_open_source" className="text-sm">
                Open source
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                When on, right-swipes auto-star your repo on GitHub.
                When off, viewers ask for access instead.
              </p>
            </div>
            <Switch
              id="is_open_source"
              checked={values.is_open_source}
              onCheckedChange={(c) =>
                setValue("is_open_source", c, { shouldValidate: true })
              }
            />
          </div>
        </FieldRow>

        <FieldRow>
          <Label htmlFor="cta_url">Call-to-action URL</Label>
          <Input
            id="cta_url"
            placeholder="https://your-app.dev"
            {...register("cta_url")}
          />
          <p className="text-xs text-muted-foreground">
            Optional — where the &ldquo;Try it&rdquo; button goes.
          </p>
          <ErrorMessage error={errors.cta_url?.message} />
        </FieldRow>

        <FieldRow>
          <Label htmlFor="demo_video_url">Demo video URL</Label>
          <Input
            id="demo_video_url"
            placeholder="https://.../demo.mp4"
            {...register("demo_video_url")}
          />
          <ErrorMessage error={errors.demo_video_url?.message} />
        </FieldRow>

        <FieldRow>
          <Label htmlFor="description_md">Description (markdown)</Label>
          <Textarea
            id="description_md"
            placeholder="What it does, why you built it, what's next…"
            rows={6}
            {...register("description_md")}
          />
          <p className="text-xs text-muted-foreground">
            We&apos;ll render the README from your repo if you skip this.
          </p>
        </FieldRow>

        <FieldRow>
          <div className="flex items-baseline justify-between gap-2">
            <Label>
              Cover image <span className="text-destructive">*</span>
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Required — first one is your card&apos;s cover.
            </span>
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => onAddFiles(e.target.files)}
          />
          <div className="grid grid-cols-3 gap-2">
            {shots.map((s) => (
              <div
                key={s.id}
                className="relative aspect-video overflow-hidden rounded-md border border-border bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.uploadedUrl ?? s.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {s.uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : null}
                {s.error ? (
                  <div className="absolute inset-x-0 bottom-0 truncate bg-destructive/80 px-2 py-1 text-[10px] text-destructive-foreground">
                    {s.error}
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-label="Remove screenshot"
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                  onClick={() => removeShot(s.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-video flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-card/30 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <ImagePlus className="h-5 w-5" />
              Add image
            </button>
          </div>
        </FieldRow>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Shipping…
              </>
            ) : (
              <>
                <Star className="h-4 w-4 fill-primary-foreground" />
                Ship it
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ---- Right: live card preview (desktop only) ---- */}
      <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-fit">
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          Live preview
        </p>
        <Card className="overflow-hidden">
          <div className="aspect-[16/10] overflow-hidden bg-gradient-to-br from-secondary to-muted">
            {shots[0]?.uploadedUrl || shots[0]?.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shots[0].uploadedUrl ?? shots[0].previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                <Star className="h-10 w-10" />
              </div>
            )}
          </div>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-base font-semibold">
                {values.title || "Untitled project"}
              </h3>
              {repoStatus.state === "ok" ? (
                <Badge variant="outline" className="shrink-0 gap-1">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  {repoStatus.stars}
                </Badge>
              ) : null}
            </div>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {values.tagline || "Your tagline appears here."}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Avatar className="h-5 w-5">
                {currentUser.avatar_url ? (
                  <AvatarImage
                    src={currentUser.avatar_url}
                    alt={currentUser.github_username}
                  />
                ) : null}
                <AvatarFallback>
                  {currentUser.github_username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                @{currentUser.github_username}
              </span>
              {repoStatus.state === "ok" && repoStatus.language ? (
                <Badge variant="secondary" className="ml-auto">
                  {repoStatus.language}
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function ErrorMessage({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-destructive">{error}</p>;
}
