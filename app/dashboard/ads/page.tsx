"use client";

import { useEffect, useState } from "react";

type Summary = { spend: number; impressions: number; reach: number; clicks: number; lpv: number; purchases: number; frequency?: number; purchaseValue?: number };
type AdPreview = { name: string; status: string; thumbnail: string | null; kind: string; headline: string | null; body: string | null; link: string | null };
type Alert = { level: "warning" | "info"; message: string };
type NamedRow = Summary & { name?: string; thumbnail?: string | null; quality?: string | null; qualityGood?: boolean | null; video?: { plays: number; completionRate: number; avgWatch: number } | null };
type DailyPoint = { date: string; spend: number; clicks: number; purchases: number };
type ManagedEntity = { id: string; name: string; status: string; effectiveStatus: string; dailyBudget: number | null; campaignName?: string; thumbnail?: string | null; targeting?: string; optimisesFor?: string | null; tracked?: boolean };
type AdBooking = { id: string; name: string; email: string; date: string; total_price: number; payment_status: string; notes: string; created_at: string; kind?: "session" | "event"; platform?: "meta" | "google" | "tiktok" | "other" };

type Data = {
  configured: boolean;
  metaError: string | null;
  summary: { today: Summary; week: Summary; prevWeek: Summary; month: Summary };
  deltas: { spend: number | null; clicks: number | null; purchases: number | null };
  adPreviews: AdPreview[];
  alerts: Alert[];
  daily: DailyPoint[];
  campaigns: NamedRow[];
  adsets: NamedRow[];
  ads: NamedRow[];
  manage: { campaigns: ManagedEntity[]; adsets: ManagedEntity[]; ads: ManagedEntity[] };
  audience: {
    ageGender: { age: string; gender: string; impressions: number; reach: number; spend: number; purchases: number }[];
    regions: { region: string; impressions: number; reach: number; spend: number }[];
    placements: { platform: string; position: string; impressions: number; clicks: number; spend: number; purchases: number }[];
  };
  attributionSplit: { clicked: number; sawOnly: number };
  devices: { device: string; impressions: number; clicks: number; purchases: number }[];
  adBookings: AdBooking[];
  platformTotals: { platform: string; bookings: number; revenue: number }[];
  google?: {
    tagEnabled: boolean;
    tagId: string | null;
    conversionWired: boolean;
    conversions: number;
    revenue: number;
    items: { id: string; name: string; email: string; value: number; status: string; kind: string; at: string }[];
    api?: {
      connected: boolean;
      error: string | null;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
      ctr: number;
      daily: { date: string; spend: number; impressions: number; clicks: number; conversions: number }[];
      campaigns: { name: string; status: string; dailyBudget: number | null; spend: number; impressions: number; clicks: number; ctr: number; cpc: number; conversions: number; convValue: number; costPerConv: number | null }[];
      ads: { name: string; adGroup: string; campaign: string; spend: number; impressions: number; clicks: number; ctr: number; cpc: number; conversions: number; convValue: number; costPerConv: number | null }[];
    };
  };
  attributedRevenue: number;
  totals?: {
    bookings: number; paidBookings: number; revenue: number;
    adBookings: number; adRevenue: number; organicBookings: number; organicRevenue: number;
    byPlatform?: Record<"meta" | "google" | "tiktok" | "other", { bookings: number; revenue: number }>;
  };
  range?: { key: string; since: string; until: string };
  comments: { adName: string; platform: string; author: string; text: string; time: string; replyUrl: string | null }[];
  fbCommentsUnavailable?: boolean;
};

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "bg-pink-100 text-pink-700",
  Facebook: "bg-blue-100 text-blue-700",
  Meta: "bg-blue-100 text-blue-700",
  Google: "bg-amber-100 text-amber-800",
};

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function adLabel(notes: string): string {
  const m = notes.match(/utm:([a-z]+)(?:\/([^>,]+?))?(?:\s*>\s*([^,\]]+))?(?=[,\]]|$)/i);
  if (m) {
    const map: Record<string, string> = { ig: "Meta", instagram: "Meta", fb: "Meta", facebook: "Meta", meta: "Meta", google: "Google", tiktok: "TikTok", email: "Email" };
    const platform = map[m[1].toLowerCase()] || m[1];
    const base = platform.toLowerCase() === "email" ? "Email" : `${platform} Ad`;
    const parts = [m[2], m[3]].filter(Boolean).map((p) => safeDecode(p!.trim()).replace(/\+/g, " "));
    return parts.length ? `${base} · ${parts.join(" · ")}` : base;
  }
  if (notes.includes("Google Ad")) return "Google Ad";
  if (notes.includes("Facebook/Instagram")) return "Meta Ad";
  return "Meta Ad";
}

const fmt = (n: number) => `£${n.toFixed(2)}`;

