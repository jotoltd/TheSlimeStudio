import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parties & Group Bookings",
  description:
    "Book a slime-making birthday party or group trip at The Slime Studio in Holt, Norfolk. Fun, hands-on creative sessions for kids and families.",
  alternates: { canonical: "https://theslimestudio.co.uk/parties" },
  openGraph: {
    title: "Slime Parties & Group Bookings — The Slime Studio, Norfolk",
    description:
      "Book a slime-making birthday party or group trip at The Slime Studio in Holt, Norfolk.",
    url: "https://theslimestudio.co.uk/parties",
  },
};

export default function PartiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
