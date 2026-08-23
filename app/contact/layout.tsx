import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with The Slime Studio in Holt, Norfolk. Find our address, email and location details. We'd love to hear from you!",
  alternates: { canonical: "https://theslimestudio.co.uk/contact" },
  openGraph: {
    title: "Contact The Slime Studio — Holt, Norfolk",
    description:
      "Get in touch with The Slime Studio in Holt, Norfolk. Unit A, Feathers Yard, NR25 6BF.",
    url: "https://theslimestudio.co.uk/contact",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
