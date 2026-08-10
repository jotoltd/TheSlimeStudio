"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, type Product, type Enquiry, type Booking, type SiteSettings } from "@/lib/supabase";

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [latestEnquiry, setLatestEnquiry] = useState<Enquiry | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [maintDate, setMaintDate] = useState("");
  const [savingMaint, setSavingMaint] = useState(false);
  const [stripeMode, setStripeMode] = useState<"live" | "test">("test");
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [stripeMsg, setStripeMsg] = useState("");
  const [migrating, setMigrating] = useState(false);
  const [migrationMsg, setMigrationMsg] = useState("");

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
      .order("date", { ascending: true });
    if (bks) setBookings(bks as Booking[]);

    const { data: ss } = await supabase.from("site_settings").select("*").eq("id", 1).single();
    if (ss) {
      const s = ss as SiteSettings;
      setSiteSettings(s);
      setMaintDate(new Date(s.launch_date).toISOString().slice(0, 16));
    }

    setLoadingData(false);

    // Load Stripe mode
    try {
      const res = await fetch("/api/stripe-mode");
      const data = await res.json();
      if (data.mode) setStripeMode(data.mode);
      setStripeConfigured(data.configured);
    } catch {}
  }

  async function switchStripeMode(newMode: "live" | "test") {
    setSwitchingMode(true);
    setStripeMsg("");
    try {
      const res = await fetch("/api/stripe-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
      const data = await res.json();
      if (data.note) {
        setStripeMsg(data.note);
      }
    } catch {}
    setSwitchingMode(false);
  }

  async function runMigration() {
    setMigrating(true);
    setMigrationMsg("");
    try {
      const res = await fetch("/api/run-migration", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMigrationMsg("Database migration completed successfully!");
      } else if (data.sql) {
        setMigrationMsg(`Automatic migration failed. Run this SQL in your Supabase SQL Editor:\n\n${data.sql}`);
      } else {
        setMigrationMsg(data.error || "Migration failed.");
      }
    } catch {
      setMigrationMsg("Migration request failed.");
    }
    setMigrating(false);
  }

  async function toggleMaintenance() {
    if (!siteSettings) return;
    const newVal = !siteSettings.maintenance_mode;
    setSiteSettings({ ...siteSettings, maintenance_mode: newVal });
    await supabase.from("site_settings").update({ maintenance_mode: newVal }).eq("id", 1);
  }

  async function saveMaintDate() {
    if (!maintDate) return;
    setSavingMaint(true);
    const isoDate = new Date(maintDate).toISOString();
    await supabase.from("site_settings").update({ launch_date: isoDate }).eq("id", 1);
    setSavingMaint(false);
    loadData();
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

      {/* Maintenance Mode */}
      <div className="bg-white rounded-[20px] p-7 shadow-sm mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h2 className="font-display text-[1.1rem] mb-1">Site Maintenance Mode</h2>
            <p className="text-[0.85rem] text-ink-soft">
              {siteSettings?.maintenance_mode
                ? "ON — entire website is offline, showing countdown page"
                : "OFF — website is live and accessible to everyone"}
            </p>
          </div>
          <button
            onClick={toggleMaintenance}
            className={`relative w-16 h-9 rounded-full transition-colors ${siteSettings?.maintenance_mode ? "bg-red-400" : "bg-ink/15"}`}
          >
            <span
              className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-sm transition-transform ${
                siteSettings?.maintenance_mode ? "translate-x-7" : ""
              }`}
            />
          </button>
        </div>
        <div className="border-t border-ink/[0.08] pt-6">
          <label className="block text-sm font-medium mb-2">Countdown Launch Date</label>
          <div className="flex gap-3 flex-wrap items-center">
            <input
              type="datetime-local"
              value={maintDate}
              onChange={(e) => setMaintDate(e.target.value)}
              className="px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
            />
            <button
              onClick={saveMaintDate}
              disabled={savingMaint}
              className="px-5 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all"
            >
              {savingMaint ? "Saving..." : "Update Date"}
            </button>
          </div>
          <p className="text-[0.8rem] text-ink-soft mt-2">
            This date powers the countdown timer on the maintenance page.
          </p>
        </div>
      </div>

      {/* Stripe Mode */}
      <div className="bg-white rounded-[20px] p-7 shadow-sm mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <h2 className="font-display text-[1.1rem] mb-1">Stripe Payment Mode</h2>
            <p className="text-[0.85rem] text-ink-soft">
              {stripeConfigured
                ? stripeMode === "live"
                  ? "LIVE — real payments are being processed"
                  : "TEST — sandbox mode, no real charges are made"
                : "Not configured — add Stripe API keys to .env.local to enable payments"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => switchStripeMode("test")}
              disabled={switchingMode}
              className={`px-5 py-2.5 rounded-full text-[0.85rem] font-medium transition-all ${
                stripeMode === "test"
                  ? "bg-canary-yellow text-ink shadow-sm"
                  : "bg-ink/5 text-ink-soft hover:bg-ink/10"
              }`}
            >
              Test (Sandbox)
            </button>
            <button
              onClick={() => switchStripeMode("live")}
              disabled={switchingMode}
              className={`px-5 py-2.5 rounded-full text-[0.85rem] font-medium transition-all ${
                stripeMode === "live"
                  ? "bg-green-500 text-white shadow-sm"
                  : "bg-ink/5 text-ink-soft hover:bg-ink/10"
              }`}
            >
              Live
            </button>
          </div>
        </div>
        {stripeMsg && (
          <div className="bg-sky-blue-light/20 rounded-xl p-4 text-[0.85rem] text-ink-soft">
            {stripeMsg}
          </div>
        )}
        <div className="border-t border-ink/[0.08] pt-4 mt-4">
          <p className="text-[0.8rem] text-ink-soft mb-3">
            Switching modes requires setting <code className="bg-ink/5 px-1.5 py-0.5 rounded">STRIPE_MODE=live</code> or <code className="bg-ink/5 px-1.5 py-0.5 rounded">STRIPE_MODE=test</code> in <code className="bg-ink/5 px-1.5 py-0.5 rounded">.env.local</code> and restarting the server. Both booking and subscription payments use the active mode.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={runMigration}
              disabled={migrating}
              className="px-5 py-2.5 rounded-full bg-bright-lavender text-white text-[0.85rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all"
            >
              {migrating ? "Running..." : "Run DB Migration"}
            </button>
            <span className="text-[0.8rem] text-ink-soft">Adds payment_status, stripe_session_id columns to the database</span>
          </div>
          {migrationMsg && (
            <div className={`mt-3 rounded-xl p-4 text-[0.85rem] whitespace-pre-wrap ${migrationMsg.includes("successfully") ? "bg-green-100 text-green-700" : "bg-sky-blue-light/20 text-ink-soft"}`}>
              {migrationMsg}
            </div>
          )}
        </div>
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

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
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
          ) : bookings.filter((b) => b.date >= new Date().toISOString().split("T")[0]).length === 0 ? (
            <div className="text-center py-8 text-ink-soft text-[0.9rem]">No upcoming bookings yet.</div>
          ) : (
            <ul className="space-y-3">
              {bookings.filter((b) => b.date >= new Date().toISOString().split("T")[0]).slice(0, 5).map((b) => (
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
