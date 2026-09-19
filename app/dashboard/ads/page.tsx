"use client";

import { useEffect, useState } from "react";

type Summary = { spend: number; impressions: number; reach: number; clicks: number; lpv: number; purchases: number };
type NamedRow = Summary & { name?: string };
type AdBooking = { id: string; name: string; email: string; date: string; total_price: number; payment_status: string; notes: string; created_at: string };

type Data = {
  configured: boolean;
  metaError: string | null;
  summary: { today: Summary; week: Summary; month: Summary };
  campaigns: NamedRow[];
  adsets: NamedRow[];
  ads: NamedRow[];
  adBookings: AdBooking[];
  attributedRevenue: number;
};

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "bg-pink-100 text-pink-700",
  Facebook: "bg-blue-100 text-blue-700",
  Meta: "bg-blue-100 text-blue-700",
  Google: "bg-amber-100 text-amber-800",
};

function adLabel(notes: string): string {
  const m = notes.match(/utm:([a-z]+)/i);
  if (m) {
    const map: Record<string, string> = { ig: "Instagram", instagram: "Instagram", fb: "Facebook", facebook: "Facebook", google: "Google" };
    return `${map[m[1].toLowerCase()] || m[1]} Ad`;
  }
  if (notes.includes("Google Ad")) return "Google Ad";
  return "Meta Ad";
}

export default function AdsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ads-insights")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `£${n.toFixed(2)}`;

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Ads</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">Live Meta ads performance and bookings they generated.</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading...</div>
      ) : !data?.configured ? (
        <div className="bg-white rounded-[20px] p-8 shadow-sm text-center text-ink-soft text-[0.9rem]">
          Meta ads integration is not configured.
        </div>
      ) : (
        <>
          {data.metaError && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-xl px-4 py-3 text-[0.85rem] mb-6">
              Meta API warning: {data.metaError}
            </div>
          )}

          {/* Headline stats — last 30 days */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-8">
            <div className="bg-white rounded-[20px] p-6 shadow-sm border-l-4 border-red-400">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Ad Spend · 30d</div>
              <div className="font-display text-[1.8rem]">{fmt(data.summary.month.spend)}</div>
              <div className="text-[0.75rem] text-ink-soft mt-1">Today: {fmt(data.summary.today.spend)}</div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm border-l-4 border-green-400">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Ad Booking Revenue</div>
              <div className="font-display text-[1.8rem] text-green-600">{fmt(data.attributedRevenue)}</div>
              <div className="text-[0.75rem] text-ink-soft mt-1">{data.adBookings.length} ad bookings</div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm border-l-4 border-bright-lavender">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Return on Spend</div>
              <div className="font-display text-[1.8rem]">
                {data.summary.month.spend > 0 ? `${(data.attributedRevenue / data.summary.month.spend).toFixed(1)}x` : "--"}
              </div>
              <div className="text-[0.75rem] text-ink-soft mt-1">revenue ÷ spend</div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm border-l-4 border-sky-blue-light">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Cost per Booking</div>
              <div className="font-display text-[1.8rem]">
                {data.adBookings.length > 0 ? fmt(data.summary.month.spend / data.adBookings.length) : "--"}
              </div>
              <div className="text-[0.75rem] text-ink-soft mt-1">Meta reported: {data.summary.month.purchases}</div>
            </div>
          </div>

          {/* Funnel */}
          <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8">
            <h2 className="font-display text-[1.1rem] mb-6">Last 30 Days Funnel</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <FunnelStat label="Reached" value={data.summary.month.reach} />
              <FunnelStat label="Impressions" value={data.summary.month.impressions} />
              <FunnelStat label="Clicks" value={data.summary.month.clicks} />
              <FunnelStat label="Page Views" value={data.summary.month.lpv} />
              <FunnelStat label="Purchases" value={data.summary.month.purchases} highlight />
            </div>
            <div className="text-[0.75rem] text-ink-soft mt-4">
              7 days: {fmt(data.summary.week.spend)} spend · {data.summary.week.clicks} clicks · {data.summary.week.purchases} purchases
            </div>
          </div>

          {/* Campaigns / ad sets / ads */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <BreakdownCard title="Campaigns" rows={data.campaigns} fmt={fmt} />
            <BreakdownCard title="Ad Sets" rows={data.adsets} fmt={fmt} />
            <BreakdownCard title="Ads" rows={data.ads} fmt={fmt} />
          </div>

          {/* Attributed bookings */}
          <div className="bg-white rounded-[20px] p-8 shadow-sm">
            <h2 className="font-display text-[1.1rem] mb-6">Bookings from Ads</h2>
            {data.adBookings.length === 0 ? (
              <div className="text-center py-8 text-ink-soft text-[0.9rem]">No ad-attributed bookings yet.</div>
            ) : (
              <div className="space-y-3">
                {data.adBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 py-2 border-b border-ink/[0.06] last:border-0 flex-wrap">
                    <div className="min-w-0">
                      <span className="font-medium text-[0.9rem]">{b.name}</span>
                      <span className={`ml-2 text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${PLATFORM_COLORS[adLabel(b.notes).split(" ")[0]] || "bg-blue-100 text-blue-700"}`}>
                        {adLabel(b.notes)}
                      </span>
                      <div className="text-[0.75rem] text-ink-soft">{b.email} · session {new Date(b.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · booked {new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-display text-[0.95rem]">£{Number(b.total_price).toFixed(2)}</div>
                      <div className={`text-[0.7rem] ${b.payment_status === "paid" ? "text-green-600" : "text-orange-500"}`}>{b.payment_status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FunnelStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${highlight ? "bg-green-50" : "bg-ink/[0.03]"}`}>
      <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider">{label}</div>
      <div className={`font-display text-[1.4rem] ${highlight ? "text-green-600" : ""}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function BreakdownCard({ title, rows, fmt }: { title: string; rows: NamedRow[]; fmt: (n: number) => string }) {
  return (
    <div className="bg-white rounded-[20px] p-6 shadow-sm">
      <h2 className="font-display text-[1rem] mb-4">{title}</h2>
      {rows.length === 0 ? (
        <div className="text-ink-soft text-[0.85rem]">No data.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i}>
              <div className="flex justify-between text-[0.85rem]">
                <span className="font-medium truncate mr-2">{r.name || "—"}</span>
                <span className="text-ink-soft flex-shrink-0">{fmt(r.spend)}</span>
              </div>
              <div className="text-[0.72rem] text-ink-soft">
                {r.clicks} clicks · {r.purchases} purchases{r.purchases > 0 ? ` · ${fmt(r.spend / r.purchases)}/booking` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
