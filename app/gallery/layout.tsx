import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "See slime creations from The Slime Studio in Holt, Norfolk. Browse photos of colourful, squishy slime made by our visitors.",
  alternates: { canonical: "https://theslimestudio.co.uk/gallery" },
  openGraph: {
    title: "Gallery — The Slime Studio",
    description:
      "See slime creations from The Slime Studio in Holt, Norfolk.",
    url: "https://theslimestudio.co.uk/gallery",
  },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