function placementLabel(platform: string, position: string): string {
  const p = platform.charAt(0).toUpperCase() + platform.slice(1);
  const pos = position
    .replace(/^(instagram|facebook|threads)_?/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
  return pos && pos !== "Feed" ? `${p} ${pos}` : `${p} Feed`;
}

const PLATFORM_TABS: { id: "meta" | "google" | "other"; label: string; color: string }[] = [
  { id: "meta", label: "Facebook & Instagram", color: "bg-blue-600" },
  { id: "google", label: "Google", color: "bg-amber-500" },
  { id: "other", label: "Other sources", color: "bg-ink/40" },
];

export default function AdsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fixingTracking, setFixingTracking] = useState(false);
  const [trackingMsg, setTrackingMsg] = useState("");
  const [budgetEdits, setBudgetEdits] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"overview" | "meta" | "google" | "other">("overview");
  const [range, setRange] = useState("30d");

  async function load(r = range) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ads-insights?range=${r}`);
      setData(await res.json());
    } catch {
      setData(null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [range]);

  async function control(id: string, payload: { status?: string; dailyBudget?: number }) {
    setBusyId(id); setActionMsg("");
    try {
      const r = await fetch("/api/admin/ads-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const json = await r.json();
      if (!r.ok) setActionMsg(json.error || "Action failed");
      else await load();
    } catch {
      setActionMsg("Network error");
    }
    setBusyId(null);
  }

  async function fixTracking() {
    setFixingTracking(true); setTrackingMsg("");
    try {
      const r = await fetch("/api/admin/ads-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixTracking: true }),
      });
      const json = await r.json();
      if (!r.ok) setTrackingMsg(json.error || "Couldn't turn on tracking");
      else {
        const names = (json.failed || []).map((f: { ad: string }) => f.ad);
        setTrackingMsg(
          names.length
            ? `Done for ${json.fixed} ad${json.fixed === 1 ? "" : "s"} — couldn't update: ${names.join(", ")} (set URL parameters on those in Ads Manager).`
            : `Done — campaign tracking is on for ${json.fixed} ad${json.fixed === 1 ? "" : "s"}. New clicks will show the campaign and ad name.`
        );
        await load();
      }
    } catch {
      setTrackingMsg("Network error");
    }
    setFixingTracking(false);
  }

  const maxSpend = Math.max(...(data?.daily || []).map((d) => d.spend), 0.01);
  const untrackedAds = (data?.manage?.ads || []).filter((a) => a.tracked === false && !["ARCHIVED", "DELETED"].includes(a.effectiveStatus));

  // Bookings/revenue filtered to the selected reporting window
  const rangeSince = data?.range?.since;
  const rangeBookings = (data?.adBookings || []).filter((b) => !rangeSince || (b.created_at || "") >= rangeSince);
  const paidInRange = rangeBookings.filter((b) => b.payment_status === "paid");
  const rangeRevenue = paidInRange.reduce((s, b) => s + Number(b.total_price), 0);
  const rangeLabel = range === "today" ? "today" : range === "7d" ? "last 7 days" : range === "90d" ? "last 90 days" : "last 30 days";

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.6rem] md:text-[2rem]">Ads</h1>
          <p className="text-ink-soft text-[0.9rem] mt-1">Live Meta &amp; Google ads performance and the bookings they generated.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-white rounded-full p-1 shadow-sm">
            {[["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"]].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={`px-3.5 py-1.5 rounded-full text-[0.78rem] font-medium transition-all ${range === k ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/[0.05]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <a href="/dashboard/marketing" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-bright-lavender to-sky-blue-light text-white font-semibold text-[0.85rem] hover:opacity-90 transition-opacity shadow-sm">
            + Create a new ad
          </a>
        </div>
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

          {/* Smart alerts */}
          {data.alerts?.length > 0 && (
            <div className="space-y-2 mb-8">
              {data.alerts.map((a, i) => (
                <div key={i} className={`rounded-xl px-4 py-3 text-[0.85rem] ${a.level === "warning" ? "bg-red-50 border border-red-200 text-red-800" : "bg-blue-50 border border-blue-200 text-blue-800"}`}>
                  {a.level === "warning" ? "⚠️ " : "ℹ️ "}{a.message}
                </div>
              ))}
            </div>
          )}

          {/* Verdict banner — are the ads working? */}
          {(() => {
            const metaSpend = data.summary.month.spend;
            const googleSpend = data.google?.api?.connected ? data.google.api.spend : 0;
            const spend = metaSpend + googleSpend;
            // Prefer the uncapped server-side totals — data.adBookings is
            // capped at ~100 rows for display and undercounts busy windows.
            const revenue = data.totals?.adRevenue ?? rangeRevenue;
            const bookings = data.totals?.adBookings ?? paidInRange.length;
            const roas = spend > 0 ? revenue / spend : null;
            const costPerBooking = bookings > 0 ? spend / bookings : null;
            const metaRev = data.totals?.byPlatform?.meta.revenue ?? paidInRange.filter((b) => b.platform === "meta").reduce((s, b) => s + Number(b.total_price), 0);
            const googleRev = data.totals?.byPlatform?.google.revenue ?? paidInRange.filter((b) => b.platform === "google").reduce((s, b) => s + Number(b.total_price), 0);
            const liveMeta = [...data.manage.campaigns, ...data.manage.adsets].some((e) => e.effectiveStatus === "ACTIVE");
            const liveGoogle = (data.google?.api?.campaigns || []).some((c) => c.status === "ENABLED");
            const anyLive = liveMeta || liveGoogle;

            let verdict: string;
            let verdictSub = "";
            if (spend > 0) {
              if (revenue === 0) {
                verdict = `£${spend.toFixed(0)} spent — no bookings from ads yet`;
                verdictSub = "Either nobody's converting or tracking missed them. If it stays at zero after a few more days of spend, pause and rethink.";
              } else if (roas && roas >= 2) {
                verdict = `Yes — ads are working. Every £1 spent made £${roas.toFixed(2)}`;
                verdictSub = "Profitable. Safe to raise budgets if you want more volume.";
              } else if (roas && roas >= 1) {
                verdict = `Breaking even — £1 in, £${roas.toFixed(2)} back`;
                verdictSub = "Covering costs but barely. Better creative or tighter targeting would push it profitable.";
              } else {
                verdict = `Losing money — £${spend.toFixed(0)} spent, £${revenue.toFixed(0)} booked back`;
                verdictSub = "Consider pausing the weakest campaign below and reworking the ad.";
              }
            } else {
              verdict = anyLive ? "Ads are live — results appear as people click and book" : "No ads spending right now";
              verdictSub = anyLive ? "" : "Launch from Marketing, or resume a paused campaign.";
            }

            const platformLine = [
              metaSpend > 0 || metaRev > 0 ? `Meta: ${fmt(metaSpend)} spent → ${fmt(metaRev)} booked` : null,
              googleSpend > 0 || googleRev > 0 ? `Google: ${fmt(googleSpend)} spent → ${fmt(googleRev)} booked` : null,
            ].filter(Boolean).join("   ·   ");

            return (
              <div className="rounded-[20px] p-6 md:p-8 mb-8 text-white bg-gradient-to-br from-[#ff2d78] via-[#a855f7] to-[#38bdf8] shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${anyLive ? "bg-green-300" : "bg-white/40"}`} />
                  <span className="text-[0.8rem] font-semibold uppercase tracking-wider text-white/90">
                    {anyLive ? "Ads running" : "Nothing running"}
                  </span>
                </div>
                <div className="font-display text-[1.4rem] md:text-[1.8rem] leading-tight mb-1">{verdict}</div>
                {verdictSub && <div className="text-white/85 text-[0.85rem] mb-4 max-w-[36rem]">{verdictSub}</div>}
                {platformLine && <div className="text-white/75 text-[0.78rem] mb-5">{platformLine}</div>}
                <div className="flex gap-6 md:gap-10 flex-wrap">
                  <div>
                    <div className="text-[0.7rem] uppercase tracking-wider text-white/80">Spent · {rangeLabel}</div>
                    <div className="font-display text-[1.5rem]">{fmt(spend)}</div>
                  </div>
                  <div>
                    <div className="text-[0.7rem] uppercase tracking-wider text-white/80">Booked from ads</div>
                    <div className="font-display text-[1.5rem]">{fmt(revenue)}</div>
                  </div>
                  <div>
                    <div className="text-[0.7rem] uppercase tracking-wider text-white/80">Paid bookings</div>
                    <div className="font-display text-[1.5rem]">{bookings}</div>
                  </div>
                  <div>
                    <div className="text-[0.7rem] uppercase tracking-wider text-white/80">Cost per booking</div>
                    <div className="font-display text-[1.5rem]">{costPerBooking ? fmt(costPerBooking) : "—"}</div>
                  </div>
                </div>
                <div className="text-white/60 text-[0.7rem] mt-4">Only counts bookings proven to come from an ad click — real return is at least this.</div>
              </div>
            );
          })()}

          {/* Platform tabs */}
          <div className="flex gap-2 flex-wrap mb-8">
            {[{ id: "overview" as const, label: "Overview" }, ...PLATFORM_TABS].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as "overview" | "meta" | "google" | "other")}
                className={`px-4 py-2 rounded-full text-[0.85rem] font-medium transition-all ${tab === t.id ? "bg-ink text-white shadow-sm" : "bg-white text-ink hover:bg-ink/[0.04] shadow-sm"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ===== OVERVIEW TAB ===== */}
          {tab === "overview" && (
            <>
              <div className="grid md:grid-cols-3 gap-4 md:gap-5 mb-8">
                {PLATFORM_TABS.map((t) => {
                  const rows = rangeBookings.filter((b) => b.platform === t.id || (t.id === "other" && b.platform === "tiktok"));
                  // Uncapped per-platform counts from the server — rows is
                  // capped at ~100 for display. Counts paid bookings only.
                  const plat = data.totals?.byPlatform;
                  const bookings = plat
                    ? (t.id === "other" ? plat.other.bookings + plat.tiktok.bookings : plat[t.id].bookings)
                    : rows.filter((b) => b.payment_status === "paid").length;
                  const revenue = plat
                    ? (t.id === "other" ? plat.other.revenue + plat.tiktok.revenue : plat[t.id].revenue)
                    : rows.filter((b) => b.payment_status === "paid").reduce((s, b) => s + Number(b.total_price), 0);
                  const isMeta = t.id === "meta";
                  const isGoogle = t.id === "google";
                  const spend = isMeta ? data.summary.month.spend : isGoogle && data.google?.api?.connected ? data.google.api.spend : 0;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id as "meta" | "google" | "other")} className="bg-white rounded-[20px] p-6 shadow-sm text-left hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                        <span className="text-[0.75rem] text-ink-soft uppercase tracking-wider font-semibold">{t.label}</span>
                      </div>
                      <div className="font-display text-[1.6rem]">{fmt(revenue)}</div>
                      <div className="text-[0.8rem] text-ink-soft">
                        {bookings} booking{bookings === 1 ? "" : "s"} · {rangeLabel}
                        {spend > 0 && ` · ${fmt(spend)} spent`}
                      </div>
                    </button>
                  );
                })}
              </div>
              {data.totals && (
                <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm mb-8">
                  <h2 className="font-display text-[1.1rem] mb-1">Ads vs. everything else</h2>
                  <p className="text-[0.75rem] text-ink-soft mb-5">All paid bookings {rangeLabel} — would these customers have booked anyway?</p>
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <div className="rounded-xl px-4 py-3 bg-ink/[0.03]">
                      <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider">All paid bookings</div>
                      <div className="font-display text-[1.5rem]">{data.totals.paidBookings}</div>
                      <div className="text-[0.75rem] text-ink-soft">{fmt(data.totals.revenue)}</div>
                    </div>
                    <div className="rounded-xl px-4 py-3 bg-pink-50">
                      <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider">From ads</div>
                      <div className="font-display text-[1.5rem]">{data.totals.adBookings}</div>
                      <div className="text-[0.75rem] text-ink-soft">{fmt(data.totals.adRevenue)}</div>
                    </div>
                    <div className="rounded-xl px-4 py-3 bg-green-50">
                      <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Organic / other</div>
                      <div className="font-display text-[1.5rem]">{data.totals.organicBookings}</div>
                      <div className="text-[0.75rem] text-ink-soft">{fmt(data.totals.organicRevenue)}</div>
                    </div>
                  </div>
                  {data.totals.paidBookings > 0 && (
                    <div>
                      <div className="h-3 rounded-full overflow-hidden flex bg-ink/[0.06]">
                        <div className="bg-gradient-to-r from-[#ff2d78] to-[#a855f7]" style={{ width: `${(data.totals.adBookings / data.totals.paidBookings) * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-[0.72rem] text-ink-soft mt-2">
                        <span><strong className="text-ink">{Math.round((data.totals.adBookings / data.totals.paidBookings) * 100)}%</strong> of bookings traceable to an ad click</span>
                        <span>{Math.round((data.totals.organicBookings / data.totals.paidBookings) * 100)}% walked in without an ad</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <BookingsCard
                bookings={rangeBookings}
                title={`All bookings from ads — ${rangeLabel}`}
                note="Every booking that came in tagged from an ad click — Meta, Google, or any other tracked source."
              />
            </>
          )}

          {/* ===== META TAB ===== */}
          {tab === "meta" && (<>
          {/* Headline stats — selected range */}
          {(() => {
            const metaBookingCount = data.totals?.byPlatform?.meta.bookings
              ?? rangeBookings.filter((b) => b.platform === "meta" && b.payment_status === "paid").length;
            const metaRangeRev = data.totals?.byPlatform?.meta.revenue
              ?? rangeBookings.filter((b) => b.platform === "meta" && b.payment_status === "paid").reduce((s, b) => s + Number(b.total_price), 0);
            const metaSpend = data.summary.month.spend;
            return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-8">
            <div className="bg-white rounded-[20px] p-6 shadow-sm border-l-4 border-red-400">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Ad Spend · {rangeLabel}</div>
              <div className="font-display text-[1.8rem]">{fmt(metaSpend)}</div>
              <div className="text-[0.75rem] text-ink-soft mt-1">Today: {fmt(data.summary.today.spend)} <Delta value={data.deltas?.spend} invert /></div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm border-l-4 border-green-400">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Meta Booking Revenue</div>
              <div className="font-display text-[1.8rem] text-green-600">{fmt(metaRangeRev)}</div>
              <div className="text-[0.75rem] text-ink-soft mt-1">{metaBookingCount} ad bookings <Delta value={data.deltas?.purchases} /></div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm border-l-4 border-bright-lavender">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Return on Spend</div>
              <div className="font-display text-[1.8rem]">
                {metaSpend > 0 ? `${(metaRangeRev / metaSpend).toFixed(1)}x` : "--"}
              </div>
              <div className="text-[0.75rem] text-ink-soft mt-1">revenue ÷ spend</div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm border-l-4 border-sky-blue-light">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Cost per Booking</div>
              <div className="font-display text-[1.8rem]">
                {metaBookingCount > 0 ? fmt(metaSpend / metaBookingCount) : "--"}
              </div>
              <div className="text-[0.75rem] text-ink-soft mt-1">Meta reported: {data.summary.month.purchases}</div>
            </div>
          </div>
            );
          })()}

          {/* Campaign tracking — without url_tags clicks only record "Meta Ad" */}
          {(untrackedAds.length > 0 || trackingMsg) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-8 flex items-start justify-between gap-4 flex-wrap">
              <div className="text-[0.85rem] text-amber-900">
                <div className="font-semibold mb-0.5">Campaign tracking {untrackedAds.length > 0 ? `is off for ${untrackedAds.length} ad${untrackedAds.length === 1 ? "" : "s"}` : "update"}</div>
                {untrackedAds.length > 0 &&
                  `Clicks from ${untrackedAds.map((a) => `"${a.name}"`).join(", ")} only record "Meta Ad" — no campaign or ad name. Turn it on and future bookings will show exactly which ad brought each customer.`}
                {trackingMsg && <div className="mt-1 font-medium">{trackingMsg}</div>}
              </div>
              {untrackedAds.length > 0 && (
                <button
                  onClick={fixTracking}
                  disabled={fixingTracking}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-[0.8rem] font-semibold hover:bg-amber-700 disabled:opacity-50 flex-shrink-0"
                >
                  {fixingTracking ? "Turning on..." : "Turn on campaign tracking"}
                </button>
              )}
            </div>
          )}

          {/* What your ads look like — visual first */}
          {data.adPreviews?.length > 0 && (
            <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm mb-8">
              <h2 className="font-display text-[1.1rem] mb-5">What your ads look like</h2>
              <div className="grid md:grid-cols-2 gap-5">
                {data.adPreviews.map((p, i) => (
                  <div key={i} className="border border-ink/[0.08] rounded-2xl overflow-hidden">
                    {p.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail} alt="" className="w-full h-44 object-cover" />
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-[0.85rem]">{p.name}</span>
                        <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${p.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-ink/[0.08] text-ink-soft"}`}>{p.status === "ACTIVE" ? "Live" : p.status}</span>
                        <span className="text-[0.6rem] bg-ink/[0.06] text-ink-soft px-1.5 py-0.5 rounded-full">{p.kind}</span>
                      </div>
                      {p.headline && <div className="text-[0.9rem] font-medium">{p.headline}</div>}
                      {p.body && <div className="text-[0.75rem] text-ink-soft mt-1 line-clamp-3">{p.body}</div>}
                      {p.link && <div className="text-[0.7rem] text-sky-blue-light mt-2 truncate">→ {p.link}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily trend */}
          {data.daily.length > 0 && (
            <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8">
              <h2 className="font-display text-[1.1rem] mb-6">Daily — {rangeLabel}</h2>
              <div className="flex items-end gap-[3px] h-32">
                {data.daily.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0" title={`${d.date}: ${fmt(d.spend)} · ${d.clicks} clicks · ${d.purchases} bookings`}>
                    {d.purchases > 0 && <span className="text-[0.6rem] font-medium text-green-600 leading-none">{d.purchases}🎉</span>}
                    <div className={`w-full rounded-t ${d.spend > 0 ? "bg-gradient-to-t from-bright-lavender to-sky-blue-light" : "bg-ink/[0.06]"}`} style={{ height: `${Math.max((d.spend / maxSpend) * 96, 2)}px` }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[0.65rem] text-ink-soft mt-2">
                <span>{data.daily[0]?.date}</span>
                <span>bars = spend · 🎉 = bookings that day</span>
                <span>{data.daily[data.daily.length - 1]?.date}</span>
              </div>
            </div>
          )}

          {/* Funnel */}
          <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8">
            <h2 className="font-display text-[1.1rem] mb-6">Funnel — {rangeLabel}</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <FunnelStat label="Reached" value={data.summary.month.reach} />
              <FunnelStat label="Impressions" value={data.summary.month.impressions} />
              <FunnelStat label="Clicks" value={data.summary.month.clicks} />
              <FunnelStat label="Page Views" value={data.summary.month.lpv} />
              <FunnelStat label="Purchases" value={data.summary.month.purchases} highlight />
            </div>
            <div className="text-[0.75rem] text-ink-soft mt-4 space-y-1">
              <div>
                7 days: {fmt(data.summary.week.spend)} spend · {data.summary.week.clicks} clicks · {data.summary.week.purchases} purchases
                {(data.summary.month.frequency || 0) > 0 && ` · each person sees your ads ~${(data.summary.month.frequency || 0).toFixed(1)}×`}
              </div>
              {(data.summary.month.purchaseValue || 0) > 0 && (
                <div>
                  Meta estimates {fmt(data.summary.month.purchaseValue || 0)} in purchases — {data.attributionSplit?.clicked ?? 0} from people who clicked · {data.attributionSplit?.sawOnly ?? 0} from people who only saw the ad
                </div>
              )}
            </div>
          </div>

          {/* Audience breakdown */}
          {(data.audience?.ageGender?.length > 0 || data.audience?.regions?.length > 0) && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-[20px] p-8 shadow-sm">
                <h2 className="font-display text-[1.1rem] mb-1">Who's seeing your ads</h2>
                <p className="text-[0.75rem] text-ink-soft mb-5">Age &amp; gender · {rangeLabel} · 🎉 = bookings</p>
                <div className="space-y-2.5">
                  {data.audience.ageGender.map((r) => {
                    const max = data.audience.ageGender[0]?.impressions || 1;
                    return (
                      <div key={`${r.age}-${r.gender}`}>
                        <div className="flex justify-between text-[0.8rem] mb-1">
                          <span className="font-medium">{r.age} · {r.gender === "female" ? "Women" : r.gender === "male" ? "Men" : "Other"}</span>
                          <span className="text-ink-soft">{r.impressions.toLocaleString()} views{r.purchases > 0 ? ` · ${r.purchases}🎉` : ""}</span>
                        </div>
                        <div className="h-2 bg-ink/[0.06] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-bright-lavender to-sky-blue-light" style={{ width: `${(r.impressions / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white rounded-[20px] p-8 shadow-sm">
                <h2 className="font-display text-[1.1rem] mb-1">Where they're seeing them</h2>
                <p className="text-[0.75rem] text-ink-soft mb-5">Regions · {rangeLabel}</p>
                <div className="space-y-2.5">
                  {data.audience.regions.map((r) => {
                    const max = data.audience.regions[0]?.impressions || 1;
                    return (
                      <div key={r.region}>
                        <div className="flex justify-between text-[0.8rem] mb-1">
                          <span className="font-medium truncate mr-2">{r.region}</span>
                          <span className="text-ink-soft flex-shrink-0">{r.impressions.toLocaleString()} views · {fmt(r.spend)}</span>
                        </div>
                        <div className="h-2 bg-ink/[0.06] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-bright-lavender to-sky-blue-light" style={{ width: `${(r.impressions / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {data.audience.regions.length === 0 && <div className="text-ink-soft text-[0.85rem]">No region data yet.</div>}
                </div>
                {data.devices?.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-ink/[0.08]">
                    <h3 className="font-display text-[0.9rem] mb-3">Devices</h3>
                    <div className="space-y-2">
                      {data.devices.map((d) => {
                        const max = data.devices[0]?.impressions || 1;
                        return (
                          <div key={d.device}>
                            <div className="flex justify-between text-[0.8rem] mb-1">
                              <span className="font-medium capitalize">{d.device.replace(/_/g, " ")}</span>
                              <span className="text-ink-soft">{d.impressions.toLocaleString()} views{d.purchases > 0 ? ` · ${d.purchases}🎉` : ""}</span>
                            </div>
                            <div className="h-2 bg-ink/[0.06] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-bright-lavender" style={{ width: `${(d.impressions / max) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Where ads appear — placements */}
          {data.audience?.placements?.length > 0 && (
            <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8">
              <h2 className="font-display text-[1.1rem] mb-1">Where your ads appear</h2>
              <p className="text-[0.75rem] text-ink-soft mb-5">{rangeLabel} · 🎉 = purchases Meta attributes to that placement</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.85rem]">
                  <thead>
                    <tr className="text-left text-[0.7rem] text-ink-soft uppercase tracking-wider border-b border-ink/[0.08]">
                      <th className="pb-2 pr-4">Placement</th>
                      <th className="pb-2 pr-4 text-right">Views</th>
                      <th className="pb-2 pr-4 text-right">Clicks</th>
                      <th className="pb-2 pr-4 text-right">Click rate</th>
                      <th className="pb-2 pr-4 text-right">Spend</th>
                      <th className="pb-2 text-right">Bookings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.audience.placements.map((p) => (
                      <tr key={`${p.platform}-${p.position}`} className="border-b border-ink/[0.05] last:border-0">
                        <td className="py-2.5 pr-4 font-medium">{placementLabel(p.platform, p.position)}</td>
                        <td className="py-2.5 pr-4 text-right">{p.impressions.toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-right">{p.clicks}</td>
                        <td className="py-2.5 pr-4 text-right">{p.impressions > 0 ? `${((p.clicks / p.impressions) * 100).toFixed(1)}%` : "—"}</td>
                        <td className="py-2.5 pr-4 text-right">{fmt(p.spend)}</td>
                        <td className="py-2.5 text-right">{p.purchases > 0 ? `${p.purchases} 🎉` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Manage campaigns */}
          <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8">
            <h2 className="font-display text-[1.1rem] mb-2">Manage</h2>
            <p className="text-[0.8rem] text-ink-soft mb-5">Pause or resume campaigns and ad sets, and edit daily budgets — no need to open Ads Manager.</p>
            {actionMsg && <div className="text-[0.8rem] text-red-600 mb-4">{actionMsg}</div>}
            {[...data.manage.campaigns.map((c) => ({ ...c, kind: "Campaign" })), ...data.manage.adsets.map((a) => ({ ...a, kind: "Ad set" }))].map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-ink/[0.06] last:border-0 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[0.9rem] truncate">{e.name}</span>
                    <span className="text-[0.6rem] bg-ink/[0.06] text-ink-soft px-1.5 py-0.5 rounded-full">{e.kind}</span>
                    <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${e.effectiveStatus === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-ink/[0.08] text-ink-soft"}`}>
                      {e.effectiveStatus === "ACTIVE" ? "Live" : e.effectiveStatus}
                    </span>
                  </div>
                  {"campaignName" in e && e.campaignName && <div className="text-[0.7rem] text-ink-soft">{e.campaignName}</div>}
                  {e.targeting && <div className="text-[0.7rem] text-ink-soft">🎯 {e.targeting}{e.optimisesFor ? ` · optimising for ${e.optimisesFor === "PURCHASE" ? "Purchases" : e.optimisesFor}` : ""}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {e.dailyBudget != null && (
                    <span className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={budgetEdits[e.id] ?? `£${e.dailyBudget.toFixed(2)}`}
                        onChange={(ev) => setBudgetEdits({ ...budgetEdits, [e.id]: ev.target.value })}
                        className="w-20 px-2 py-1 border border-ink/15 rounded-lg text-[0.75rem] text-right"
                      />
                      {budgetEdits[e.id] && budgetEdits[e.id] !== `£${e.dailyBudget.toFixed(2)}` && (
                        <button
                          onClick={() => control(e.id, { dailyBudget: parseFloat(budgetEdits[e.id].replace(/[^0-9.]/g, "")) })}
                          disabled={busyId === e.id}
                          className="text-[0.7rem] text-sky-blue-light hover:underline disabled:opacity-50"
                        >
                          Save
                        </button>
                      )}
                    </span>
                  )}
                  <button
                    onClick={() => control(e.id, { status: e.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })}
                    disabled={busyId === e.id}
                    className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-medium disabled:opacity-50 ${e.status === "ACTIVE" ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                  >
                    {busyId === e.id ? "..." : e.status === "ACTIVE" ? "Pause" : "Resume"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Campaigns / ad sets / ads breakdown */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <BreakdownCard title="Campaigns" rows={data.campaigns} />
            <BreakdownCard title="Ad Sets" rows={data.adsets} />
            <BreakdownCard title="Ads" rows={data.ads} showThumb />
          </div>

          {/* Comments on ads */}
          <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8">
            <h2 className="font-display text-[1.1rem] mb-2">Comments on your ads</h2>
            <p className="text-[0.75rem] text-ink-soft mb-5">
              Questions people leave on your ads — answering them wins bookings. Reply on Facebook/Instagram.
            </p>
            {data.fbCommentsUnavailable && (
              <div className="text-[0.75rem] text-orange-600 bg-orange-50 rounded-lg px-3 py-2 mb-4">
                Facebook comments unavailable — the Facebook Page needs assigning to the API system user in Business Settings.
              </div>
            )}
            {data.comments.length === 0 ? (
              <div className="text-center py-8 text-ink-soft text-[0.9rem]">No comments on your ads yet.</div>
            ) : (
              <div className="space-y-3">
                {data.comments.map((cm, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-ink/[0.06] last:border-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[0.85rem]">{cm.author}</span>
                        <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${cm.platform === "Instagram" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>{cm.platform}</span>
                        <span className="text-[0.65rem] text-ink-soft">on {cm.adName}</span>
                      </div>
                      <div className="text-[0.85rem] text-ink mt-0.5">{cm.text}</div>
                      <div className="text-[0.7rem] text-ink-soft">{cm.time ? new Date(cm.time).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                    </div>
                    {cm.replyUrl && (
                      <a href={cm.replyUrl} target="_blank" rel="noreferrer" className="text-[0.75rem] text-sky-blue-light hover:underline flex-shrink-0">Reply →</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meta bookings */}
          <BookingsCard
            bookings={rangeBookings.filter((b) => b.platform === "meta")}
            title="Bookings from Facebook & Instagram ads"
            note="Real bookings from your database — the accurate count. Ads Manager may show fewer purchases because Meta can't always connect a booking back to the original click."
          />
          </>)}

          {/* ===== GOOGLE TAB ===== */}
          {tab === "google" && (<>
          <GoogleApiSection api={data.google?.api} onChanged={load} rangeLabel={rangeLabel} />
          {data.google && (
            <div className="bg-white rounded-[20px] p-8 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div>
                  <h2 className="font-display text-[1.1rem] mb-1">Google Ads</h2>
                  <p className="text-[0.75rem] text-ink-soft">
                    Conversion tracking for Google ad campaigns.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[0.7rem] px-2.5 py-1 rounded-full font-medium ${data.google.tagEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    Tag {data.google.tagEnabled ? "live" : "off"}{data.google.tagId ? ` · ${data.google.tagId}` : ""}
                  </span>
                  <span className="text-[0.7rem] px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                    Purchase conversion wired
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl px-4 py-3 bg-ink/[0.03]">
                  <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Ad-attributed sales</div>
                  <div className="font-display text-[1.4rem]">{data.google.conversions}</div>
                </div>
                <div className="rounded-xl px-4 py-3 bg-green-50">
                  <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Revenue</div>
                  <div className="font-display text-[1.4rem] text-green-600">{fmt(data.google.revenue)}</div>
                </div>
              </div>

              {data.google.items.length > 0 ? (
                <div className="space-y-2 mb-6">
                  {data.google.items.map((i) => (
                    <div key={`${i.kind}-${i.id}`} className="flex items-center justify-between gap-3 py-2 border-b border-ink/[0.06] last:border-0 text-[0.85rem]">
                      <div className="min-w-0">
                        <span className="font-medium">{i.name}</span>
                        <span className="ml-2 text-[0.6rem] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-medium">{i.kind}</span>
                        <div className="text-[0.72rem] text-ink-soft truncate">{i.email} · {new Date(i.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                      <div className="font-medium flex-shrink-0">£{i.value.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-ink-soft text-[0.85rem] mb-4">
                  No Google ad-attributed sales yet — they'll appear here automatically when someone clicks a Google ad and buys.
                </div>
              )}

              <div className="border-t border-ink/[0.08] pt-4">
                <p className="text-[0.75rem] text-ink-soft">
                  <strong>Note:</strong> spend, clicks and impressions from Google Ads need an API connection (developer token + OAuth). Conversions are already tracked — this panel shows real sales attributed to Google ads from your own data.
                </p>
              </div>
            </div>
          )}
          <BookingsCard
            bookings={rangeBookings.filter((b) => b.platform === "google")}
            title="Bookings from Google ads"
            note="Customers who clicked a Google ad (gclid tracked) and then booked or bought."
          />
          </>)}

          {/* ===== OTHER TAB ===== */}
          {tab === "other" && (
            <>
              <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8">
                <h2 className="font-display text-[1.1rem] mb-2">Other tracked sources</h2>
                <p className="text-[0.85rem] text-ink-soft leading-relaxed">
                  Any booking tagged with a source that isn&apos;t Meta or Google lands here — TikTok, Snapchat, newsletter links, or anything with a tracking parameter in the URL.
                  {data.adBookings.filter((b) => b.platform === "tiktok").length > 0 && " TikTok bookings are being picked up."}
                </p>
                <p className="text-[0.8rem] text-ink-soft mt-3">
                  Tip: add <code className="bg-ink/[0.06] px-1.5 py-0.5 rounded">?utm_source=tiktok</code> (or newsletter, poster, etc.) to any link you share and bookings from it will show up here.
                </p>
              </div>
              <BookingsCard
                bookings={rangeBookings.filter((b) => b.platform === "other" || b.platform === "tiktok")}
                title="Bookings from other sources"
                note="Bookings tagged with a non-Meta, non-Google source."
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function BookingsCard({ bookings, title, note }: { bookings: AdBooking[]; title: string; note: string }) {
  return (
    <div className="bg-white rounded-[20px] p-8 shadow-sm">
      <h2 className="font-display text-[1.1rem] mb-2">{title}</h2>
      <p className="text-[0.75rem] text-ink-soft mb-6">{note}</p>
      {bookings.length === 0 ? (
        <div className="text-center py-8 text-ink-soft text-[0.9rem]">No bookings attributed yet.</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 py-2 border-b border-ink/[0.06] last:border-0 flex-wrap">
              <div className="min-w-0">
                <span className="font-medium text-[0.9rem]">{b.name}</span>
                {b.kind === "event" && <span className="ml-2 text-[0.6rem] bg-bright-lavender/20 text-ink px-1.5 py-0.5 rounded-full font-medium">Event</span>}
                <span className={`ml-2 text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${PLATFORM_COLORS[adLabel(b.notes).split(" ")[0]] || "bg-blue-100 text-blue-700"}`}>
                  {adLabel(b.notes)}
                </span>
                <div className="text-[0.75rem] text-ink-soft">{b.email} · session {new Date(b.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · booked {new Date(b.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
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
  );
}

function GoogleApiSection({ api, onChanged, rangeLabel }: { api?: NonNullable<Data["google"]>["api"]; onChanged: () => void; rangeLabel: string }) {
  const [cfg, setCfg] = useState<{ hasClientId: boolean; hasClientSecret: boolean; hasDevToken: boolean; customerId: string | null; loginCustomerId: string | null; connected: boolean; redirectUri?: string } | null>(null);
  const [form, setForm] = useState({ clientId: "", clientSecret: "", devToken: "", customerId: "", loginCustomerId: "" });
  const [msg, setMsg] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    fetch("/api/admin/google-ads").then((r) => r.ok ? r.json() : null).then((j) => j && setCfg(j));
    const p = new URLSearchParams(window.location.search);
    if (p.get("g") === "connected") setFlash("Google Ads connected — your stats are loading in.");
    if (p.get("gerr")) setFlash(`Connection failed: ${p.get("gerr")}`);
  }, []);

  // The URI the OAuth flow actually sends (server-authoritative). Before the
  // config loads, guess from the current origin — usually the canonical domain.
  const redirectUri = cfg?.redirectUri || `${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/google-ads/callback`;
  const canConnect = cfg?.hasClientId && cfg?.hasClientSecret && cfg?.hasDevToken;

  async function saveCredentials() {
    setMsg("");
    const res = await fetch("/api/admin/google-ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        google_ads_client_id: form.clientId || undefined,
        google_ads_client_secret: form.clientSecret || undefined,
        google_ads_dev_token: form.devToken || undefined,
        google_ads_customer_id: form.customerId || undefined,
        google_ads_login_customer_id: form.loginCustomerId || undefined,
      }),
    });
    setMsg(res.ok ? "Saved — now click Connect Google Ads" : "Failed to save");
    fetch("/api/admin/google-ads").then((r) => r.ok ? r.json() : null).then((j) => j && setCfg(j));
  }

  const maxSpend = Math.max(...(api?.daily || []).map((d) => d.spend), 0.01);

  return (
    <>
      {flash && <div className="rounded-xl px-4 py-3 text-[0.85rem] mb-6 bg-blue-50 border border-blue-200 text-blue-800">{flash}</div>}

      {api?.connected ? (
        <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div>
              <h2 className="font-display text-[1.1rem] mb-1">Google Ads — live account data</h2>
              <p className="text-[0.75rem] text-ink-soft">Spend, views and clicks straight from your Google Ads account · {rangeLabel}.</p>
            </div>
            <button
              onClick={async () => { await fetch("/api/admin/google-ads", { method: "DELETE" }); onChanged(); }}
              className="text-[0.75rem] text-red-500 hover:underline"
            >
              Disconnect
            </button>
          </div>
          {api.error ? (
            <div className="rounded-xl px-4 py-3 text-[0.85rem] bg-red-50 border border-red-200 text-red-800">
              Couldn&apos;t load Google Ads data: {api.error}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="rounded-xl px-4 py-3 bg-red-50"><div className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Spend</div><div className="font-display text-[1.4rem]">{fmt(api.spend)}</div></div>
                <div className="rounded-xl px-4 py-3 bg-ink/[0.03]"><div className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Views</div><div className="font-display text-[1.4rem]">{api.impressions.toLocaleString()}</div></div>
                <div className="rounded-xl px-4 py-3 bg-ink/[0.03]"><div className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Clicks</div><div className="font-display text-[1.4rem]">{api.clicks.toLocaleString()}</div></div>
                <div className="rounded-xl px-4 py-3 bg-ink/[0.03]"><div className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Click rate</div><div className="font-display text-[1.4rem]">{(api.ctr * 100).toFixed(1)}%</div></div>
                <div className="rounded-xl px-4 py-3 bg-green-50"><div className="text-[0.7rem] text-ink-soft uppercase tracking-wider">Conversions</div><div className="font-display text-[1.4rem] text-green-600">{api.conversions?.toFixed(0) ?? 0}</div></div>
              </div>
              {api.daily.length > 0 && (
                <div className="flex items-end gap-[3px] h-24 mb-6">
                  {api.daily.map((d) => (
                    <div key={d.date} className="flex-1 min-w-0" title={`${d.date}: ${fmt(d.spend)} · ${d.clicks} clicks`}>
                      <div className={`w-full rounded-t ${d.spend > 0 ? "bg-amber-400" : "bg-ink/[0.06]"}`} style={{ height: `${Math.max((d.spend / maxSpend) * 90, 2)}px` }} />
                    </div>
                  ))}
                </div>
              )}
              {api.campaigns.length > 0 && (
                <div className="overflow-x-auto mb-6">
                  <h3 className="font-display text-[0.95rem] mb-3">Campaigns</h3>
                  <table className="w-full text-[0.85rem]">
                    <thead>
                      <tr className="text-left text-[0.7rem] text-ink-soft uppercase tracking-wider border-b border-ink/[0.08]">
                        <th className="pb-2 pr-4">Campaign</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2 pr-4 text-right">£/day</th>
                        <th className="pb-2 pr-4 text-right">Views</th>
                        <th className="pb-2 pr-4 text-right">Clicks</th>
                        <th className="pb-2 pr-4 text-right">CTR</th>
                        <th className="pb-2 pr-4 text-right">Per click</th>
                        <th className="pb-2 pr-4 text-right">Spend</th>
                        <th className="pb-2 pr-4 text-right">Conv.</th>
                        <th className="pb-2 text-right">£/conv</th>
                      </tr>
                    </thead>
                    <tbody>
                      {api.campaigns.map((c) => (
                        <tr key={c.name} className="border-b border-ink/[0.05] last:border-0">
                          <td className="py-2.5 pr-4 font-medium">{c.name}</td>
                          <td className="py-2.5 pr-4"><span className={`text-[0.65rem] px-1.5 py-0.5 rounded-full font-medium ${c.status === "ENABLED" ? "bg-green-100 text-green-700" : "bg-ink/[0.08] text-ink-soft"}`}>{c.status === "ENABLED" ? "Live" : c.status}</span></td>
                          <td className="py-2.5 pr-4 text-right">{c.dailyBudget != null ? fmt(c.dailyBudget) : "—"}</td>
                          <td className="py-2.5 pr-4 text-right">{c.impressions.toLocaleString()}</td>
                          <td className="py-2.5 pr-4 text-right">{c.clicks.toLocaleString()}</td>
                          <td className="py-2.5 pr-4 text-right">{c.impressions > 0 ? `${(c.ctr * 100).toFixed(1)}%` : "—"}</td>
                          <td className="py-2.5 pr-4 text-right">{c.clicks > 0 ? fmt(c.cpc) : "—"}</td>
                          <td className="py-2.5 pr-4 text-right">{fmt(c.spend)}</td>
                          <td className="py-2.5 pr-4 text-right">{c.conversions > 0 ? c.conversions.toFixed(0) : "—"}</td>
                          <td className="py-2.5 text-right">{c.costPerConv != null ? fmt(c.costPerConv) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(api.ads || []).length > 0 && (
                <div className="overflow-x-auto">
                  <h3 className="font-display text-[0.95rem] mb-3">Individual ads — which ones work</h3>
                  <table className="w-full text-[0.85rem]">
                    <thead>
                      <tr className="text-left text-[0.7rem] text-ink-soft uppercase tracking-wider border-b border-ink/[0.08]">
                        <th className="pb-2 pr-4">Ad</th>
                        <th className="pb-2 pr-4">Campaign</th>
                        <th className="pb-2 pr-4 text-right">Views</th>
                        <th className="pb-2 pr-4 text-right">Clicks</th>
                        <th className="pb-2 pr-4 text-right">Per click</th>
                        <th className="pb-2 pr-4 text-right">Spend</th>
                        <th className="pb-2 text-right">Conversions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {api.ads.map((a, i) => (
                        <tr key={`${a.name}-${i}`} className="border-b border-ink/[0.05] last:border-0">
                          <td className="py-2.5 pr-4 font-medium">{a.name}</td>
                          <td className="py-2.5 pr-4 text-ink-soft text-[0.78rem]">{a.campaign}</td>
                          <td className="py-2.5 pr-4 text-right">{a.impressions.toLocaleString()}</td>
                          <td className="py-2.5 pr-4 text-right">{a.clicks.toLocaleString()}</td>
                          <td className="py-2.5 pr-4 text-right">{a.clicks > 0 ? fmt(a.cpc) : "—"}</td>
                          <td className="py-2.5 pr-4 text-right">{fmt(a.spend)}</td>
                          <td className="py-2.5 text-right">{a.conversions > 0 ? a.conversions.toFixed(0) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-6 pt-4 border-t border-ink/[0.08] space-y-3">
                <a href="https://ads.google.com/aw/campaigns" target="_blank" rel="noreferrer" className="inline-block text-[0.8rem] font-medium text-amber-600 hover:underline">
                  Pause / edit budgets in Google Ads →
                </a>
                <p className="text-[0.75rem] text-ink-soft leading-relaxed">
                  (Google&apos;s read-only access tier doesn&apos;t allow remote changes — upgrading to Standard access unlocks it later.)
                </p>
                <p className="text-[0.75rem] text-ink-soft leading-relaxed">
                  <strong>Attribution:</strong> bookings from Google and Meta ads show the campaign and ad name in the badge (e.g. <em>Meta Ad · Local Bookings - Sales · Slime Sessions — Book Online</em>) when ads pass <code className="bg-ink/[0.06] px-1 py-0.5 rounded">utm_campaign</code> / <code className="bg-ink/[0.06] px-1 py-0.5 rounded">utm_content</code> — set via Meta&apos;s <em>URL parameters</em> (url_tags) and Google&apos;s <em>tracking template</em>.
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8 border-2 border-amber-200">
          <h2 className="font-display text-[1.1rem] mb-1">Connect Google Ads</h2>
          <p className="text-[0.8rem] text-ink-soft mb-5">Three setup steps (done once) unlock live spend, views and clicks right here — bookings are already tracked.</p>

          <ol className="space-y-4 text-[0.85rem] mb-6">
            <li>
              <strong>1 · Free Manager account + developer token</strong> — API Center only exists in Manager accounts, so: go to <a href="https://ads.google.com/home/tools/manager-accounts/" target="_blank" rel="noreferrer" className="text-sky-blue-light hover:underline">ads.google.com → Manager accounts</a>, create one (free, 2 mins, nothing moves or gets billed), then in it: <em>Admin → API Center → apply for a developer token</em> (Basic access). Manager account&apos;s 10-digit ID goes in <em>Manager account ID</em> below.
            </li>
            <li>
              <strong>2 · OAuth app</strong> — at <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-sky-blue-light hover:underline">console.cloud.google.com</a>: create a project → <em>APIs &amp; Services → OAuth consent screen</em> (External, add yourself as a test user) → <em>Credentials → Create OAuth client ID → Web application</em> with this exact redirect:
              <div className="mt-1.5 bg-ink/[0.04] rounded-lg px-3 py-2 font-mono text-[0.75rem] break-all select-all">{redirectUri}</div>
            </li>
            <li>
              <strong>3 · Customer ID</strong> — the 10-digit number top-right of <em>your normal Google Ads account</em> (e.g. 123-456-7890) — the one that actually runs the ads. Then click <em>Connect</em> and approve.
            </li>
          </ol>

          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <input type="text" placeholder={`Client ID ${cfg?.hasClientId ? "(saved)" : ""}`} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50" />
            <input type="password" placeholder={`Client secret ${cfg?.hasClientSecret ? "(saved)" : ""}`} value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} className="px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50" />
            <input type="password" placeholder={`Developer token ${cfg?.hasDevToken ? "(saved)" : ""}`} value={form.devToken} onChange={(e) => setForm({ ...form, devToken: e.target.value })} className="px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50" />
            <input type="text" placeholder={`Ads customer ID ${cfg?.customerId ? `(saved: ${cfg.customerId})` : "(your ads account, e.g. 123-456-7890)"}`} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50" />
            <input type="text" placeholder={`Manager account ID ${cfg?.loginCustomerId ? `(saved: ${cfg.loginCustomerId})` : "(from step 1)"}`} value={form.loginCustomerId} onChange={(e) => setForm({ ...form, loginCustomerId: e.target.value })} className="px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50" />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={saveCredentials} className="px-5 py-2.5 rounded-xl bg-ink/[0.06] font-semibold text-[0.85rem] hover:bg-ink/[0.1]">Save details</button>
            <a
              href={canConnect ? "/api/admin/google-ads/connect" : undefined}
              className={`px-5 py-2.5 rounded-xl font-semibold text-[0.85rem] ${canConnect ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:opacity-90" : "bg-ink/[0.04] text-ink-soft pointer-events-none"}`}
            >
              Connect Google Ads →
            </a>
            {msg && <span className="text-[0.8rem] text-ink-soft">{msg}</span>}
          </div>
        </div>
      )}
    </>
  );
}

function Delta({ value, invert }: { value: number | null | undefined; invert?: boolean }) {
  if (value == null || value === 0) return null;
  const up = value > 0;
  const good = invert ? !up : up;
  return (
    <span className={`ml-1 font-medium ${good ? "text-green-600" : "text-red-500"}`}>
      {up ? "↑" : "↓"}{Math.abs(value) >= 1 ? `${(Math.abs(value) * 100).toFixed(0)}%` : Math.abs(value)} vs last wk
    </span>
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

function BreakdownCard({ title, rows, showThumb }: { title: string; rows: NamedRow[]; showThumb?: boolean }) {
  return (
    <div className="bg-white rounded-[20px] p-6 shadow-sm">
      <h2 className="font-display text-[1rem] mb-4">{title}</h2>
      {rows.length === 0 ? (
        <div className="text-ink-soft text-[0.85rem]">No data.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="flex items-start gap-3">
              {showThumb && r.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-[0.85rem]">
                  <span className="font-medium truncate mr-2">{r.name || "—"}</span>
                  <span className="text-ink-soft flex-shrink-0">{fmt(r.spend)}</span>
                </div>
                <div className="text-[0.72rem] text-ink-soft">
                  {r.clicks} clicks · {r.purchases} purchases{r.purchases > 0 ? ` · ${fmt(r.spend / r.purchases)}/booking` : ""}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {r.quality && (
                    <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${r.qualityGood ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      Meta rating: {r.quality}
                    </span>
                  )}
                  {r.video && (
                    <span className="text-[0.65rem] text-ink-soft">
                      ▶ {r.video.plays.toLocaleString()} plays · {r.video.completionRate}% watch to the end
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
