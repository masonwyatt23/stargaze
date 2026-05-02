import type { MetadataRoute } from "next";

/**
 * robots.txt route. Allow crawlers to index public marketing/feed/profile
 * pages and the share routes; explicitly disallow auth-private surfaces and
 * the API.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://stargaze-evero.vercel.app";
  const origin = baseUrl.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/auth/", "/api/", "/settings"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
