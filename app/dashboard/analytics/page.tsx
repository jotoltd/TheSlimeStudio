"use client";

import { useCallback, useEffect, useState } from "react";

type Analytics = {
  connected: boolean;
  error?: string;
  sessions?: number;
  users?: number;
  newUsers?: number;
  pageViews?: number;
  purchases?: number;
  purchaseRevenue?: number;
  bounceRate?: number;
  daily?: { date: string; sessions: number; purchases: number; revenue: number }[];
  channels?: { channel: string; sessions: number; purchases: number; revenue: number }[];
  topPages?: { path: string; views: number; users: number }[];
  realtime?: { activeUsers: number; pages: { page: string; users: number }[] };
};

const fmtMoney = (n: number) => `£${n.toFixed(2)}`;

export default function AnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<{ range: { since: string; until: string }; analytics: Analytics } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r = range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${r}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const a = data?.analytics;
  const rangeLabel = range === "today" ? "today" : range === "7d" ? "last 7 days" : range === "90d" ? "last 90 days" : "last 30 days";
  const maxSessions = Math.max(...(a?.daily || []).map((d) => d.sessions), 1);

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-[1.6rem] md:text-[2rem]">Analytics</h1>
          <p className="text-ink-soft text-[0.9rem] mt-1">Website traffic from Google Analytics.</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-full p-1 shadow-sm">
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
      </div>

      {loading && !data && (
        <div className="text-ink-soft text-[0.9rem]">Loading…</div>
      )}

      {a && !a.connected && (
        <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-5 text-[0.85rem] text-amber-900">
          Analytics not connected{a.error ? `: ${a.error}` : ""}. Reconnect Google on the Ads page to grant the analytics scope.
        </div>
      )}

      {a?.connected && (
        <>
          {/* Live now */}
          {a.realtime && (
            <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm mb-6">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <h2 className="font-display text-[1.1rem]">
                  {a.realtime.activeUsers} {a.realtime.activeUsers === 1 ? "visitor" : "visitors"} on the site right now
                </h2>
              </div>
              <p className="text-[0.75rem] text-ink-soft mb-4">Active in the last 30 minutes.</p>
              {a.realtime.pages.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-x-8">
                  {a.realtime.pages.map((p) => (
                    <div key={p.page} className="flex justify-between text-[0.85rem] py-2 border-b border-ink/5 last:border-0">
                      <span className="font-semibold truncate pr-3">{p.page}</span>
                      <span className="text-ink-soft shrink-0">{p.users} {p.users === 1 ? "visitor" : "visitors"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[0.85rem] text-ink-soft">Nobody browsing right now.</p>
              )}
            </div>
          )}

          {/* Headline stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
            {[
              ["Visitors", a.users ?? 0],
              ["New visitors", a.newUsers ?? 0],
              ["Sessions", a.sessions ?? 0],
              ["Page views", a.pageViews ?? 0],
              ["Purchases", a.purchases ?? 0],
              ["Bounce rate", `${Math.round((a.bounceRate ?? 0) * 100)}%`],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-white rounded-[16px] px-4 py-4 shadow-sm">
                <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider">{label}</div>
                <div className="font-display text-[1.6rem] mt-1">{value}</div>
              </div>
            ))}
          </div>
          {(a.purchaseRevenue ?? 0) > 0 && (
            <p className="text-[0.8rem] text-ink-soft mb-6 -mt-3">
              GA4-tracked purchase revenue {rangeLabel}: <strong className="text-ink">{fmtMoney(a.purchaseRevenue!)}</strong>
              {" "}(consenting visitors only — real booking totals are on the Revenue page)
            </p>
          )}

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Daily trend */}
            <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
              <h2 className="font-display text-[1.1rem] mb-6">Sessions — {rangeLabel}</h2>
              {a.daily && a.daily.length > 0 ? (
                <div className="flex items-end gap-1 h-36">
                  {a.daily.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col justify-end group relative" title={`${d.date}: ${d.sessions} sessions${d.purchases ? `, ${d.purchases} purchases` : ""}`}>
                      <div
                        className="rounded-t bg-gradient-to-t from-[#ff2d78] to-[#a855f7] min-h-[2px]"
                        style={{ height: `${(d.sessions / maxSessions) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[0.85rem] text-ink-soft">No data in this range.</p>
              )}
              {a.daily && a.daily.length > 0 && (
                <div className="flex justify-between text-[0.65rem] text-ink-soft mt-2">
                  <span>{a.daily[0].date.slice(4, 6)}/{a.daily[0].date.slice(6, 8)}</span>
                  <span>{a.daily[a.daily.length - 1].date.slice(4, 6)}/{a.daily[a.daily.length - 1].date.slice(6, 8)}</span>
                </div>
              )}
            </div>

            {/* Channels */}
            <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
              <h2 className="font-display text-[1.1rem] mb-6">Where visitors came from — {rangeLabel}</h2>
              {a.channels && a.channels.length > 0 ? (
                <div>
                  {a.channels.map((c) => {
                    const pct = a.sessions ? (c.sessions / a.sessions) * 100 : 0;
                    return (
                      <div key={c.channel} className="mb-3">
                        <div className="flex justify-between text-[0.8rem] mb-1">
                          <span className="font-semibold">{c.channel}</span>
                          <span className="text-ink-soft">{c.sessions} sessions{c.purchases > 0 ? ` · ${c.purchases} purchases` : ""}{c.revenue > 0 ? ` · ${fmtMoney(c.revenue)}` : ""}</span>
                        </div>
                        <div className="h-2 rounded-full bg-ink/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#ff2d78] to-[#a855f7]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[0.85rem] text-ink-soft">No data in this range.</p>
              )}
            </div>
          </div>

          {/* Top pages */}
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
            <h2 className="font-display text-[1.1rem] mb-6">Top pages — {rangeLabel}</h2>
            {a.topPages && a.topPages.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-x-8">
                {a.topPages.map((p, i) => (
                  <div key={p.path} className="flex items-center gap-3 py-2.5 border-b border-ink/5 last:border-0 text-[0.85rem]">
                    <span className="w-5 text-ink-soft text-[0.7rem]">{i + 1}</span>
                    <span className="font-semibold truncate flex-1">{p.path}</span>
                    <span className="text-ink-soft shrink-0">{p.views} views · {p.users} users</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[0.85rem] text-ink-soft">No data in this range.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
