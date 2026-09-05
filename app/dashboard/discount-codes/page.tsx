"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";

type DiscountCode = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  value: number;
  scope: "booking" | "shop" | "both";
  min_spend: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  referrer_customer_id: string | null;
  referrer_reward: string | null;
  referrer_name?: string | null;
  referrer_email?: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
  email: string;
};

export default function DiscountCodesPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    value: "10",
    scope: "both" as "booking" | "shop" | "both",
    min_spend: "0",
    max_uses: "",
    expires_at: "",
    active: true,
    isReferral: false,
    referrer_customer_id: "" as string,
    referrer_reward: "loyalty_stamp" as string,
  });
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searching, setSearching] = useState(false);
  const [copiedLink, setCopiedLink] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/discount-codes");
      const data = await res.json();
      if (data.codes) setCodes(data.codes as DiscountCode[]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setForm({
      code: "",
      description: "",
      discount_type: "percentage",
      value: "10",
      scope: "both",
      min_spend: "0",
      max_uses: "",
      expires_at: "",
      active: true,
      isReferral: false,
      referrer_customer_id: "",
      referrer_reward: "loyalty_stamp",
    });
    setEditing(null);
    setShowForm(false);
    setMsg(null);
    setCustomerSearch("");
    setCustomerResults([]);
    setSelectedCustomer(null);
  }

  function startEdit(c: DiscountCode) {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      value: String(c.value),
      scope: c.scope,
      min_spend: String(c.min_spend),
      max_uses: c.max_uses === null ? "" : String(c.max_uses),
      expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 10) : "",
      active: c.active,
      isReferral: !!c.referrer_customer_id,
      referrer_customer_id: c.referrer_customer_id || "",
      referrer_reward: c.referrer_reward || "loyalty_stamp",
    });
    if (c.referrer_customer_id) {
      setSelectedCustomer({
        id: c.referrer_customer_id,
        name: c.referrer_name || "",
        email: c.referrer_email || "",
      });
      setCustomerSearch(c.referrer_name ? `${c.referrer_name} (${c.referrer_email})` : c.referrer_email || "");
    } else {
      setSelectedCustomer(null);
      setCustomerSearch("");
    }
    setShowForm(true);
    setMsg(null);
  }

  async function searchCustomers(query: string) {
    setCustomerSearch(query);
    if (query.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/search-customers?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.customers) setCustomerResults(data.customers);
    } catch {}
    setSearching(false);
  }

  function pickCustomer(c: Customer) {
    setSelectedCustomer(c);
    setCustomerSearch(`${c.name} (${c.email})`);
    setCustomerResults([]);
    setForm({ ...form, referrer_customer_id: c.id, isReferral: true });
  }

  async function save() {
    if (!form.code.trim()) { setMsg({ type: "err", text: "Code is required." }); return; }
    if (!form.value || parseFloat(form.value) <= 0) { setMsg({ type: "err", text: "Value must be greater than 0." }); return; }
    if (form.isReferral && !selectedCustomer) { setMsg({ type: "err", text: "Please search and select a customer for the referral code." }); return; }

    setSaving(true);
    setMsg(null);

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      value: parseFloat(form.value),
      scope: form.scope,
      min_spend: parseFloat(form.min_spend) || 0,
      max_uses: form.max_uses.trim() === "" ? null : parseInt(form.max_uses),
      expires_at: form.expires_at.trim() === "" ? null : new Date(form.expires_at + "T23:59:59").toISOString(),
      active: form.active,
      updated_at: new Date().toISOString(),
      referrer_customer_id: form.isReferral && selectedCustomer ? selectedCustomer.id : null,
      referrer_reward: form.isReferral && selectedCustomer ? form.referrer_reward : null,
    };

    try {
      const res = await fetch("/api/admin/discount-codes", {
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
        setMsg({ type: "ok", text: editing ? "Discount code updated!" : "Discount code created!" });
        setTimeout(() => resetForm(), 1500);
        load();
      }
    } catch {
      setMsg({ type: "err", text: "Network error. Please try again." });
    }
    setSaving(false);
  }

  async function toggleActive(c: DiscountCode) {
    await fetch("/api/admin/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id: c.id }),
    });
    load();
  }

  async function deleteCode(c: DiscountCode) {
    if (c.referrer_customer_id) {
      if (!confirm(`"${c.code}" is a referral code. Deleting it will stop new referrals from working. Continue?`)) return;
    } else {
      if (!confirm(`Delete discount code "${c.code}"? This cannot be undone.`)) return;
    }
    await fetch("/api/admin/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: c.id }),
    });
    load();
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Discount Codes"
        subtitle="Create and manage discount codes for bookings and shop orders"
        actions={
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary text-[0.85rem]"
          >
            + New Code
          </button>
        }
      />

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-display text-[1.1rem] mb-4">
            {editing ? "Edit Code" : "Create New Code"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER25"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light uppercase"
                disabled={!!editing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Summer 25% off"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Discount Type</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percentage" | "fixed" })}
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Value {form.discount_type === "percentage" ? "(%)" : "(£)"}
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.discount_type === "percentage" ? "10" : "5.00"}
                step={form.discount_type === "percentage" ? "1" : "0.01"}
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Scope</label>
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value as "booking" | "shop" | "both" })}
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              >
                <option value="both">Both (Bookings + Shop)</option>
                <option value="booking">Bookings Only</option>
                <option value="shop">Shop Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Min Spend (£)</label>
              <input
                type="number"
                value={form.min_spend}
                onChange={(e) => setForm({ ...form, min_spend: e.target.value })}
                placeholder="0"
                step="0.01"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Max Uses (blank = unlimited)</label>
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="100"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Expiry Date (blank = never)</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
          </div>

          {/* Referral / Influencer section */}
          <div className="mt-5 border-t border-ink/10 pt-5">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={form.isReferral}
                onChange={(e) => {
                  setForm({ ...form, isReferral: e.target.checked });
                  if (!e.target.checked) {
                    setSelectedCustomer(null);
                    setCustomerSearch("");
                    setCustomerResults([]);
                  }
                }}
                className="accent-[#ff2d78] w-4 h-4"
              />
              Influencer / Referral Code
            </label>
            {form.isReferral && (
              <div className="bg-bright-lavender/5 border border-bright-lavender/20 rounded-xl p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Link to Customer *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => searchCustomers(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                      disabled={!!editing && !!editing.referrer_customer_id}
                    />
                    {searching && (
                      <span className="absolute right-3 top-3 text-[0.75rem] text-ink-soft">searching...</span>
                    )}
                    {customerResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border-2 border-ink/15 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {customerResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => pickCustomer(c)}
                            className="w-full text-left px-4 py-2.5 hover:bg-ink/[0.03] border-b border-ink/5 last:border-0"
                          >
                            <div className="text-sm font-medium">{c.name}</div>
                            <div className="text-[0.75rem] text-ink-soft">{c.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCustomer && (
                    <div className="mt-2 text-[0.8rem] text-green-600">
                      Selected: {selectedCustomer.name} ({selectedCustomer.email})
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Referrer Reward</label>
                  <select
                    value={form.referrer_reward}
                    onChange={(e) => setForm({ ...form, referrer_reward: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  >
                    <option value="loyalty_stamp">Loyalty Stamp (1 per use)</option>
                    <option value="none">No automatic reward</option>
                  </select>
                </div>
                {form.code.trim() && (
                  <div className="bg-white rounded-lg p-3 border border-ink/10">
                    <label className="block text-[0.75rem] text-ink-soft mb-1">Tracking Link (share with influencer)</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[0.8rem] text-ink bg-ink/5 px-3 py-2 rounded-lg overflow-x-auto">
                        {typeof window !== "undefined" ? `${window.location.origin}/?ref=${form.code.trim().toUpperCase()}` : `/?ref=${form.code.trim().toUpperCase()}`}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/?ref=${form.code.trim().toUpperCase()}`;
                          navigator.clipboard.writeText(link);
                          setCopiedLink(form.code);
                          setTimeout(() => setCopiedLink(""), 2000);
                        }}
                        className="px-3 py-2 rounded-lg bg-ink/5 text-ink text-[0.8rem] font-medium hover:bg-ink/10 whitespace-nowrap"
                      >
                        {copiedLink === form.code ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="accent-[#ff2d78] w-4 h-4"
              />
              Active
            </label>
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
              {saving ? "Saving..." : editing ? "Update Code" : "Create Code"}
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
      ) : codes.length === 0 ? (
        <div className="text-center py-12 text-ink-soft text-sm">
          No discount codes yet. Click &ldquo;New Code&rdquo; to create one.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-ink-soft text-[0.8rem] uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Discount</th>
                  <th className="px-4 py-3 font-semibold">Scope</th>
                  <th className="px-4 py-3 font-semibold">Usage</th>
                  <th className="px-4 py-3 font-semibold">Expiry</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const expired = c.expires_at && new Date(c.expires_at) < new Date();
                  const exhausted = c.max_uses !== null && c.used_count >= c.max_uses;
                  return (
                    <tr key={c.id} className="border-b border-ink/5 hover:bg-ink/[0.02]">
                      <td className="px-4 py-3">
                        <div className="font-display text-ink">{c.code}</div>
                        {c.description && (
                          <div className="text-[0.75rem] text-ink-soft">{c.description}</div>
                        )}
                        {c.referrer_customer_id && (
                          <div className="text-[0.7rem] text-bright-lavender mt-0.5">
                            Influencer referral{c.referrer_name ? ` — ${c.referrer_name}` : ""}
                          </div>
                        )}
                        {c.referrer_customer_id && (
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/?ref=${c.code}`;
                              navigator.clipboard.writeText(link);
                              setCopiedLink(c.code);
                              setTimeout(() => setCopiedLink(""), 2000);
                            }}
                            className="text-[0.7rem] text-sky-blue-light hover:underline mt-1"
                          >
                            {copiedLink === c.code ? "Link copied!" : "Copy tracking link"}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.discount_type === "percentage"
                          ? `${c.value}% off`
                          : `£${Number(c.value).toFixed(2)} off`}
                        {c.min_spend > 0 && (
                          <div className="text-[0.7rem] text-ink-soft">min £{Number(c.min_spend).toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize">{c.scope}</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.used_count}{c.max_uses !== null ? ` / ${c.max_uses}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        {c.expires_at ? (
                          <span className={expired ? "text-red-600" : ""}>
                            {new Date(c.expires_at).toLocaleDateString("en-GB")}
                          </span>
                        ) : (
                          <span className="text-ink-soft">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {expired || exhausted ? (
                          <span className="text-[0.75rem] text-red-600 font-medium">
                            {expired ? "Expired" : "Exhausted"}
                          </span>
                        ) : c.active ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[0.75rem] font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-ink/10 text-ink-soft text-[0.75rem] font-medium">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
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
                            {c.active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => deleteCode(c)}
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
    </div>
  );
}
