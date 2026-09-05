"use client";

import { useEffect, useState } from "react";

type CustomerBooking = {
  id: string;
  date: string;
  time_slot: string;
  people: number;
  total_price: number;
  payment_status: string;
  is_party: boolean;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  terms_agreed_at: string | null;
  bookingCount: number;
  totalSpent: number;
  upcomingBookings: number;
  loyaltyStamps: number;
  loyaltyRewards: number;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  async function openCustomer(c: Customer) {
    setSelected(c);
    setCustomerBookings([]);
    setLoadingBookings(true);
    try {
      const res = await fetch(`/api/admin/customers?email=${encodeURIComponent(c.email)}`);
      const data = await res.json();
      setCustomerBookings(data.bookings || []);
    } catch {}
    setLoadingBookings(false);
  }

  useEffect(() => {
    loadCustomers();
  }, [page]);

  async function loadCustomers() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/customers?${params}`);
    const data = await res.json();
    if (data.customers) {
      setCustomers(data.customers);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadCustomers();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Customers</h1>
          <p className="text-sm text-ink-soft mt-1">{total} registered {total === 1 ? "customer" : "customers"}</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
        />
        <button type="submit" className="px-5 py-2.5 rounded-xl bg-sky-blue-light text-ink text-sm font-medium hover:opacity-90">
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(""); setPage(1); }}
            className="px-4 py-2.5 rounded-xl bg-ink/5 text-ink text-sm hover:bg-ink/10"
          >
            Clear
          </button>
        )}
      </form>

      {loading ? (
        <div className="text-center py-12 text-ink-soft">Loading customers...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-ink-soft">
          {search ? "No customers found matching your search." : "No customers yet."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-ink-soft text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold text-center">Bookings</th>
                  <th className="px-4 py-3 font-semibold text-center">Upcoming</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Spent</th>
                  <th className="px-4 py-3 font-semibold text-center">Stamps</th>
                  <th className="px-4 py-3 font-semibold text-center">Rewards</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openCustomer(c)}
                    className="hover:bg-sky-blue-light/5 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{c.email}</td>
                    <td className="px-4 py-3 text-center text-ink">{c.bookingCount}</td>
                    <td className="px-4 py-3 text-center">
                      {c.upcomingBookings > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                          {c.upcomingBookings}
                        </span>
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-ink">
                      £{c.totalSpent.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.loyaltyStamps > 0 ? (
                        <span className="text-bright-lavender font-medium">{c.loyaltyStamps}★</span>
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.loyaltyRewards > 0 ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-bright-lavender/15 text-bright-lavender text-xs font-bold">
                          {c.loyaltyRewards} free
                        </span>
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft text-xs">
                      {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg bg-ink/5 text-ink text-sm disabled:opacity-40 hover:bg-ink/10"
              >
                ← Prev
              </button>
              <span className="text-sm text-ink-soft px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg bg-ink/5 text-ink text-sm disabled:opacity-40 hover:bg-ink/10"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
          onClick={() => { setSelected(null); setCustomerBookings([]); }}
        >
          <div
            className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-xl text-ink">{selected.name}</h2>
                <p className="text-sm text-ink-soft">{selected.email}</p>
              </div>
              <button
                onClick={() => { setSelected(null); setCustomerBookings([]); }}
                className="text-ink-soft hover:text-ink text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {selected.phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-soft">Phone</span>
                  <span className="text-ink font-medium">{selected.phone}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Total Bookings</span>
                <span className="text-ink font-medium">{selected.bookingCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Upcoming Bookings</span>
                <span className="text-ink font-medium">{selected.upcomingBookings}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Total Spent</span>
                <span className="text-ink font-medium">£{selected.totalSpent.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Loyalty Stamps</span>
                <span className="text-bright-lavender font-medium">{selected.loyaltyStamps}★</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Free Sessions Available</span>
                <span className="text-bright-lavender font-medium">{selected.loyaltyRewards}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Joined</span>
                <span className="text-ink font-medium">
                  {new Date(selected.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Terms Agreed</span>
                <span className="text-ink font-medium">
                  {selected.terms_agreed_at
                    ? new Date(selected.terms_agreed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : "Not yet"}
                </span>
              </div>
            </div>

            {/* Booking history */}
            <div className="mt-5 border-t border-ink/10 pt-4">
              <h3 className="font-display text-[0.9rem] text-ink mb-3">Booking History</h3>
              {loadingBookings ? (
                <div className="text-center py-4 text-ink-soft text-sm">Loading bookings...</div>
              ) : customerBookings.length === 0 ? (
                <div className="text-center py-4 text-ink-soft text-sm">No bookings yet.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customerBookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between bg-ink/[0.03] rounded-lg px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium text-ink text-[0.85rem]">
                          {new Date(b.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {b.time_slot}
                        </div>
                        <div className="text-[0.75rem] text-ink-soft">
                          {b.people} {b.people === 1 ? "person" : "people"} · {b.is_party ? "Party" : "Session"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-[0.85rem] text-ink">£{Number(b.total_price).toFixed(2)}</div>
                        <div className={`text-[0.65rem] uppercase tracking-wide ${b.payment_status === "paid" ? "text-green-600" : b.payment_status === "refunded" ? "text-red-500" : "text-ink-soft"}`}>
                          {b.payment_status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <a
                href={`mailto:${selected.email}`}
                className="flex-1 text-center px-4 py-2.5 rounded-xl bg-sky-blue-light text-ink text-sm font-medium hover:opacity-90"
              >
                Email Customer
              </a>
              <button
                onClick={() => { setSelected(null); setCustomerBookings([]); }}
                className="px-4 py-2.5 rounded-xl bg-ink/5 text-ink text-sm hover:bg-ink/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
