"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Product, type Enquiry, type Booking } from "@/lib/supabase";
import { classifyBookingSource } from "@/lib/ad-tracking";

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [latestEnquiry, setLatestEnquiry] = useState<Enquiry | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [revenueToday, setRevenueToday] = useState(0);
  const [revenueWeek, setRevenueWeek] = useState(0);
  const [revenueMonth, setRevenueMonth] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthBreakdown, setMonthBreakdown] = useState({ bookings: 0, events: 0, shop: 0, cards: 0 });
  const [adMonth, setAdMonth] = useState({ count: 0, revenue: 0 });
  const [ordersToFulfil, setOrdersToFulfil] = useState<number | null>(null);
  const [todayEvents, setTodayEvents] = useState<{ id: string; name: string; quantity: number; total_price: number; title: string; start_time: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoadingData(true);
    const [prodsRes, eqsRes, bksRes, evbRes, ordersRes, cardsRes, custRes] = await Promise.all([
      fetch("/api/admin/products"),
      fetch("/api/admin/enquiries"),
      fetch("/api/admin/bookings"),
      fetch("/api/admin/event-bookings"),
      fetch("/api/admin/orders"),
      fetch("/api/admin/gift-card-stats"),
      fetch("/api/admin/customers"),
    ]);

    const { products: prods } = await prodsRes.json();
    if (prods) setProducts(prods as Product[]);

    const { enquiries: eqs } = await eqsRes.json();
    if (eqs && eqs.length > 0) setLatestEnquiry(eqs[0] as Enquiry);

    const { bookings: bks } = await bksRes.json();
    const allBookings = (bks || []) as Booking[];
    setBookings(allBookings);
    setBookingCount(allBookings.length);

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const dayStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const todayStr = dayStr(now);
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = dayStr(tomorrow);
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = dayStr(weekStart);
    const monthStart = new Date(now); monthStart.setDate(monthStart.getDate() - 30);
    const monthStartStr = dayStr(monthStart);

    // Today's bookings (paid only)
    const today = allBookings.filter((b) => b.date === todayStr && b.payment_status === "paid");
    setTodayBookings(today.sort((a, b) => a.time_slot.localeCompare(b.time_slot)));

    // Revenue from paid bookings only
    setRevenueToday(today.reduce((sum, b) => sum + Number(b.total_price), 0));
    setRevenueWeek(allBookings.filter((b) => b.date >= weekStartStr && b.payment_status === "paid").reduce((sum, b) => sum + Number(b.total_price), 0));
    setRevenueMonth(allBookings.filter((b) => b.date >= monthStartStr && b.payment_status === "paid").reduce((sum, b) => sum + Number(b.total_price), 0));

    // Revenue from other sources: special events, shop orders, gift card sales
    const { bookings: evb } = await evbRes.json();
    const { orders } = await ordersRes.json();
    const { cards } = await cardsRes.json();
    const { total: custTotal } = await custRes.json();
    setCustomerCount(custTotal || 0);

    type EvBooking = { id: string; name: string; quantity: number; total_price: number | string; payment_status: string; instance_id: string; event_id: string; notes?: string | null; instance?: { date?: string; start_time?: string } | null; event?: { id?: string; title?: string } | null };
    type ShopOrder = { total: number | string; payment_status: string; created_at: string; fulfillment_status?: string };
    type GiftCardRow = { initial_value: number | string; purchased_at: string; ad_source: string | null };

    const paidEv = ((evb || []) as EvBooking[]).filter((b) => b.payment_status === "paid");
    const isoDay = (iso: string) => (iso || "").split("T")[0];
    const instDate = (b: EvBooking) => b.instance?.date || "";
    const instTime = (b: EvBooking) => b.instance?.start_time || "";
    const evTitle = (b: EvBooking) => b.event?.title || "Special Event";

    const evRev = (from: string, to?: string) =>
      paidEv.filter((b) => {
        const d = instDate(b);
        return d && d >= from && (!to || d < to);
      }).reduce((s: number, b) => s + Number(b.total_price || 0), 0);
    const shopRev = (from: string) =>
      ((orders || []) as ShopOrder[]).filter((o) => o.payment_status === "paid" && isoDay(o.created_at) >= from)
        .reduce((s: number, o) => s + Number(o.total || 0), 0);
    const cardRev = (from: string) =>
      ((cards || []) as GiftCardRow[]).filter((c) => isoDay(c.purchased_at) >= from)
        .reduce((s: number, c) => s + Number(c.initial_value || 0), 0);

    const bookingRev = (from: string) =>
      allBookings.filter((b) => b.date >= from && b.payment_status === "paid")
        .reduce((s: number, b) => s + Number(b.total_price), 0);

    setRevenueToday((prev) => prev + evRev(todayStr, tomorrowStr) + shopRev(todayStr) + cardRev(todayStr));
    setRevenueWeek((prev) => prev + evRev(weekStartStr) + shopRev(weekStartStr) + cardRev(weekStartStr));
    setRevenueMonth((prev) => prev + evRev(monthStartStr) + shopRev(monthStartStr) + cardRev(monthStartStr));

    setMonthBreakdown({
      bookings: bookingRev(monthStartStr),
      events: evRev(monthStartStr),
      shop: shopRev(monthStartStr),
      cards: cardRev(monthStartStr),
    });

    // Ad-driven revenue this month — only real ad clicks (Meta/Google); email
    // campaigns and other tracked links are classified separately.
    const adTagged = (n: string | null | undefined) => ["meta", "google"].includes(classifyBookingSource(n));
    const adBookings = allBookings.filter((b) => b.payment_status === "paid" && b.date >= monthStartStr && adTagged(b.notes));
    const adEvents = paidEv.filter((b) => adTagged(b.notes) && instDate(b) >= monthStartStr);
    const adCards = ((cards || []) as GiftCardRow[]).filter((c) => adTagged(c.ad_source) && isoDay(c.purchased_at) >= monthStartStr);
    setAdMonth({
      count: adBookings.length + adEvents.length + adCards.length,
      revenue:
        adBookings.reduce((s: number, b) => s + Number(b.total_price || 0), 0) +
        adEvents.reduce((s: number, b) => s + Number(b.total_price || 0), 0) +
        adCards.reduce((s: number, c) => s + Number(c.initial_value || 0), 0),
    });

    // Today's special event bookings
    setTodayEvents(
      paidEv
        .filter((b) => instDate(b) === todayStr)
        .map((b) => ({
          id: b.id,
          name: b.name,
          quantity: b.quantity,
          total_price: Number(b.total_price),
          title: evTitle(b),
          start_time: instTime(b),
        }))
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    );

    // Orders still needing fulfilment
    setOrdersToFulfil(
      ((orders || []) as ShopOrder[]).filter((o) => o.payment_status === "paid" && (o.fulfillment_status || "new") !== "completed").length
    );

    const allRevenue = allBookings.filter((b) => b.payment_status === "paid")
      .reduce((sum, b) => sum + Number(b.total_price), 0);
    const allEventRevenue = paidEv.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
    const allShopRevenue = ((orders || []) as ShopOrder[]).filter((o) => o.payment_status === "paid")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    const allCardRevenue = ((cards || []) as GiftCardRow[])
      .reduce((sum, c) => sum + Number(c.initial_value || 0), 0);
    setTotalRevenue(allRevenue + allEventRevenue + allShopRevenue + allCardRevenue);

    setLoadingData(false);
  }

  const lowStock = products.filter((p) => (p.stock || 0) <= 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Chart: last 8 weeks bookings count
  const last8Weeks: { label: string; count: number; revenue: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split("T")[0];
    const weekBookings = bookings.filter((b) => b.date >= weekStartStr && b.date < weekEndStr);
    last8Weeks.push({
      label: weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      count: weekBookings.length,
      revenue: weekBookings.reduce((sum, b) => sum + Number(b.total_price), 0),
    });
  }
  const maxWeekCount = Math.max(...last8Weeks.map((w) => w.count), 1);

  // Chart: popular time slots
  const slotCounts: Record<string, number> = {};
  bookings.forEach((b) => {
    slotCounts[b.time_slot] = (slotCounts[b.time_slot] || 0) + 1;
  });
  const topSlots = Object.entries(slotCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxSlotCount = Math.max(...topSlots.map(([, c]) => c), 1);

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      {/* Welcome banner */}
      <div className="reveal rounded-[24px] p-8 md:p-10 mb-8 shadow-md ring-1 ring-white/10" style={{ background: "var(--hero-grad)" }}>
        <span className="eyebrow">{greeting}</span>
        <h1 className="font-display text-[2rem] md:text-[2.75rem] font-bold tracking-tight mt-2 mb-3 text-white">
          Welcome back, Lara!
        </h1>
        <p className="text-white/80 text-[1rem] max-w-lg font-medium">
          Here&apos;s what&apos;s happening at The Slime Studio today. Bookings,
          shop stock and enquiries all in one place.
        </p>
      </div>

      {/* Needs attention */}
      {ordersToFulfil !== null && ordersToFulfil > 0 && (
        <Link
          href="/dashboard/orders?filter=to_fulfil"
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-[16px] px-5 py-3.5 mb-8 hover:bg-amber-100/70 transition-colors"
        >
          <span className="text-[0.9rem] text-amber-800 font-medium">
            📦 {ordersToFulfil} paid shop order{ordersToFulfil === 1 ? "" : "s"} waiting to be fulfilled
          </span>
          <span className="text-[0.8rem] text-amber-700">View →</span>
        </Link>
      )}

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5 mb-8">
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm ring-1 ring-ink/[0.06] border-l-4 border-green-400">
          <div className="text-[0.72rem] md:text-[0.8rem] text-ink-soft uppercase tracking-[0.12em] font-semibold mb-1 md:mb-2">Today&apos;s Revenue</div>
          <div className="font-display text-[1.7rem] md:text-[2.3rem] font-bold tracking-tight">{loadingData ? "--" : `£${revenueToday.toFixed(2)}`}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm ring-1 ring-ink/[0.06] border-l-4 border-sky-blue-light">
          <div className="text-[0.72rem] md:text-[0.8rem] text-ink-soft uppercase tracking-[0.12em] font-semibold mb-1 md:mb-2">This Week</div>
          <div className="font-display text-[1.7rem] md:text-[2.3rem] font-bold tracking-tight">{loadingData ? "--" : `£${revenueWeek.toFixed(2)}`}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm ring-1 ring-ink/[0.06] border-l-4 border-bright-lavender">
          <div className="text-[0.72rem] md:text-[0.8rem] text-ink-soft uppercase tracking-[0.12em] font-semibold mb-1 md:mb-2">This Month</div>
          <div className="font-display text-[1.7rem] md:text-[2.3rem] font-bold tracking-tight">{loadingData ? "--" : `£${revenueMonth.toFixed(2)}`}</div>
        </div>
      </div>

      {/* Money in — this month, by source */}
      <div className="bg-white rounded-2xl p-6 md:p-7 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-[1.3rem] font-bold tracking-tight">Money In — This Month</h2>
          <Link href="/dashboard/ads" className="text-[0.8rem] text-bright-lavender hover:underline">Ad stats →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Bookings", value: monthBreakdown.bookings },
            { label: "Special events", value: monthBreakdown.events },
            { label: "Shop orders", value: monthBreakdown.shop },
            { label: "Gift cards", value: monthBreakdown.cards },
            { label: `From ads (${adMonth.count})`, value: adMonth.revenue, highlight: true },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl px-4 py-3 ${s.highlight ? "bg-pink-50" : "bg-ink/[0.03]"}`}>
              <div className="text-[0.65rem] text-ink-soft uppercase tracking-wider mb-1">{s.label}</div>
              <div className={`font-display text-[1.1rem] ${s.highlight ? "text-pink-600" : ""}`}>
                {loadingData ? "--" : `£${s.value.toFixed(2)}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-8">
        <Link href="/dashboard/bookings" className="bg-white rounded-2xl p-5 md:p-6 shadow-sm ring-1 ring-ink/[0.06] hover:-translate-y-1 hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-sky-blue-light/20 grid place-items-center text-lg">📅</div>
            <span className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Total</span>
          </div>
          <div className="font-display text-[1.9rem] md:text-[2.4rem] font-bold tracking-tight">{loadingData ? "--" : bookingCount}</div>
          <div className="text-[0.8rem] text-ink-soft mt-0.5">Bookings</div>
        </Link>
        <Link href="/dashboard/customers" className="bg-white rounded-2xl p-5 md:p-6 shadow-sm ring-1 ring-ink/[0.06] hover:-translate-y-1 hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-bright-lavender/15 grid place-items-center text-lg">👥</div>
            <span className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Total</span>
          </div>
          <div className="font-display text-[1.9rem] md:text-[2.4rem] font-bold tracking-tight">{loadingData ? "--" : customerCount}</div>
          <div className="text-[0.8rem] text-ink-soft mt-0.5">Customers</div>
        </Link>
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm ring-1 ring-ink/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-green-100 grid place-items-center text-lg">💰</div>
            <span className="text-[0.7rem] text-ink-soft uppercase tracking-wider">All Time</span>
          </div>
          <div className="font-display text-[1.9rem] md:text-[2.4rem] font-bold tracking-tight">{loadingData ? "--" : `£${totalRevenue.toFixed(0)}`}</div>
          <div className="text-[0.8rem] text-ink-soft mt-0.5">Total Revenue</div>
        </div>
        <Link href="/dashboard/shop" className="bg-white rounded-2xl p-5 md:p-6 shadow-sm ring-1 ring-ink/[0.06] hover:-translate-y-1 hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl grid place-items-center text-lg ${lowStock.length > 0 ? "bg-red-100" : "bg-green-100"}`}>📦</div>
            <span className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Alert</span>
          </div>
          <div className="font-display text-[1.9rem] md:text-[2.4rem] font-bold tracking-tight">{loadingData ? "--" : lowStock.length}</div>
          <div className="text-[0.8rem] text-ink-soft mt-0.5">Low Stock</div>
        </Link>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
        {/* Weekly bookings chart */}
        <div className="bg-white rounded-2xl p-7 shadow-sm">
          <h2 className="font-display text-[1.3rem] font-bold tracking-tight mb-5">Bookings — Last 8 Weeks</h2>
          {loadingData ? (
            <div className="text-center py-8 text-ink-soft text-[0.9rem]">Loading...</div>
          ) : (
            <div className="flex items-end justify-between gap-2 h-40">
              {last8Weeks.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-[0.7rem] font-display text-ink-soft">{w.count}</div>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-bright-lavender to-sky-blue-light transition-all hover:opacity-80"
                    style={{ height: `${(w.count / maxWeekCount) * 100}%`, minHeight: w.count > 0 ? "8px" : "2px" }}
                  />
                  <div className="text-[0.65rem] text-ink-soft text-center leading-tight">{w.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular time slots */}
        <div className="bg-white rounded-2xl p-7 shadow-sm">
          <h2 className="font-display text-[1.3rem] font-bold tracking-tight mb-5">Popular Time Slots</h2>
          {loadingData ? (
            <div className="text-center py-8 text-ink-soft text-[0.9rem]">Loading...</div>
          ) : topSlots.length === 0 ? (
            <div className="text-center py-8 text-ink-soft text-[0.9rem]">No bookings yet.</div>
          ) : (
            <div className="space-y-3">
              {topSlots.map(([slot, count]) => (
                <div key={slot}>
                  <div className="flex justify-between text-[0.85rem] mb-1">
                    <span className="font-medium">{slot}</span>
                    <span className="text-ink-soft">{count} bookings</span>
                  </div>
                  <div className="h-2.5 bg-ink/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-bright-lavender"
                      style={{ width: `${(count / maxSlotCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Today's bookings */}
        <div className="bg-white rounded-2xl p-7 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-display text-[1.3rem] font-bold tracking-tight">Today&apos;s Sessions</h2>
            <span className="text-[0.8rem] text-ink-soft">{todayBookings.length + todayEvents.length} booked</span>
          </div>
          {loadingData ? (
            <div className="text-center py-8 text-ink-soft text-[0.9rem]">Loading...</div>
          ) : todayBookings.length === 0 && todayEvents.length === 0 ? (
            <div className="text-center py-8 text-ink-soft text-[0.9rem]">No sessions booked today.</div>
          ) : (
            <ul className="space-y-3">
              {todayEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between border-b border-ink/[0.06] pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-bright-lavender/15 grid place-items-center font-display text-[0.75rem]">
                      {e.start_time.slice(0, 5)}
                    </div>
                    <div>
                      <div className="text-[0.9rem] font-medium">{e.name}</div>
                      <div className="text-[0.8rem] text-ink-soft">
                        <span className="inline-block bg-bright-lavender/15 text-bright-lavender px-1.5 py-0.5 rounded-full text-[0.65rem] font-medium mr-1">Event</span>
                        {e.title} · {e.quantity} {e.quantity === 1 ? "ticket" : "tickets"} · £{Number(e.total_price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {todayBookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between border-b border-ink/[0.06] pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-sky-blue-light/20 grid place-items-center font-display text-[0.9rem]">
                      {b.time_slot}
                    </div>
                    <div>
                      <div className="text-[0.9rem] font-medium">{b.name}</div>
                      <div className="text-[0.8rem] text-ink-soft">{b.people} {b.people === 1 ? "person" : "people"} · £{Number(b.total_price).toFixed(2)}</div>
                    </div>
                  </div>
                  {b.notes && (
                    <span className="text-[0.7rem] text-ink-soft bg-ink/[0.04] rounded-lg px-2 py-1 max-w-[120px] truncate" title={b.notes}>
                        📝 {b.notes}
                      </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming bookings preview */}
        <div className="bg-white rounded-2xl p-7 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-display text-[1.3rem] font-bold tracking-tight">Next Up</h2>
            <Link href="/dashboard/bookings" className="text-[0.8rem] text-bright-lavender hover:underline">
              View all →
            </Link>
          </div>
          {loadingData ? (
            <div className="text-center py-8 text-ink-soft text-[0.9rem]">Loading...</div>
          ) : bookings.filter((b) => b.date > new Date().toISOString().split("T")[0] && b.payment_status === "paid").length === 0 ? (
            <div className="text-center py-8 text-ink-soft text-[0.9rem]">No upcoming bookings yet.</div>
          ) : (
            <ul className="space-y-3">
              {bookings.filter((b) => b.date > new Date().toISOString().split("T")[0] && b.payment_status === "paid").slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between border-b border-ink/[0.06] pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="text-[0.9rem] font-medium">{b.name}</div>
                    <div className="text-[0.8rem] text-ink-soft">
                      {new Date(b.date).toLocaleDateString("en-GB")} · {b.time_slot} · {b.people} {b.people === 1 ? "person" : "people"}
                    </div>
                  </div>
                  <span className="text-[0.9rem] font-display">£{Number(b.total_price).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick links + latest enquiry */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-7 shadow-sm">
            <h2 className="font-display text-[1.3rem] font-bold tracking-tight mb-5">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/shop" className="bg-sky-blue-light/20 rounded-xl p-4 text-center hover:bg-sky-blue-light/30 transition-colors">
                <div className="text-xl mb-1">➕</div>
                <div className="text-[0.8rem] font-medium">Add Product</div>
              </Link>
              <Link href="/dashboard/bookings" className="bg-canary-yellow/20 rounded-xl p-4 text-center hover:bg-canary-yellow/30 transition-colors">
                <div className="text-xl mb-1">📅</div>
                <div className="text-[0.8rem] font-medium">View Bookings</div>
              </Link>
              <Link href="/dashboard/ads" className="bg-pink-100 rounded-xl p-4 text-center hover:bg-pink-200/60 transition-colors">
                <div className="text-xl mb-1">📣</div>
                <div className="text-[0.8rem] font-medium">Ad Stats</div>
              </Link>
              <Link href="/dashboard/gift-cards" className="bg-green-100 rounded-xl p-4 text-center hover:bg-green-200/60 transition-colors">
                <div className="text-xl mb-1">🎁</div>
                <div className="text-[0.8rem] font-medium">Gift Cards</div>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-7 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-[1.3rem] font-bold tracking-tight">Latest Enquiry</h2>
              <Link href="/dashboard/enquiries" className="text-[0.8rem] text-bright-lavender hover:underline">
                View all →
              </Link>
            </div>
            {loadingData ? (
              <div className="text-center py-6 text-ink-soft text-[0.9rem]">Loading...</div>
            ) : !latestEnquiry ? (
              <div className="text-center py-6 text-ink-soft text-[0.9rem]">No enquiries yet.</div>
            ) : (
              <div>
                <div className="text-[0.9rem] font-medium mb-1">{latestEnquiry.name || "--"}</div>
                <div className="text-[0.8rem] text-ink-soft mb-2">{latestEnquiry.enquiry_type || "General"}</div>
                <p className="text-[0.85rem] text-ink-soft line-clamp-2">{latestEnquiry.message || "--"}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
