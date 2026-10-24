"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

type WaitlistEntry = {
  id: string;
  name: string | null;
  email: string;
  date: string;
  time_slot: string;
  people: number;
  notified_at: string | null;
  created_at: string;
};

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setLoadErr("");
    try {
      const res = await fetch("/api/waitlist", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) setLoadErr(data.error || "Failed to load");
      else setEntries(data.waitlist || []);
    } catch {
      setLoadErr("Failed to load waitlist — if this is a new feature, apply the SQL in supabase/migrations/ via the Supabase SQL Editor");
    }
    setLoading(false);
  }

  async function markNotified(e: WaitlistEntry, notified: boolean) {
    await fetch("/api/waitlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: e.id, notified }),
    });
    setEntries((prev) => prev.map((x) => x.id === e.id ? { ...x, notified_at: notified ? new Date().toISOString() : null } : x));
  }

  async function remove(e: WaitlistEntry) {
    if (!confirm(`Remove ${e.email} from the waitlist?`)) return;
    const res = await fetch(`/api/waitlist?id=${encodeURIComponent(e.id)}`, { method: "DELETE" });
    if (res.ok) setEntries((prev) => prev.filter((x) => x.id !== e.id));
    else toast("Failed to remove entry", "error");
  }

  // Group by date+slot so demand per slot is obvious
  const groups: Record<string, WaitlistEntry[]> = {};
  entries.forEach((e) => {
    const k = `${e.date}|${e.time_slot}`;
    if (!groups[k]) groups[k] = [];
    groups[k].push(e);
  });
  const groupKeys = Object.keys(groups).sort();

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <PageHeader title="Waitlist" subtitle="People waiting for a space on sold-out slots. Email them when a spot opens up." />

      <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
        {loading ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading waitlist...</div>
        ) : loadErr ? (
          <div className="text-center py-10 text-red-600 text-[0.9rem]">{loadErr}</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">No one is on the waitlist right now.</div>
        ) : (
          <div className="space-y-6">
            {groupKeys.map((k) => {
              const [d, slot] = k.split("|");
              const list = groups[k];
              const dateStr = new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
              return (
                <div key={k}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-[0.95rem]">{dateStr} · {slot}</h3>
                    <span className="text-[0.8rem] text-ink-soft">{list.length} waiting · {list.reduce((s, e) => s + e.people, 0)} people</span>
                  </div>
                  <div className="space-y-2">
                    {list.map((e) => (
                      <div key={e.id} className="flex items-center justify-between flex-wrap gap-3 rounded-xl border border-ink/[0.08] px-4 py-3">
                        <div>
                          <div className="text-[0.9rem] font-medium">{e.name || e.email}</div>
                          <div className="text-[0.8rem] text-ink-soft">
                            {e.name && <span className="mr-2">{e.email}</span>}
                            {e.people} {e.people === 1 ? "person" : "people"} · joined {new Date(e.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            {e.notified_at && <span className="ml-2 text-green-600">· notified {new Date(e.notified_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`mailto:${e.email}?subject=${encodeURIComponent("Space available — The Slime Studio")}&body=${encodeURIComponent(`Hi${e.name ? ` ${e.name}` : ""},\n\nA space has opened up for your waitlisted slot:\n\n${dateStr} at ${slot}\n\nBook now: https://theslimestudio.co.uk/booking\n\nThe Slime Studio`)}`}
                            onClick={() => markNotified(e, true)}
                            className="px-3 py-1.5 rounded-lg bg-sky-blue-light/30 text-ink text-[0.8rem] hover:bg-sky-blue-light/50 transition-colors"
                          >
                            Notify
                          </a>
                          {e.notified_at && (
                            <button
                              onClick={() => markNotified(e, false)}
                              className="px-3 py-1.5 rounded-lg bg-ink/5 text-ink-soft text-[0.8rem] hover:bg-ink/10 transition-colors"
                            >
                              Unmark
                            </button>
                          )}
                          <button
                            onClick={() => remove(e)}
                            className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
