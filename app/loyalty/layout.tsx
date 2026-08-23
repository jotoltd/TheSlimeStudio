import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loyalty Card — Stamp Card Rewards",
  description:
    "Check your digital stamp card from The Slime Studio. Earn a stamp for every paid booking and collect 10 stamps for a free slime-making session.",
  alternates: { canonical: "https://theslimestudio.co.uk/loyalty" },
  openGraph: {
    title: "Loyalty Card — The Slime Studio",
    description:
      "Earn stamps for every booking and get a free session. Check your digital stamp card.",
    url: "https://theslimestudio.co.uk/loyalty",
  },
};

export default function LoyaltyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
