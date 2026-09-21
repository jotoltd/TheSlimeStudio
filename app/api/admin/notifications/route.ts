import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const LAST_SEEN_KEY = "admin_notif_last_seen";
const DISMISSED_KEY = "admin_notif_dismissed";

type Notification = {
  id: string;
  type: "booking" | "cancellation" | "event_booking" | "shop_order" | "gift_card" | "enquiry";
  title: string;
  detail: string;
  href: string;
  at: string;
};

export async function GET() {
  try {
    const [lastSeenRes, dismissedRes, bookingsRes, eventsRes, ordersRes, cardsRes, enquiriesRes] = await Promise.all([
      supabaseAdmin.from("site_content").select("value").eq("key", LAST_SEEN_KEY).maybeSingle(),
      supabaseAdmin.from("site_content").select("value").eq("key", DISMISSED_KEY).maybeSingle(),
      supabaseAdmin
        .from("bookings")
        .select("id, name, date, time_slot, people, total_price, payment_status, created_at")
        .order("created_at", { ascending: false })
        .limit(15),
      supabaseAdmin
        .from("special_event_bookings")
        .select("id, name, quantity, total_price, payment_status, created_at, event_id")
        .order("created_at", { ascending: false })
        .limit(15),
      supabaseAdmin
        .from("shop_orders")
        .select("id, customer_name, total, payment_status, created_at")
        .order("created_at", { ascending: false })
        .limit(15),
      supabaseAdmin
        .from("gift_cards")
        .select("id, code, purchaser_name, initial_value, created_at, purchased_at")
        .order("created_at", { ascending: false })
        .limit(15),
      supabaseAdmin
        .from("enquiries")
        .select("id, name, email, status, created_at")
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    const lastSeen = lastSeenRes.data?.value || null;
    const items: Notification[] = [];

    // Event titles for special event bookings
    const eventIds = Array.from(new Set((eventsRes.data || []).map((b) => b.event_id).filter(Boolean)));
    let eventTitles: Record<string, string> = {};
    if (eventIds.length) {
      const { data: events } = await supabaseAdmin
        .from("special_events")
        .select("id, title")
        .in("id", eventIds);
      (events || []).forEach((e: { id: string; title: string }) => {
        eventTitles[e.id] = e.title;
      });
    }

    for (const b of bookingsRes.data || []) {
      const cancelled = b.payment_status === "cancelled" || b.payment_status === "refunded";
      items.push({
        id: `booking-${b.id}`,
        type: cancelled ? "cancellation" : "booking",
        title: cancelled ? `Booking cancelled — ${b.name || "Customer"}` : `New booking — ${b.name || "Customer"}`,
        detail: `${b.people || "?"} people · ${b.date || ""} at ${b.time_slot || ""} · £${Number(b.total_price || 0).toFixed(2)}${cancelled ? ` (${b.payment_status})` : ""}`,
        href: `/dashboard/bookings?filter=all&q=${encodeURIComponent(b.name || "")}`,
        at: b.created_at,
      });
    }

    for (const eb of eventsRes.data || []) {
      const cancelled = eb.payment_status === "cancelled" || eb.payment_status === "refunded";
      const title = eventTitles[eb.event_id] || "Special event";
      items.push({
        id: `event-${eb.id}`,
        type: cancelled ? "cancellation" : "event_booking",
        title: cancelled ? `Event booking cancelled — ${eb.name || "Customer"}` : `Event booking — ${eb.name || "Customer"}`,
        detail: `${title} · ${eb.quantity || 1} ticket${eb.quantity === 1 ? "" : "s"} · £${Number(eb.total_price || 0).toFixed(2)}`,
        href: "/dashboard/bookings?filter=all",
        at: eb.created_at,
      });
    }

    for (const o of ordersRes.data || []) {
      if (o.payment_status !== "paid") continue;
      items.push({
        id: `order-${o.id}`,
        type: "shop_order",
        title: `Shop order — ${o.customer_name || "Customer"}`,
        detail: `£${Number(o.total || 0).toFixed(2)}`,
        href: `/dashboard/orders?order=${o.id}`,
        at: o.created_at,
      });
    }

    for (const g of cardsRes.data || []) {
      items.push({
        id: `gift-${g.id}`,
        type: "gift_card",
        title: `Gift card sold — £${Number(g.initial_value || 0).toFixed(0)}`,
        detail: `${g.code} · ${g.purchaser_name || "Customer"}`,
        href: `/dashboard/gift-cards?search=${encodeURIComponent(g.code)}`,
        at: g.purchased_at || g.created_at,
      });
    }

    for (const e of enquiriesRes.data || []) {
      items.push({
        id: `enquiry-${e.id}`,
        type: "enquiry",
        title: `New enquiry — ${e.name || "Visitor"}`,
        detail: e.email || "",
        href: "/dashboard/enquiries",
        at: e.created_at,
      });
    }

    // Hide individually dismissed items
    let dismissed: string[] = [];
    try {
      dismissed = JSON.parse(dismissedRes.data?.value || "[]");
    } catch {}
    const visible = items.filter((i) => !dismissed.includes(i.id));

    visible.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : 0;
    const unread = visible.filter((i) => new Date(i.at).getTime() > lastSeenMs).length;

    return NextResponse.json({ items: visible.slice(0, 40), unread, lastSeen });
  } catch (err) {
    console.error("[notifications] error:", err);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

// POST — body {dismiss: "item-id"} hides one item; empty body marks all read
export async function POST(req: Request) {
  let dismiss: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.dismiss === "string") dismiss = body.dismiss;
  } catch {
    // no body — mark-all-read request
  }

  if (dismiss) {
    const { data } = await supabaseAdmin
      .from("site_content")
      .select("value")
      .eq("key", DISMISSED_KEY)
      .maybeSingle();
    let dismissed: string[] = [];
    try {
      dismissed = JSON.parse(data?.value || "[]");
    } catch {}
    if (!dismissed.includes(dismiss)) dismissed.push(dismiss);
    // Keep the list bounded — oldest dismissals fall off
    dismissed = dismissed.slice(-500);
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert({ key: DISMISSED_KEY, value: JSON.stringify(dismissed) }, { onConflict: "key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("site_content")
    .upsert({ key: LAST_SEEN_KEY, value: now }, { onConflict: "key" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, lastSeen: now });
}
