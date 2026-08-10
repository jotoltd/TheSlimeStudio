"use client";

import { useEffect, useState } from "react";
import { supabase, type Booking, type Subscriber, type SubscriptionSettings } from "@/lib/supabase";

export default function RevenuePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subSettings, setSubSettings] = useState<SubscriptionSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: bks } = await supabase.from("bookings").select("*").order("date", { ascending: false });
    if (bks) setBookings(bks as Booking[]);
    const { data: subs } = await supabase.from("subscribers").select("*");
    if (subs) setSubscribers(subs as Subscriber[]);
    const { data: ss } = await supabase.from("subscription_settings").select("*").eq("id", 1).single();
    if (ss) setSubSettings(ss as SubscriptionSettings);
    setLoading(false);
  }

  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_price), 0);
  const paidRevenue = bookings.filter((b) => b.payment_status === "paid").reduce((sum, b) => sum + Number(b.total_price), 0);
  const unpaidRevenue = bookings.filter((b) => b.payment_status !== "paid").reduce((sum, b) => sum + Number(b.total_price), 0);

  const now = new Date();
  const monthlyData: Record<string, { revenue: number; count: number; paid: number }> = {};
  bookings.forEach((b) => {
    const d = new Date(b.date);
    const key = d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    if (!monthlyData[key]) monthlyData[key] = { revenue: 0, count: 0, paid: 0 };
    monthlyData[key].revenue += Number(b.total_price);
    monthlyData[key].count++;
    if (b.payment_status === "paid") monthlyData[key].paid += Number(b.total_price);
  });

  const months = Object.entries(monthlyData).slice(0, 12);
  const maxRevenue = Math.max(...months.map(([, v]) => v.revenue), 1);

  const paymentStats = {
    paid: bookings.filter((b) => b.payment_status === "paid").length,
    unpaid: bookings.filter((b) => !b.payment_status || b.payment_status === "unpaid").length,
    refunded: bookings.filter((b) => b.payment_status === "refunded").length,
    expired: bookings.filter((b) => b.payment_status === "expired").length,
  };

  const activeSubs = subscribers.filter((s) => s.status === "active").length;
  const subRevenue = subSettings ? activeSubs * Number(subSettings.price) : 0;
  const thisMonthKey = now.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  const thisMonthRevenue = monthlyData[thisMonthKey]?.revenue || 0;

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Revenue</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">Track earnings from bookings and subscriptions.</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading...</div>
      ) : (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-8">
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Total Revenue</div>
              <div className="font-display text-[1.8rem]">£{totalRevenue.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Paid Revenue</div>
              <div className="font-display text-[1.8rem] text-green-600">£{paidRevenue.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Unpaid</div>
              <div className="font-display text-[1.8rem] text-orange-500">£{unpaidRevenue.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">This Month</div>
              <div className="font-display text-[1.8rem]">£{thisMonthRevenue.toFixed(2)}</div>
            </div>
          </div>

          {/* Monthly breakdown chart */}
          <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8">
            <h2 className="font-display text-[1.1rem] mb-6">Monthly Revenue</h2>
            {months.length === 0 ? (
              <div className="text-center py-8 text-ink-soft text-[0.9rem]">No revenue data yet.</div>
            ) : (
              <div className="space-y-4">
                {months.map(([month, data]) => (
                  <div key={month}>
                    <div className="flex justify-between text-[0.85rem] mb-1.5">
                      <span className="font-medium">{month} <span className="text-ink-soft">({data.count} bookings)</span></span>
                      <span className="font-display">£{data.revenue.toFixed(2)}</span>
                    </div>
                    <div className="h-3 bg-ink/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-bright-lavender to-sky-blue-light" style={{ width: `${(data.revenue / maxRevenue) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment status breakdown */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-[20px] p-8 shadow-sm">
              <h2 className="font-display text-[1.1rem] mb-6">Payment Status</h2>
              <div className="space-y-4">
                <PaymentRow label="Paid" count={paymentStats.paid} total={bookings.length} color="bg-green-500" />
                <PaymentRow label="Unpaid" count={paymentStats.unpaid} total={bookings.length} color="bg-orange-400" />
                <PaymentRow label="Refunded" count={paymentStats.refunded} total={bookings.length} color="bg-red-400" />
                <PaymentRow label="Expired" count={paymentStats.expired} total={bookings.length} color="bg-ink/30" />
              </div>
            </div>

            <div className="bg-white rounded-[20px] p-8 shadow-sm">
              <h2 className="font-display text-[1.1rem] mb-6">Subscriptions</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1">Active Subs</div>
                  <div className="font-display text-[1.6rem]">{activeSubs}</div>
                </div>
                <div>
                  <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1">Monthly Recurring</div>
                  <div className="font-display text-[1.6rem]">£{subRevenue.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1">Total Signups</div>
                  <div className="font-display text-[1.6rem]">{subscribers.length}</div>
                </div>
                <div>
                  <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1">Box Price</div>
                  <div className="font-display text-[1.6rem]">£{subSettings ? Number(subSettings.price).toFixed(2) : "--"}</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PaymentRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[0.85rem] mb-1.5">
        <span className="font-medium">{label}</span>
        <span className="text-ink-soft">{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-2.5 bg-ink/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
