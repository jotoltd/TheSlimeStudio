import type { Metadata } from "next";
import BookingPage from "../booking/page";

export const metadata: Metadata = {
  // Distinct title from /booking ("Book a Slime-Making Session") so ad-landing
  // pageviews are easy to spot in analytics page-title reports.
  title: "Book Now — The Slime Studio",
  // Dedicated ad-landing route — hidden from search engines and nav so any
  // booking here is provably ad-channel (see the /go stamp in booking/page.tsx).
  robots: { index: false, follow: false },
};

export default function AdLandingPage() {
  return <BookingPage />;
}
