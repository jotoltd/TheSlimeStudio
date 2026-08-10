"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
    <>
      <Navbar />
      <section className="section">
        <div className="container max-w-2xl">
          <h1 className="font-display text-2xl md:text-3xl mb-6">Manage Blocked Dates</h1>
          <p className="text-ink-soft text-sm mb-6">
            Block specific dates so customers can&apos;t book on them (e.g. holidays, private events).
          </p>

          {msg && (
            <div className="bg-sky-blue-light/20 text-ink text-sm rounded-xl p-3 mb-4">{msg}</div>
          )}

          <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
            <h2 className="font-display text-lg mb-4">Block a New Date</h2>
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <input
                type="date"
                value={newDate}
                min={todayISO()}
                onChange={(e) => setNewDate(e.target.value)}
                className="px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Reason (optional)"
                className="flex-1 px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <button
              onClick={addDate}
              disabled={!newDate}
              className="btn-primary disabled:opacity-60"
            >
              Block Date
            </button>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-display text-lg mb-4">Currently Blocked Dates</h2>
            {loading ? (
              <p className="text-ink-soft text-sm">Loading...</p>
            ) : blockedDates.length === 0 ? (
              <p className="text-ink-soft text-sm">No dates are currently blocked.</p>
            ) : (
              <div className="space-y-2">
                {blockedDates.map((b) => (
                  <div
                    key={b.date}
                    className="flex items-center justify-between border border-ink/10 rounded-xl px-4 py-3"
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {new Date(b.date + "T00:00:00").toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      {b.reason && (
                        <span className="text-xs text-ink-soft ml-2">— {b.reason}</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeDate(b.date)}
                      className="text-sm text-red-500 hover:text-red-700 font-medium"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
