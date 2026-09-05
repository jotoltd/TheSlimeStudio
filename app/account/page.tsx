"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Booking, LoyaltyCard } from "@/lib/supabase";
import { paymentMethodFor, PAYMENT_METHOD_LABELS, TIME_SLOTS as DEFAULT_SLOTS, SLOT_CAPACITY as DEFAULT_CAP } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export default function AccountDashboardPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [stampsPerReward, setStampsPerReward] = useState(10);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralUses, setReferralUses] = useState(0);
  const [copied, setCopied] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [rescheduleRemaining, setRescheduleRemaining] = useState<Record<string, number>>({});
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [slotCapacity] = useState(DEFAULT_CAP);

  useEffect(() => {
    async function loadAll() {
      try {
        const [meRes, bookingsRes, loyaltyRes] = await Promise.all([
          fetch("/api/account/me"),
          fetch("/api/account/bookings"),
          fetch("/api/account/loyalty"),
        ]);

        if (!meRes.ok) {
          router.push("/account/login?redirect=dashboard");
          return;
        }

        const meData = await meRes.json();
        if (!meData.authenticated) {
          router.push("/account/login?redirect=dashboard");
          return;
        }
        setCustomer(meData);

        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData.bookings || []);

        const loyaltyData = await loyaltyRes.json();
        setLoyaltyCard(loyaltyData.card || null);
        setLoyaltyEnabled(loyaltyData.loyaltyEnabled ?? false);
        setStampsPerReward(loyaltyData.stampsPerReward ?? 10);

        // Fetch referral code
        const refRes = await fetch("/api/account/referral");
        if (refRes.ok) {
          const refData = await refRes.json();
          setReferralCode(refData.referralCode);
          setReferralUses(refData.uses || 0);
        }
      } catch {
        router.push("/account/login?redirect=dashboard");
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [router]);

  function startReschedule(b: Booking) {
    setRescheduleBooking(b);
    setRescheduleDate(b.date);
    setRescheduleSlot(b.time_slot);
    setRescheduleError("");
    loadRescheduleSlots(b.date, b.id);
  }

  async function loadRescheduleSlots(forDate: string, excludeId?: string) {
    setRescheduleLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("time_slot, people")
      .eq("date", forDate)
      .eq("payment_status", "paid");
    const used: Record<string, number> = {};
    (data || []).forEach((b: { time_slot: string; people: number }) => {
      used[b.time_slot] = (used[b.time_slot] || 0) + b.people;
    });
    const rem: Record<string, number> = {};
    DEFAULT_SLOTS.forEach((slot) => {
      rem[slot] = Math.max(0, slotCapacity - (used[slot] || 0));
    });
    setRescheduleRemaining(rem);
    setRescheduleLoading(false);
  }

  async function confirmReschedule() {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleSlot) return;
    setRescheduleSaving(true);
    setRescheduleError("");
    try {
      const res = await fetch("/api/account/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: rescheduleBooking.id,
          newDate: rescheduleDate,
          newTimeSlot: rescheduleSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRescheduleError(data.error || "Could not reschedule. Please try again.");
        setRescheduleSaving(false);
        return;
      }
      // Update local state
      setBookings((prev) =>
        prev.map((b) =>
          b.id === rescheduleBooking.id
            ? { ...b, date: rescheduleDate, time_slot: rescheduleSlot }
            : b
        )
      );
      setRescheduleBooking(null);
    } catch {
      setRescheduleError("Network error. Please try again.");
    }
    setRescheduleSaving(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/account/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <section className="section px-4">
          <div className="container max-w-2xl text-center py-20">
            <div className="text-ink-soft">Loading your account...</div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  if (!customer) return null;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const upcoming = bookings
    .filter((b) => b.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = bookings
    .filter((b) => b.date < todayStr)
    .sort((a, b) => b.date.localeCompare(a.date));

  const availableRewards = loyaltyCard
    ? loyaltyCard.rewards_earned - loyaltyCard.rewards_redeemed
    : 0;
  const stampsNeeded = loyaltyCard ? stampsPerReward - loyaltyCard.stamps : stampsPerReward;

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function BookingCard({ booking }: { booking: Booking }) {
    const method = paymentMethodFor(booking.stripe_session_id);
    const isPaid = booking.payment_status === "paid";
    return (
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-ink/5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-display text-[1rem] text-ink">
              {formatDate(booking.date)}
            </div>
            <div className="text-[0.85rem] text-ink-soft">
              {booking.time_slot} &middot; {booking.people} {" "}
              {booking.is_party ? "party" : booking.people === 1 ? "person" : "people"}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-[0.75rem] font-medium px-2.5 py-1 rounded-full ${
                isPaid
                  ? "bg-sky-blue-light/20 text-ink"
                  : "bg-[#ff2d78]/10 text-[#ff2d78]"
              }`}
            >
              {isPaid ? "Paid" : "Pending"}
            </span>
            <span className="text-[0.7rem] text-ink-soft">
              {PAYMENT_METHOD_LABELS[method]}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[0.85rem]">
          <span className="text-ink-soft">
            &pound;{booking.total_price.toFixed(2)}
            {booking.is_party && (
              <span className="ml-2 text-[0.75rem] bg-bright-lavender/15 text-bright-lavender px-2 py-0.5 rounded-full">
                Party
              </span>
            )}
          </span>
          {booking.attendance_status && booking.attendance_status !== "pending" && (
            <span className="text-[0.75rem] text-ink-soft capitalize">
              {booking.attendance_status}
            </span>
          )}
        </div>
        {booking.notes && (
          <p className="text-[0.8rem] text-ink-soft mt-2 pt-2 border-t border-ink/5">
            {booking.notes}
          </p>
        )}
        {isPaid && booking.date >= todayStr && !booking.is_party && (
          <button
            onClick={() => startReschedule(booking)}
            className="mt-3 text-[0.8rem] text-sky-blue-light hover:text-ink font-medium transition-colors"
          >
            Reschedule →
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <Navbar />

      <section
        className="py-[50px] md:py-[70px] text-center px-4"
        style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}
      >
        <div className="container">
          <h1 className="font-display text-[1.5rem] md:text-[3.2rem] mt-3 mb-3 text-ink">
            Hi, {customer.name.split(" ")[0]}!
          </h1>
          <p className="text-[0.95rem] md:text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            Manage your bookings and loyalty card.
          </p>
        </div>
      </section>

      <section className="section px-4">
        <div className="container max-w-2xl space-y-6">
          {/* Account info + logout */}
          <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-display text-[1.1rem] text-ink">{customer.name}</div>
                <div className="text-[0.85rem] text-ink-soft">{customer.email}</div>
                {customer.phone && (
                  <div className="text-[0.85rem] text-ink-soft">{customer.phone}</div>
                )}
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-[0.85rem] text-ink-soft hover:text-[#ff2d78] transition-colors px-3 py-2 rounded-lg hover:bg-ink/5"
              >
                {loggingOut ? "..." : "Sign Out"}
              </button>
            </div>
          </div>

          {/* Loyalty card */}
          {loyaltyEnabled && (
            <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm">
              <h2 className="font-display text-[1.1rem] text-ink mb-4">Loyalty Card</h2>
              {loyaltyCard ? (
                <>
                  <div className="bg-gradient-to-br from-sky-blue-light/20 to-bright-lavender/10 rounded-2xl p-5 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-display text-[0.9rem] text-ink">Stamp Card</span>
                      <span className="text-[0.8rem] text-ink-soft">
                        {loyaltyCard.stamps} / {stampsPerReward}
                      </span>
                    </div>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {Array.from({ length: stampsPerReward }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-10 h-10 rounded-full grid place-items-center text-sm font-bold transition-all ${
                            i < loyaltyCard.stamps
                              ? "bg-bright-lavender text-white shadow-md"
                              : "bg-white/60 text-ink/20 border-2 border-dashed border-ink/15"
                          }`}
                        >
                          {i < loyaltyCard.stamps ? "★" : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center bg-ink/[0.03] rounded-xl py-3">
                      <div className="font-display text-[1.2rem] text-ink">
                        {loyaltyCard.stamps}
                      </div>
                      <div className="text-[0.65rem] text-ink-soft uppercase tracking-wide">
                        Current
                      </div>
                    </div>
                    <div className="text-center bg-ink/[0.03] rounded-xl py-3">
                      <div className="font-display text-[1.2rem] text-ink">
                        {loyaltyCard.total_stamps}
                      </div>
                      <div className="text-[0.65rem] text-ink-soft uppercase tracking-wide">
                        Lifetime
                      </div>
                    </div>
                    <div className="text-center bg-ink/[0.03] rounded-xl py-3">
                      <div className="font-display text-[1.2rem] text-bright-lavender">
                        {availableRewards}
                      </div>
                      <div className="text-[0.65rem] text-ink-soft uppercase tracking-wide">
                        Free Sessions
                      </div>
                    </div>
                  </div>
                  {availableRewards > 0 ? (
                    <div className="bg-bright-lavender/10 border-2 border-bright-lavender/30 rounded-xl p-3 text-center mt-4">
                      <p className="font-display text-[0.9rem] text-bright-lavender">
                        You have a free session!
                      </p>
                      <p className="text-[0.8rem] text-ink-soft mt-0.5">
                        Mention this at your next visit to redeem.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[0.85rem] text-ink-soft text-center mt-4">
                      {stampsNeeded === 1
                        ? "Just 1 more stamp for a free session!"
                        : `${stampsNeeded} more stamps for a free session!`}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-[0.9rem] text-ink-soft mb-3">
                    No loyalty card yet. You&apos;ll earn a stamp with each paid booking!
                  </p>
                </div>
              )}
              <div className="mt-4 text-center">
                <a href="/booking" className="btn-primary inline-block">
                  Book a Session
                </a>
              </div>
            </div>
          )}

          {/* Referral card */}
          {referralCode && (
            <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm">
              <h2 className="font-display text-[1.1rem] text-ink mb-2">Refer a Friend</h2>
              <p className="text-[0.85rem] text-ink-soft mb-4">
                Share your code and get a loyalty stamp every time a friend uses it!
              </p>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-gradient-to-br from-sky-blue-light/20 to-bright-lavender/10 rounded-xl px-4 py-3 text-center">
                  <span className="font-display text-[1.2rem] text-ink tracking-wider">{referralCode}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(referralCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-4 py-3 rounded-xl bg-ink/5 text-ink text-sm font-medium hover:bg-ink/10 transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="text-center">
                <span className="text-[0.8rem] text-ink-soft">
                  {referralUses === 0 ? "No referrals yet" : `${referralUses} friend${referralUses === 1 ? "" : "s"} referred`}
                </span>
              </div>
            </div>
          )}

          {/* Upcoming bookings */}
          <div>
            <h2 className="font-display text-[1.1rem] text-ink mb-3">
              Upcoming Bookings ({upcoming.length})
            </h2>
            {upcoming.length > 0 ? (
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
                <p className="text-[0.9rem] text-ink-soft mb-3">
                  No upcoming bookings. Why not book one?
                </p>
                <a href="/booking" className="btn-primary inline-block">
                  Book Now
                </a>
              </div>
            )}
          </div>

          {/* Past bookings */}
          {past.length > 0 && (
            <div>
              <h2 className="font-display text-[1.1rem] text-ink mb-3">
                Past Bookings ({past.length})
              </h2>
              <div className="space-y-3">
                {past.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Reschedule modal */}
      {rescheduleBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setRescheduleBooking(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-[1.1rem] text-ink mb-1">Reschedule Booking</h2>
            <p className="text-[0.8rem] text-ink-soft mb-5">
              {formatDate(rescheduleBooking.date)} at {rescheduleBooking.time_slot} · {rescheduleBooking.people} {rescheduleBooking.people === 1 ? "person" : "people"}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={todayStr}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleSlot("");
                    if (e.target.value) loadRescheduleSlots(e.target.value, rescheduleBooking.id);
                  }}
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">New Time Slot</label>
                {rescheduleLoading ? (
                  <div className="text-sm text-ink-soft py-3 text-center bg-ink/[0.03] rounded-xl">
                    Checking availability...
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {DEFAULT_SLOTS.map((slot) => {
                      const rem = rescheduleRemaining[slot] ?? slotCapacity;
                      const isSameSlot =
                        rescheduleDate === rescheduleBooking.date && slot === rescheduleBooking.time_slot;
                      const full = rem === 0 && !isSameSlot;
                      const now = new Date();
                      const slotTime = new Date(rescheduleDate + "T00:00:00");
                      const [h, m] = slot.split(":").map(Number);
                      slotTime.setHours(h, m, 0, 0);
                      const past = slotTime.getTime() < now.getTime();
                      const disabled = full || past;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={disabled}
                          onClick={() => setRescheduleSlot(slot)}
                          className={`rounded-xl py-2.5 text-sm font-display transition-all ${
                            disabled
                              ? "bg-ink/[0.03] text-ink/30 cursor-not-allowed"
                              : rescheduleSlot === slot
                              ? "bg-sky-blue-light text-ink shadow-sm"
                              : "bg-ink/[0.04] text-ink hover:bg-sky-blue-light/30"
                          }`}
                        >
                          {slot}
                          <span className="block text-[0.6rem] font-body normal-case mt-0.5">
                            {past ? "Past" : full ? "Full" : isSameSlot ? "Current" : `${rem} left`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {rescheduleError && (
                <div className="bg-[#ff2d78]/10 border-2 border-[#ff2d78]/20 rounded-xl p-3 text-center">
                  <p className="text-[0.85rem] text-[#ff2d78]">{rescheduleError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmReschedule}
                disabled={rescheduleSaving || !rescheduleDate || !rescheduleSlot}
                className="flex-1 px-5 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60"
              >
                {rescheduleSaving ? "Saving..." : "Confirm Reschedule"}
              </button>
              <button
                onClick={() => setRescheduleBooking(null)}
                className="px-5 py-2.5 rounded-full bg-ink/5 text-ink text-[0.9rem] font-medium hover:bg-ink/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
