"use client";

import { useCallback, useEffect, useState } from "react";

type SourceKey = "meta" | "google" | "email" | "other" | "organic";

type Item = {
  id: string;
  name: string;
  email: string | null;
  amount: number;
  status: string;
  kind: "Session" | "Event" | "Gift card";
  date: string | null;
  at: string;
  source: SourceKey;
  label: string;
};

type ManagedEntity = {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  dailyBudget: number | null;
  campaignName?: string;
  adsetName?: string;
  targeting?: string;
  optimisesFor?: string | null;
  tracked?: boolean;
  paid?: boolean;
  link?: string | null;
};

type Data = {
  configured: boolean;
  metaConfigured: boolean;
  metaError: string | null;
  meta: { spend: number; impressions: number; clicks: number } | null;
  google: {
    connected: boolean;
    error: string | null;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    campaigns: { name: string; status: string; dailyBudget: number | null }[];
  };
  manage: { campaigns: ManagedEntity[]; adsets: ManagedEntity[]; ads: ManagedEntity[] };
  sources: Record<SourceKey, { bookings: number; revenue: number }>;
  totalPaid: { bookings: number; revenue: number };
  items: Item[];
  range: { key: string; since: string; until: string };
};

const fmt = (n: number) => `£${n.toFixed(2)}`;

// Meta's effective_status jargon → what it actually means for delivery.
// status (the toggle you set) vs effective_status (what's really happening)
// is the #1 confusion: an "ACTIVE" ad inside a paused ad set delivers nothing.
function statusBadge(effectiveStatus: string): { text: string; cls: string } | null {
  switch (effectiveStatus) {
    case "ACTIVE": return { text: "Live now", cls: "bg-green-100 text-green-700" };
    case "IN_PROCESS": return { text: "In review", cls: "bg-blue-100 text-blue-700" };
    case "ADSET_PAUSED": return { text: "Off — ad set paused", cls: "bg-ink/[0.08] text-ink-soft" };
    case "CAMPAIGN_PAUSED": return { text: "Off — campaign paused", cls: "bg-ink/[0.08] text-ink-soft" };
    case "PAUSED": return { text: "Paused", cls: "bg-ink/[0.08] text-ink-soft" };
    case "PENDING_REVIEW": return { text: "Pending review", cls: "bg-blue-100 text-blue-700" };
    case "DISAPPROVED": return { text: "Disapproved", cls: "bg-red-100 text-red-700" };
    case "ARCHIVED":
    case "DELETED": return null;
    default: return { text: effectiveStatus, cls: "bg-ink/[0.08] text-ink-soft" };
  }
}

const isGone = (e: { effectiveStatus: string }) => ["ARCHIVED", "DELETED"].includes(e.effectiveStatus);

// Short display form of an ad's click destination, e.g. "/booking" or "/go".
function linkPath(link: string | null | undefined): string {
  if (!link) return "";
  try {
    const u = new URL(link);
    return u.pathname === "/" ? u.hostname : u.pathname;
  } catch {
    return link;
  }
}

// Where a click ends up after our /booking → /go redirect rule.
function landingBadge(a: ManagedEntity): { text: string; cls: string } | null {
  const p = linkPath(a.link);
  if (!p) return null;
  if (p === "/go") return { text: "clicks → /go", cls: "bg-green-100 text-green-700" };
  if (p === "/booking") {
    return a.paid
      ? { text: "clicks → /go (via redirect)", cls: "bg-green-100 text-green-700" }
      : { text: "stays on /booking", cls: "bg-amber-100 text-amber-700" };
  }
  return { text: `clicks → ${p}`, cls: "bg-ink/[0.08] text-ink-soft" };
}

