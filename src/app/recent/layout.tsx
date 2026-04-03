import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Continue Watching – Resume Your Anime",
  description:
    "Pick up exactly where you left off. View your watching history and resume your favorite anime episodes instantly on ANICloud.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function RecentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
