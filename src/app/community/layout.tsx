import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anime Community – Discuss & Share with Fellow Fans",
  description:
    "Join the ANICloud community hub. Discuss recent anime episodes, share theories, post reactions, and connect with anime fans worldwide.",
  openGraph: {
    title: "Anime Community – Discuss & Share with Fellow Fans | ANICloud",
    description: "Join the ANICloud community. Discuss episodes, share theories, and connect with anime fans.",
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
