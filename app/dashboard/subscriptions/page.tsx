"use client";

import { useEffect, useState } from "react";
import { supabase, type SubscriptionSettings, type Subscriber } from "@/lib/supabase";

export default function SubscriptionsAdminPage() {
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    box_name: "",
    price: "",
    current_theme: "",
    current_theme_description: "",
    perks: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: settingsData } = await supabase.from("subscription_settings").select("*").eq("id", 1).single();
    if (settingsData) {
      const s = settingsData as SubscriptionSettings;
      setSettings(s);
      setForm({
        box_name: s.box_name,
        price: String(s.price),
        current_theme: s.current_theme,
        current_theme_description: s.current_theme_description,
        perks: (s.perks || []).join("\n"),
      });
    }
    const { data: subsData } = await supabase.from("subscribers").select("*").order("created_at", { ascending: false });
    if (subsData) setSubscribers(subsData as Subscriber[]);
    setLoading(false);
  }

  async function toggleEnabled() {
    if (!settings) return;
    const newVal = !settings.enabled;
    setSettings({ ...settings, enabled: newVal });
    await supabase.from("subscription_settings").update({ enabled: newVal }).eq("id", 1);
  }

  async function saveSettings() {
    setSaving(true);
    const payload = {
      box_name: form.box_name.trim() || "Slime of the Month",
      price: parseFloat(form.price) || 0,
      frequency: "monthly",
      current_theme: form.current_theme.trim(),
      current_theme_description: form.current_theme_description.trim(),
      perks: form.perks.split("\n").map((p) => p.trim()).filter(Boolean),
    };
    await supabase.from("subscription_settings").update(payload).eq("id", 1);
    setSaving(false);
    loadData();
  }

  async function removeSubscriber(id: string, name: string) {
    if (!confirm(`Remove subscriber "${name}"? This cannot be undone.`)) return;
    await supabase.from("subscribers").delete().eq("id", id);
    loadData();
  }

  const activeCount = subscribers.filter((s) => s.status === "active").length;
  const monthlyRevenue = settings ? activeCount * Number(settings.price) : 0;

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Subscription Box</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">Manage your monthly slime subscription service.</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading...</div>
      ) : (
        <>
          {/* Enable toggle */}
          <div className="bg-white rounded-[20px] p-7 shadow-sm mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-display text-[1.1rem] mb-1">Subscription Service</h2>
              <p className="text-[0.85rem] text-ink-soft">
                {settings?.enabled ? "Live — customers can sign up at /subscribe" : "Disabled — signup page shows a coming soon message"}
              </p>
            </div>
            <button
              onClick={toggleEnabled}
              className={`relative w-16 h-9 rounded-full transition-colors ${settings?.enabled ? "bg-sky-blue-light" : "bg-ink/15"}`}
            >
              <span
                className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-sm transition-transform ${
                  settings?.enabled ? "translate-x-7" : ""
                }`}
              />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Active Subscribers</div>
              <div className="font-display text-[1.8rem]">{activeCount}</div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Est. Monthly Revenue</div>
              <div className="font-display text-[1.8rem]">£{monthlyRevenue.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm">
              <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider mb-2">Total Signups</div>
              <div className="font-display text-[1.8rem]">{subscribers.length}</div>
            </div>
          </div>

          {/* Settings form */}
          <div className="bg-white rounded-[20px] p-8 shadow-sm mb-8">
            <h2 className="font-display text-[1.1rem] mb-6">Box Settings</h2>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-2">Box Name</label>
                <input
                  value={form.box_name}
                  onChange={(e) => setForm({ ...form, box_name: e.target.value })}
                  placeholder="e.g. Slime of the Month"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Price (£)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">This Month&apos;s Theme</label>
                <input
                  value={form.current_theme}
                  onChange={(e) => setForm({ ...form, current_theme: e.target.value })}
                  placeholder="e.g. Galaxy Glow"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Theme Description</label>
                <textarea
                  value={form.current_theme_description}
                  onChange={(e) => setForm({ ...form, current_theme_description: e.target.value })}
                  rows={2}
                  placeholder="Describe this month's slime box theme"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Perks (one per line)</label>
                <textarea
                  value={form.perks}
                  onChange={(e) => setForm({ ...form, perks: e.target.value })}
                  rows={4}
                  placeholder={"A themed slime every month\nExclusive charms\nFree UK delivery"}
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="mt-6 px-6 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>

          {/* Subscribers list */}
          <div className="bg-white rounded-[20px] p-8 shadow-sm">
            <h2 className="font-display text-[1.1rem] mb-6">Subscribers</h2>
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
                        <td className="py-3 pr-4 text-[0.9rem] max-w-[220px]">
                          {s.address}{s.postcode ? `, ${s.postcode}` : ""}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="px-3 py-1 rounded-full text-[0.8rem] bg-sky-blue-light/20 text-ink capitalize">
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-[0.9rem]">{new Date(s.created_at).toLocaleDateString("en-GB")}</td>
                        <td className="py-3">
                          <button
                            onClick={() => removeSubscriber(s.id, s.name)}
                            className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
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
    </div>
  );
}
