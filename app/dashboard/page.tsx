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
    const { data: bks } = await supabase
      .from("bookings")
      .select("*")
      .gte("date", todayStr)
      .order("date", { ascending: true })
      .order("time_slot", { ascending: true })
      .limit(5);
    if (bks) setBookings(bks as Booking[]);

    setLoadingData(false);
  }

  const lowStock = products.filter((p) => (p.stock || 0) <= 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      {/* Welcome banner */}
      <div className="reveal rounded-[28px] p-8 md:p-10 mb-8 shadow-sm" style={{ background: "linear-gradient(135deg, #2b2350 0%, #4a3f7a 100%)" }}>
        <span className="eyebrow">{greeting}</span>
        <h1 className="font-display text-[1.8rem] md:text-[2.4rem] mt-2 mb-2 text-white">
          Welcome back, Lorna! ✨
        </h1>
        <p className="text-white/70 text-[0.95rem] max-w-lg">
          Here&apos;s what&apos;s happening at The Slime Studio today. Bookings,
          shop stock and enquiries all in one place.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        <Link href="/dashboard/bookings" className="bg-white rounded-[20px] p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Total Bookings</div>
          <div className="font-display text-[1.8rem]">{loadingData ? "--" : bookingCount}</div>
        </Link>
        <Link href="/dashboard/shop" className="bg-white rounded-[20px] p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Total Products</div>
          <div className="font-display text-[1.8rem]">{loadingData ? "--" : products.length}</div>
        </Link>
        <Link href="/dashboard/enquiries" className="bg-white rounded-[20px] p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Enquiries</div>
          <div className="font-display text-[1.8rem]">{loadingData ? "--" : enquiryCount}</div>
        </Link>
        <Link href="/dashboard/shop" className="bg-white rounded-[20px] p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Low Stock</div>
          <div className="font-display text-[1.8rem]">{loadingData ? "--" : lowStock.length}</div>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 text-ink-soft text-[0.9rem]">No upcoming bookings yet.</div>
          ) : (
            <ul className="space-y-3">
              {bookings.map((b) => (
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
