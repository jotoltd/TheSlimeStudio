"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 25;

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

type BroadcastRecord = { title: string; body: string; sent: number; at: string };

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushLink, setPushLink] = useState("book");
  const [devices, setDevices] = useState<number | null>(null);
  const [history, setHistory] = useState<BroadcastRecord[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; text: string } | null>(null);

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

    fetch("/api/admin/push-broadcast")
      .then((r) => r.json())
      .then((d) => {
        setDevices(typeof d.devices === "number" ? d.devices : null);
        setHistory(d.history || []);
      })
      .catch(() => {});
  }, []);

  async function sendBroadcast() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/push-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: pushTitle, body: pushBody, link: pushLink }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendResult({ ok: false, text: data.error || "Send failed" });
      } else {
        setSendResult({ ok: true, text: `Sent to ${data.sent} device${data.sent === 1 ? "" : "s"}${data.failed ? ` · ${data.failed} failed` : ""}` });
        setPushTitle("");
        setPushBody("");
        setHistory((h) => [{ title: pushTitle, body: pushBody, sent: data.sent, at: new Date().toISOString() }, ...h].slice(0, 10));
      }
    } catch {
      setSendResult({ ok: false, text: "Send failed" });
    } finally {
      setSending(false);
    }
  }

  async function dismiss(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setItems((prev) => prev.filter((i) => i.id !== id));
    fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismiss: id }),
    }).catch(() => {});
  }

  async function markAllRead() {
    const res = await fetch("/api/admin/notifications", { method: "POST" });
    const data = await res.json();
    if (data.lastSeen) setLastSeen(data.lastSeen);
  }

  const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : 0;
  const unreadCount = items.filter((i) => new Date(i.at).getTime() > lastSeenMs).length;
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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

      <div className="bg-white rounded-[20px] shadow-sm p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#ff2d78]/10 grid place-items-center text-[1.05rem]">📣</div>
          <div>
            <h2 className="font-semibold text-ink text-[0.95rem]">Broadcast a push</h2>
            <p className="text-[0.78rem] text-ink-soft">
              {devices === null
                ? "Checking registered devices…"
                : devices === 0
                  ? "No devices registered yet — they appear once customers install the app"
                  : `Goes to every customer with the app — ${devices} device${devices === 1 ? "" : "s"} registered`}
            </p>
          </div>
        </div>
        <input
          value={pushTitle}
          onChange={(e) => setPushTitle(e.target.value)}
          maxLength={60}
          placeholder="Title — e.g. Half-term slime week!"
          className="w-full rounded-xl border border-ink/10 bg-cream/50 px-4 py-2.5 text-[0.88rem] text-ink placeholder:text-ink-soft/60 outline-none focus:border-[#ff2d78]/50 focus:bg-white transition-colors mb-2"
        />
        <textarea
          value={pushBody}
          onChange={(e) => setPushBody(e.target.value)}
          maxLength={180}
          rows={2}
          placeholder="Message — e.g. Extra sessions just opened this Saturday, book now ✨"
          className="w-full rounded-xl border border-ink/10 bg-cream/50 px-4 py-2.5 text-[0.88rem] text-ink placeholder:text-ink-soft/60 outline-none focus:border-[#ff2d78]/50 focus:bg-white transition-colors resize-none mb-3"
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-[0.8rem] text-ink-soft">
            Opens
            <select
              value={pushLink}
              onChange={(e) => setPushLink(e.target.value)}
              className="rounded-lg border border-ink/10 bg-cream/50 px-2.5 py-1.5 text-[0.8rem] text-ink outline-none focus:border-[#ff2d78]/50"
            >
              <option value="book">Book tab</option>
              <option value="events">Events</option>
              <option value="giftcards">Gift cards</option>
              <option value="account">Account</option>
            </select>
            <span className="text-[0.7rem]">{pushBody.length}/180</span>
          </label>
          <div className="flex items-center gap-3">
            {sendResult && (
              <span className={`text-[0.8rem] ${sendResult.ok ? "text-emerald-600" : "text-red-500"}`}>
                {sendResult.text}
              </span>
            )}
            <button
              onClick={sendBroadcast}
              disabled={sending || !pushTitle.trim() || !pushBody.trim() || !devices}
              className="px-5 py-2.5 rounded-full bg-[#ff2d78] text-white text-[0.85rem] font-medium hover:-translate-y-0.5 hover:shadow-md transition-all disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {sending ? "Sending…" : "Send push"}
            </button>
          </div>
        </div>
        {history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-ink/[0.06]">
            <div className="text-[0.72rem] font-medium text-ink-soft uppercase tracking-wide mb-2">Recent broadcasts</div>
            {history.slice(0, 3).map((h, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 text-[0.8rem] py-1">
                <span className="text-ink/80 truncate">{h.title} — {h.body}</span>
                <span className="text-ink-soft shrink-0">{h.sent} sent</span>
              </div>
            ))}
          </div>
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
          {pagedItems.map((n) => {
            const s = TYPE_STYLE[n.type];
            const unread = new Date(n.at).getTime() > lastSeenMs;
            return (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => fetch("/api/admin/notifications", { method: "POST" }).catch(() => {})}
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
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="text-[0.72rem] text-ink-soft pt-1">{timeAgo(n.at)}</div>
                  <button
                    onClick={(e) => dismiss(n.id, e)}
                    className="text-ink-soft/50 hover:text-ink text-[0.9rem] leading-none px-1"
                    aria-label="Dismiss"
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <Pagination page={safePage} total={items.length} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}
