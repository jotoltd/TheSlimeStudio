"use client";

import { useEffect, useState } from "react";

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

export default function BlockedDatesPage() {
  const [blockedDates, setBlockedDates] = useState<{ date: string; reason: string | null }[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function loadBlockedDates() {
    setLoading(true);
    const res = await fetch("/api/blocked-dates");
    const data = await res.json();
    setBlockedDates(data.blockedDates || []);
    setLoading(false);
  }

  useEffect(() => {
    loadBlockedDates();
  }, []);

  async function addDate() {
    if (!newDate) return;
    const res = await fetch("/api/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", date: newDate, reason: newReason || null }),
    });
    const data = await res.json();
    if (data.success) {
      setNewDate("");
      setNewReason("");
      setMsg("Date blocked successfully.");
      loadBlockedDates();
    } else {
      setMsg(data.error || "Failed to block date.");
    }
  }

  async function removeDate(date: string) {
    const res = await fetch("/api/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", date }),
    });
    const data = await res.json();
    if (data.success) {
      setMsg("Date unblocked.");
      loadBlockedDates();
    } else {
      setMsg(data.error || "Failed to unblock date.");
    }
  }

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Blocked Dates</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">Block specific dates so customers can&apos;t book on them (e.g. holidays, private events).</p>
      </div>

      {msg && (
        <div className="bg-sky-blue-light/20 text-ink text-sm rounded-xl p-3 mb-4">{msg}</div>
      )}

      <div className="bg-white rounded-[20px] p-6 md:p-7 shadow-sm mb-6">
        <h2 className="font-display text-[1.1rem] mb-4">Block a New Date</h2>
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <input
                type="date"
                value={newDate}
                min={todayISO()}
                onChange={(e) => setNewDate(e.target.value)}
        className="px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Reason (optional)"
        className="flex-1 px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <button
              onClick={addDate}
              disabled={!newDate}
        className="px-6 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all"
            >
              Block Date
            </button>
          </div>

      <div className="bg-white rounded-[20px] p-6 md:p-7 shadow-sm">
        <h2 className="font-display text-[1.1rem] mb-5">Currently Blocked Dates</h2>
            {loading ? (
        <div className="text-center py-8 text-ink-soft text-[0.9rem]">Loading...</div>
            ) : blockedDates.length === 0 ? (
        <div className="text-center py-8 text-ink-soft text-[0.9rem]">
          <div className="text-3xl mb-2">📅</div>
          No dates are currently blocked.
        </div>
            ) : (
              <div className="space-y-2">
                {blockedDates.map((b) => (
                  <div
                    key={b.date}
            className="flex items-center justify-between border border-ink/10 rounded-xl px-4 py-3 hover:border-ink/20 transition-colors"
                  >
                    <div>
                    <span className="text-[0.9rem] font-medium">
                        {new Date(b.date + "T00:00:00").toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                  {b.reason && (
                    <span className="text-[0.8rem] text-ink-soft ml-2">— {b.reason}</span>
                  )}
                    </div>
                  <button
                    onClick={() => removeDate(b.date)}
                    className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] font-medium hover:bg-red-200 transition-colors"
                  >
                    Unblock
                  </button>
                  </div>
                ))}
              </div>
            )}
          </div>
    </div>
  );
}