const SOURCES: { key: SourceKey; label: string; dot: string; badge: string; isAd?: boolean }[] = [
  { key: "meta", label: "Meta ads (Facebook & Instagram)", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700", isAd: true },
  { key: "google", label: "Google ads", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800", isAd: true },
  { key: "email", label: "Email campaigns", dot: "bg-purple-400", badge: "bg-purple-100 text-purple-700" },
  { key: "other", label: "Other tracked links", dot: "bg-ink/30", badge: "bg-ink/[0.08] text-ink" },
  { key: "organic", label: "Organic / walk-ins", dot: "bg-green-500", badge: "bg-green-100 text-green-700" },
];

export default function AdsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fixingTracking, setFixingTracking] = useState(false);
  const [trackingMsg, setTrackingMsg] = useState("");
  const [budgetEdits, setBudgetEdits] = useState<Record<string, string>>({});
  const [range, setRange] = useState("30d");

  const load = useCallback(async (r = range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ads-insights?range=${r}`);
      const json = await res.json().catch(() => null);
      setData(res.ok && json?.sources ? json : null);
    } catch {
      setData(null);
    }
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

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
            : `Done — tracking is fully on for ${json.fixed} ad${json.fixed === 1 ? "" : "s"}.`
        );
        await load();
      }
    } catch {
      setTrackingMsg("Network error");
    }
    setFixingTracking(false);
  }

  const liveAdsList = (data?.manage?.ads || []).filter((a) => !isGone(a));
  const untrackedAds = liveAdsList.filter((a) => a.tracked === false);
  // Tracked enough to attribute bookings, but missing utm_medium=paid so a
  // /booking click won't forward to the /go ad-landing page.
  const noRedirectAds = liveAdsList.filter((a) => a.tracked !== false && a.paid === false && linkPath(a.link) === "/booking");
  const rangeLabel = range === "today" ? "today" : range === "7d" ? "last 7 days" : range === "90d" ? "last 90 days" : "last 30 days";

  const metaSpend = data?.meta?.spend || 0;
  const googleSpend = data?.google?.connected ? data.google.spend : 0;
  const spend = metaSpend + googleSpend;
  const adBookings = (data?.sources.meta.bookings || 0) + (data?.sources.google.bookings || 0);
  const adRevenue = (data?.sources.meta.revenue || 0) + (data?.sources.google.revenue || 0);
  const roas = spend > 0 ? adRevenue / spend : null;
  const costPerBooking = adBookings > 0 ? spend / adBookings : null;
  const anyLive =
    [...(data?.manage?.campaigns || []), ...(data?.manage?.adsets || [])].some((e) => e.effectiveStatus === "ACTIVE") ||
    (data?.google?.campaigns || []).some((c) => c.status === "ENABLED");
  const maxSourceBookings = Math.max(...SOURCES.filter((s) => s.key !== "organic").map((s) => data?.sources[s.key].bookings || 0), 1);

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.6rem] md:text-[2rem]">Ad Management</h1>
          <p className="text-ink-soft text-[0.9rem] mt-1">Ad spend, where your sales came from, and pause/resume controls.</p>
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
      ) : !data ? (
        <div className="bg-white rounded-[20px] p-8 shadow-sm text-center text-ink-soft text-[0.9rem]">
          Couldn&apos;t load ad data — try refreshing.
        </div>
      ) : (
        <>
          {data.metaError && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-xl px-4 py-3 text-[0.85rem] mb-6">
              Meta API warning: {data.metaError}
            </div>
          )}

          {/* Verdict — are the ads working? */}
          <div className="rounded-[20px] p-6 md:p-8 mb-8 text-white bg-gradient-to-br from-[#ff2d78] via-[#a855f7] to-[#38bdf8] shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${anyLive ? "bg-green-300" : "bg-white/40"}`} />
              <span className="text-[0.8rem] font-semibold uppercase tracking-wider text-white/90">
                {anyLive ? "Ads running" : "Nothing running"}
              </span>
            </div>
            <div className="font-display text-[1.4rem] md:text-[1.8rem] leading-tight mb-1">
              {spend > 0
                ? roas && roas >= 1
                  ? `Every £1 spent made £${roas.toFixed(2)}`
                  : `${fmt(spend)} spent — ${fmt(adRevenue)} booked back`
                : adBookings > 0
                  ? `${adBookings} booking${adBookings === 1 ? "" : "s"} traced to ads — ${fmt(adRevenue)}`
                  : anyLive
                    ? "Ads are live — results appear as people click and book"
                    : "No ad spend in this period"}
            </div>
            <div className="text-white/85 text-[0.85rem] mb-5">
              {data.metaConfigured
                ? [metaSpend > 0 ? `Meta: ${fmt(metaSpend)} spent → ${fmt(data.sources.meta.revenue)} booked` : null,
                   googleSpend > 0 ? `Google: ${fmt(googleSpend)} spent → ${fmt(data.sources.google.revenue)} booked` : null,
                  ].filter(Boolean).join("   ·   ")
                : "Meta account isn't connected — spend unavailable, but ad bookings are still tracked below."}
            </div>
            <div className="flex gap-6 md:gap-10 flex-wrap">
              <div>
                <div className="text-[0.7rem] uppercase tracking-wider text-white/80">Spent · {rangeLabel}</div>
                <div className="font-display text-[1.5rem]">{fmt(spend)}</div>
              </div>
              <div>
                <div className="text-[0.7rem] uppercase tracking-wider text-white/80">Booked from ads</div>
                <div className="font-display text-[1.5rem]">{fmt(adRevenue)}</div>
              </div>
              <div>
                <div className="text-[0.7rem] uppercase tracking-wider text-white/80">Paid bookings</div>
                <div className="font-display text-[1.5rem]">{adBookings}</div>
              </div>
              <div>
                <div className="text-[0.7rem] uppercase tracking-wider text-white/80">Cost per booking</div>
                <div className="font-display text-[1.5rem]">{costPerBooking ? fmt(costPerBooking) : "—"}</div>
              </div>
            </div>
            <div className="text-white/60 text-[0.7rem] mt-4">Bookings only count here when the customer clicked a real Meta or Google ad — email links and shares don&apos;t.</div>
          </div>

          {/* What the ads brought in — paid channels only */}
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm mb-8">
            <h2 className="font-display text-[1.1rem] mb-1">What your ads brought in</h2>
            <p className="text-[0.75rem] text-ink-soft mb-6">Paid sales {rangeLabel} traced back to an ad or tracked link — how much each channel earned.</p>
            {(() => {
              const sourceRow = (s: (typeof SOURCES)[number]) => {
                const v = data.sources[s.key];
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-[0.85rem] mb-1.5">
                      <span className="flex items-center gap-2 font-medium">
                        <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                      <span className="text-ink-soft">
                        <strong className="text-ink">{v.bookings}</strong> · {fmt(v.revenue)}
                      </span>
                    </div>
                    <div className="h-2 bg-ink/[0.05] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.dot}`} style={{ width: `${(v.bookings / maxSourceBookings) * 100}%`, opacity: 0.85 }} />
                    </div>
                  </div>
                );
              };
              return (
                <div className="space-y-4">
                  <div className="text-[0.7rem] uppercase tracking-wider text-ink-soft">Paid ads</div>
                  {SOURCES.filter((s) => s.isAd).map(sourceRow)}
                  <div className="text-[0.7rem] uppercase tracking-wider text-ink-soft pt-2">Tracked links — free</div>
                  {SOURCES.filter((s) => !s.isAd && s.key !== "organic").map(sourceRow)}
                </div>
              );
            })()}
          </div>

          {/* Manage ads */}
          {(data.manage.campaigns.length > 0 || data.manage.adsets.length > 0 || data.google.campaigns.length > 0) && (
            <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm mb-8">
              <h2 className="font-display text-[1.1rem] mb-2">Manage ads</h2>
              <p className="text-[0.8rem] text-ink-soft mb-5">Pause or resume Meta campaigns, ad sets and individual ads, and edit daily budgets — no need to open Ads Manager.</p>
              {actionMsg && <div className="text-[0.8rem] text-red-600 mb-4">{actionMsg}</div>}

              {(untrackedAds.length > 0 || noRedirectAds.length > 0 || trackingMsg) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-start justify-between gap-4 flex-wrap">
                  <div className="text-[0.85rem] text-amber-900 space-y-1">
                    {untrackedAds.length > 0 && (
                      <div>
                        {untrackedAds.length} ad{untrackedAds.length === 1 ? "" : "s"} missing tracking tags — bookings from {untrackedAds.length === 1 ? "it" : "them"} just say &quot;Meta Ad&quot; and clicks won&apos;t reach the /go booking page.
                      </div>
                    )}
                    {noRedirectAds.length > 0 && (
                      <div>
                        {noRedirectAds.length} tracked ad{noRedirectAds.length === 1 ? "" : "s"} land on /booking but won&apos;t forward to /go (missing <code className="text-[0.75rem]">utm_medium=paid</code>).
                      </div>
                    )}
                    {trackingMsg && <div className="font-medium">{trackingMsg}</div>}
                  </div>
                  {(untrackedAds.length > 0 || noRedirectAds.length > 0) && (
                    <button
                      onClick={fixTracking}
                      disabled={fixingTracking}
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white text-[0.8rem] font-semibold hover:bg-amber-700 disabled:opacity-50 flex-shrink-0"
                    >
                      {fixingTracking ? "Fixing..." : "Fix tracking tags"}
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-0.5">
                {[...data.manage.campaigns.map((c) => ({ ...c, kind: "Campaign" })), ...data.manage.adsets.map((a) => ({ ...a, kind: "Ad set" }))]
                  .filter((e) => !isGone(e))
                  .map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-ink/[0.06] last:border-0 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[0.9rem] truncate">{e.name}</span>
                        <span className="text-[0.6rem] bg-ink/[0.06] text-ink-soft px-1.5 py-0.5 rounded-full">{e.kind}</span>
                        {(() => { const b = statusBadge(e.effectiveStatus); return b && <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${b.cls}`}>{b.text}</span>; })()}
                      </div>
                      {e.campaignName && <div className="text-[0.7rem] text-ink-soft">{e.campaignName}</div>}
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

                {liveAdsList.length > 0 && (
                  <>
                    <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider pt-5 pb-1">
                      Individual ads — where each click lands
                    </div>
                    {liveAdsList.map((a) => {
                      const sb = statusBadge(a.effectiveStatus);
                      const lb = landingBadge(a);
                      return (
                        <div key={a.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-ink/[0.06] last:border-0 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-[0.9rem] truncate">{a.name}</span>
                              {sb && <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${sb.cls}`}>{sb.text}</span>}
                              {lb && <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${lb.cls}`} title={a.link || ""}>{lb.text}</span>}
                              {a.tracked
                                ? <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Tracked</span>
                                : <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-700">No tracking</span>}
                            </div>
                            <div className="text-[0.7rem] text-ink-soft">
                              {[a.adsetName, a.campaignName].filter(Boolean).join(" · ")}
                              {a.link ? ` — ${a.link}` : " — link not readable via API"}
                            </div>
                          </div>
                          <button
                            onClick={() => control(a.id, { status: a.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })}
                            disabled={busyId === a.id}
                            className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-medium disabled:opacity-50 flex-shrink-0 ${a.status === "ACTIVE" ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                          >
                            {busyId === a.id ? "..." : a.status === "ACTIVE" ? "Pause" : "Resume"}
                          </button>
                        </div>
                      );
                    })}
                    <p className="text-[0.7rem] text-ink-soft pt-2">
                      &quot;Off — ad set/campaign paused&quot; means the ad itself is switched on but its parent is off, so nothing delivers. Resume the parent to go live.
                    </p>
                  </>
                )}

                {data.google.campaigns.length > 0 && (
                  <>
                    <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider pt-4 pb-1">Google campaigns — managed in Google Ads</div>
                    {data.google.campaigns.map((c) => (
                      <div key={c.name} className="flex items-center justify-between gap-3 py-2.5 border-b border-ink/[0.06] last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-[0.9rem] truncate">{c.name}</span>
                          <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${c.status === "ENABLED" ? "bg-green-100 text-green-700" : "bg-ink/[0.08] text-ink-soft"}`}>
                            {c.status === "ENABLED" ? "Live" : c.status}
                          </span>
                        </div>
                        <span className="text-[0.75rem] text-ink-soft flex-shrink-0">{c.dailyBudget != null ? `${fmt(c.dailyBudget)}/day` : ""}</span>
                      </div>
                    ))}
                    <a href="https://ads.google.com/aw/campaigns" target="_blank" rel="noreferrer" className="inline-block text-[0.75rem] text-amber-600 hover:underline pt-2">
                      Pause / edit in Google Ads →
                    </a>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Sales list — ad/tracked sources only */}
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm mb-8">
            <h2 className="font-display text-[1.1rem] mb-2">Sales from ads &amp; tracked links — {rangeLabel}</h2>
            <p className="text-[0.75rem] text-ink-soft mb-6">
              Bookings, event tickets and gift cards that came from an ad or tracked link.
              {data.items.length >= 100 ? " Showing the 100 most recent." : ""}
            </p>
            {data.items.length === 0 ? (
              <div className="text-center py-8 text-ink-soft text-[0.9rem]">No ad-attributed sales in this period.</div>
            ) : (
              <div className="space-y-1">
                {data.items.map((b) => {
                  const src = SOURCES.find((s) => s.key === b.source);
                  return (
                    <div key={`${b.kind}-${b.id}`} className="flex items-center justify-between gap-3 py-2 border-b border-ink/[0.06] last:border-0 flex-wrap">
                      <div className="min-w-0">
                        <span className="font-medium text-[0.9rem]">{b.name}</span>
                        {b.kind !== "Session" && <span className="ml-2 text-[0.6rem] bg-bright-lavender/20 text-ink px-1.5 py-0.5 rounded-full font-medium">{b.kind}</span>}
                        <span className={`ml-2 text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${src?.badge || "bg-ink/[0.08] text-ink"}`} title={b.label}>
                          {b.label}
                        </span>
                        <div className="text-[0.75rem] text-ink-soft">
                          {b.email} · booked {new Date(b.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-display text-[0.95rem]">£{b.amount.toFixed(2)}</div>
                        <div className={`text-[0.7rem] ${b.status === "paid" ? "text-green-600" : "text-orange-500"}`}>{b.status}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <GoogleConnectCard connected={data.google.connected} onChanged={load} />
        </>
      )}
    </div>
  );
}

// Google Ads connection setup — only needed once. When connected, spend and
// clicks show in the stats above.
function GoogleConnectCard({ connected, onChanged }: { connected: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<{ hasClientId: boolean; hasClientSecret: boolean; hasDevToken: boolean; customerId: string | null; loginCustomerId: string | null; connected: boolean; redirectUri?: string } | null>(null);
  const [form, setForm] = useState({ clientId: "", clientSecret: "", devToken: "", customerId: "", loginCustomerId: "" });
  const [msg, setMsg] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    fetch("/api/admin/google-ads").then((r) => r.ok ? r.json() : null).then((j) => j && setCfg(j));
    const p = new URLSearchParams(window.location.search);
    if (p.get("g") === "connected") { setFlash("Google Ads connected — your stats are loading in."); onChanged(); }
    if (p.get("gerr")) setFlash(`Connection failed: ${p.get("gerr")}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (connected) {
    return (
      <div className="text-[0.75rem] text-ink-soft">
        {flash && <div className="rounded-xl px-4 py-3 text-[0.85rem] mb-3 bg-blue-50 border border-blue-200 text-blue-800">{flash}</div>}
        Google Ads account connected.{" "}
        <button
          onClick={async () => { await fetch("/api/admin/google-ads", { method: "DELETE" }); onChanged(); }}
          className="text-red-500 hover:underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm border-2 border-amber-200">
      {flash && <div className="rounded-xl px-4 py-3 text-[0.85rem] mb-5 bg-blue-50 border border-blue-200 text-blue-800">{flash}</div>}
      <h2 className="font-display text-[1.1rem] mb-2">Google Ads connection</h2>
      <p className="text-[0.8rem] text-ink-soft mb-4">
        Bookings from Google ads are already tracked. Connect once to also see live spend, views and clicks.
      </p>
      {!open ? (
        <button onClick={() => setOpen(true)} className="px-5 py-2.5 rounded-xl bg-ink/[0.06] font-semibold text-[0.85rem] hover:bg-ink/[0.1]">
          Set up Google Ads
        </button>
      ) : (
        <>
          <ol className="space-y-4 text-[0.85rem] mb-6">
            <li>
              <strong>1 · Free Manager account + developer token</strong> — go to <a href="https://ads.google.com/home/tools/manager-accounts/" target="_blank" rel="noreferrer" className="text-sky-blue-light hover:underline">ads.google.com → Manager accounts</a>, create one (free), then in it: <em>Admin → API Center → apply for a developer token</em> (Basic access). Manager account&apos;s 10-digit ID goes in <em>Manager account ID</em> below.
            </li>
            <li>
              <strong>2 · OAuth app</strong> — at <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-sky-blue-light hover:underline">console.cloud.google.com</a>: create a project → <em>APIs &amp; Services → OAuth consent screen</em> (External, add yourself as a test user) → <em>Credentials → Create OAuth client ID → Web application</em> with this exact redirect:
              <div className="mt-1.5 bg-ink/[0.04] rounded-lg px-3 py-2 font-mono text-[0.75rem] break-all select-all">{redirectUri}</div>
            </li>
            <li>
              <strong>3 · Customer ID</strong> — the 10-digit number top-right of <em>your normal Google Ads account</em> (e.g. 123-456-7890). Then click <em>Connect</em> and approve.
            </li>
          </ol>

          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <input type="text" placeholder={`Client ID ${cfg?.hasClientId ? "(saved)" : ""}`} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50" />
            <input type="password" placeholder={`Client secret ${cfg?.hasClientSecret ? "(saved)" : ""}`} value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} className="px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50" />
            <input type="password" placeholder={`Developer token ${cfg?.hasDevToken ? "(saved)" : ""}`} value={form.devToken} onChange={(e) => setForm({ ...form, devToken: e.target.value })} className="px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50" />
            <input type="text" placeholder={`Ads customer ID ${cfg?.customerId ? `(saved: ${cfg.customerId})` : "(e.g. 123-456-7890)"}`} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50" />
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
        </>
      )}
    </div>
  );
}
