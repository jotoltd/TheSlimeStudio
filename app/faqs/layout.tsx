import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Frequently asked questions about The Slime Studio — session details, pricing, age requirements, what to bring, party bookings and more.",
  alternates: { canonical: "https://theslimestudio.co.uk/faqs" },
  openGraph: {
    title: "FAQs — The Slime Studio",
    description:
      "Frequently asked questions about slime-making sessions, pricing, parties and more at The Slime Studio.",
    url: "https://theslimestudio.co.uk/faqs",
  },
};

export default function FAQsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
