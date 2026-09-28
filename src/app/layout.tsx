import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Every page reads the demo cookie and SQLite: render at request time, on Node.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Clearing House — BBNJ",
  description: "Clearing-House Mechanism — submit, publish and notify across MGR, EIA and CBTMT.",
  icons: {
    icon: [{ url: "/bbnj-emblem.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Hosted sandbox only — unset locally so clones do not phone home.
  const umamiId = process.env.UMAMI_WEBSITE_ID?.trim();
  const umamiSrc =
    process.env.UMAMI_SCRIPT_URL?.trim() ||
    "https://analytics.glenwright.earth/script.js";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {umamiId ? (
          <Script
            defer
            src={umamiSrc}
            data-website-id={umamiId}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
