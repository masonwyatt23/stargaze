import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Stargaze — Swipe right. Star repos. Boost makers.",
    template: "%s · Stargaze",
  },
  description:
    "A swipe-deck for indie GitHub side projects. Right-swipe to star the repo and back the maker. Distribution for the vibe-coded era.",
  keywords: [
    "indie projects",
    "github discovery",
    "vibe coded",
    "agentic engineering",
    "swipe to star",
    "developer tools",
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    title: "Stargaze",
    description: "Swipe right. Star repos. Boost makers.",
    siteName: "Stargaze",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stargaze",
    description: "Swipe right. Star repos. Boost makers.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1426" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col bg-background text-foreground font-sans">
        {children}
        <Toaster
          position="bottom-center"
          theme="dark"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
