import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { Providers } from "@/components/Providers";
import { WebsiteJsonLd, FAQJsonLd } from "@/components/JsonLd";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://anicloud-production.up.railway.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ANICloud | Watch Anime Online Free – HD Streaming",
    template: "%s | ANICloud",
  },
  description:
    "ANICloud is a next-generation anime streaming platform. Watch the latest anime series, movies, and new releases in HD quality for free. Discover trending and popular anime all in one place.",
  keywords: [
    "anime",
    "watch anime online",
    "watch anime free",
    "anime streaming",
    "free anime",
    "HD anime",
    "anime movies",
    "anime series",
    "new anime releases",
    "trending anime",
    "popular anime",
    "ANICloud",
    "anime aggregator",
    "anime 2026",
    "best anime",
    "anime episodes online",
    "subbed anime",
    "dubbed anime",
  ],
  authors: [{ name: "ANICloud" }],
  creator: "ANICloud",
  publisher: "ANICloud",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "ANICloud",
    title: "ANICloud | Watch Anime Online Free – HD Streaming",
    description:
      "Next-gen anime streaming platform. Watch the latest anime series, movies, and new releases in HD quality for free.",
    images: [
      {
        url: `${siteUrl}/icon.png`,
        width: 512,
        height: 512,
        alt: "ANICloud – Anime Streaming Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ANICloud | Watch Anime Online Free – HD Streaming",
    description:
      "Next-gen anime streaming platform. Watch the latest anime, movies, and new releases in HD.",
    images: [`${siteUrl}/icon.png`],
  },
  verification: {
    google: "a7083cadc1de7b46",
  },
  alternates: {
    canonical: siteUrl,
  },
  other: {
    "admaven-placement": "BqjsHpjCE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <WebsiteJsonLd
          url={siteUrl}
          name="ANICloud"
          description="Watch anime online for free in HD. Browse trending, popular, and new release anime series and movies."
        />
        <FAQJsonLd
          questions={[
            {
              question: "What is ANICloud?",
              answer: "ANICloud is a free, next-generation anime streaming platform where you can watch the latest anime series, movies, and new releases in HD quality.",
            },
            {
              question: "Is ANICloud free to use?",
              answer: "Yes, ANICloud is completely free. You can browse, discover, and watch anime without any subscription or payment.",
            },
            {
              question: "What anime can I watch on ANICloud?",
              answer: "ANICloud features thousands of anime titles including trending shows, popular all-time classics, seasonal anime, new releases, anime movies, and OVAs.",
            },
            {
              question: "How do I search for anime on ANICloud?",
              answer: "Use the Browse page to search by title, or use the Discover page to filter by genre, year, season, type, score, and more.",
            },
          ]}
        />
        <Script
          src="https://pl29012834.profitablecpmratenetwork.com/fa/04/4d/fa044d8118db908767b24b508db48cec.js"
          strategy="lazyOnload"
        />
      </head>
      <body className={`${inter.variable} ${outfit.variable} antialiased bg-[#0B0E14]`} suppressHydrationWarning>
        <Providers>
          <AppLayout>
            {children}
          </AppLayout>
        </Providers>
      </body>
    </html>
  );
}
