"use client";

import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Calendar from "@/components/Calendar";
import { supabase, TIME_SLOTS as DEFAULT_SLOTS, SLOT_CAPACITY as DEFAULT_CAP, PRICE_PER_PERSON, MAX_DAILY_BOOKINGS as DEFAULT_MAX } from "@/lib/supabase";
import type { BookingSettings, OpeningHour, DateOverride } from "@/lib/supabase";

const InlinePayment = lazy(() => import("@/components/InlinePayment"));

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

function BookingPageInner() {
  const [date, setDate] = useState(todayISO());
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [people, setPeople] = useState(1);
  const [remaining, setRemaining] = useState<Record<string, number>>({});
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "paid" | "cancelled" | "payment">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [pricePerPerson, setPricePerPerson] = useState(PRICE_PER_PERSON);
  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [slotCapacity, setSlotCapacity] = useState(DEFAULT_CAP);
  const [maxDaily, setMaxDaily] = useState(DEFAULT_MAX);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [globalSlots, setGlobalSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "sumup">("stripe");


  useEffect(() => {
    supabase.from("booking_settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) {
        const s = data as BookingSettings;
        setPricePerPerson(s.price_per_person);
        if (s.time_slots && s.time_slots.length > 0) { setTimeSlots(s.time_slots); setGlobalSlots(s.time_slots); }
        if (s.slot_capacity) setSlotCapacity(s.slot_capacity);
        if (s.max_daily_bookings) setMaxDaily(s.max_daily_bookings);
      }
    });
    fetch("/api/blocked-dates").then(r => r.json()).then(d => {
      if (d.blockedDates) setBlockedDates(d.blockedDates.map((b: { date: string }) => b.date));
    }).catch(() => {});
    fetch("/api/opening-hours", { cache: "no-store" }).then(r => r.json()).then(d => {
      if (d.weekly) setOpeningHours(d.weekly);
      if (d.overrides) setDateOverrides(d.overrides);
    }).catch(() => {});
    supabase.from("site_settings").select("loyalty_enabled, payment_provider").eq("id", 1).single().then(({ data }) => {
      if (data) {
        setLoyaltyEnabled(!!data.loyalty_enabled);
        if (data.payment_provider) setPaymentProvider(data.payment_provider as "stripe" | "sumup");
      }
    });

    // Handle SumUp redirect back after payment
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sumupStatus = params.get("sumup_status");
      const sumupRef = params.get("ref");
      if (sumupStatus === "paid" && sumupRef) {
        fetch("/api/sumup-confirm-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkoutRef: sumupRef }),
        }).then((res) => res.json()).then((data) => {
          if (data.success) {
            setBookingId(data.bookingId);
            setName(data.name || "");
            setEmail(data.email || "");
            setDate(data.date || date);
            setTimeSlot(data.timeSlot || timeSlot);
            setPeople(data.people || people);
            setStatus("paid");
          } else {
            setErrorMsg(data.error || "Payment verification failed.");
            setStatus("error");
          }
        }).catch(() => {
          setErrorMsg("Payment verification failed.");
          setStatus("error");
        }).finally(() => {
          const url = new URL(window.location.href);
          url.searchParams.delete("sumup_status");
          url.searchParams.delete("ref");
          window.history.replaceState({}, "", url.toString());
        });
      }
    }

    // Handle Stripe 3D Secure redirect: if redirected back with payment_intent param,
    // the payment may have succeeded but onSuccess never fired. Confirm booking directly.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const piId = params.get("payment_intent");
      const redirectStatus = params.get("redirect_status");
      if (piId && redirectStatus === "succeeded") {
        // Call confirm-booking with just the paymentIntentId — the API can read
        // booking details from Stripe metadata
        let redirectError = false;
        fetch("/api/confirm-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: piId, fromRedirect: true }),
        }).then((res) => res.json()).then((data) => {
          if (data.success) {
            // Send confirmation email
            fetch("/api/booking-confirmation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: data.name || "",
                email: data.email || "",
                date: data.date || "",
                timeSlot: data.timeSlot || "",
                people: data.people || 1,
                totalPrice: data.totalPrice || 0,
                isParty: false,
              }),
            }).catch(() => {});
          } else if (data.overCapacity) {
            redirectError = true;
            setErrorMsg(data.error || "This slot is fully booked. Please contact us for a refund.");
            setStatus("error");
          }
        }).catch(() => {}).finally(() => {
          if (redirectError) return; // Don't show success if error was set
          setStatus("paid");
          // Clean up URL
          const url = new URL(window.location.href);
          url.searchParams.delete("payment_intent");
          url.searchParams.delete("payment_intent_client_secret");
          url.searchParams.delete("redirect_status");
          window.history.replaceState({}, "", url.toString());
        });
      } else if (piId && redirectStatus === "failed") {
        setStatus("cancelled");
        const url = new URL(window.location.href);
        url.searchParams.delete("payment_intent");
        url.searchParams.delete("payment_intent_client_secret");
        url.searchParams.delete("redirect_status");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  // Compute which time slots are available for a given date
  function getSlotsForDate(forDate: string): { slots: string[]; isOpen: boolean } {
    // Check date override first
    const override = dateOverrides.find((o) => o.date === forDate);
    if (override) {
      return { slots: override.is_open ? override.time_slots : [], isOpen: override.is_open };
    }
    // Check weekly schedule
    const dow = new Date(forDate + "T00:00:00").getDay();
    const weekly = openingHours.find((w) => w.day_of_week === dow);
    if (weekly) {
      return { slots: weekly.is_open ? weekly.time_slots : [], isOpen: weekly.is_open };
    }
    // Fall back to global time slots from settings
    return { slots: globalSlots, isOpen: true };
  }

  // Get closed dates for calendar (dates with no override and weekly schedule says closed)
  function getClosedDates(): string[] {
    const closed: string[] = [];
    // Only compute if we have opening hours set
    if (openingHours.length === 0) return closed;
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      // Skip if there's a date override for this date (override takes priority)
      const ov = dateOverrides.find((o) => o.date === iso);
      if (ov) continue;
      // Skip if blocked — blocked dates already in the list, no need to duplicate
      if (blockedDates.includes(iso)) continue;
      const dow = d.getDay();
      const weekly = openingHours.find((w) => w.day_of_week === dow);
      if (weekly && !weekly.is_open) closed.push(iso);
    }
    return closed;
  }

  useEffect(() => {
    const { slots, isOpen } = getSlotsForDate(date);
    setTimeSlots(slots);
    if (!isOpen) {
      setRemaining({});
      setLoadingSlots(false);
    } else {
      loadAvailability(date);
    }
    setTimeSlot("");
  }, [date, slotCapacity, openingHours, dateOverrides, globalSlots]);


  function isSlotInPast(slot: string, forDate: string) {
    const now = new Date();
    const [h, m] = slot.split(":").map(Number);
    const slotTime = new Date(forDate + "T00:00:00");
    slotTime.setHours(h, m, 0, 0);
    return slotTime.getTime() < now.getTime();
  }

  async function loadAvailability(forDate: string) {
    setLoadingSlots(true);
    const { data } = await supabase.from("bookings").select("time_slot, people, payment_status").eq("date", forDate).eq("payment_status", "paid");
    const used: Record<string, number> = {};
    (data || []).forEach((b: { time_slot: string; people: number; payment_status: string }) => {
      used[b.time_slot] = (used[b.time_slot] || 0) + b.people;
    });
    const currentSlots = getSlotsForDate(forDate).slots;
    const rem: Record<string, number> = {};
    currentSlots.forEach((slot) => {
      rem[slot] = Math.max(0, slotCapacity - (used[slot] || 0));
    });
    setRemaining(rem);
    setLoadingSlots(false);
  }

  const maxPeopleForSlot = timeSlot ? remaining[timeSlot] ?? slotCapacity : slotCapacity;
  const totalPrice = useMemo(() => people * pricePerPerson, [people, pricePerPerson]);

  function selectSlot(slot: string) {
    setTimeSlot(slot);
    const rem = remaining[slot] ?? slotCapacity;
    if (people > rem) setPeople(Math.max(1, rem));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!timeSlot) {
      setErrorMsg("Please select a time slot.");
      return;
    }
    if (people < 1 || people > slotCapacity) {
      setErrorMsg(`Group size must be between 1 and ${slotCapacity}.`);
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    // Don't allow booking in the past
    if (isSlotInPast(timeSlot, date)) {
      setErrorMsg("Cannot book a session in the past. Please choose a future time slot.");
      return;
    }

    setStatus("sending");

    // Check total bookings for this date (daily cap) — only paid bookings count
    const { data: dailyBookings } = await supabase
      .from("bookings")
      .select("people")
      .eq("date", date)
      .eq("payment_status", "paid");
    const dailyUsed = (dailyBookings || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);
    if (dailyUsed + people > maxDaily) {
      setStatus("error");
      setErrorMsg(`Sorry, this date is fully booked. Please choose another date.`);
      loadAvailability(date);
      return;
    }

    // Re-check slot capacity — only paid bookings count
    const { data: existing } = await supabase
      .from("bookings")
      .select("people")
      .eq("date", date)
      .eq("time_slot", timeSlot)
      .eq("payment_status", "paid");
    const used = (existing || [])
      .reduce((sum: number, b: { people: number }) => sum + b.people, 0);

    if (used + people > slotCapacity) {
      setStatus("error");
      setErrorMsg(`Sorry, only ${Math.max(0, slotCapacity - used)} spot(s) left in that slot. Please choose another.`);
      loadAvailability(date);
      return;
    }

    // Create payment — branch based on provider
    try {
      if (paymentProvider === "sumup") {
        // SumUp: redirect to hosted checkout
        const res = await fetch("/api/sumup-booking-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            phone,
            date,
            timeSlot,
            people,
            totalPrice,
          }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        } else {
          console.error("SumUp checkout error:", data.error);
          setStatus("error");
          setErrorMsg(data.error || "Payment setup failed. Please try again.");
          return;
        }
      }

      // Stripe: inline payment intent
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          date,
          timeSlot,
          people,
          totalPrice,
          isParty: false,
        }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        const modeRes = await fetch("/api/stripe-mode");
        const modeData = await modeRes.json();
        setPublishableKey(modeData.publishableKey || "");
        setStatus("payment");
        return;
      } else {
        console.error("Payment intent error:", data.error);
        setStatus("error");
        setErrorMsg(data.error || "Payment setup failed. Please try again.");
        return;
      }
    } catch (err) {
      console.error("Payment intent fetch failed:", err);
      setStatus("error");
      setErrorMsg("Payment setup failed. Please try again.");
      return;
    }
  }

  return (
    <>
      <Navbar />

      <section className="py-[50px] md:py-[70px] text-center px-4" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
        <div className="container">
          <h1 className="font-display text-[1.5rem] md:text-[3.2rem] mt-3 mb-3 text-ink">Book a Slime-Making Session</h1>
          <p className="text-[1.1rem] md:text-[1.3rem] text-ink/90 mb-2 font-display">Choose Your Session</p>
          <p className="text-[0.95rem] md:text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            One-hour sessions, every hour. Up to {slotCapacity} slime makers per slot at
            £{pricePerPerson.toFixed(2)} per person.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/50 rounded-full px-4 py-2 text-[0.85rem] text-ink">
            <span>📍</span>
            <span className="font-medium">Unit A, Feathers Yard, Holt, NR25 6BF</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-2 bg-white/50 rounded-full px-4 py-2 text-[0.85rem] text-ink">
            <span>🚶</span>
            <span className="font-medium">Walk-ins also welcome, subject to space</span>
          </div>
        </div>
      </section>

      <section className="section px-4">
        <div className="container max-w-2xl">
          {status === "paid" ? (
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-green-100 grid place-items-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <h2 className="font-display text-xl md:text-2xl mb-2">Booking Confirmed!</h2>
                <p className="text-ink-soft text-sm">
                  We've sent a confirmation to <strong className="text-ink">{email}</strong>. See you soon!
                </p>
              </div>

              {/* Booking summary */}
              <div className="border-2 border-ink/[0.08] rounded-2xl overflow-hidden">
                <div className="bg-ink/[0.02] px-5 py-3 flex items-center justify-between">
                  <span className="text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold">Booking Details</span>
                  {bookingId && <span className="text-[0.7rem] text-ink-soft font-mono">Ref: {bookingId.slice(0, 8).toUpperCase()}</span>}
                </div>
                <div className="divide-y divide-ink/[0.06]">
                  <div className="flex items-center justify-between px-4 md:px-5 py-3.5 gap-2">
                    <span className="text-[0.85rem] text-ink-soft flex-shrink-0">Date</span>
                    <span className="text-[0.9rem] font-medium text-ink text-right">{new Date(date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 md:px-5 py-3.5 gap-2">
                    <span className="text-[0.85rem] text-ink-soft flex-shrink-0">Time</span>
                    <span className="text-[0.9rem] font-medium text-ink text-right">{timeSlot} — {timeSlot.split(":").map(Number).length === 2 ? (() => { const [h, m] = timeSlot.split(":").map(Number); const end = new Date(); end.setHours(h + 1, m); return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`; })() : ""}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 md:px-5 py-3.5 gap-2">
                    <span className="text-[0.85rem] text-ink-soft flex-shrink-0">Slime Makers</span>
                    <span className="text-[0.9rem] font-medium text-ink">{people} {people === 1 ? "person" : "people"}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 md:px-5 py-3.5 gap-2">
                    <span className="text-[0.85rem] text-ink-soft flex-shrink-0">Name</span>
                    <span className="text-[0.9rem] font-medium text-ink text-right">{name}</span>
                  </div>
                  {phone && (
                    <div className="flex items-center justify-between px-4 md:px-5 py-3.5 gap-2">
                      <span className="text-[0.85rem] text-ink-soft flex-shrink-0">Phone</span>
                      <span className="text-[0.9rem] font-medium text-ink">{phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 md:px-5 py-3.5 gap-2">
                    <span className="text-[0.85rem] text-ink-soft flex-shrink-0">Total Paid</span>
                    <span className="text-[0.9rem] font-display text-ink">£{totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="mt-4 bg-sky-blue-light/10 rounded-xl px-5 py-4 flex items-start gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-soft flex-shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                <div>
                  <div className="text-[0.85rem] font-medium text-ink">Unit A, Feathers Yard, Holt, NR25 6BF</div>
                  <div className="text-[0.8rem] text-ink-soft mt-0.5">Please arrive 5 minutes before your session</div>
                </div>
              </div>

              <button onClick={() => { setStatus("idle"); setBookingId(""); }} className="btn-primary w-full justify-center mt-6">
                Make Another Booking
              </button>

              {/* Loyalty stamp notification */}
              {loyaltyEnabled && (
                <div className="mt-4 bg-bright-lavender/10 rounded-xl px-5 py-4 flex items-center gap-3">
                  <span className="text-2xl">★</span>
                  <div>
                    <div className="text-[0.85rem] font-medium text-bright-lavender">You earned a loyalty stamp!</div>
                    <div className="text-[0.8rem] text-ink-soft mt-0.5">
                      Collect stamps for a free session.{" "}
                      <a href="/loyalty" className="underline hover:text-ink">Check your card →</a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : status === "cancelled" ? (
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm text-center">
              <div className="text-4xl md:text-5xl mb-4">😕</div>
              <h2 className="font-display text-xl md:text-2xl mb-3">Payment Cancelled</h2>
              <p className="text-ink-soft mb-6">
                Payment wasn't completed, so no booking has been made. You can try again below.
              </p>
              <button onClick={() => setStatus("idle")} className="btn-primary">
                Try Again
              </button>
            </div>
          ) : status === "payment" ? (
            <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm">
              <h2 className="font-display text-lg md:text-xl mb-2 text-center">Complete Your Payment</h2>
              <p className="text-sm text-ink-soft text-center mb-5">
                <strong className="text-ink">{people} {people === 1 ? "person" : "people"}</strong> · {new Date(date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} at <strong className="text-ink">{timeSlot}</strong> · <strong className="text-ink">£{totalPrice.toFixed(2)}</strong>
              </p>
              <Suspense fallback={<div className="py-8 text-center text-ink-soft text-sm">Loading payment form...</div>}>
                <InlinePayment
                  clientSecret={clientSecret}
                  publishableKey={publishableKey}
                  amount={totalPrice}
                  onSuccess={() => {
                    // Payment succeeded — NOW create the booking in the database
                    // Retry up to 3 times in case of network issues
                    async function confirmBooking(attempt = 0) {
                      try {
                        const res = await fetch("/api/confirm-booking", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            paymentIntentId,
                            name,
                            email,
                            phone,
                            date,
                            timeSlot,
                            people,
                            totalPrice,
                            isParty: false,
                          }),
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          // Booking confirmed — send email
                          if (data.bookingId) setBookingId(data.bookingId);
                          fetch("/api/booking-confirmation", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name, email, date, timeSlot, people, totalPrice, isParty: false }),
                          }).catch(() => {});
                          setStatus("paid");
                        } else if (data.overCapacity) {
                          // Slot is over capacity — don't retry, show error
                          setStatus("error");
                          setErrorMsg(data.error || "This slot is fully booked. Please contact us for a refund.");
                        } else if (attempt < 2) {
                          // Retry after short delay
                          setTimeout(() => confirmBooking(attempt + 1), 1000);
                        } else {
                          // Webhook will handle it as fallback, but show a reassuring message
                          setStatus("paid");
                        }
                      } catch {
                        if (attempt < 2) {
                          setTimeout(() => confirmBooking(attempt + 1), 1000);
                        } else {
                          // Webhook fallback should create the booking
                          setStatus("paid");
                        }
                      }
                    }
                    confirmBooking();
                  }}
                  onCancel={() => {
                    setStatus("cancelled");
                    setClientSecret("");
                  }}
                />
              </Suspense>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 md:p-8 shadow-sm">

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Date</label>
                <Calendar value={date} onChange={setDate} min={todayISO()} disableDays={[]} blockedDates={[...blockedDates.filter((bd) => {
                  // Don't block dates that have an 'open' override
                  const ov = dateOverrides.find((o) => o.date === bd);
                  return !(ov && ov.is_open);
                }), ...getClosedDates()]} />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Time Slot (1 hour)</label>
                {loadingSlots ? (
                  <div className="text-sm text-ink-soft py-4 text-center">Checking availability...</div>
                ) : timeSlots.length === 0 ? (
                  <div className="text-sm text-ink-soft py-4 text-center bg-ink/[0.03] rounded-xl">
                    We're closed on this day. Please choose another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                    {timeSlots.map((slot) => {
                      const rem = remaining[slot] ?? slotCapacity;
                      const full = rem === 0;
                      const past = isSlotInPast(slot, date);
                      const disabled = full || past;
                      return (
                        <button
                          type="button"
                          key={slot}
                          disabled={disabled}
                          onClick={() => selectSlot(slot)}
                          className={`rounded-xl py-3 text-sm font-display transition-all ${
                            disabled
                              ? "bg-ink/[0.03] text-ink/30 cursor-not-allowed"
                              : timeSlot === slot
                              ? "bg-sky-blue-light text-ink shadow-sm"
                              : "bg-ink/[0.04] text-ink hover:bg-sky-blue-light/30"
                          }`}
                        >
                          {slot}
                          <span className="block text-[0.65rem] font-body normal-case mt-0.5">
                            {past ? "Past" : full ? "Full" : `${rem} left`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Number of Slime Makers {timeSlot && `(max ${maxPeopleForSlot} available)`}
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPeople((p) => Math.max(1, p - 1))}
                    className="w-10 h-10 rounded-full bg-ink/10 text-ink text-lg hover:bg-ink/15 transition-colors"
                  >
                    −
                  </button>
                  <span className="font-display text-2xl w-10 text-center">{people}</span>
                  <button
                    type="button"
                    onClick={() => setPeople((p) => Math.min(slotCapacity, maxPeopleForSlot, p + 1))}
                    className="w-10 h-10 rounded-full bg-ink/10 text-ink text-lg hover:bg-ink/15 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Jane Smith"
                    className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Phone Number (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07900 123456"
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>

              <div className="flex items-center justify-between bg-sky-blue-light/20 rounded-xl p-4 md:p-5 mb-6">
                <span className="text-xs md:text-sm text-ink-soft">Total ({people} × £{pricePerPerson.toFixed(2)})</span>
                <span className="font-display text-xl md:text-2xl">£{totalPrice.toFixed(2)}</span>
              </div>

              {errorMsg && (
                <div className="bg-red-100 text-red-700 text-sm rounded-xl p-3 mb-5">
                  {errorMsg}
                </div>
              )}

              <div className="text-center">
                <button type="submit" disabled={status === "sending"} className="btn-primary disabled:opacity-60 w-full justify-center inline-flex items-center gap-2">
                  {status === "sending" && (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  )}
                  {status === "sending" ? "Processing..." : `Continue to Payment — £${totalPrice.toFixed(2)}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] grid place-items-center text-ink-soft">Loading...</div>}>
      <BookingPageInner />
    </Suspense>
  );
}
