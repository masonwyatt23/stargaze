import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Stargaze — Swipe right. Star repos. Boost makers.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0B1426";
const NAVY_LIGHT = "#142037";
const YELLOW = "#FACC15";
const YELLOW_DIM = "#a47e0a";
const SLATE = "#94A3B8";

/**
 * Stargaze homepage OG image — generated as a 1200x630 PNG at request time.
 * Returned by Next.js for `og:image` and `twitter:image` automatically.
 */
export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: NAVY,
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
          padding: "72px",
        }}
      >
        {/* Radial glow top-right */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-180px",
            width: "640px",
            height: "640px",
            borderRadius: "9999px",
            background: `radial-gradient(circle, ${YELLOW}22 0%, ${YELLOW}11 30%, transparent 70%)`,
          }}
        />
        {/* Constellation dots */}
        {[
          { x: 80, y: 110, r: 2, o: 0.6 },
          { x: 220, y: 70, r: 1.5, o: 0.4 },
          { x: 350, y: 150, r: 2.5, o: 0.55 },
          { x: 520, y: 90, r: 1.8, o: 0.45 },
          { x: 720, y: 130, r: 1.4, o: 0.4 },
          { x: 880, y: 80, r: 2, o: 0.5 },
          { x: 1050, y: 200, r: 1.6, o: 0.35 },
          { x: 1100, y: 380, r: 2.2, o: 0.55 },
          { x: 950, y: 540, r: 1.5, o: 0.4 },
          { x: 760, y: 580, r: 2, o: 0.45 },
          { x: 90, y: 460, r: 1.7, o: 0.4 },
          { x: 200, y: 540, r: 1.4, o: 0.35 },
          { x: 380, y: 580, r: 1.8, o: 0.45 },
        ].map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              width: d.r * 2,
              height: d.r * 2,
              borderRadius: "9999px",
              background: YELLOW,
              opacity: d.o,
            }}
          />
        ))}

        {/* Top row: logomark + brandname pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            position: "relative",
          }}
        >
          {/* Inline SVG logomark */}
          <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
            <path
              d="M2 16 L9 16"
              stroke={YELLOW}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.22}
            />
            <path
              d="M4 11.5 L10 11.5"
              stroke={YELLOW}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.45}
            />
            <path
              d="M4 20.5 L10 20.5"
              stroke={YELLOW}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.45}
            />
            <path
              d="M20.5 5.5 L22.85 12.7 L30.5 12.7 L24.32 17.16 L26.65 24.4 L20.5 19.95 L14.35 24.4 L16.68 17.16 L10.5 12.7 L18.15 12.7 Z"
              fill={YELLOW}
            />
          </svg>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "white",
            }}
          >
            Stargaze
          </div>
        </div>

        {/* Centerpiece */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            position: "relative",
            marginTop: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: 18,
              fontWeight: 500,
              color: YELLOW,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                width: 32,
                height: 1,
                background: YELLOW,
                opacity: 0.7,
              }}
            />
            distribution for indie builders
          </div>

          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 1.04,
              color: "white",
              marginTop: "24px",
              maxWidth: "880px",
            }}
          >
            Discover indie projects
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 1.04,
              color: YELLOW,
              maxWidth: "880px",
            }}
          >
            worth a star.
          </div>

          <div
            style={{
              fontSize: 28,
              color: SLATE,
              marginTop: "30px",
              maxWidth: "780px",
              fontWeight: 400,
              lineHeight: 1.4,
            }}
          >
            Swipe right to save — and auto-star the repo on GitHub.
          </div>
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            paddingTop: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: 22,
              color: SLATE,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            stargaze.dev
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 18px",
              border: `1px solid ${YELLOW}66`,
              borderRadius: 999,
              background: `${YELLOW}11`,
              fontSize: 22,
              color: YELLOW,
              fontWeight: 600,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={YELLOW}>
              <path d="M12 2 L14.85 8.45 L22 9.27 L16.5 13.97 L18.18 21 L12 17.27 L5.82 21 L7.5 13.97 L2 9.27 L9.15 8.45 Z" />
            </svg>
            ← skip · star → 🌟
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
