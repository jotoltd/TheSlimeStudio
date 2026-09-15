import { redirect } from "next/navigation";

export default function EventBookingsRedirect() {
  redirect("/dashboard/bookings");
}
