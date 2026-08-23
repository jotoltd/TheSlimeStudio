import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Discover The Slime Studio in Holt, Norfolk — a creative space where families mix, stretch and create their own slime. Learn about our story and mission.",
  alternates: { canonical: "https://theslimestudio.co.uk/about" },
  openGraph: {
    title: "About The Slime Studio — Slime-Making in Norfolk",
    description:
      "A creative space in Holt, Norfolk where families come to create their own slime. Learn about our story.",
    url: "https://theslimestudio.co.uk/about",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
