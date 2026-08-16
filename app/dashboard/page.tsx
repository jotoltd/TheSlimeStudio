"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, type Product, type Enquiry, type Booking } from "@/lib/supabase";

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [latestEnquiry, setLatestEnquiry] = useState<Enquiry | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [revenueToday, setRevenueToday] = useState(0);
  const [revenueWeek, setRevenueWeek] = useState(0);
  const [revenueMonth, setRevenueMonth] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoadingData(true);
    const { data: prods } = await supabase.from("products").select("*");
    if (prods) setProducts(prods as Product[]);

    const { count } = await supabase.from("enquiries").select("*", { count: "exact", head: true });
    setEnquiryCount(count || 0);

    const { data: eqs } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(1);
    if (eqs && eqs.length > 0) setLatestEnquiry(eqs[0] as Enquiry);

    const { count: bCount } = await supabase.from("bookings").select("*", { count: "exact", head: true });
    setBookingCount(bCount || 0);

    const todayStr = new Date().toISOString().split("T")[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    const { data: bks } = await supabase
      .from("bookings")
      .select("*")
      .order("date", { ascending: true });
    if (bks) {
      const allBookings = bks as Booking[];
      setBookings(allBookings);

      // Today's bookings (paid only)
      const today = allBookings.filter((b) => b.date === todayStr && b.payment_status === "paid");
      setTodayBookings(today.sort((a, b) => a.time_slot.localeCompare(b.time_slot)));

      // Revenue from paid bookings only
      setRevenueToday(today.reduce((sum, b) => sum + Number(b.total_price), 0));
      setRevenueWeek(allBookings.filter((b) => b.date >= weekStartStr && b.payment_status === "paid").reduce((sum, b) => sum + Number(b.total_price), 0));
      setRevenueMonth(allBookings.filter((b) => b.date >= monthStartStr && b.payment_status === "paid").reduce((sum, b) => sum + Number(b.total_price), 0));
    }

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
      <div className="reveal rounded-[28px] p-8 md:p-10 mb-8 shadow-sm" style={{ background: "linear-gradient(135deg, #2b2350 0%, #4a3f7a 100%)" }}>
        <span className="eyebrow">{greeting}</span>
        <h1 className="font-display text-[1.8rem] md:text-[2.4rem] mt-2 mb-2 text-white">
          Welcome back, Lara! ✨
        </h1>
        <p className="text-white/70 text-[0.95rem] max-w-lg">
          Here&apos;s what&apos;s happening at The Slime Studio today. Bookings,
          shop stock and enquiries all in one place.
        </p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5 mb-8">
        <div className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-6 shadow-sm border-l-4 border-green-400">
          <div className="text-[0.65rem] md:text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1 md:mb-2">Today's Revenue</div>
          <div className="font-display text-[1.2rem] md:text-[1.8rem]">{loadingData ? "--" : `£${revenueToday.toFixed(2)}`}</div>
        </div>
        <div className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-6 shadow-sm border-l-4 border-sky-blue-light">
          <div className="text-[0.65rem] md:text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1 md:mb-2">This Week</div>
          <div className="font-display text-[1.2rem] md:text-[1.8rem]">{loadingData ? "--" : `£${revenueWeek.toFixed(2)}`}</div>
        </div>
        <div className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-6 shadow-sm border-l-4 border-bright-lavender">
          <div className="text-[0.65rem] md:text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1 md:mb-2">This Month</div>
          <div className="font-display text-[1.2rem] md:text-[1.8rem]">{loadingData ? "--" : `£${revenueMonth.toFixed(2)}`}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-8">
        <Link href="/dashboard/bookings" className="bg-white rounded-[20px] p-5 md:p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-blue-light/20 grid place-items-center text-lg">📅</div>
            <span className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Total</span>
          </div>
          <div className="font-display text-[1.6rem] md:text-[1.8rem]">{loadingData ? "--" : bookingCount}</div>
          <div className="text-[0.8rem] text-ink-soft mt-0.5">Bookings</div>
        </Link>
        <Link href="/dashboard/shop" className="bg-white rounded-[20px] p-5 md:p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-bright-lavender/15 grid place-items-center text-lg">🛍️</div>
            <span className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Total</span>
          </div>
          <div className="font-display text-[1.6rem] md:text-[1.8rem]">{loadingData ? "--" : products.length}</div>
          <div className="text-[0.8rem] text-ink-soft mt-0.5">Products</div>
        </Link>
        <Link href="/dashboard/enquiries" className="bg-white rounded-[20px] p-5 md:p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-canary-yellow/20 grid place-items-center text-lg">✉️</div>
            <span className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Total</span>
          </div>
          <div className="font-display text-[1.6rem] md:text-[1.8rem]">{loadingData ? "--" : enquiryCount}</div>
          <div className="text-[0.8rem] text-ink-soft mt-0.5">Enquiries</div>
        </Link>
        <Link href="/dashboard/shop" className="bg-white rounded-[20px] p-5 md:p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl grid place-items-center text-lg ${lowStock.length > 0 ? "bg-red-100" : "bg-green-100"}`}>📦</div>
            <span className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Alert</span>
          </div>
          <div className="font-display text-[1.6rem] md:text-[1.8rem]">{loadingData ? "--" : lowStock.length}</div>
          <div className="text-[0.8rem] text-ink-soft mt-0.5">Low Stock</div>
        </Link>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
        {/* Weekly bookings chart */}
        <div className="bg-white rounded-[20px] p-7 shadow-sm">
          <h2 className="font-display text-[1.1rem] mb-5">Bookings — Last 8 Weeks</h2>
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
        <div className="bg-white rounded-[20px] p-7 shadow-sm">
          <h2 className="font-display text-[1.1rem] mb-5">Popular Time Slots</h2>
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
        <div className="bg-white rounded-[20px] p-7 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-display text-[1.1rem]">Today's Sessions</h2>
            <span className="text-[0.8rem] text-ink-soft">{todayBookings.length} booked</span>
          </div>
          {loadingData ? (
            <div className="text-center py-8 text-ink-soft text-[0.9rem]">Loading...</div>
          ) : todayBookings.length === 0 ? (
            <div className="text-center py-8 text-ink-soft text-[0.9rem]">No sessions booked today.</div>
          ) : (
            <ul className="space-y-3">
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
        <div className="bg-white rounded-[20px] p-7 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-display text-[1.1rem]">Next Up</h2>
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
          <div className="bg-white rounded-[20px] p-7 shadow-sm">
            <h2 className="font-display text-[1.1rem] mb-5">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/shop" className="bg-sky-blue-light/20 rounded-xl p-4 text-center hover:bg-sky-blue-light/30 transition-colors">
                <div className="text-xl mb-1">➕</div>
                <div className="text-[0.8rem] font-medium">Add Product</div>
              </Link>
              <Link href="/dashboard/bookings" className="bg-canary-yellow/20 rounded-xl p-4 text-center hover:bg-canary-yellow/30 transition-colors">
                <div className="text-xl mb-1">📅</div>
                <div className="text-[0.8rem] font-medium">View Bookings</div>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-7 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-[1.1rem]">Latest Enquiry</h2>
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
