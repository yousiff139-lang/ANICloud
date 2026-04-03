import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Anime – Search & Filter Thousands of Titles",
  description:
    "Search and browse thousands of anime titles on ANICloud. Filter by genre, rating, format, and release year to find your next favorite anime to watch online for free.",
  openGraph: {
    title: "Browse Anime – Search & Filter Thousands of Titles | ANICloud",
    description: "Search and browse thousands of anime titles. Filter by genre, rating, format, and year.",
  },
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
