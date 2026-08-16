"use client";

import { useEffect, useState } from "react";
import { supabase, type Booking, type BookingSettings, TIME_SLOTS as DEFAULT_SLOTS, SLOT_CAPACITY as DEFAULT_CAP, MAX_DAILY_BOOKINGS as DEFAULT_MAX } from "@/lib/supabase";

type ViewMode = "calendar" | "table";

export default function BookingsAdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [price, setPrice] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceMsg, setPriceMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({ date: "", time_slot: "", people: 1, name: "", email: "", phone: "", notes: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [slotCapacity, setSlotCapacity] = useState(DEFAULT_CAP);
  const [maxDaily, setMaxDaily] = useState(DEFAULT_MAX);
  const [slotsText, setSlotsText] = useState(DEFAULT_SLOTS.join("\n"));
  const [savingSlots, setSavingSlots] = useState(false);
  const [slotsMsg, setSlotsMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [payFilter, setPayFilter] = useState<"all" | "paid" | "unpaid" | "refunded" | "pending">("all");

  useEffect(() => { loadBookings(); }, [filter]);

  useEffect(() => {
    supabase.from("booking_settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) {
        const s = data as BookingSettings;
        setPrice(String(s.price_per_person));
        if (s.time_slots && s.time_slots.length > 0) { setTimeSlots(s.time_slots); setSlotsText(s.time_slots.join("\n")); }
        if (s.slot_capacity) setSlotCapacity(s.slot_capacity);
        if (s.max_daily_bookings) setMaxDaily(s.max_daily_bookings);
      }
    });
  }, []);

  async function loadBookings() {
    setLoading(true);
    const todayStr = new Date().toISOString().split("T")[0];
    let query = supabase.from("bookings").select("*");
    if (filter === "upcoming") query = query.gte("date", todayStr);
    if (filter === "past") query = query.lt("date", todayStr);
    const { data } = await query.order("date", { ascending: filter !== "past" }).order("time_slot", { ascending: true });
    if (data) setBookings(data as Booking[]);
    setLoading(false);
  }

  async function cancelBooking(id: string, name: string) {
    if (!confirm(`Cancel the booking for "${name}"? This cannot be undone. An email will be sent to the customer.`)) return;
    setCancellingId(id);
    try {
      const res = await fetch("/api/cancel-booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: id }) });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to cancel booking"); }
      else if (data.refunded) { alert("Booking cancelled and Stripe refund processed successfully."); }
      else if (data.refundError) { alert("Booking cancelled but refund failed: " + data.refundError); }
    } catch { alert("Failed to cancel booking"); }
    setCancellingId(null);
    loadBookings();
  }

  function startEdit(b: Booking) {
    setEditingBooking(b);
    setEditForm({ date: b.date, time_slot: b.time_slot, people: b.people, name: b.name, email: b.email, phone: b.phone || "", notes: b.notes || "" });
    setEditMsg("");
  }

  async function saveEdit() {
    if (!editingBooking) return;
    setSavingEdit(true); setEditMsg("");
    const { error } = await supabase.from("bookings").update({
      date: editForm.date, time_slot: editForm.time_slot, people: editForm.people,
      name: editForm.name, email: editForm.email, phone: editForm.phone || null,
      notes: editForm.notes || null,
    }).eq("id", editingBooking.id);
    setSavingEdit(false);
    if (error) { setEditMsg("Failed to save: " + error.message); }
    else { setEditMsg("Booking updated successfully!"); setEditingBooking(null); loadBookings(); }
  }

  async function saveSlotConfig() {
    if (slotCapacity < 1) { setSlotsMsg("Max people per slot must be at least 1"); return; }
    if (maxDaily < 1) { setSlotsMsg("Max daily bookings must be at least 1"); return; }
    setSavingSlots(true); setSlotsMsg("");
    const parsedSlots = slotsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("booking_settings").update({
      time_slots: parsedSlots,
      slot_capacity: slotCapacity,
      max_daily_bookings: maxDaily,
    }).eq("id", 1);
    setSavingSlots(false);
    if (error) setSlotsMsg("Failed to save: " + error.message);
    else { setSlotsMsg("Settings saved!"); setTimeSlots(parsedSlots); }
  }

  async function savePrice() {
    const value = parseFloat(price);
    if (isNaN(value) || value < 0) { setPriceMsg({ type: "err", text: "Please enter a valid price." }); return; }
    setSavingPrice(true); setPriceMsg(null);
    const { error } = await supabase.from("booking_settings").update({ price_per_person: value }).eq("id", 1);
    setSavingPrice(false);
    if (error) setPriceMsg({ type: "err", text: "Failed to save." });
    else setPriceMsg({ type: "ok", text: "Price updated successfully!" });
  }

  const calYear = calMonth.getFullYear();
  const calMonthIdx = calMonth.getMonth();
  const firstDay = new Date(calYear, calMonthIdx, 1);
  const lastDay = new Date(calYear, calMonthIdx + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const monthName = calMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !b.name.toLowerCase().includes(q) && !b.email.toLowerCase().includes(q) && !b.date.includes(q) && !(b.phone || "").toLowerCase().includes(q)) return false;
    if (payFilter !== "all") {
      if (payFilter === "unpaid" && b.payment_status && b.payment_status !== "unpaid") return false;
      if (payFilter !== "unpaid" && (b.payment_status || "unpaid") !== payFilter) return false;
    }
    return true;
  });

  const bookingsByDate: Record<string, Booking[]> = {};
  filteredBookings.forEach((b) => { const d = b.date; if (!bookingsByDate[d]) bookingsByDate[d] = []; bookingsByDate[d].push(b); });
  const selectedDateBookings = selectedDate ? (bookingsByDate[selectedDate] || []) : [];
  const totalPeople = filteredBookings.reduce((sum, b) => sum + b.people, 0);
  const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.total_price), 0);

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="font-display text-[1.6rem] md:text-[2rem]">Bookings</h1>
          <p className="text-ink-soft text-[0.9rem] mt-1">Manage all slime-making session bookings.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["upcoming", "past", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-[0.85rem] font-medium capitalize transition-all ${filter === f ? "bg-sky-blue-light text-ink shadow-sm" : "bg-white text-ink hover:bg-sky-blue-light/20"}`}>
              {f}
            </button>
          ))}
          <div className="flex rounded-full overflow-hidden border border-ink/10">
            <button onClick={() => setViewMode("calendar")} className={`px-4 py-2 text-[0.85rem] font-medium ${viewMode === "calendar" ? "bg-ink text-white" : "bg-white text-ink"}`}>Calendar</button>
            <button onClick={() => setViewMode("table")} className={`px-4 py-2 text-[0.85rem] font-medium ${viewMode === "table" ? "bg-ink text-white" : "bg-white text-ink"}`}>Table</button>
          </div>
        </div>
      </div>

      {/* Search & Payment Filter */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, date, or phone..."
          className="flex-1 min-w-[200px] px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
        />
        <select
          value={payFilter}
          onChange={(e) => setPayFilter(e.target.value as typeof payFilter)}
          className="px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light bg-white"
        >
          <option value="all">All Payments</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="unpaid">Unpaid</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="bg-white rounded-[20px] p-7 shadow-sm mb-8">
        <h2 className="font-display text-[1.1rem] mb-1">Price Per Person</h2>
        <p className="text-[0.85rem] text-ink-soft mb-4">Used to calculate booking totals on the public booking page.</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center border-2 border-ink/15 rounded-xl px-4 py-2.5 w-40">
            <span className="text-ink-soft mr-1">£</span>
            <input type="number" step="0.50" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full outline-none text-sm" />
          </div>
          <button onClick={savePrice} disabled={savingPrice} className="px-6 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all">
            {savingPrice ? "Saving..." : "Save Price"}
          </button>
        </div>
        {priceMsg && <p className={`text-[0.85rem] mt-3 ${priceMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>{priceMsg.text}</p>}
      </div>

      <div className="bg-white rounded-[20px] p-7 shadow-sm mb-8">
        <h2 className="font-display text-[1.1rem] mb-1">Time Slots &amp; Capacity</h2>
        <p className="text-[0.85rem] text-ink-soft mb-4">Configure available time slots, max people per slot, and daily booking limit.</p>
        <div className="grid md:grid-cols-3 gap-5">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-2">Time Slots (one per line, 24h format)</label>
            <textarea
              value={slotsText}
              onChange={(e) => setSlotsText(e.target.value)}
              rows={6}
              placeholder={"10:00\n11:00\n12:00\n13:00\n14:00\n15:00"}
              className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light resize-none font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max People Per Slot</label>
            <input
              type="number" min="1" value={slotCapacity}
              onChange={(e) => {
                const v = e.target.value;
                setSlotCapacity(v === "" ? 0 : parseInt(v) || 0);
              }}
              className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Daily Bookings</label>
            <input
              type="number" min="1" value={maxDaily}
              onChange={(e) => {
                const v = e.target.value;
                setMaxDaily(v === "" ? 0 : parseInt(v) || 0);
              }}
              className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
            />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <button onClick={saveSlotConfig} disabled={savingSlots} className="px-6 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all">
            {savingSlots ? "Saving..." : "Save Settings"}
          </button>
          {slotsMsg && <p className={`text-[0.85rem] ${slotsMsg.includes("saved") ? "text-green-600" : "text-red-600"}`}>{slotsMsg}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8">
        <div className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-6 shadow-sm">
          <div className="text-[0.65rem] md:text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1 md:mb-2">Bookings</div>
          <div className="font-display text-[1.2rem] md:text-[1.8rem]">{loading ? "--" : filteredBookings.length}</div>
        </div>
        <div className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-6 shadow-sm">
          <div className="text-[0.65rem] md:text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1 md:mb-2">Total People</div>
          <div className="font-display text-[1.2rem] md:text-[1.8rem]">{loading ? "--" : totalPeople}</div>
        </div>
        <div className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-6 shadow-sm">
          <div className="text-[0.65rem] md:text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1 md:mb-2">Revenue</div>
          <div className="font-display text-[1.2rem] md:text-[1.8rem]">{loading ? "--" : `£${totalRevenue.toFixed(2)}`}</div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-[20px] p-8 shadow-sm text-center text-ink-soft text-[0.9rem]">Loading bookings...</div>
      ) : viewMode === "calendar" ? (
        <div className="space-y-6">
          {/* Calendar */}
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCalMonth(new Date(calYear, calMonthIdx - 1, 1))} className="w-10 h-10 rounded-full bg-ink/5 hover:bg-ink/10 transition-colors text-ink">←</button>
              <h2 className="font-display text-[1.2rem]">{monthName}</h2>
              <button onClick={() => setCalMonth(new Date(calYear, calMonthIdx + 1, 1))} className="w-10 h-10 rounded-full bg-ink/5 hover:bg-ink/10 transition-colors text-ink">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-[0.7rem] md:text-[0.8rem] text-ink-soft font-medium py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {Array.from({ length: startWeekday }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calYear}-${String(calMonthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayBookings = bookingsByDate[dateStr] || [];
                const hasBookings = dayBookings.length > 0;
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                return (
                  <button key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`min-h-[70px] md:min-h-[100px] rounded-lg md:rounded-xl p-1 md:p-1.5 text-left transition-all relative flex flex-col ${
                      isSelected ? "bg-sky-blue-light/40 ring-2 ring-sky-blue-light" :
                      hasBookings ? "bg-bright-lavender/10 hover:bg-bright-lavender/20" :
                      "bg-ink/[0.03] hover:bg-ink/[0.06]"
                    } ${isToday && !isSelected ? "ring-2 ring-bright-lavender" : ""}`}>
                    <span className={`text-[0.7rem] md:text-[0.85rem] font-medium ${hasBookings ? "text-ink" : "text-ink-soft"}`}>{day}</span>
                    {dayBookings.length > 0 && (
                      <div className="flex-1 mt-0.5 space-y-0.5 overflow-hidden">
                        {dayBookings.slice(0, 3).map((b) => (
                          <div key={b.id} className="text-[0.55rem] md:text-[0.65rem] leading-tight truncate px-1 py-0.5 rounded bg-bright-lavender/20 text-ink">
                            {b.time_slot} {b.name}
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <div className="text-[0.55rem] md:text-[0.65rem] text-ink-soft px-1">+{dayBookings.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Booking list below calendar */}
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
            {selectedDate ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-display text-[1.1rem]">
                      {new Date(selectedDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                    </h2>
                    <p className="text-[0.85rem] text-ink-soft mt-0.5">{selectedDateBookings.length} booking{selectedDateBookings.length !== 1 ? "s" : ""}</p>
                  </div>
                  <button onClick={() => setSelectedDate(null)} className="text-[0.8rem] text-ink-soft hover:text-ink">Clear selection</button>
                </div>
                {selectedDateBookings.length === 0 ? (
                  <div className="text-center py-8 text-ink-soft text-[0.9rem]">No bookings on this date.</div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {selectedDateBookings.map((b) => (
                      <BookingCard key={b.id} b={b} onEdit={() => startEdit(b)} onCancel={() => cancelBooking(b.id, b.name)} cancelling={cancellingId === b.id} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="font-display text-[1.1rem] mb-1">All Bookings ({filteredBookings.length})</h2>
                <p className="text-[0.85rem] text-ink-soft mb-5">Click a date on the calendar to filter, or browse all bookings below.</p>
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-8 text-ink-soft text-[0.9rem]">No bookings found.</div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredBookings.map((b) => (
                      <BookingCard key={b.id} b={b} onEdit={() => startEdit(b)} onCancel={() => cancelBooking(b.id, b.name)} cancelling={cancellingId === b.id} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-8 shadow-sm">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-10 text-ink-soft text-[0.9rem]">No bookings found{searchQuery || payFilter !== "all" ? " matching your filters" : ""}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-[0.75rem] text-ink-soft uppercase tracking-wider">
                    <th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Time</th><th className="pb-3 pr-4">People</th>
                    <th className="pb-3 pr-4">Price</th><th className="pb-3 pr-4">Payment</th><th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Contact</th><th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="border-t border-ink/[0.08]">
                      <td className="py-3 pr-4 text-[0.9rem]">{new Date(b.date).toLocaleDateString("en-GB")}</td>
                      <td className="py-3 pr-4 text-[0.9rem]">{b.time_slot}</td>
                      <td className="py-3 pr-4 text-[0.9rem]">{b.people}</td>
                      <td className="py-3 pr-4 text-[0.9rem]">£{Number(b.total_price).toFixed(2)}</td>
                      <td className="py-3 pr-4 text-[0.9rem]">
                        <span className={`px-2 py-0.5 rounded-full text-[0.75rem] font-medium ${
                          b.payment_status === "paid" ? "bg-green-100 text-green-700" :
                          b.payment_status === "refunded" ? "bg-orange-100 text-orange-700" :
                          b.payment_status === "expired" ? "bg-red-100 text-red-700" : "bg-ink/5 text-ink-soft"
                        }`}>{b.payment_status || "unpaid"}</span>
                      </td>
                      <td className="py-3 pr-4 text-[0.9rem]">{b.name}</td>
                      <td className="py-3 pr-4 text-[0.9rem]"><div>{b.email}</div>{b.phone && <div className="text-ink-soft text-[0.8rem]">{b.phone}</div>}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(b)} className="px-3 py-1.5 rounded-lg bg-sky-blue-light/30 text-ink text-[0.8rem] hover:bg-sky-blue-light/50 transition-colors">Edit</button>
                          <button onClick={() => cancelBooking(b.id, b.name)} disabled={cancellingId === b.id} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] hover:bg-red-200 transition-colors disabled:opacity-60">
                            {cancellingId === b.id ? "..." : "Cancel"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editingBooking && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditingBooking(null)}>
          <div className="bg-white rounded-[24px] p-8 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-[1.2rem] mb-5">Edit Booking</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Date</label>
                <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Time Slot</label>
                <select value={editForm.time_slot} onChange={(e) => setEditForm({ ...editForm, time_slot: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light">
                  {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">People</label>
                <input type="number" min="1" value={editForm.people} onChange={(e) => setEditForm({ ...editForm, people: parseInt(e.target.value) || 1 })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone</label>
                <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5">Admin Notes</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} placeholder="Internal notes about this booking..." className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light resize-none" />
              </div>
            </div>
            {editMsg && <p className={`text-[0.85rem] mt-3 ${editMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>{editMsg}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={saveEdit} disabled={savingEdit} className="flex-1 px-5 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60">{savingEdit ? "Saving..." : "Save Changes"}</button>
              <button onClick={() => setEditingBooking(null)} className="px-5 py-2.5 rounded-full bg-ink/5 text-ink text-[0.9rem] font-medium hover:bg-ink/10">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingCard({ b, onEdit, onCancel, cancelling }: { b: Booking; onEdit: () => void; onCancel: () => void; cancelling: boolean }) {
  return (
    <div className="border border-ink/[0.08] rounded-xl p-4 hover:border-ink/15 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-display text-[1rem]">{b.time_slot}</span>
          <span className="text-[0.8rem] text-ink-soft ml-2">{b.people} {b.people === 1 ? "person" : "people"}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-medium ${
          b.payment_status === "paid" ? "bg-green-100 text-green-700" :
          b.payment_status === "refunded" ? "bg-orange-100 text-orange-700" :
          b.payment_status === "expired" ? "bg-red-100 text-red-700" : "bg-ink/5 text-ink-soft"
        }`}>{b.payment_status || "unpaid"}</span>
      </div>
      <div className="text-[0.9rem] font-medium">{b.name}</div>
      <div className="text-[0.8rem] text-ink-soft">{b.email}</div>
      {b.phone && <div className="text-[0.8rem] text-ink-soft">{b.phone}</div>}
      <div className="text-[0.85rem] font-display mt-1">£{Number(b.total_price).toFixed(2)}</div>
      {b.notes && <div className="text-[0.8rem] text-ink-soft bg-ink/[0.04] rounded-lg px-3 py-2 mt-2">📝 {b.notes}</div>}
      <div className="flex gap-2 mt-3">
        <button onClick={onEdit} className="px-3 py-1.5 rounded-lg bg-sky-blue-light/30 text-ink text-[0.8rem] hover:bg-sky-blue-light/50 transition-colors">Edit</button>
        <button onClick={onCancel} disabled={cancelling} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] hover:bg-red-200 transition-colors disabled:opacity-60">{cancelling ? "Cancelling..." : "Cancel"}</button>
      </div>
    </div>
  );
}
