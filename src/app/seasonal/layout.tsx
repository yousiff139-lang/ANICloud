import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seasonal Anime – Current & Past Season Charts",
  description:
    "Browse anime by season and year on ANICloud. See what's airing this season, upcoming shows, and explore past seasonal anime charts from Winter, Spring, Summer, and Fall.",
  openGraph: {
    title: "Seasonal Anime – Current & Past Season Charts | ANICloud",
    description: "Browse anime by season and year. See what's currently airing and explore past seasons.",
  },
};

export default function SeasonalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
