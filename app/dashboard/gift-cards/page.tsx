"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";

type GiftCard = {
  id: string;
  code: string;
  balance: number;
  initial_value: number;
  purchaser_email: string;
  purchaser_name: string;
  recipient_email: string | null;
  recipient_name: string | null;
  message: string | null;
  status: "active" | "used" | "expired" | "cancelled";
  expiry_date: string | null;
  purchased_at: string;
  redeemed_at: string | null;
  payment_reference: string | null;
  customer_id: string | null;
};

type Redemption = {
  id: string;
  amount: number;
  booking_id: string | null;
  shop_order_id: string | null;
  redeemed_at: string;
};

export default function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GiftCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [selected, setSelected] = useState<GiftCard | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);

  const [form, setForm] = useState({
    code: "",
    balance: "",
    initial_value: "",
    purchaser_email: "",
    purchaser_name: "",
    recipient_email: "",
    recipient_name: "",
    message: "",
    status: "active" as "active" | "used" | "expired" | "cancelled",
    expiry_date: "",
    customer_id: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/gift-cards?${params}`);
      const data = await res.json();
      if (data.giftCards) {
        setGiftCards(data.giftCards);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, search]);

  function resetForm() {
    setForm({
      code: "",
      balance: "",
      initial_value: "",
      purchaser_email: "",
      purchaser_name: "",
      recipient_email: "",
      recipient_name: "",
      message: "",
      status: "active",
      expiry_date: "",
      customer_id: "",
    });
    setEditing(null);
    setShowForm(false);
    setMsg(null);
  }

  function startEdit(c: GiftCard) {
    setEditing(c);
    setForm({
      code: c.code,
      balance: String(c.balance),
      initial_value: String(c.initial_value),
      purchaser_email: c.purchaser_email,
      purchaser_name: c.purchaser_name,
      recipient_email: c.recipient_email || "",
      recipient_name: c.recipient_name || "",
      message: c.message || "",
      status: c.status,
      expiry_date: c.expiry_date ? c.expiry_date.split("T")[0] : "",
      customer_id: c.customer_id || "",
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.code.trim()) { setMsg({ type: "err", text: "Code is required." }); return; }
    if (!form.balance || parseFloat(form.balance) < 0) { setMsg({ type: "err", text: "Balance must be >= 0." }); return; }
    if (!form.initial_value || parseFloat(form.initial_value) <= 0) { setMsg({ type: "err", text: "Initial value must be > 0." }); return; }
    if (!form.purchaser_email || !form.purchaser_name) { setMsg({ type: "err", text: "Purchaser details required." }); return; }

    setSaving(true);
    setMsg(null);

    const payload = {
      code: form.code.trim().toUpperCase(),
      balance: parseFloat(form.balance),
      initial_value: parseFloat(form.initial_value),
      purchaser_email: form.purchaser_email.trim(),
      purchaser_name: form.purchaser_name.trim(),
      recipient_email: form.recipient_email.trim() || null,
      recipient_name: form.recipient_name.trim() || null,
      message: form.message.trim() || null,
      status: form.status,
      expiry_date: form.expiry_date ? new Date(form.expiry_date + "T23:59:59").toISOString() : null,
      customer_id: form.customer_id.trim() || null,
    };

    try {
      const res = await fetch("/api/admin/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editing ? "update" : "create",
          id: editing?.id,
          data: payload,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMsg({ type: "err", text: "Failed: " + data.error });
      } else {
        setMsg({ type: "ok", text: editing ? "Gift card updated!" : "Gift card created!" });
        setTimeout(() => resetForm(), 1500);
        load();
      }
    } catch {
      setMsg({ type: "err", text: "Network error. Please try again." });
    }
    setSaving(false);
  }

  async function toggleActive(c: GiftCard) {
    await fetch("/api/admin/gift-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id: c.id }),
    });
    load();
  }

  async function deleteCard(c: GiftCard) {
    if (!confirm(`Delete gift card "${c.code}"? This cannot be undone.`)) return;
    await fetch("/api/admin/gift-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: c.id }),
    });
    load();
  }

  async function loadRedemptions(card: GiftCard) {
    setSelected(card);
    setRedemptions([]);
    setLoadingRedemptions(true);
    try {
      const res = await fetch(`/api/admin/gift-cards/redemptions?card_id=${card.id}`);
      const data = await res.json();
      setRedemptions(data.redemptions || []);
    } catch {}
    setLoadingRedemptions(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Gift Cards"
        subtitle="Manage gift cards, view balances, and track redemptions"
        actions={
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary text-[0.85rem]"
          >
            + New Gift Card
          </button>
        }
      />

      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code, name, or email..."
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

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-display text-[1.1rem] mb-4">
            {editing ? "Edit Gift Card" : "Create New Gift Card"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="GIFT-XXXX-XXXX"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light uppercase"
                disabled={!!editing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Balance (£) *</label>
              <input
                type="number"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                placeholder="50.00"
                step="0.01"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Initial Value (£) *</label>
              <input
                type="number"
                value={form.initial_value}
                onChange={(e) => setForm({ ...form, initial_value: e.target.value })}
                placeholder="50.00"
                step="0.01"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              >
                <option value="active">Active</option>
                <option value="used">Used</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Purchaser Name *</label>
              <input
                type="text"
                value={form.purchaser_name}
                onChange={(e) => setForm({ ...form, purchaser_name: e.target.value })}
                placeholder="John Smith"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Purchaser Email *</label>
              <input
                type="email"
                value={form.purchaser_email}
                onChange={(e) => setForm({ ...form, purchaser_email: e.target.value })}
                placeholder="john@example.com"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Recipient Name</label>
              <input
                type="text"
                value={form.recipient_name}
                onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Recipient Email</label>
              <input
                type="email"
                value={form.recipient_email}
                onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
                placeholder="jane@example.com"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Message</label>
              <input
                type="text"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Happy Birthday!"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Expiry Date (blank = never)</label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Customer ID (optional - link to account)</label>
              <input
                type="text"
                value={form.customer_id}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                placeholder="UUID from customers table"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
          </div>
          {msg && (
            <p className={`text-sm mt-4 ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
          )}
          <div className="flex gap-3 mt-5">
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary text-[0.85rem] disabled:opacity-60"
            >
              {saving ? "Saving..." : editing ? "Update Gift Card" : "Create Gift Card"}
            </button>
            <button
              onClick={resetForm}
              className="px-5 py-2.5 rounded-full bg-ink/5 text-ink text-[0.85rem] font-medium hover:bg-ink/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-ink-soft text-sm">Loading...</div>
      ) : giftCards.length === 0 ? (
        <div className="text-center py-12 text-ink-soft text-sm">
          {search ? "No gift cards found matching your search." : "No gift cards yet. Click \"New Gift Card\" to create one."}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-ink-soft text-[0.8rem] uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Balance</th>
                  <th className="px-4 py-3 font-semibold">Purchaser</th>
                  <th className="px-4 py-3 font-semibold">Recipient</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Purchased</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {giftCards.map((c) => {
                  const expired = c.expiry_date && new Date(c.expiry_date) < new Date();
                  return (
                    <tr key={c.id} className="border-b border-ink/5 hover:bg-ink/[0.02]">
                      <td className="px-4 py-3">
                        <div className="font-display text-ink font-medium">{c.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">£{c.balance.toFixed(2)}</span>
                        <span className="text-ink-soft text-xs ml-1">/ £{c.initial_value.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-ink">{c.purchaser_name}</div>
                        <div className="text-[0.75rem] text-ink-soft">{c.purchaser_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {c.recipient_name ? (
                          <>
                            <div className="text-ink">{c.recipient_name}</div>
                            <div className="text-[0.75rem] text-ink-soft">{c.recipient_email}</div>
                          </>
                        ) : (
                          <span className="text-ink-soft">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {expired ? (
                          <span className="text-[0.75rem] text-red-600 font-medium">Expired</span>
                        ) : c.status === "active" ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[0.75rem] font-medium">
                            Active
                          </span>
                        ) : c.status === "used" ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-ink/10 text-ink-soft text-[0.75rem] font-medium">
                            Used
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[0.75rem] font-medium">
                            {c.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-soft text-xs">
                        {new Date(c.purchased_at).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => loadRedemptions(c)}
                            className="text-[0.8rem] text-sky-blue-light hover:underline"
                          >
                            History
                          </button>
                          <button
                            onClick={() => startEdit(c)}
                            className="text-[0.8rem] text-sky-blue-light hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleActive(c)}
                            className="text-[0.8rem] text-ink-soft hover:text-ink"
                          >
                            {c.status === "active" ? "Cancel" : "Activate"}
                          </button>
                          <button
                            onClick={() => deleteCard(c)}
                            className="text-[0.8rem] text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
          onClick={() => { setSelected(null); setRedemptions([]); }}
        >
          <div
            className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-xl text-ink">{selected.code}</h2>
                <p className="text-sm text-ink-soft">Redemption History</p>
              </div>
              <button
                onClick={() => { setSelected(null); setRedemptions([]); }}
                className="text-ink-soft hover:text-ink text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Current Balance</span>
                <span className="text-ink font-medium">£{selected.balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Initial Value</span>
                <span className="text-ink font-medium">£{selected.initial_value.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Status</span>
                <span className="text-ink font-medium capitalize">{selected.status}</span>
              </div>
            </div>

            <div className="border-t border-ink/10 pt-4">
              <h3 className="font-display text-[0.9rem] text-ink mb-3">Redemptions</h3>
              {loadingRedemptions ? (
                <div className="text-center py-4 text-ink-soft text-sm">Loading redemptions...</div>
              ) : redemptions.length === 0 ? (
                <div className="text-center py-4 text-ink-soft text-sm">No redemptions yet.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {redemptions.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-ink/[0.03] rounded-lg px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium text-ink">£{r.amount.toFixed(2)}</div>
                        <div className="text-[0.75rem] text-ink-soft">
                          {r.booking_id ? "Booking" : "Shop Order"} · {new Date(r.redeemed_at).toLocaleDateString("en-GB")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => { setSelected(null); setRedemptions([]); }}
                className="w-full px-4 py-2.5 rounded-xl bg-ink/5 text-ink text-sm font-medium hover:bg-ink/10"
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
