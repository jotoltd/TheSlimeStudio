import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Slime-Making Session",
  description:
    "Book your hands-on slime-making session at The Slime Studio in Holt, Norfolk. One-hour sessions from £15 per person. Choose your date and time slot online.",
  alternates: { canonical: "https://theslimestudio.co.uk/booking" },
  openGraph: {
    title: "Book a Slime-Making Session — The Slime Studio, Holt",
    description:
      "Book your hands-on slime-making session at The Slime Studio in Holt, Norfolk. From £15 per person.",
    url: "https://theslimestudio.co.uk/booking",
  },
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
