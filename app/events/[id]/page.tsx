import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import EventDetailClient from "./EventDetailClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { data: event } = await supabaseAdmin
    .from("special_events")
    .select("title, description, image_url")
    .eq("id", params.id)
    .single();

  if (!event) {
    return { title: "Event not found — The Slime Studio" };
  }

  return {
    title: `${event.title} — The Slime Studio`,
    description: event.description || "Special event at The Slime Studio",
    openGraph: {
      title: event.title,
      description: event.description || "Special event at The Slime Studio",
      images: event.image_url ? [{ url: event.image_url }] : undefined,
    },
  };
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const { data: event } = await supabaseAdmin
    .from("special_events")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen grid place-items-center bg-cream px-4">
          <div className="text-center">
            <h1 className="font-display text-2xl text-ink mb-2">Event not found</h1>
            <p className="text-ink-soft mb-4">This event may have been removed.</p>
            <a href="/events" className="text-sky-blue-light hover:underline">← Back to all events</a>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Fetch upcoming instances
  const today = new Date().toISOString().split("T")[0];
  const { data: instances } = await supabaseAdmin
    .from("special_event_instances")
    .select("*")
    .eq("event_id", params.id)
    .gte("date", today)
    .eq("status", "open")
    .order("date", { ascending: true });

  // Fetch booking counts
  const instanceIds = (instances || []).map((i: any) => i.id);
  let bookingCounts: Record<string, number> = {};
  if (instanceIds.length > 0) {
    const { data: bookings } = await supabaseAdmin
      .from("special_event_bookings")
      .select("instance_id, quantity")
      .in("instance_id", instanceIds)
      .eq("payment_status", "paid");
    (bookings || []).forEach((b: any) => {
      bookingCounts[b.instance_id] = (bookingCounts[b.instance_id] || 0) + b.quantity;
    });
  }

  const instancesWithCounts = (instances || []).map((inst: any) => ({
    ...inst,
    booked_count: bookingCounts[inst.id] || 0,
    spots_remaining: (inst.capacity || event.capacity) - (bookingCounts[inst.id] || 0),
  }));

  return (
    <>
      <Navbar />
      <EventDetailClient event={event} instances={instancesWithCounts} />
      <Footer />
    </>
  );
}
