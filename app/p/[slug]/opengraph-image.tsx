import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "Stargaze project preview";

type OgImageProps = {
  params: Promise<{ slug: string }>;
};

const BG = "#0B1426";
const STAR_YELLOW = "#FACC15";
const FG = "#F8FAFC";
const MUTED = "#94A3B8";

export default async function OpenGraphImage({ params }: OgImageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("projects")
    .select(
      `title, tagline, github_language, github_stars,
       creator:users!projects_user_id_fkey(github_username, display_name, avatar_url)`,
    )
    .eq("slug", slug)
    .maybeSingle();

  type Row = {
    title: string;
    tagline: string;
    github_language: string | null;
    github_stars: number | null;
    creator: {
      github_username: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  };
  const project = (data as unknown as Row | null) ?? null;

  const title = project?.title ?? "Stargaze";
  const tagline =
    project?.tagline ?? "Swipe right. Star repos. Boost makers.";
  const username = project?.creator?.github_username ?? null;
  const displayName =
    project?.creator?.display_name ?? project?.creator?.github_username ?? null;
  const avatarUrl = project?.creator?.avatar_url ?? null;
  const language = project?.github_language ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          backgroundImage:
            "radial-gradient(ellipse at top right, rgba(250, 204, 21, 0.18), transparent 50%), radial-gradient(circle at 20% 30%, rgba(250, 204, 21, 0.08), transparent 1.5px), radial-gradient(circle at 80% 60%, rgba(250, 204, 21, 0.07), transparent 1.5px)",
          backgroundSize: "100% 100%, 200px 200px, 280px 280px",
          padding: "64px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "system-ui, sans-serif",
          color: FG,
        }}
      >
        {/* Top row — Stargaze brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            color: STAR_YELLOW,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <Star size={38} />
          <span style={{ color: FG }}>Stargaze</span>
        </div>

        {/* Middle — title + tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: FG,
              maxWidth: 1080,
            }}
          >
            {truncate(title, 60)}
          </div>
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.3,
              color: MUTED,
              maxWidth: 1000,
            }}
          >
            {truncate(tagline, 140)}
          </div>
        </div>

        {/* Bottom row — creator + meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
              <img
                src={avatarUrl}
                width={64}
                height={64}
                style={{
                  borderRadius: 9999,
                  border: `2px solid ${STAR_YELLOW}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 9999,
                  background: "#1E293B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: STAR_YELLOW,
                  fontWeight: 700,
                  fontSize: 24,
                }}
              >
                {username?.slice(0, 2).toUpperCase() ?? "★"}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 26, fontWeight: 600, color: FG }}>
                {displayName ?? "Indie maker"}
              </div>
              {username ? (
                <div style={{ fontSize: 22, color: MUTED }}>@{username}</div>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 18px",
              borderRadius: 9999,
              background: "rgba(250, 204, 21, 0.12)",
              border: "1px solid rgba(250, 204, 21, 0.35)",
              color: STAR_YELLOW,
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            <Star size={26} />
            {language ?? "Open source"}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function Star({ size }: { size: number }) {
  // Hand-rolled SVG star — Satori supports inline SVG.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={STAR_YELLOW}
      stroke={STAR_YELLOW}
      strokeWidth={1}
      strokeLinejoin="round"
    >
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
}
