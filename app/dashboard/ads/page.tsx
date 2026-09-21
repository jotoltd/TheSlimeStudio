"use client";

import { useEffect, useState } from "react";

type Summary = { spend: number; impressions: number; reach: number; clicks: number; lpv: number; purchases: number; frequency?: number; purchaseValue?: number };
type AdPreview = { name: string; status: string; thumbnail: string | null; kind: string; headline: string | null; body: string | null; link: string | null };
type Alert = { level: "warning" | "info"; message: string };
type NamedRow = Summary & { name?: string; thumbnail?: string | null; quality?: string | null; qualityGood?: boolean | null; video?: { plays: number; completionRate: number; avgWatch: number } | null };
type DailyPoint = { date: string; spend: number; clicks: number; purchases: number };
type ManagedEntity = { id: string; name: string; status: string; effectiveStatus: string; dailyBudget: number | null; campaignName?: string; thumbnail?: string | null; targeting?: string; optimisesFor?: string | null };
type AdBooking = { id: string; name: string; email: string; date: string; total_price: number; payment_status: string; notes: string; created_at: string; kind?: "session" | "event" };

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
  attributedRevenue: number;
  comments: { adName: string; platform: string; author: string; text: string; time: string; replyUrl: string | null }[];
  fbCommentsUnavailable?: boolean;
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

const fmt = (n: number) => `£${n.toFixed(2)}`;

function placementLabel(platform: string, position: string): string {
  const p = platform.charAt(0).toUpperCase() + platform.slice(1);
  const pos = position
    .replace(/^(instagram|facebook|threads)_?/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
  return pos && pos !== "Feed" ? `${p} ${pos}` : `${p} Feed`;
}

export default function AdsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [budgetEdits, setBudgetEdits] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/ads-insights");
      setData(await r.json());
    } catch {
      setData(null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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

  const maxSpend = Math.max(...(data?.daily || []).map((d) => d.spend), 0.01);

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

          {/* Headline stats — last 30 days */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-8">
            <div className="bg-white rounded-[20px] p-6 shadow-sm border-l-4 border-red-400">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Ad Spend · 30d</div>
              <div className="font-display text-[1.8rem]">{fmt(data.summary.month.spend)}</div>
              <div className="text-[0.75rem] text-ink-soft mt-1">Today: {fmt(data.summary.today.spend)} <Delta value={data.deltas?.spend} invert /></div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm border-l-4 border-green-400">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Ad Booking Revenue</div>
              <div className="font-display text-[1.8rem] text-green-600">{fmt(data.attributedRevenue)}</div>
              <div className="text-[0.75rem] text-ink-soft mt-1">{data.adBookings.length} ad bookings <Delta value={data.deltas?.purchases} /></div>
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

          {/* Daily trend */}
          {data.daily.length > 0 && (
            <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8">
              <h2 className="font-display text-[1.1rem] mb-6">Daily — Last 30 Days</h2>
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
            <h2 className="font-display text-[1.1rem] mb-6">Last 30 Days Funnel</h2>
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
                <p className="text-[0.75rem] text-ink-soft mb-5">Age & gender · last 30 days · 🎉 = bookings</p>
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
                <p className="text-[0.75rem] text-ink-soft mb-5">Regions · last 30 days</p>
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
              <p className="text-[0.75rem] text-ink-soft mb-5">Last 30 days · 🎉 = purchases Meta attributes to that placement</p>
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

          {/* What your ads look like */}
          {data.adPreviews?.length > 0 && (
            <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8">
              <h2 className="font-display text-[1.1rem] mb-5">What your ads look like</h2>
              <div className="grid md:grid-cols-2 gap-5">
                {data.adPreviews.map((p, i) => (
                  <div key={i} className="border border-ink/[0.08] rounded-2xl overflow-hidden">
                    {p.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail} alt="" className="w-full h-40 object-cover" />
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

          {/* Attributed bookings */}
          <div className="bg-white rounded-[20px] p-8 shadow-sm">
            <h2 className="font-display text-[1.1rem] mb-2">Bookings from Ads</h2>
            <p className="text-[0.75rem] text-ink-soft mb-6">
              Real bookings from your database — this is the accurate count. Ads Manager may show fewer purchases because Meta can't always connect a booking back to the original ad click (different device, ad blockers, long gaps).
            </p>
            {data.adBookings.length === 0 ? (
              <div className="text-center py-8 text-ink-soft text-[0.9rem]">No ad-attributed bookings yet.</div>
            ) : (
              <div className="space-y-3">
                {data.adBookings.map((b) => (
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
        </>
      )}
    </div>
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
