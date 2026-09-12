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
  const [selectedInstance, setSelectedInstance] = useState<{ event: SpecialEvent; instance: EventInstance } | null>(null);
  const [bookingQty, setBookingQty] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingMsg, setBookingMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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

  function openBooking(event: SpecialEvent, instance: EventInstance) {
    setSelectedInstance({ event, instance });
    setBookingQty(1);
    setName("");
    setEmail("");
    setPhone("");
    setBookingMsg(null);
  }

  function closeBooking() {
    setSelectedInstance(null);
    setBookingMsg(null);
  }

  async function submitBooking() {
    if (!selectedInstance) return;
    if (!name.trim() || !email.trim()) {
      setBookingMsg({ type: "err", text: "Please enter your name and email." });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setBookingMsg({ type: "err", text: "Please enter a valid email address." });
      return;
    }
    if (bookingQty < 1) {
      setBookingMsg({ type: "err", text: "Please select at least 1 spot." });
      return;
    }

    setBooking(true);
    setBookingMsg(null);

    try {
      const res = await fetch("/api/event-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instance_id: selectedInstance.instance.id,
          event_id: selectedInstance.event.id,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          quantity: bookingQty,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setBookingMsg({ type: "err", text: data.error });
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        setBookingMsg({ type: "ok", text: "Booking confirmed! Check your email for details." });
      }
    } catch {
      setBookingMsg({ type: "err", text: "Network error. Please try again." });
    }
    setBooking(false);
  }

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
                  <div key={event.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
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

                      {/* Upcoming sessions */}
                      <div className="space-y-2">
                        <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider font-semibold">
                          Upcoming Sessions
                        </div>
                        {event.instances.map((inst) => {
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
                              <button
                                onClick={() => openBooking(event, inst)}
                                disabled={isFull}
                                className="px-4 py-1.5 rounded-full text-sm font-medium bg-sky-blue-light text-ink hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {isFull ? "Full" : "Book"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
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

      {/* Booking modal */}
      {selectedInstance && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={closeBooking}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg mb-1">{selectedInstance.event.title}</h3>
            <p className="text-sm text-ink-soft mb-4">
              {new Date(selectedInstance.instance.date + "T00:00:00").toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              at {selectedInstance.instance.start_time}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07123 456789"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setBookingQty(Math.max(1, bookingQty - 1))}
                    className="w-9 h-9 rounded-full bg-ink/5 text-ink grid place-items-center hover:bg-ink/10"
                  >
                    −
                  </button>
                  <span className="font-display text-lg w-8 text-center">{bookingQty}</span>
                  <button
                    onClick={() => setBookingQty(Math.min(selectedInstance.instance.spots_remaining ?? 10, bookingQty + 1))}
                    className="w-9 h-9 rounded-full bg-ink/5 text-ink grid place-items-center hover:bg-ink/10"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="bg-ink/5 rounded-xl p-3 flex justify-between">
                <span className="text-sm text-ink-soft">Total</span>
                <span className="font-display font-bold text-ink">
                  £{(selectedInstance.event.price * bookingQty).toFixed(2)}
                </span>
              </div>
            </div>

            {bookingMsg && (
              <p className={`text-sm mt-3 ${bookingMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                {bookingMsg.text}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={submitBooking}
                disabled={booking}
                className="btn-primary text-sm flex-1 disabled:opacity-60"
              >
                {booking ? "Processing..." : `Pay £${(selectedInstance.event.price * bookingQty).toFixed(2)}`}
              </button>
              <button
                onClick={closeBooking}
                className="px-5 py-2.5 rounded-full bg-ink/5 text-ink text-sm font-medium hover:bg-ink/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
