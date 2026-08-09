"use client";

import { useEffect, useState } from "react";
import { supabase, type Booking, type BookingSettings } from "@/lib/supabase";

export default function BookingsAdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [price, setPrice] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    loadBookings();
  }, [filter]);

  useEffect(() => {
    supabase.from("booking_settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) setPrice(String((data as BookingSettings).price_per_person));
    });
  }, []);

  async function savePrice() {
    const value = parseFloat(price);
    if (isNaN(value) || value < 0) {
      alert("Please enter a valid price.");
      return;
    }
    setSavingPrice(true);
    await supabase.from("booking_settings").update({ price_per_person: value }).eq("id", 1);
    setSavingPrice(false);
  }

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
    if (!confirm(`Cancel the booking for "${name}"? This cannot be undone.`)) return;
    await supabase.from("bookings").delete().eq("id", id);
    loadBookings();
  }

  const totalPeople = bookings.reduce((sum, b) => sum + b.people, 0);
  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_price), 0);

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="font-display text-[1.6rem] md:text-[2rem]">Bookings</h1>
          <p className="text-ink-soft text-[0.9rem] mt-1">Manage all slime-making session bookings.</p>
        </div>
        <div className="flex gap-2">
          {(["upcoming", "past", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-[0.85rem] font-medium capitalize transition-all ${
                filter === f ? "bg-sky-blue-light text-ink shadow-sm" : "bg-white text-ink hover:bg-sky-blue-light/20"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[20px] p-7 shadow-sm mb-8">
        <h2 className="font-display text-[1.1rem] mb-1">Price Per Person</h2>
        <p className="text-[0.85rem] text-ink-soft mb-4">Used to calculate booking totals on the public booking page.</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center border-2 border-ink/15 rounded-xl px-4 py-2.5 w-40">
            <span className="text-ink-soft mr-1">£</span>
            <input
              type="number"
              step="0.50"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full outline-none text-sm"
            />
          </div>
          <button
            onClick={savePrice}
            disabled={savingPrice}
            className="px-6 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all"
          >
            {savingPrice ? "Saving..." : "Save Price"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-[20px] p-6 shadow-sm">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Bookings Shown</div>
          <div className="font-display text-[1.8rem]">{loading ? "--" : bookings.length}</div>
        </div>
        <div className="bg-white rounded-[20px] p-6 shadow-sm">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Total People</div>
          <div className="font-display text-[1.8rem]">{loading ? "--" : totalPeople}</div>
        </div>
        <div className="bg-white rounded-[20px] p-6 shadow-sm">
          <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Revenue</div>
          <div className="font-display text-[1.8rem]">{loading ? "--" : `£${totalRevenue.toFixed(2)}`}</div>
        </div>
      </div>

      <div className="bg-white rounded-[20px] p-8 shadow-sm">
        {loading ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">No {filter !== "all" ? filter : ""} bookings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[0.75rem] text-ink-soft uppercase tracking-wider">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 pr-4">People</th>
                  <th className="pb-3 pr-4">Price</th>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Contact</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-ink/[0.08]">
                    <td className="py-3 pr-4 text-[0.9rem]">{new Date(b.date).toLocaleDateString("en-GB")}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">{b.time_slot}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">{b.people}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">£{Number(b.total_price).toFixed(2)}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">{b.name}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">
                      <div>{b.email}</div>
                      {b.phone && <div className="text-ink-soft text-[0.8rem]">{b.phone}</div>}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => cancelBooking(b.id, b.name)}
                        className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] hover:bg-red-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
