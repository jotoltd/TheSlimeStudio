"use client";

import { useEffect, useState } from "react";
import { supabase, type Booking, type BookingSettings, TIME_SLOTS as DEFAULT_SLOTS, SLOT_CAPACITY as DEFAULT_CAP, MAX_DAILY_BOOKINGS as DEFAULT_MAX } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";

type ViewMode = "calendar" | "table";

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

export default function BookingsAdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({ date: "", time_slot: "", people: "1", name: "", email: "", phone: "", notes: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [addForm, setAddForm] = useState({ date: todayISO(), time_slot: "", people: "1", name: "", email: "", phone: "", notes: "", is_party: false, total_price: "0" });
  const [savingAdd, setSavingAdd] = useState(false);
  const [addMsg, setAddMsg] = useState("");
  const [addSlotAvailability, setAddSlotAvailability] = useState<Record<string, number>>({});
  const [addDailyUsed, setAddDailyUsed] = useState(0);
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [slotCapacity, setSlotCapacity] = useState(DEFAULT_CAP);
  const [maxDaily, setMaxDaily] = useState(DEFAULT_MAX);
  const [searchQuery, setSearchQuery] = useState("");
  const [payFilter, setPayFilter] = useState<"all" | "paid" | "unpaid" | "refunded" | "expired">("all");
  const [partyFilter, setPartyFilter] = useState<"all" | "party" | "regular">("all");
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showCustomerLookup, setShowCustomerLookup] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Booking[]>([]);
  const [duplicates, setDuplicates] = useState<{ key: string; bookings: Booking[] }[]>([]);
  const [sortField, setSortField] = useState<"date" | "time_slot" | "people" | "total_price" | "name" | "payment_status" | "created_at">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  useEffect(() => { loadBookings(); }, [filter]);

  useEffect(() => {
    if (showAddBooking) loadAddAvailability(addForm.date);
  }, [showAddBooking, addForm.date]);

  useEffect(() => {
    // Detect duplicates: same name + date + time_slot
    const seen: Record<string, Booking[]> = {};
    bookings.forEach((b) => {
      const key = `${b.name.toLowerCase()}|${b.date}|${b.time_slot}`;
      if (!seen[key]) seen[key] = [];
      seen[key].push(b);
    });
    setDuplicates(Object.entries(seen).filter(([, bs]) => bs.length > 1).map(([key, bs]) => ({ key, bookings: bs })));
  }, [bookings]);

  useEffect(() => {
    supabase.from("booking_settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) {
        const s = data as BookingSettings;
        if (s.time_slots && s.time_slots.length > 0) { setTimeSlots(s.time_slots); }
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

  async function cancelBooking(id: string, name: string, paymentStatus?: string) {
    const isPaid = paymentStatus === "paid";
    const msg = isPaid
      ? `Cancel the booking for "${name}"? This will refund the customer via Stripe and send them a cancellation email. This cannot be undone.`
      : `Cancel the booking for "${name}"? This will delete it and send a cancellation email. This cannot be undone.`;
    if (!confirm(msg)) return;
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
    setEditForm({ date: b.date, time_slot: b.time_slot, people: String(b.people), name: b.name, email: b.email, phone: b.phone || "", notes: b.notes || "" });
    setEditMsg("");
  }

  async function saveEdit() {
    if (!editingBooking) return;
    setSavingEdit(true); setEditMsg("");
    const { error } = await supabase.from("bookings").update({
      date: editForm.date, time_slot: editForm.time_slot, people: parseInt(editForm.people) || 1,
      name: editForm.name, email: editForm.email, phone: editForm.phone || null,
      notes: editForm.notes || null,
    }).eq("id", editingBooking.id);
    setSavingEdit(false);
    if (error) { setEditMsg("Failed to save: " + error.message); }
    else { setEditMsg("Booking updated successfully!"); setEditingBooking(null); loadBookings(); }
  }

  async function loadAddAvailability(forDate: string) {
    const { data } = await supabase.from("bookings").select("time_slot, people").eq("date", forDate).eq("payment_status", "paid");
    const used: Record<string, number> = {};
    let dailyTotal = 0;
    (data || []).forEach((b: { time_slot: string; people: number }) => {
      used[b.time_slot] = (used[b.time_slot] || 0) + b.people;
      dailyTotal += b.people;
    });
    setAddSlotAvailability(used);
    setAddDailyUsed(dailyTotal);
  }

  async function updateAttendance(bookingId: string, status: string) {
    await fetch("/api/update-attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, attendance_status: status }),
    });
    setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, attendance_status: status } : b));
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selectedBookings.size} booking(s)? This cannot be undone.`)) return;
    const res = await fetch("/api/bulk-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingIds: Array.from(selectedBookings), action: "delete" }),
    });
    if (res.ok) {
      setSelectedBookings(new Set());
      setBulkMode(false);
      loadBookings();
    }
  }

  function toggleSelection(id: string) {
    setSelectedBookings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedBookings(new Set(filteredBookings.map((b) => b.id)));
  }

  async function searchCustomers() {
    const q = customerQuery.toLowerCase().trim();
    if (!q) { setCustomerResults([]); return; }
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .neq("payment_status", "refunded")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("date", { ascending: false })
      .limit(50);
    if (data) setCustomerResults(data as Booking[]);
  }

  async function saveAddBooking() {
    if (!addForm.date || !addForm.time_slot || !addForm.name) {
      setAddMsg("Please fill in date, time slot and name.");
      return;
    }
    setSavingAdd(true); setAddMsg("");
    try {
      const res = await fetch("/api/add-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, people: parseInt(addForm.people) || 1, total_price: parseFloat(addForm.total_price) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddMsg(data.error || "Failed to add booking");
      } else {
        setAddMsg("");
        setShowAddBooking(false);
        setAddForm({ date: todayISO(), time_slot: "", people: "1", name: "", email: "", phone: "", notes: "", is_party: false, total_price: "0" });
        loadBookings();
      }
    } catch {
      setAddMsg("Network error — please try again");
    }
    setSavingAdd(false);
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
      const status = b.payment_status || "unpaid";
      if (status !== payFilter) return false;
    }
    if (partyFilter === "party" && !b.is_party) return false;
    if (partyFilter === "regular" && b.is_party) return false;
    return true;
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todaysBookings = bookings.filter((b) => b.date === todayStr && b.payment_status !== "refunded").sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const bookingsByDate: Record<string, Booking[]> = {};
  filteredBookings.forEach((b) => { const d = b.date; if (!bookingsByDate[d]) bookingsByDate[d] = []; bookingsByDate[d].push(b); });
  const selectedDateBookings = selectedDate ? (bookingsByDate[selectedDate] || []) : [];
  const totalPeople = filteredBookings.reduce((sum, b) => sum + b.people, 0);
  const totalRevenue = filteredBookings.filter((b) => b.payment_status === "paid").reduce((sum, b) => sum + Number(b.total_price), 0);

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "date": cmp = a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot); break;
      case "time_slot": cmp = a.time_slot.localeCompare(b.time_slot); break;
      case "people": cmp = a.people - b.people; break;
      case "total_price": cmp = Number(a.total_price) - Number(b.total_price); break;
      case "name": cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase()); break;
      case "payment_status": cmp = (a.payment_status || "unpaid").localeCompare(b.payment_status || "unpaid"); break;
      case "created_at": cmp = a.created_at.localeCompare(b.created_at); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <PageHeader
        title="Bookings"
        subtitle="Manage all slime-making session bookings."
        actions={
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setShowAddBooking(true)} className="px-3 md:px-4 py-2 rounded-full text-[0.8rem] md:text-[0.85rem] font-medium bg-bright-lavender text-white hover:opacity-90 transition-all">+ Add Booking</button>
            <button onClick={() => setShowCustomerLookup(true)} className="px-3 md:px-4 py-2 rounded-full text-[0.8rem] md:text-[0.85rem] font-medium bg-white text-ink hover:bg-sky-blue-light/20 transition-all">Customer Lookup</button>
            <a href="/api/export-ical" className="px-3 md:px-4 py-2 rounded-full text-[0.8rem] md:text-[0.85rem] font-medium bg-white text-ink hover:bg-sky-blue-light/20 transition-all">iCal Export</a>
            <button onClick={() => { setBulkMode(!bulkMode); setSelectedBookings(new Set()); }} className={`px-3 md:px-4 py-2 rounded-full text-[0.8rem] md:text-[0.85rem] font-medium transition-all ${bulkMode ? "bg-ink text-white" : "bg-white text-ink hover:bg-sky-blue-light/20"}`}>{bulkMode ? "Exit Bulk" : "Bulk Select"}</button>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="bg-white rounded-[16px] p-3 md:p-4 shadow-sm mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, date, phone..."
            className="flex-1 min-w-[150px] md:min-w-[180px] px-4 py-2 border-2 border-ink/10 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
          />
          <div className="flex gap-1.5">
            {(["upcoming", "past", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-[0.8rem] font-medium capitalize transition-all ${filter === f ? "bg-sky-blue-light text-ink shadow-sm" : "bg-ink/5 text-ink-soft hover:bg-ink/10"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <select
            value={payFilter}
            onChange={(e) => setPayFilter(e.target.value as typeof payFilter)}
            className="px-3 py-2 border-2 border-ink/10 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light bg-white"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="refunded">Refunded</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value as typeof partyFilter)}
            className="px-3 py-2 border-2 border-ink/10 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light bg-white"
          >
            <option value="all">All Types</option>
            <option value="regular">Sessions</option>
            <option value="party">Parties</option>
          </select>
          <div className="flex rounded-lg overflow-hidden border border-ink/10 ml-auto">
            <button onClick={() => setViewMode("calendar")} className={`px-3 py-2 text-[0.8rem] font-medium transition-colors ${viewMode === "calendar" ? "bg-ink text-white" : "bg-white text-ink hover:bg-ink/5"}`}>Calendar</button>
            <button onClick={() => setViewMode("table")} className={`px-3 py-2 text-[0.8rem] font-medium transition-colors ${viewMode === "table" ? "bg-ink text-white" : "bg-white text-ink hover:bg-ink/5"}`}>Table</button>
          </div>
        </div>
      </div>

      {duplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="font-display text-[0.95rem] text-amber-800 mb-2">Duplicate Bookings Detected ({duplicates.length})</h3>
          <div className="space-y-1">
            {duplicates.slice(0, 5).map(({ key, bookings: bs }) => {
              const [name, date, time] = key.split("|");
              return (
                <div key={key} className="text-[0.85rem] text-amber-700">
                  <span className="font-medium">{name}</span> on {date} at {time} — {bs.length} bookings
                  <button onClick={() => { setSearchQuery(name); }} className="ml-2 text-amber-800 underline hover:text-amber-900">View</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {todaysBookings.length > 0 && (
        <div className="bg-white rounded-[20px] p-5 md:p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[1.1rem]">Today's Bookings ({todaysBookings.length})</h2>
            <span className="text-[0.85rem] text-ink-soft">{todaysBookings.reduce((s, b) => s + b.people, 0)} people total</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {todaysBookings.map((b) => (
              <div key={b.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-[0.85rem] ${b.is_party ? "bg-bright-lavender/10 border border-bright-lavender/20" : "bg-ink/[0.03]"}`}>
                <div>
                  <span className="font-display">{b.time_slot}</span>
                  <span className="ml-2 font-medium">{b.name}</span>
                  <span className="text-ink-soft ml-1">({b.people})</span>
                  {b.is_party && <span className="ml-1 text-[0.7rem] bg-bright-lavender/20 px-1.5 py-0.5 rounded-full">Party</span>}
                </div>
                <div className="flex items-center gap-1">
                  {b.attendance_status === "attended" && <span className="text-green-600 text-[0.75rem]">✓ Attended</span>}
                  {b.attendance_status === "no_show" && <span className="text-red-600 text-[0.75rem]">✗ No-show</span>}
                  {(!b.attendance_status || b.attendance_status === "pending") && (
                    <>
                      <button onClick={() => updateAttendance(b.id, "attended")} className="text-green-600 hover:bg-green-100 rounded px-1.5 py-0.5 text-[0.75rem]">✓</button>
                      <button onClick={() => updateAttendance(b.id, "no_show")} className="text-red-600 hover:bg-red-100 rounded px-1.5 py-0.5 text-[0.75rem]">✗</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bulkMode && (
        <div className="bg-ink text-white rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[0.9rem]">{selectedBookings.size} selected</span>
            <button onClick={selectAllVisible} className="text-[0.8rem] underline hover:text-sky-blue-light">Select all visible</button>
            <button onClick={() => setSelectedBookings(new Set())} className="text-[0.8rem] underline hover:text-sky-blue-light">Clear</button>
          </div>
          <button onClick={bulkDelete} disabled={selectedBookings.size === 0} className="px-4 py-2 rounded-full bg-red-500 text-white text-[0.85rem] font-medium disabled:opacity-40 hover:bg-red-600 transition-colors">Delete Selected</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8">
        <div className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-6 shadow-sm border-l-4 border-sky-blue-light">
          <div className="text-[0.65rem] md:text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1 md:mb-2">Bookings</div>
          <div className="font-display text-[1.2rem] md:text-[1.8rem]">{loading ? "--" : filteredBookings.length}</div>
        </div>
        <div className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-6 shadow-sm border-l-4 border-bright-lavender">
          <div className="text-[0.65rem] md:text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1 md:mb-2">Total People</div>
          <div className="font-display text-[1.2rem] md:text-[1.8rem]">{loading ? "--" : totalPeople}</div>
        </div>
        <div className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-6 shadow-sm border-l-4 border-green-400">
          <div className="text-[0.65rem] md:text-[0.75rem] text-ink-soft uppercase tracking-wider mb-1 md:mb-2">Revenue</div>
          <div className="font-display text-[1.2rem] md:text-[1.8rem]">{loading ? "--" : `£${totalRevenue.toFixed(2)}`}</div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-[20px] p-8 shadow-sm text-center">
          <div className="inline-block w-6 h-6 border-2 border-ink/20 border-t-sky-blue-light rounded-full animate-spin mb-2"></div>
          <div className="text-ink-soft text-[0.9rem]">Loading bookings...</div>
        </div>
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
                      <BookingCard key={b.id} b={b} onEdit={() => startEdit(b)} onCancel={() => cancelBooking(b.id, b.name, b.payment_status)} cancelling={cancellingId === b.id} />
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
                      <BookingCard key={b.id} b={b} onEdit={() => startEdit(b)} onCancel={() => cancelBooking(b.id, b.name, b.payment_status)} cancelling={cancellingId === b.id} />
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
            <div className="text-center py-10 text-ink-soft text-[0.9rem]">No bookings found{searchQuery || payFilter !== "all" || partyFilter !== "all" ? " matching your filters" : ""}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-[0.7rem] text-ink-soft uppercase tracking-wider border-b-2 border-ink/[0.08]">
                    {bulkMode && <th className="pb-3 pr-2"></th>}
                    <th className="pb-3 pr-4 font-semibold cursor-pointer hover:text-ink select-none" onClick={() => toggleSort("date")}>Session Date {sortField === "date" && (sortDir === "asc" ? "↑" : "↓")}</th>
                    <th className="pb-3 pr-4 font-semibold cursor-pointer hover:text-ink select-none" onClick={() => toggleSort("time_slot")}>Time {sortField === "time_slot" && (sortDir === "asc" ? "↑" : "↓")}</th>
                    <th className="pb-3 pr-4 font-semibold cursor-pointer hover:text-ink select-none" onClick={() => toggleSort("people")}>People {sortField === "people" && (sortDir === "asc" ? "↑" : "↓")}</th>
                    <th className="pb-3 pr-4 font-semibold cursor-pointer hover:text-ink select-none" onClick={() => toggleSort("total_price")}>Price {sortField === "total_price" && (sortDir === "asc" ? "↑" : "↓")}</th>
                    <th className="pb-3 pr-4 font-semibold cursor-pointer hover:text-ink select-none" onClick={() => toggleSort("payment_status")}>Payment {sortField === "payment_status" && (sortDir === "asc" ? "↑" : "↓")}</th>
                    <th className="pb-3 pr-4 font-semibold cursor-pointer hover:text-ink select-none" onClick={() => toggleSort("name")}>Customer {sortField === "name" && (sortDir === "asc" ? "↑" : "↓")}</th>
                    <th className="pb-3 pr-4 font-semibold cursor-pointer hover:text-ink select-none" onClick={() => toggleSort("created_at")}>Booked {sortField === "created_at" && (sortDir === "asc" ? "↑" : "↓")}</th>
                    <th className="pb-3 pr-4 font-semibold">Attendance</th>
                    <th className="pb-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBookings.map((b) => (
                    <tr key={b.id} className={`border-b border-ink/[0.05] hover:bg-ink/[0.02] transition-colors ${bulkMode && selectedBookings.has(b.id) ? "bg-sky-blue-light/20" : ""}`}>
                      {bulkMode && (
                        <td className="py-3 pr-2">
                          <input type="checkbox" checked={selectedBookings.has(b.id)} onChange={() => toggleSelection(b.id)} className="w-4 h-4" />
                        </td>
                      )}
                      <td className="py-3.5 pr-4">
                        <div className="text-[0.9rem] font-medium text-ink">{new Date(b.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                        <div className="text-[0.75rem] text-ink-soft">{new Date(b.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" })}</div>
                      </td>
                      <td className="py-3.5 pr-4 text-[0.9rem] font-display">{b.time_slot}</td>
                      <td className="py-3.5 pr-4 text-[0.9rem]">{b.people}</td>
                      <td className="py-3.5 pr-4 text-[0.9rem] font-display">£{Number(b.total_price).toFixed(2)}</td>
                      <td className="py-3.5 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-[0.75rem] font-medium ${
                          b.payment_status === "paid" ? "bg-green-100 text-green-700" :
                          b.payment_status === "refunded" ? "bg-orange-100 text-orange-700" :
                          b.payment_status === "expired" ? "bg-red-100 text-red-700" : "bg-ink/5 text-ink-soft"
                        }`}>{b.payment_status || "unpaid"}</span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="text-[0.9rem] font-medium text-ink">
                          {b.name}
                          {b.is_party && <span className="ml-1.5 text-[0.6rem] bg-bright-lavender/20 px-1.5 py-0.5 rounded-full align-middle">Party</span>}
                        </div>
                        <div className="text-[0.8rem] text-ink-soft">{b.email}</div>
                        {b.phone && <div className="text-[0.75rem] text-ink-soft">{b.phone}</div>}
                        {b.notes && <div className="text-[0.7rem] text-ink-soft mt-0.5 italic">📝 {b.notes.length > 30 ? b.notes.slice(0, 30) + "…" : b.notes}</div>}
                      </td>
                      <td className="py-3.5 pr-4 text-[0.8rem] text-ink-soft">{new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                      <td className="py-3.5 pr-4">
                        <select
                          value={b.attendance_status || "pending"}
                          onChange={(e) => updateAttendance(b.id, e.target.value)}
                          className={`text-[0.75rem] px-2 py-1 rounded-lg border-0 cursor-pointer ${
                            b.attendance_status === "attended" ? "bg-green-100 text-green-700" :
                            b.attendance_status === "no_show" ? "bg-red-100 text-red-700" :
                            "bg-ink/5 text-ink-soft"
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="attended">Attended</option>
                          <option value="no_show">No-show</option>
                        </select>
                      </td>
                      <td className="py-3.5">
                        <div className="flex gap-1.5">
                          <button onClick={() => startEdit(b)} className="px-2.5 py-1.5 rounded-lg bg-sky-blue-light/30 text-ink text-[0.8rem] hover:bg-sky-blue-light/50 transition-colors">Edit</button>
                          <button onClick={() => cancelBooking(b.id, b.name, b.payment_status)} disabled={cancellingId === b.id} className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] hover:bg-red-200 transition-colors disabled:opacity-60">
                            {cancellingId === b.id ? "…" : "Cancel"}
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
          <div className="bg-white rounded-[24px] p-6 md:p-8 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                <input type="text" inputMode="numeric" value={editForm.people} onChange={(e) => setEditForm({ ...editForm, people: e.target.value.replace(/[^0-9]/g, "") })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
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

      {showAddBooking && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddBooking(false)}>
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg mb-4">Add Manual Booking</h2>
            <p className="text-[0.85rem] text-ink-soft mb-4">For bookings made via email, phone or messages (e.g. parties).</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Date</label>
                <input type="date" value={addForm.date} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Time Slot</label>
                <select value={addForm.time_slot} onChange={(e) => setAddForm({ ...addForm, time_slot: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light">
                  <option value="">Select time...</option>
                  {timeSlots.map((s) => {
                    const used = addSlotAvailability[s] || 0;
                    const remaining = slotCapacity - used;
                    return (
                      <option key={s} value={s} disabled={remaining <= 0}>
                        {s} — {remaining > 0 ? `${remaining} left` : "FULL"}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">People</label>
                <input type="text" inputMode="numeric" value={addForm.people} onChange={(e) => setAddForm({ ...addForm, people: e.target.value.replace(/[^0-9]/g, "") })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
                {addForm.time_slot && (() => {
                  const remaining = slotCapacity - (addSlotAvailability[addForm.time_slot] || 0);
                  if (parseInt(addForm.people) > remaining) {
                    return <p className="text-[0.8rem] text-red-600 mt-1">Only {remaining} spot{remaining === 1 ? "" : "s"} left at this time</p>;
                  }
                  return <p className="text-[0.8rem] text-green-600 mt-1">{remaining} spot{remaining === 1 ? "" : "s"} left at this time</p>;
                })()}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email (optional)</label>
                <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone (optional)</label>
                <input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5">Total Price (£) <span className="text-ink-soft font-normal">(0 for walk-ins/parties paid separately)</span></label>
                <input type="text" inputMode="decimal" value={addForm.total_price} onChange={(e) => setAddForm({ ...addForm, total_price: e.target.value.replace(/[^0-9.]/g, "") })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5">Notes (optional)</label>
                <textarea value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} rows={2} placeholder="e.g. Party booking via Instagram" className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light resize-none" />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={addForm.is_party} onChange={(e) => setAddForm({ ...addForm, is_party: e.target.checked })} />
                  This is a party booking
                </label>
              </div>
            </div>
            <div className="mt-4 bg-ink/[0.03] rounded-xl p-3 text-[0.8rem] text-ink-soft">
              <span className="font-medium">Daily usage:</span> {addDailyUsed} / {maxDaily} people booked for {new Date(addForm.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
              {addForm.time_slot && (() => {
                const used = addSlotAvailability[addForm.time_slot] || 0;
                return <> · <span className="font-medium">{addForm.time_slot}:</span> {used} / {slotCapacity} people</>;
              })()}
            </div>
            {addMsg && <p className={`text-[0.85rem] mt-3 ${addMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>{addMsg}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={saveAddBooking} disabled={savingAdd} className="flex-1 px-5 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60">{savingAdd ? "Adding..." : "Add Booking"}</button>
              <button onClick={() => setShowAddBooking(false)} className="px-5 py-2.5 rounded-full bg-ink/5 text-ink text-[0.9rem] font-medium hover:bg-ink/10">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showCustomerLookup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCustomerLookup(false)}>
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg mb-4">Customer Lookup</h2>
            <p className="text-[0.85rem] text-ink-soft mb-4">Search by name, email, or phone to see all bookings for a customer.</p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchCustomers()}
                placeholder="Enter name, email, or phone..."
                className="flex-1 px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
              <button onClick={searchCustomers} className="px-5 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium">Search</button>
            </div>
            {customerResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-[0.85rem] text-ink-soft">{customerResults.length} booking(s) found</p>
                {customerResults.map((b) => (
                  <div key={b.id} className={`flex items-center justify-between rounded-lg px-4 py-3 ${b.is_party ? "bg-bright-lavender/10" : "bg-ink/[0.03]"}`}>
                    <div>
                      <div className="text-[0.9rem] font-medium">{b.name} {b.is_party && <span className="text-[0.65rem] bg-bright-lavender/20 px-1.5 py-0.5 rounded-full ml-1">Party</span>}</div>
                      <div className="text-[0.8rem] text-ink-soft">{new Date(b.date).toLocaleDateString("en-GB")} at {b.time_slot} · {b.people} people · £{Number(b.total_price).toFixed(2)}</div>
                      <div className="text-[0.75rem] text-ink-soft">{b.email} {b.phone && `· ${b.phone}`}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-medium ${
                      b.payment_status === "paid" ? "bg-green-100 text-green-700" :
                      b.payment_status === "refunded" ? "bg-orange-100 text-orange-700" : "bg-ink/5 text-ink-soft"
                    }`}>{b.payment_status || "unpaid"}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowCustomerLookup(false)} className="px-5 py-2.5 rounded-full bg-ink/5 text-ink text-[0.9rem] font-medium hover:bg-ink/10">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingCard({ b, onEdit, onCancel, cancelling }: { b: Booking; onEdit: () => void; onCancel: () => void; cancelling: boolean }) {
  const bookedDate = new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const sessionDate = new Date(b.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return (
    <div className={`border rounded-xl p-4 hover:border-ink/15 transition-colors ${b.is_party ? "border-bright-lavender/30 bg-bright-lavender/[0.03]" : "border-ink/[0.08]"}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-[1rem]">{b.time_slot}</span>
            {b.is_party && <span className="text-[0.65rem] bg-bright-lavender/20 px-1.5 py-0.5 rounded-full">Party</span>}
          </div>
          <div className="text-[0.8rem] text-ink-soft mt-0.5">{sessionDate}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {b.attendance_status === "attended" && <span className="text-[0.65rem] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Attended</span>}
          {b.attendance_status === "no_show" && <span className="text-[0.65rem] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">No-show</span>}
          <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-medium ${
            b.payment_status === "paid" ? "bg-green-100 text-green-700" :
            b.payment_status === "refunded" ? "bg-orange-100 text-orange-700" :
            b.payment_status === "expired" ? "bg-red-100 text-red-700" : "bg-ink/5 text-ink-soft"
          }`}>{b.payment_status || "unpaid"}</span>
        </div>
      </div>
      <div className="space-y-1 mb-3">
        <div className="text-[0.9rem] font-medium">{b.name} <span className="text-[0.75rem] text-ink-soft font-normal">· {b.people} {b.people === 1 ? "person" : "people"}</span></div>
        <div className="text-[0.8rem] text-ink-soft">{b.email}</div>
        {b.phone && <div className="text-[0.8rem] text-ink-soft">{b.phone}</div>}
      </div>
      <div className="flex items-center justify-between text-[0.8rem] mb-3">
        <span className="font-display text-ink">£{Number(b.total_price).toFixed(2)}</span>
        <span className="text-ink-soft text-[0.7rem]">Booked {bookedDate}</span>
      </div>
      {b.notes && <div className="text-[0.8rem] text-ink-soft bg-ink/[0.04] rounded-lg px-3 py-2 mb-3">📝 {b.notes}</div>}
      <div className="flex gap-2">
        <button onClick={onEdit} className="px-3 py-1.5 rounded-lg bg-sky-blue-light/30 text-ink text-[0.8rem] hover:bg-sky-blue-light/50 transition-colors">Edit</button>
        <button onClick={onCancel} disabled={cancelling} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] hover:bg-red-200 transition-colors disabled:opacity-60">{cancelling ? "Cancelling..." : "Cancel"}</button>
      </div>
    </div>
  );
}
