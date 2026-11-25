import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gift Cards — Slime Studio Experience Vouchers",
  description:
    "Buy a Slime Studio gift card — the perfect present for kids and families in Norfolk. Instant email delivery, valid on sessions, parties and the shop.",
  alternates: { canonical: "https://theslimestudio.co.uk/gift-card" },
  openGraph: {
    title: "Slime Studio Gift Cards — The Gift That's an Experience",
    description:
      "Instant-delivery gift cards for slime-making sessions, parties and the shop at The Slime Studio in Holt, Norfolk.",
    url: "https://theslimestudio.co.uk/gift-card",
  },
};

export default function GiftCardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
