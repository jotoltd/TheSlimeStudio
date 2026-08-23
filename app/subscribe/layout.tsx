import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscribe — Slime Box Subscription",
  description:
    "Subscribe to The Slime Studio's monthly slime box and get DIY slime kits delivered to your door. A fun creative activity for kids every month.",
  alternates: { canonical: "https://theslimestudio.co.uk/subscribe" },
  openGraph: {
    title: "Slime Box Subscription — The Slime Studio",
    description:
      "Get DIY slime kits delivered to your door with The Slime Studio's monthly subscription box.",
    url: "https://theslimestudio.co.uk/subscribe",
  },
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
