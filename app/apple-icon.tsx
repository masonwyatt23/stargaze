import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * iOS / iPadOS home-screen icon. Rounded mask is applied automatically
 * by the OS. We render a solid navy background + centered logomark.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 70% 30%, #1a2952 0%, #0B1426 60%)",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <path
            d="M2 16 L9 16"
            stroke="#FACC15"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.22}
          />
          <path
            d="M4 11.5 L10 11.5"
            stroke="#FACC15"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.5}
          />
          <path
            d="M4 20.5 L10 20.5"
            stroke="#FACC15"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.5}
          />
          <path
            d="M20.5 5.5 L22.85 12.7 L30.5 12.7 L24.32 17.16 L26.65 24.4 L20.5 19.95 L14.35 24.4 L16.68 17.16 L10.5 12.7 L18.15 12.7 Z"
            fill="#FACC15"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
