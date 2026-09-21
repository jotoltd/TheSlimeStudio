"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  type: "booking" | "cancellation" | "event_booking" | "shop_order" | "gift_card" | "enquiry";
  title: string;
  detail: string;
  href: string;
  at: string;
};

const TYPE_STYLE: Record<Notification["type"], { icon: string; bg: string; label: string }> = {
  booking: { icon: "📅", bg: "bg-sky-blue-light/25", label: "Booking" },
  event_booking: { icon: "🎉", bg: "bg-bright-lavender/30", label: "Event" },
  shop_order: { icon: "🛍️", bg: "bg-aquamarine/40", label: "Shop" },
  gift_card: { icon: "🎁", bg: "bg-[#ff2d78]/10", label: "Gift card" },
  enquiry: { icon: "✉️", bg: "bg-canary-yellow/15", label: "Enquiry" },
  cancellation: { icon: "❌", bg: "bg-red-100", label: "Cancelled" },
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || []);
        setLastSeen(d.lastSeen || null);
        // Mark read after capturing the previous lastSeen so new items
        // still show their unread highlight on this visit.
        fetch("/api/admin/notifications", { method: "POST" }).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    const res = await fetch("/api/admin/notifications", { method: "POST" });
    const data = await res.json();
    if (data.lastSeen) setLastSeen(data.lastSeen);
  }

  const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : 0;
  const unreadCount = items.filter((i) => new Date(i.at).getTime() > lastSeenMs).length;

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[1.6rem] md:text-[2rem] text-ink">Notifications</h1>
          <p className="text-[0.85rem] text-ink-soft mt-1">
            {unreadCount > 0 ? `${unreadCount} new since your last visit` : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-5 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.85rem] font-medium hover:-translate-y-0.5 hover:shadow-sm transition-all"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-[20px] p-10 text-center text-ink-soft text-sm shadow-sm">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-[20px] p-10 text-center text-ink-soft text-sm shadow-sm">
          Nothing yet — new bookings, orders, gift cards and enquiries will appear here.
        </div>
      ) : (
        <div className="bg-white rounded-[20px] shadow-sm overflow-hidden divide-y divide-ink/[0.06]">
          {items.map((n) => {
            const s = TYPE_STYLE[n.type];
            const unread = new Date(n.at).getTime() > lastSeenMs;
            return (
              <Link
                key={n.id}
                href={n.href}
                className={`flex items-start gap-4 px-5 py-4 hover:bg-cream/60 transition-colors ${unread ? "bg-sky-blue-light/[0.07]" : ""}`}
              >
                <div className={`w-10 h-10 rounded-full ${s.bg} grid place-items-center text-[1.05rem] shrink-0`}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[0.9rem] ${unread ? "font-semibold text-ink" : "text-ink/80"}`}>{n.title}</span>
                    {unread && <span className="w-2 h-2 rounded-full bg-[#ff2d78] shrink-0" />}
                  </div>
                  <div className="text-[0.8rem] text-ink-soft mt-0.5 truncate">{n.detail}</div>
                </div>
                <div className="text-[0.72rem] text-ink-soft shrink-0 pt-1">{timeAgo(n.at)}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
