"use client";

import { useEffect, useState } from "react";
import { supabase, type BookingSettings, type SiteSettings, TIME_SLOTS as DEFAULT_SLOTS, SLOT_CAPACITY as DEFAULT_CAP, MAX_DAILY_BOOKINGS as DEFAULT_MAX, STAMPS_PER_REWARD as DEFAULT_STAMPS } from "@/lib/supabase";

export default function SettingsPage() {
  const [tab, setTab] = useState<"site" | "bookings" | "payments" | "loyalty">("site");

  // Site settings
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [maintDate, setMaintDate] = useState("");
  const [savingMaint, setSavingMaint] = useState(false);

  // Loyalty settings
  const [stampsPerReward, setStampsPerReward] = useState(DEFAULT_STAMPS);
  const [savingLoyalty, setSavingLoyalty] = useState(false);
  const [loyaltyMsg, setLoyaltyMsg] = useState("");

  // Stripe settings
  const [stripeMode, setStripeMode] = useState<"live" | "test">("test");
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [stripeMsg, setStripeMsg] = useState("");

  // Payment provider
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "sumup">("stripe");
  const [switchingProvider, setSwitchingProvider] = useState(false);
  const [providerMsg, setProviderMsg] = useState("");

  // Booking settings
  const [price, setPrice] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceMsg, setPriceMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [slotsText, setSlotsText] = useState(DEFAULT_SLOTS.join("\n"));
  const [slotCapacity, setSlotCapacity] = useState(DEFAULT_CAP);
  const [maxDaily, setMaxDaily] = useState(DEFAULT_MAX);
  const [savingSlots, setSavingSlots] = useState(false);
  const [slotsMsg, setSlotsMsg] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const { data: ss } = await supabase.from("site_settings").select("*").eq("id", 1).single();
    if (ss) {
      const s = ss as SiteSettings;
      setSiteSettings(s);
      setMaintDate(new Date(s.launch_date).toISOString().slice(0, 16));
      if (s.stamps_per_reward) setStampsPerReward(s.stamps_per_reward);
    }

    try {
      const res = await fetch("/api/stripe-mode");
      const data = await res.json();
      if (data.mode) setStripeMode(data.mode);
      setStripeConfigured(data.configured);
    } catch {}

    try {
      const res = await fetch("/api/payment-provider");
      const data = await res.json();
      if (data.provider) setPaymentProvider(data.provider);
    } catch {}

    const { data: bs } = await supabase.from("booking_settings").select("*").eq("id", 1).single();
    if (bs) {
      const s = bs as BookingSettings;
      setPrice(String(s.price_per_person));
      if (s.time_slots && s.time_slots.length > 0) setSlotsText(s.time_slots.join("\n"));
      if (s.slot_capacity) setSlotCapacity(s.slot_capacity);
      if (s.max_daily_bookings) setMaxDaily(s.max_daily_bookings);
    }
  }

  async function toggleMaintenance() {
    if (!siteSettings) return;
    const newVal = !siteSettings.maintenance_mode;
    setSiteSettings({ ...siteSettings, maintenance_mode: newVal });
    await supabase.from("site_settings").update({ maintenance_mode: newVal }).eq("id", 1);
  }

  async function toggleLoyalty() {
    if (!siteSettings) return;
    const newVal = !siteSettings.loyalty_enabled;
    setSiteSettings({ ...siteSettings, loyalty_enabled: newVal });
    await supabase.from("site_settings").update({ loyalty_enabled: newVal }).eq("id", 1);
  }

  async function saveLoyaltySettings() {
    if (stampsPerReward < 1) { setLoyaltyMsg("Stamps per reward must be at least 1"); return; }
    setSavingLoyalty(true); setLoyaltyMsg("");
    const { error } = await supabase.from("site_settings").update({ stamps_per_reward: stampsPerReward }).eq("id", 1);
    setSavingLoyalty(false);
    if (error) setLoyaltyMsg("Failed to save: " + error.message);
    else setLoyaltyMsg("Loyalty settings saved!");
  }

  async function saveMaintDate() {
    if (!maintDate) return;
    setSavingMaint(true);
    const isoDate = new Date(maintDate).toISOString();
    await supabase.from("site_settings").update({ launch_date: isoDate }).eq("id", 1);
    setSavingMaint(false);
    loadAll();
  }

  async function switchStripeMode(newMode: "live" | "test") {
    setSwitchingMode(true);
    setStripeMsg("");
    try {
      const res = await fetch("/api/stripe-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
      const data = await res.json();
      if (data.note) setStripeMsg(data.note);
    } catch {}
    setSwitchingMode(false);
  }

  async function switchPaymentProvider(newProvider: "stripe" | "sumup") {
    setSwitchingProvider(true);
    setProviderMsg("");
    try {
      const res = await fetch("/api/payment-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: newProvider }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentProvider(newProvider);
        setProviderMsg(`Switched to ${newProvider === "sumup" ? "SumUp" : "Stripe"}`);
      } else {
        setProviderMsg(data.error || "Failed to switch provider");
      }
    } catch {
      setProviderMsg("Failed to switch provider");
    }
    setSwitchingProvider(false);
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
    else setSlotsMsg("Settings saved!");
  }

  const tabs = [
    { key: "site" as const, icon: "🌐", label: "Site" },
    { key: "bookings" as const, icon: "📅", label: "Bookings" },
    { key: "loyalty" as const, icon: "⭐", label: "Loyalty" },
    { key: "payments" as const, icon: "💳", label: "Payments" },
  ];

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Settings</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">Configure your site, booking rules, and payment settings.</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-full text-[0.9rem] font-medium transition-all flex items-center gap-2 ${tab === t.key ? "bg-sky-blue-light text-ink shadow-sm" : "bg-white text-ink hover:bg-sky-blue-light/20"}`}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Site tab */}
      {tab === "site" && (
        <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h2 className="font-display text-[1.1rem] mb-1">Maintenance Mode</h2>
              <p className="text-[0.85rem] text-ink-soft">
                {siteSettings?.maintenance_mode
                  ? "ON — entire website is offline, showing countdown page"
                  : "OFF — website is live and accessible to everyone"}
              </p>
            </div>
            <button
              onClick={toggleMaintenance}
              className={`relative w-16 h-9 rounded-full transition-colors ${siteSettings?.maintenance_mode ? "bg-red-400" : "bg-ink/15"}`}
            >
              <span
                className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-sm transition-transform ${
                  siteSettings?.maintenance_mode ? "translate-x-7" : ""
                }`}
              />
            </button>
          </div>
          <div className="border-t border-ink/[0.08] pt-6 mt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-display text-[1.1rem] mb-1">Loyalty Programme</h2>
                <p className="text-[0.85rem] text-ink-soft">
                  {siteSettings?.loyalty_enabled
                    ? "ON — customers earn stamps per booking and can check their card online"
                    : "OFF — loyalty page is hidden and stamps are not awarded"}
                </p>
              </div>
              <button
                onClick={toggleLoyalty}
                className={`relative w-16 h-9 rounded-full transition-colors ${siteSettings?.loyalty_enabled ? "bg-green-400" : "bg-ink/15"}`}
              >
                <span
                  className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-sm transition-transform ${
                    siteSettings?.loyalty_enabled ? "translate-x-7" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-ink/[0.08] pt-6 mt-6">
            <label className="block text-sm font-medium mb-2">Countdown Launch Date</label>
            <div className="flex gap-3 flex-wrap items-center">
              <input
                type="datetime-local"
                value={maintDate}
                onChange={(e) => setMaintDate(e.target.value)}
                className="px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
              <button
                onClick={saveMaintDate}
                disabled={savingMaint}
                className="px-5 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all"
              >
                {savingMaint ? "Saving..." : "Update Date"}
              </button>
            </div>
            <p className="text-[0.8rem] text-ink-soft mt-2">
              This date powers the countdown timer on the maintenance page.
            </p>
          </div>
        </div>
      )}

      {/* Bookings tab */}
      {tab === "bookings" && (
        <div className="space-y-6">
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
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

          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
            <h2 className="font-display text-[1.1rem] mb-1">Time Slots &amp; Capacity</h2>
            <p className="text-[0.85rem] text-ink-soft mb-4">Configure available time slots, max people per slot, and daily booking limit.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                <label className="block text-sm font-medium mb-2">Max Daily Bookings <span className="text-ink-soft font-normal">(total people per day)</span></label>
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
        </div>
      )}

      {/* Payments tab */}
      {tab === "payments" && (
        <div className="space-y-6">
          {/* Payment Provider Selection */}
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <h2 className="font-display text-[1.1rem] mb-1">Payment Provider</h2>
                <p className="text-[0.85rem] text-ink-soft">
                  {paymentProvider === "sumup"
                    ? "SumUp is active — all payments are processed via SumUp hosted checkout"
                    : "Stripe is active — all payments are processed via Stripe"}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => switchPaymentProvider("stripe")}
                  disabled={switchingProvider}
                  className={`px-5 py-2.5 rounded-full text-[0.85rem] font-medium transition-all ${
                    paymentProvider === "stripe"
                      ? "bg-[#635bff] text-white shadow-sm"
                      : "bg-ink/5 text-ink-soft hover:bg-ink/10"
                  }`}
                >
                  Stripe
                </button>
                <button
                  onClick={() => switchPaymentProvider("sumup")}
                  disabled={switchingProvider}
                  className={`px-5 py-2.5 rounded-full text-[0.85rem] font-medium transition-all ${
                    paymentProvider === "sumup"
                      ? "bg-[#1aada6] text-white shadow-sm"
                      : "bg-ink/5 text-ink-soft hover:bg-ink/10"
                  }`}
                >
                  SumUp
                </button>
              </div>
            </div>
            {providerMsg && (
              <div className="bg-sky-blue-light/20 rounded-xl p-4 text-[0.85rem] text-ink-soft">
                {providerMsg}
              </div>
            )}
            <div className="border-t border-ink/[0.08] pt-4 mt-4">
              <p className="text-[0.8rem] text-ink-soft">
                Switching takes effect immediately. Both booking and shop payments use the selected provider.
              </p>
            </div>
          </div>

          {/* Stripe Mode (only relevant when Stripe is active) */}
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <h2 className="font-display text-[1.1rem] mb-1">Stripe Mode {paymentProvider !== "stripe" && <span className="text-ink-soft text-[0.8rem]">(inactive)</span>}</h2>
                <p className="text-[0.85rem] text-ink-soft">
                  {stripeConfigured
                    ? stripeMode === "live"
                      ? "LIVE — real payments are being processed"
                      : "TEST — sandbox mode, no real charges are made"
                    : "Not configured — add Stripe API keys to .env.local to enable payments"}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => switchStripeMode("test")}
                  disabled={switchingMode}
                  className={`px-5 py-2.5 rounded-full text-[0.85rem] font-medium transition-all ${
                    stripeMode === "test"
                      ? "bg-canary-yellow text-ink shadow-sm"
                      : "bg-ink/5 text-ink-soft hover:bg-ink/10"
                  }`}
                >
                  Test (Sandbox)
                </button>
                <button
                  onClick={() => switchStripeMode("live")}
                  disabled={switchingMode}
                  className={`px-5 py-2.5 rounded-full text-[0.85rem] font-medium transition-all ${
                    stripeMode === "live"
                      ? "bg-green-500 text-white shadow-sm"
                      : "bg-ink/5 text-ink-soft hover:bg-ink/10"
                  }`}
                >
                  Live
                </button>
              </div>
            </div>
            {stripeMsg && (
              <div className="bg-sky-blue-light/20 rounded-xl p-4 text-[0.85rem] text-ink-soft">
                {stripeMsg}
              </div>
            )}
            <div className="border-t border-ink/[0.08] pt-4 mt-4">
              <p className="text-[0.8rem] text-ink-soft">
                Both booking and subscription payments use the active mode. Switching takes effect immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loyalty tab */}
      {tab === "loyalty" && (
        <div className="space-y-6">
          {/* Enable/disable */}
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-display text-[1.1rem] mb-1">Loyalty Programme</h2>
                <p className="text-[0.85rem] text-ink-soft">
                  {siteSettings?.loyalty_enabled
                    ? "ON — customers earn stamps per booking and can check their card online"
                    : "OFF — loyalty page is hidden and stamps are not awarded"}
                </p>
              </div>
              <button
                onClick={toggleLoyalty}
                className={`relative w-16 h-9 rounded-full transition-colors ${siteSettings?.loyalty_enabled ? "bg-green-400" : "bg-ink/15"}`}
              >
                <span
                  className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-sm transition-transform ${
                    siteSettings?.loyalty_enabled ? "translate-x-7" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Stamps per reward */}
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
            <h2 className="font-display text-[1.1rem] mb-1">Stamps Per Free Session</h2>
            <p className="text-[0.85rem] text-ink-soft mb-4">
              How many stamps a customer needs to collect before earning a free session.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="number"
                min="1"
                max="50"
                value={stampsPerReward}
                onChange={(e) => {
                  const v = e.target.value;
                  setStampsPerReward(v === "" ? 0 : parseInt(v) || 0);
                }}
                className="w-32 px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
              <span className="text-[0.85rem] text-ink-soft">stamps = 1 free session</span>
              <button
                onClick={saveLoyaltySettings}
                disabled={savingLoyalty}
                className="px-6 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all"
              >
                {savingLoyalty ? "Saving..." : "Save"}
              </button>
            </div>
            {loyaltyMsg && (
              <p className={`text-[0.85rem] mt-3 ${loyaltyMsg.includes("saved") ? "text-green-600" : "text-red-600"}`}>{loyaltyMsg}</p>
            )}
            <div className="mt-4 bg-sky-blue-light/10 rounded-xl p-4">
              <p className="text-[0.8rem] text-ink-soft">
                <strong>How it works:</strong> Each paid online booking awards 1 stamp. When a customer reaches {stampsPerReward || DEFAULT_STAMPS} stamps, they automatically earn a free session reward. Rewards can be redeemed from the admin loyalty dashboard.
              </p>
            </div>
          </div>

          {/* Quick link to loyalty dashboard */}
          <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
            <h2 className="font-display text-[1.1rem] mb-1">Manage Loyalty Cards</h2>
            <p className="text-[0.85rem] text-ink-soft mb-4">
              View all member cards, add/remove stamps, and redeem free session rewards.
            </p>
            <a
              href="/dashboard/loyalty"
              className="inline-block px-6 py-2.5 rounded-full bg-bright-lavender text-white text-[0.9rem] font-medium hover:opacity-90 transition-opacity"
            >
              Go to Loyalty Dashboard →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
