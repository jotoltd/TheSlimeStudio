"use client";

import { useEffect, useState } from "react";
import { supabase, type OpeningHour, type DateOverride, TIME_SLOTS as DEFAULT_SLOTS } from "@/lib/supabase";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

export default function OpeningHoursPage() {
  const [weekly, setWeekly] = useState<OpeningHour[]>([]);
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Override form
  const [ovDate, setOvDate] = useState(todayISO());
  const [ovIsOpen, setOvIsOpen] = useState(true);
  const [ovSlots, setOvSlots] = useState<string>(DEFAULT_SLOTS.join("\n"));
  const [ovLabel, setOvLabel] = useState("");
  const [savingOv, setSavingOv] = useState(false);
  const [ovMsg, setOvMsg] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/opening-hours");
      const data = await res.json();
      if (data.weekly) setWeekly(data.weekly);
      if (data.overrides) setOverrides(data.overrides);
    } catch {}
    setLoading(false);
  }

  // Build a map: day_of_week -> OpeningHour
  function getDaySchedule(dow: number): OpeningHour | null {
    return weekly.find((w) => w.day_of_week === dow) || null;
  }

  function toggleDayOpen(dow: number, isOpen: boolean) {
    const existing = getDaySchedule(dow);
    if (existing) {
      setWeekly(weekly.map((w) => w.day_of_week === dow ? { ...w, is_open: isOpen } : w));
    } else {
      setWeekly([...weekly, {
        id: `temp-${dow}`,
        day_of_week: dow,
        is_open: isOpen,
        time_slots: [...DEFAULT_SLOTS],
      }]);
    }
  }

  function updateDaySlots(dow: number, slotsText: string) {
    const slots = slotsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const existing = getDaySchedule(dow);
    if (existing) {
      setWeekly(weekly.map((w) => w.day_of_week === dow ? { ...w, time_slots: slots } : w));
    } else {
      setWeekly([...weekly, {
        id: `temp-${dow}`,
        day_of_week: dow,
        is_open: true,
        time_slots: slots,
      }]);
    }
  }

  async function saveWeekly() {
    setSaving(true); setMsg("");
    const schedule = weekly.map((w) => ({
      day_of_week: w.day_of_week,
      is_open: w.is_open,
      time_slots: w.time_slots,
    }));
    try {
      const res = await fetch("/api/opening-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_weekly", schedule }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || "Failed to save"); }
      else { setMsg("Weekly schedule saved!"); load(); }
    } catch {
      setMsg("Network error");
    }
    setSaving(false);
  }

  async function addOverride() {
    if (!ovDate) { setOvMsg("Please select a date"); return; }
    setSavingOv(true); setOvMsg("");
    const slots = ovIsOpen ? ovSlots.split("\n").map((s) => s.trim()).filter(Boolean) : [];
    try {
      const res = await fetch("/api/opening-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_override",
          date: ovDate,
          is_open: ovIsOpen,
          time_slots: slots,
          label: ovLabel || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setOvMsg(data.error || "Failed to save"); }
      else {
        setOvMsg("Override saved!");
        setOvLabel("");
        load();
      }
    } catch {
      setOvMsg("Network error");
    }
    setSavingOv(false);
  }

  async function removeOverride(date: string) {
    if (!confirm(`Remove override for ${new Date(date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}?`)) return;
    await fetch("/api/opening-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_override", date }),
    });
    load();
  }

  // Sort overrides by date
  const sortedOverrides = [...overrides].sort((a, b) => a.date.localeCompare(b.date));
  const upcomingOverrides = sortedOverrides.filter((o) => o.date >= todayISO());
  const pastOverrides = sortedOverrides.filter((o) => o.date < todayISO());

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Opening Hours</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">Control which days you're open and what time slots are available.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-[20px] p-8 shadow-sm text-center text-ink-soft text-[0.9rem]">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Weekly Schedule */}
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-[1.1rem]">Weekly Schedule</h2>
              <button onClick={saveWeekly} disabled={saving} className="px-5 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.85rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all">
                {saving ? "Saving..." : "Save Schedule"}
              </button>
            </div>
            <p className="text-[0.85rem] text-ink-soft mb-5">Set default opening hours for each day of the week. Use date overrides below for holidays and special events.</p>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
                const sched = getDaySchedule(dow);
                const isOpen = sched?.is_open ?? false;
                const slots = sched?.time_slots || [];
                return (
                  <div key={dow} className={`rounded-xl border-2 p-4 transition-colors ${isOpen ? "border-sky-blue-light/30 bg-sky-blue-light/[0.03]" : "border-ink/[0.08] bg-ink/[0.02]"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-[0.95rem]">{DAY_NAMES[dow]}</span>
                        <span className={`text-[0.75rem] px-2 py-0.5 rounded-full font-medium ${isOpen ? "bg-green-100 text-green-700" : "bg-ink/5 text-ink-soft"}`}>
                          {isOpen ? "Open" : "Closed"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleDayOpen(dow, !isOpen)}
                        className={`relative w-12 h-7 rounded-full transition-colors ${isOpen ? "bg-green-400" : "bg-ink/15"}`}
                      >
                        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isOpen ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                    {isOpen && (
                      <div>
                        <label className="block text-[0.8rem] text-ink-soft mb-1.5">Time slots (one per line, 24h format)</label>
                        <textarea
                          value={slots.join("\n")}
                          onChange={(e) => updateDaySlots(dow, e.target.value)}
                          rows={Math.max(2, slots.length)}
                          placeholder={"10:00\n11:00\n12:00"}
                          className="w-full px-3 py-2 border-2 border-ink/10 rounded-lg text-sm focus:outline-none focus:border-sky-blue-light resize-none font-mono"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {msg && <p className={`text-[0.85rem] mt-4 ${msg.includes("saved") ? "text-green-600" : "text-red-600"}`}>{msg}</p>}
          </div>

          {/* Date Overrides */}
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
            <h2 className="font-display text-[1.1rem] mb-1">Date Overrides</h2>
            <p className="text-[0.85rem] text-ink-soft mb-5">Override your weekly schedule for specific dates — school holidays, special events, one-off openings, etc.</p>

            {/* Add override form */}
            <div className="bg-ink/[0.02] rounded-xl p-4 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Date</label>
                  <input
                    type="date"
                    value={ovDate}
                    min={todayISO()}
                    onChange={(e) => setOvDate(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Label (optional)</label>
                  <input
                    type="text"
                    value={ovLabel}
                    onChange={(e) => setOvLabel(e.target.value)}
                    placeholder="e.g. School holiday, After school club"
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setOvIsOpen(!ovIsOpen)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${ovIsOpen ? "bg-green-400" : "bg-ink/15"}`}
                >
                  <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${ovIsOpen ? "translate-x-5" : ""}`} />
                </button>
                <span className="text-sm font-medium">{ovIsOpen ? "Open on this date" : "Closed on this date"}</span>
              </div>

              {ovIsOpen && (
                <div className="mb-4">
                  <label className="block text-[0.8rem] text-ink-soft mb-1.5">Time slots for this date (one per line)</label>
                  <textarea
                    value={ovSlots}
                    onChange={(e) => setOvSlots(e.target.value)}
                    rows={4}
                    placeholder={"10:00\n11:00\n12:00"}
                    className="w-full px-3 py-2 border-2 border-ink/10 rounded-lg text-sm focus:outline-none focus:border-sky-blue-light resize-none font-mono"
                  />
                </div>
              )}

              <div className="flex items-center gap-4">
                <button onClick={addOverride} disabled={savingOv} className="px-5 py-2.5 rounded-full bg-bright-lavender text-white text-[0.85rem] font-medium disabled:opacity-60 hover:opacity-90 transition-all">
                  {savingOv ? "Saving..." : "Add Override"}
                </button>
                {ovMsg && <p className={`text-[0.85rem] ${ovMsg.includes("saved") ? "text-green-600" : "text-red-600"}`}>{ovMsg}</p>}
              </div>
            </div>

            {/* Existing overrides */}
            {upcomingOverrides.length > 0 && (
              <div>
                <h3 className="font-display text-[0.95rem] mb-3">Upcoming Overrides</h3>
                <div className="space-y-2">
                  {upcomingOverrides.map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg border border-ink/[0.08] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[50px]">
                          <div className="text-[0.7rem] text-ink-soft uppercase">{DAY_SHORT[new Date(o.date + "T00:00:00").getDay()]}</div>
                          <div className="font-display text-[1.1rem]">{new Date(o.date + "T00:00:00").getDate()}</div>
                        </div>
                        <div>
                          <div className="text-[0.9rem] font-medium">
                            {new Date(o.date + "T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                          </div>
                          <div className="text-[0.8rem] text-ink-soft">
                            {o.is_open ? (
                              <>Open · {o.time_slots.join(", ")}</>
                            ) : (
                              "Closed"
                            )}
                            {o.label && <span className="ml-2">· {o.label}</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeOverride(o.date)}
                        className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] hover:bg-red-200 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pastOverrides.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-[0.85rem] text-ink-soft hover:text-ink">Past overrides ({pastOverrides.length})</summary>
                <div className="space-y-2 mt-3">
                  {pastOverrides.map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg border border-ink/[0.05] px-4 py-2 opacity-60">
                      <div className="text-[0.85rem]">
                        {new Date(o.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        {" — "}
                        {o.is_open ? `Open · ${o.time_slots.join(", ")}` : "Closed"}
                        {o.label && ` · ${o.label}`}
                      </div>
                      <button
                        onClick={() => removeOverride(o.date)}
                        className="px-2 py-1 rounded text-[0.75rem] text-ink-soft hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {overrides.length === 0 && (
              <div className="text-center py-6 text-ink-soft text-[0.85rem]">No date overrides set. Your weekly schedule applies to all dates.</div>
            )}
          </div>

          {/* Info box */}
          <div className="bg-sky-blue-light/10 rounded-xl p-4 text-[0.85rem] text-ink-soft">
            <p className="font-medium text-ink mb-1">How it works:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li><strong>Weekly schedule</strong> sets your default opening hours for each day of the week</li>
              <li><strong>Date overrides</strong> take priority over the weekly schedule for specific dates</li>
              <li><strong>Blocked dates</strong> (in the Blocked Dates page) always take top priority — the date is fully closed regardless</li>
              <li>If no weekly schedule is set, the system falls back to the global time slots in Settings</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
