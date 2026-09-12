"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

type EventBooking = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  quantity: number;
  total_price: number;
  payment_status: string;
  payment_reference: string | null;
  created_at: string;
  event: {
    id: string;
    title: string;
    category: string;
    price: number;
    pricing_model: string;
  } | null;
  instance: {
    id: string;
    date: string;
    start_time: string;
    capacity: number;
    status: string;
  } | null;
};

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

const CATEGORY_COLORS: Record<string, string> = {
  adult_evening: "bg-purple-100 text-purple-700",
  after_school: "bg-blue-100 text-blue-700",
  workshop: "bg-green-100 text-green-700",
  special: "bg-pink-100 text-pink-700",
};

export default function EventBookingsPage() {
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    let url = "/api/admin/event-bookings?";
    if (filterEvent !== "all") url += `event_id=${filterEvent}&`;
    if (filterStatus !== "all") url += `status=${filterStatus}&`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.bookings) setBookings(data.bookings);
    } catch {}
    setLoading(false);
  }, [filterEvent, filterStatus]);

  useEffect(() => {
    // Load event list for filter dropdown
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((data) => {
        if (data.events) setEvents(data.events.map((e: any) => ({ id: e.id, title: e.title })));
      })
      .catch(() => {});
    load();
  }, [load]);

  async function updateStatus(id: string, action: "mark_paid" | "mark_pending" | "cancel" | "delete") {
    if (action === "delete" && !confirm("Delete this booking permanently?")) return;
    if (action === "cancel" && !confirm("Cancel this booking?")) return;
    const res = await fetch("/api/admin/event-bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, "error");
    } else {
      toast(action === "delete" ? "Booking deleted" : "Booking updated");
      load();
    }
  }

  const totalRevenue = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + b.total_price, 0);

  const totalTickets = bookings
    .filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + b.quantity, 0);

  return (
    <div className="py-8 md:py-10 px-5 md:px-10 max-w-6xl">
      <PageHeader
        title="Event Bookings"
        subtitle="View and manage bookings for special events"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider">Total Bookings</div>
          <div className="font-display text-xl text-ink mt-1">{bookings.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider">Tickets Sold</div>
          <div className="font-display text-xl text-ink mt-1">{totalTickets}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider">Revenue</div>
          <div className="font-display text-xl text-ink mt-1">£{totalRevenue.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          className="px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light bg-white"
        >
          <option value="all">All Events</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink-soft text-sm">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
          <p className="text-ink-soft text-sm">No event bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const eventDate = b.instance?.date
              ? new Date(b.instance.date + "T00:00:00").toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })
              : "—";
            return (
              <div key={b.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[0.7rem] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.payment_status] || "bg-gray-100 text-gray-700"}`}>
                        {b.payment_status}
                      </span>
                      {b.event && (
                        <span className={`text-[0.7rem] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[b.event.category] || CATEGORY_COLORS.special}`}>
                          {b.event.title}
                        </span>
                      )}
                    </div>
                    <div className="font-display text-[0.95rem] text-ink mb-1">{b.name}</div>
                    <div className="text-[0.85rem] text-ink-soft space-y-0.5">
                      <div>{b.email}{b.phone ? ` · ${b.phone}` : ""}</div>
                      <div>
                        {eventDate} at {b.instance?.start_time || "—"} · {b.quantity} {b.event?.pricing_model === "per_person" ? "people" : "tickets"} · £{b.total_price.toFixed(2)}
                      </div>
                      <div className="text-[0.75rem] text-ink-soft/70">
                        Booked {new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {b.payment_reference ? ` · Ref: ${b.payment_reference.slice(0, 20)}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {b.payment_status !== "paid" && (
                      <button
                        onClick={() => updateStatus(b.id, "mark_paid")}
                        className="px-3 py-1.5 rounded-full text-[0.8rem] font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                      >
                        Mark Paid
                      </button>
                    )}
                    {b.payment_status === "paid" && (
                      <button
                        onClick={() => updateStatus(b.id, "mark_pending")}
                        className="px-3 py-1.5 rounded-full text-[0.8rem] font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                      >
                        Unmark
                      </button>
                    )}
                    {b.payment_status !== "cancelled" && (
                      <button
                        onClick={() => updateStatus(b.id, "cancel")}
                        className="px-3 py-1.5 rounded-full text-[0.8rem] font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus(b.id, "delete")}
                      className="px-3 py-1.5 rounded-full text-[0.8rem] font-medium bg-ink/5 text-ink-soft hover:bg-ink/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
