"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
};

const CATEGORY_BADGE: Record<string, { label: string; color: string }> = {
  adult_evening: { label: "Adults Only", color: "bg-purple-100 text-purple-700" },
  after_school: { label: "After School", color: "bg-blue-100 text-blue-700" },
  workshop: { label: "Workshop", color: "bg-green-100 text-green-700" },
  special: { label: "Special Event", color: "bg-pink-100 text-pink-700" },
};

export default function EventDetailClient({
  event,
  instances,
}: {
  event: SpecialEvent;
  instances: EventInstance[];
}) {
  const searchParams = useSearchParams();
  const booked = searchParams.get("booked") === "1";
  const cancelled = searchParams.get("cancelled") === "1";
  const bookedQty = searchParams.get("qty");
  const bookedTotal = searchParams.get("total");
  const bookedDate = searchParams.get("date");
  const bookedTime = searchParams.get("time");

  const [selectedInstance, setSelectedInstance] = useState<EventInstance | null>(null);
  const [bookingQty, setBookingQty] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingMsg, setBookingMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [shareMsg, setShareMsg] = useState(false);

  const badge = CATEGORY_BADGE[event.category] || CATEGORY_BADGE.special;

  function openBooking(inst: EventInstance) {
    setSelectedInstance(inst);
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
          instance_id: selectedInstance.id,
          event_id: event.id,
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

  function shareLink() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: event.title, text: event.description, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setShareMsg(true);
      setTimeout(() => setShareMsg(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bright-lavender/20 via-white to-sky-blue-light/20 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/events" className="text-sky-blue-light hover:underline text-sm mb-6 inline-block">
          ← All Events
        </Link>

        {/* Share button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={shareLink}
            className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {shareMsg ? "Link copied!" : "Share"}
          </button>
        </div>

        {booked && (
          <div className="mb-6 bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-green-500 px-6 py-4 text-center">
              <div className="text-white text-3xl mb-1">✓</div>
              <h2 className="font-display text-xl text-white">Booking Confirmed!</h2>
            </div>
            <div className="p-6">
              <p className="text-ink-soft text-sm mb-4 text-center">
                Great news! Your booking is confirmed. A confirmation email is on its way to you.
              </p>
              <div className="bg-ink/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft">Event</span>
                  <span className="font-medium text-ink">{event.title}</span>
                </div>
                {bookedDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-soft">Date</span>
                    <span className="font-medium text-ink">
                      {new Date(bookedDate + "T00:00:00").toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  </div>
                )}
                {bookedTime && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-soft">Time</span>
                    <span className="font-medium text-ink">{bookedTime}</span>
                  </div>
                )}
                {bookedQty && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-soft">{event.pricing_model === "per_person" ? "People" : "Tickets"}</span>
                    <span className="font-medium text-ink">{bookedQty}</span>
                  </div>
                )}
                {bookedTotal && (
                  <div className="flex justify-between text-sm border-t border-ink/10 pt-2 mt-2">
                    <span className="text-ink-soft font-medium">Total Paid</span>
                    <span className="font-display font-bold text-ink">£{parseFloat(bookedTotal).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <p className="text-[0.8rem] text-ink-soft mt-4 text-center">
                Please arrive 5 minutes before the event starts. Everything you need is provided!
              </p>
            </div>
          </div>
        )}
        {cancelled && (
          <div className="mb-6 bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-red-500 px-6 py-4 text-center">
              <div className="text-white text-3xl mb-1">✕</div>
              <h2 className="font-display text-xl text-white">Payment Cancelled</h2>
            </div>
            <div className="p-6">
              <p className="text-ink-soft text-sm text-center">
                Your payment was cancelled and no charge was made. You can try booking again below.
              </p>
            </div>
          </div>
        )}

        {/* Event hero */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          {event.image_url && (
            <div className="h-64 overflow-hidden">
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[0.7rem] px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                {badge.label}
              </span>
              {event.event_type === "recurring" && (
                <span className="text-[0.7rem] px-2 py-0.5 rounded-full bg-ink/5 text-ink-soft font-medium">
                  Recurring
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl text-ink mb-3">{event.title}</h1>
            {event.description && (
              <p className="text-ink-soft text-base mb-5 whitespace-pre-line">{event.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-ink-soft mb-2">
              <span className="font-medium text-ink text-lg">
                {event.pricing_model === "per_person"
                  ? `£${event.price} per person`
                  : `£${event.price} per ticket`}
              </span>
              <span>·</span>
              <span>{event.duration_minutes} minutes</span>
              <span>·</span>
              <span>Capacity: {event.capacity}</span>
            </div>
          </div>
        </div>

        {/* Upcoming sessions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h2 className="font-display text-xl text-ink mb-4">Upcoming Sessions</h2>
          {instances.length === 0 ? (
            <p className="text-ink-soft text-sm">No upcoming sessions scheduled. Check back soon!</p>
          ) : (
            <div className="space-y-3">
              {instances.map((inst) => {
                const remaining = inst.spots_remaining ?? (inst.capacity - (inst.booked_count || 0));
                const isFull = remaining <= 0;
                return (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between rounded-xl border border-ink/10 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-ink">
                        {new Date(inst.date + "T00:00:00").toLocaleDateString("en-GB", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        · {inst.start_time}
                      </div>
                      <div className="text-[0.8rem] text-ink-soft mt-0.5">
                        {isFull ? "Fully booked" : `${remaining} spots left`} · {inst.booked_count || 0} booked
                      </div>
                    </div>
                    <button
                      onClick={() => openBooking(inst)}
                      disabled={isFull}
                      className="px-5 py-2 rounded-full text-sm font-medium bg-sky-blue-light text-ink hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isFull ? "Full" : "Book Now"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <Link href="/booking" className="text-sky-blue-light hover:underline text-sm">
            Or book a regular slime session →
          </Link>
        </div>
      </div>

      {/* Booking modal */}
      {selectedInstance && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={closeBooking}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg mb-1">{event.title}</h3>
            <p className="text-sm text-ink-soft mb-4">
              {new Date(selectedInstance.date + "T00:00:00").toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              at {selectedInstance.start_time}
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
                    onClick={() => setBookingQty(Math.min(selectedInstance.spots_remaining ?? 10, bookingQty + 1))}
                    className="w-9 h-9 rounded-full bg-ink/5 text-ink grid place-items-center hover:bg-ink/10"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="bg-ink/5 rounded-xl p-3 flex justify-between">
                <span className="text-sm text-ink-soft">Total</span>
                <span className="font-display font-bold text-ink">
                  £{(event.price * bookingQty).toFixed(2)}
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
                {booking ? "Processing..." : `Pay £${(event.price * bookingQty).toFixed(2)}`}
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
    </div>
  );
}
