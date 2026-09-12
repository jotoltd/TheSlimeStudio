"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type EventInstance = {
  id: string;
  date: string;
  start_time: string;
  capacity: number;
  status: string;
  booked_count: number;
  spots_remaining: number;
};

type SpecialEvent = {
  id: string;
  title: string;
  description: string;
  event_type: string;
  category: string;
  pricing_model: string;
  price: number;
  capacity: number;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  instances: EventInstance[];
};

const CATEGORIES = [
  { value: "all", label: "All Events" },
  { value: "adult_evening", label: "Adult Evenings" },
  { value: "after_school", label: "After School Clubs" },
  { value: "workshop", label: "Workshops" },
  { value: "special", label: "Special Events" },
];

const CATEGORY_BADGE: Record<string, { label: string; color: string }> = {
  adult_evening: { label: "Adults Only", color: "bg-purple-100 text-purple-700" },
  after_school: { label: "After School", color: "bg-blue-100 text-blue-700" },
  workshop: { label: "Workshop", color: "bg-green-100 text-green-700" },
  special: { label: "Special Event", color: "bg-pink-100 text-pink-700" },
};

export default function EventsPage() {
  const searchParams = useSearchParams();
  const booked = searchParams.get("booked") === "1";
  const cancelled = searchParams.get("cancelled") === "1";
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => {
        if (data.events) setEvents(data.events);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? events : events.filter((e) => e.category === filter);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-bright-lavender/20 via-white to-sky-blue-light/20 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl text-ink mb-3">Special Events</h1>
            <p className="text-ink-soft text-lg">
              Adult-only evenings, after school clubs, workshops and more.
            </p>
          </div>

          {booked && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
              Booking confirmed! Check your email for details.
            </div>
          )}
          {cancelled && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
              Payment was cancelled. Please try again.
            </div>
          )}

          {/* Category filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setFilter(c.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === c.value
                    ? "bg-ink text-white"
                    : "bg-white text-ink-soft hover:bg-ink/5 border border-ink/10"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-ink-soft">Loading events...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-ink-soft">
              No upcoming events. Check back soon!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((event) => {
                const badge = CATEGORY_BADGE[event.category] || CATEGORY_BADGE.special;
                return (
                  <Link key={event.id} href={`/events/${event.id}`} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    {event.image_url && (
                      <div className="h-40 overflow-hidden">
                        <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[0.7rem] px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                        {event.event_type === "recurring" && (
                          <span className="text-[0.7rem] px-2 py-0.5 rounded-full bg-ink/5 text-ink-soft font-medium">
                            Recurring
                          </span>
                        )}
                      </div>
                      <h2 className="font-display text-xl text-ink mb-2">{event.title}</h2>
                      {event.description && (
                        <p className="text-ink-soft text-sm mb-4">{event.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm text-ink-soft mb-4">
                        <span className="font-medium text-ink">
                          {event.pricing_model === "per_person"
                            ? `£${event.price} per person`
                            : `£${event.price} per ticket`}
                        </span>
                        <span>·</span>
                        <span>{event.duration_minutes} min</span>
                      </div>

                      {/* Upcoming sessions preview */}
                      <div className="space-y-2">
                        <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider font-semibold">
                          Upcoming Sessions
                        </div>
                        {event.instances.slice(0, 3).map((inst) => {
                          const remaining = inst.spots_remaining ?? (inst.capacity - (inst.booked_count || 0));
                          const isFull = remaining <= 0;
                          return (
                            <div
                              key={inst.id}
                              className="flex items-center justify-between rounded-xl border border-ink/10 px-3 py-2.5"
                            >
                              <div>
                                <div className="text-sm font-medium text-ink">
                                  {new Date(inst.date + "T00:00:00").toLocaleDateString("en-GB", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                  })}{" "}
                                  · {inst.start_time}
                                </div>
                                <div className="text-[0.75rem] text-ink-soft">
                                  {isFull ? "Fully booked" : `${remaining} spots left`}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {event.instances.length > 3 && (
                          <p className="text-[0.8rem] text-sky-blue-light font-medium">
                            +{event.instances.length - 3} more sessions — click to view all
                          </p>
                        )}
                      </div>
                      <div className="mt-4 text-center">
                        <span className="inline-block px-5 py-2 rounded-full bg-sky-blue-light text-ink text-sm font-medium">
                          View Event & Book →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="text-center mt-10">
            <Link href="/booking" className="text-sky-blue-light hover:underline text-sm">
              Or book a regular slime session →
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
