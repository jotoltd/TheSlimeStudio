"use client";

import { useEffect, useState } from "react";
import { supabase, type Subscriber, type SubscriptionSettings } from "@/lib/supabase";

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSub, setEditingSub] = useState<Subscriber | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", address: "", postcode: "", status: "pending" });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: subs } = await supabase.from("subscribers").select("*").order("created_at", { ascending: false });
    if (subs) setSubscribers(subs as Subscriber[]);
    const { data: ss } = await supabase.from("subscription_settings").select("*").eq("id", 1).single();
    if (ss) setSettings(ss as SubscriptionSettings);
    setLoading(false);
  }

  async function removeSubscriber(id: string, name: string) {
    if (!confirm(`Remove subscriber "${name}"? This cannot be undone.`)) return;
    await supabase.from("subscribers").delete().eq("id", id);
    loadData();
  }

  function startEdit(s: Subscriber) {
    setEditingSub(s);
    setEditForm({ name: s.name, email: s.email, phone: s.phone || "", address: s.address || "", postcode: s.postcode || "", status: s.status });
  }

  async function saveEdit() {
    if (!editingSub) return;
    setSavingEdit(true);
    await supabase.from("subscribers").update({
      name: editForm.name, email: editForm.email, phone: editForm.phone || null,
      address: editForm.address, postcode: editForm.postcode, status: editForm.status,
    }).eq("id", editingSub.id);
    setSavingEdit(false);
    setEditingSub(null);
    loadData();
  }

  async function toggleEnabled() {
    if (!settings) return;
    const newVal = !settings.enabled;
    setSettings({ ...settings, enabled: newVal });
    await supabase.from("subscription_settings").update({ enabled: newVal }).eq("id", 1);
  }

  const activeCount = subscribers.filter((s) => s.status === "active").length;
  const monthlyRevenue = settings ? activeCount * Number(settings.price) : 0;

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Subscribers</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">Manage monthly slime subscription box subscribers.</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading...</div>
      ) : (
        <>
          <div className="bg-white rounded-[20px] p-7 shadow-sm mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-display text-[1.1rem] mb-1">Subscription Service</h2>
              <p className="text-[0.85rem] text-ink-soft">
                {settings?.enabled ? "Live — customers can sign up at /subscribe" : "Disabled — signup page shows a coming soon message"}
              </p>
            </div>
            <button onClick={toggleEnabled} className={`relative w-16 h-9 rounded-full transition-colors ${settings?.enabled ? "bg-sky-blue-light" : "bg-ink/15"}`}>
              <span className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-sm transition-transform ${settings?.enabled ? "translate-x-7" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Active Subscribers</div>
              <div className="font-display text-[1.8rem]">{activeCount}</div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Monthly Revenue</div>
              <div className="font-display text-[1.8rem]">£{monthlyRevenue.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Total Signups</div>
              <div className="font-display text-[1.8rem]">{subscribers.length}</div>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-8 shadow-sm">
            <h2 className="font-display text-[1.1rem] mb-6">All Subscribers</h2>
            {subscribers.length === 0 ? (
              <div className="text-center py-10 text-ink-soft text-[0.9rem]">No subscribers yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-[0.75rem] text-ink-soft uppercase tracking-wider">
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Contact</th>
                      <th className="pb-3 pr-4">Address</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Payment</th>
                      <th className="pb-3 pr-4">Since</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr key={s.id} className="border-t border-ink/[0.08]">
                        <td className="py-3 pr-4 text-[0.9rem]">{s.name}</td>
                        <td className="py-3 pr-4 text-[0.9rem]">
                          <div>{s.email}</div>
                          {s.phone && <div className="text-ink-soft text-[0.8rem]">{s.phone}</div>}
                        </td>
                        <td className="py-3 pr-4 text-[0.9rem] max-w-[220px]">{s.address}{s.postcode ? `, ${s.postcode}` : ""}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-3 py-1 rounded-full text-[0.8rem] capitalize ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-sky-blue-light/20 text-ink"}`}>{s.status}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-[0.75rem] font-medium ${s.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-ink/5 text-ink-soft"}`}>{s.payment_status || "unpaid"}</span>
                        </td>
                        <td className="py-3 pr-4 text-[0.9rem]">{new Date(s.created_at).toLocaleDateString("en-GB")}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(s)} className="px-3 py-1.5 rounded-lg bg-sky-blue-light/30 text-ink text-[0.8rem] hover:bg-sky-blue-light/50 transition-colors">Edit</button>
                            <button onClick={() => removeSubscriber(s.id, s.name)} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] hover:bg-red-200 transition-colors">Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {editingSub && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditingSub(null)}>
          <div className="bg-white rounded-[24px] p-8 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-[1.2rem] mb-5">Edit Subscriber</h2>
            <div className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium mb-1.5">Address</label>
                <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Postcode</label>
                <input value={editForm.postcode} onChange={(e) => setEditForm({ ...editForm, postcode: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light">
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveEdit} disabled={savingEdit} className="flex-1 px-5 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60">{savingEdit ? "Saving..." : "Save Changes"}</button>
              <button onClick={() => setEditingSub(null)} className="px-5 py-2.5 rounded-full bg-ink/5 text-ink text-[0.9rem] font-medium hover:bg-ink/10">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
