import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press & Features",
  description:
    "The Slime Studio has been featured in Visit North Norfolk, North Norfolk News, and All Things Norfolk. See our press coverage and media features.",
  alternates: { canonical: "https://theslimestudio.co.uk/press" },
  openGraph: {
    title: "Press & Features — The Slime Studio",
    description:
      "Featured across Norfolk's leading publications and visitor guides. See our press coverage.",
    url: "https://theslimestudio.co.uk/press",
  },
};

export default function PressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
