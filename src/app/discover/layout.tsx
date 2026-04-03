import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover Anime – Find Your Next Favorite Show",
  description:
    "Discover anime by genre, year, season, type, and score. Use advanced filters or try a random anime pick. Find trending, seasonal, and top-rated anime all in one place on ANICloud.",
  openGraph: {
    title: "Discover Anime – Find Your Next Favorite Show | ANICloud",
    description: "Discover anime by genre, year, season, type, and score. Advanced filters and random picks.",
  },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
