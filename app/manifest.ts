import type { MetadataRoute } from "next";

/**
 * PWA web app manifest. Renders Stargaze as an installable app with the
 * brand-correct dark theme and brand-yellow accents. The icon refs match
 * the static `/icon.svg` and the `app/apple-icon.tsx` route.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stargaze",
    short_name: "Stargaze",
    description:
      "A swipe-deck for indie GitHub side projects. Right-swipe to star the repo and back the maker. Distribution for the vibe-coded era.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B1426",
    theme_color: "#0B1426",
    categories: ["developer", "productivity", "social"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
