import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop — Slime Kits, Handmade Slimes & Accessories",
  description:
    "Shop DIY slime kits, handmade slimes, slime textures and accessories from The Slime Studio. Delivered across the UK from Holt, Norfolk.",
  alternates: { canonical: "https://theslimestudio.co.uk/shop" },
  openGraph: {
    title: "Shop — The Slime Studio",
    description:
      "Shop DIY slime kits, handmade slimes, slime textures and accessories from The Slime Studio.",
    url: "https://theslimestudio.co.uk/shop",
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
