"use client";

import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Calendar from "@/components/Calendar";
import { supabase, TIME_SLOTS as DEFAULT_SLOTS, SLOT_CAPACITY as DEFAULT_CAP, PRICE_PER_PERSON, MAX_DAILY_BOOKINGS as DEFAULT_MAX } from "@/lib/supabase";
import type { BookingSettings, OpeningHour, DateOverride } from "@/lib/supabase";
import { useContent } from "@/lib/useContent";
import { trackPurchase, trackInitiateCheckout } from "@/lib/ad-tracking";

const InlinePayment = lazy(() => import("@/components/InlinePayment"));

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

function BookingPageInner() {
  const { content: c } = useContent();
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
  const [customerSignedIn, setCustomerSignedIn] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; discountAmount: number; finalAmount: number } | null>(null);
  const [discountChecking, setDiscountChecking] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [termsPreAgreed, setTermsPreAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showDiscountField, setShowDiscountField] = useState(false);
  const [showWhatToExpect, setShowWhatToExpect] = useState(false);


  useEffect(() => {
    // Auto-apply referral code from tracking link
    if (typeof window !== "undefined") {
      const refCode = localStorage.getItem("refCode");
      if (refCode) {
        setDiscountCode(refCode);
        setShowDiscountField(true);
        localStorage.removeItem("refCode");
      }
    }
  }, []);

  useEffect(() => {
    // Prefill form if customer is signed in
    fetch("/api/account/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setCustomerSignedIn(true);
          setName(data.name || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          if (data.termsAgreed) {
            setTermsAgreed(true);
            setTermsPreAgreed(true);
          }
        }
      })
      .catch(() => {});

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
        const stored = localStorage.getItem("sumupBookingDetails");
        const fallback = stored ? JSON.parse(stored) : {};
        fetch("/api/sumup-confirm-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkoutRef: sumupRef,
            name: fallback.name,
            email: fallback.email,
            phone: fallback.phone,
            date: fallback.date,
            timeSlot: fallback.timeSlot,
            people: fallback.people,
            totalPrice: fallback.totalPrice,
            discountCode: fallback.discountCode,
          }),
        }).then((res) => res.json()).then((data) => {
          if (data.success) {
            setBookingId(data.bookingId);
            setName(data.name || "");
            setEmail(data.email || "");
            setDate(data.date || date);
            setTimeSlot(data.timeSlot || timeSlot);
            setPeople(data.people || people);
            setStatus("paid");
            trackPurchase(Number(data.totalPrice || 0));
          } else {
            setErrorMsg(data.error || "Payment verification failed.");
            setStatus("error");
          }
        }).catch(() => {
          setErrorMsg("Payment verification failed.");
          setStatus("error");
        }).finally(() => {
          localStorage.removeItem("sumupBookingDetails");
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
        fetch("/api/confirm-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: piId, fromRedirect: true }),
        }).then((res) => res.json()).then((data) => {
          if (data.bookingId) setBookingId(data.bookingId);
          if (data.overCapacity) {
            setErrorMsg("Your payment went through and your booking is saved, but this slot is now over capacity. We'll be in touch shortly to confirm or arrange an alternative.");
          }
        }).catch(() => {
          // The Stripe webhook creates the booking if this request never lands.
        }).finally(() => {
          setStatus("paid");
          trackPurchase(finalPrice);
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
  const finalPrice = appliedDiscount ? appliedDiscount.finalAmount : totalPrice;

  async function applyDiscount() {
    if (!discountCode.trim()) return;
    setDiscountChecking(true);
    setDiscountError("");
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode, scope: "booking", amount: totalPrice }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedDiscount({ code: data.code, discountAmount: data.discountAmount, finalAmount: data.finalAmount });
      } else {
        setAppliedDiscount(null);
        setDiscountError(data.error || "Invalid code.");
      }
    } catch {
      setDiscountError("Could not validate code. Please try again.");
    }
    setDiscountChecking(false);
  }

  function removeDiscount() {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountError("");
  }

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

    if (!termsAgreed) {
      setErrorMsg("You must agree to the Participation Terms & Consent to make a booking.");
      return;
    }

    // Don't allow booking in the past
    if (isSlotInPast(timeSlot, date)) {
      setErrorMsg("Cannot book a session in the past. Please choose a future time slot.");
      return;
    }

    setStatus("sending");

    // Record terms agreement for logged-in customers who haven't agreed yet
    if (customerSignedIn && !termsPreAgreed) {
      fetch("/api/account/agree-terms", { method: "POST" }).catch(() => {});
      setTermsPreAgreed(true);
    }

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
            totalPrice: finalPrice,
            discountCode: appliedDiscount?.code,
          }),
        });
        const data = await res.json();
        if (data.url) {
          localStorage.setItem("sumupBookingDetails", JSON.stringify({
            checkoutRef: data.checkoutRef,
            name, email, phone, date, timeSlot, people,
            totalPrice: finalPrice,
            discountCode: appliedDiscount?.code,
          }));
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
          totalPrice: finalPrice,
          isParty: false,
          discountCode: appliedDiscount?.code,
        }),
      });
      const data = await res.json();
      if (data.free) {
        setBookingId(data.bookingId || "");
        setStatus("paid");
        trackPurchase(0);
        return;
      }
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        trackInitiateCheckout(finalPrice);
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
          <h1 className="font-display text-[1.5rem] md:text-[3.2rem] mt-3 mb-3 text-ink">{c.booking_title}</h1>
          <p className="text-[1.1rem] md:text-[1.3rem] text-ink/90 mb-2 font-display">{c.booking_subtitle}</p>
          <p className="text-[0.95rem] md:text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            {c.booking_info}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/50 rounded-full px-4 py-2 text-[0.85rem] text-ink">
            <span>📍</span>
            <span className="font-medium">Unit A, Feathers Yard, Holt, NR25 6BF</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-2 bg-white/50 rounded-full px-4 py-2 text-[0.85rem] text-ink">
            <span>🚶</span>
            <span className="font-medium">{c.booking_walkins}</span>
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
                    <span className="text-[0.9rem] font-display text-ink">£{finalPrice.toFixed(2)}</span>
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

              {/* Account creation offer */}
              {!customerSignedIn && (
                <div className="mt-4 bg-sky-blue-light/15 rounded-xl px-5 py-4">
                  <div className="text-[0.9rem] font-medium text-ink mb-1">Create an account to manage your bookings</div>
                  <div className="text-[0.8rem] text-ink-soft mb-3">
                    Sign up with the same email to track bookings, earn loyalty stamps, and get rewards — all in one place.
                  </div>
                  <a href={`/account/login?email=${encodeURIComponent(email)}`} className="btn-primary inline-block text-sm">
                    Create Account / Sign In
                  </a>
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
                <strong className="text-ink">{people} {people === 1 ? "person" : "people"}</strong> · {new Date(date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} at <strong className="text-ink">{timeSlot}</strong> · <strong className="text-ink">£{finalPrice.toFixed(2)}</strong>
              </p>
              <Suspense fallback={<div className="py-8 text-center text-ink-soft text-sm">Loading payment form...</div>}>
                <InlinePayment
                  clientSecret={clientSecret}
                  publishableKey={publishableKey}
                  amount={finalPrice}
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
                            totalPrice: finalPrice,
                            isParty: false,
                            discountCode: appliedDiscount?.code,
                          }),
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          // Booking recorded server-side, which also sends the
                          // confirmation and admin emails.
                          if (data.bookingId) setBookingId(data.bookingId);
                          if (data.overCapacity) {
                            setErrorMsg("Your payment went through and your booking is saved, but this slot is now over capacity. We'll be in touch shortly to confirm or arrange an alternative.");
                          }
                          setStatus("paid");
                          trackPurchase(finalPrice);
                        } else if (attempt < 2) {
                          // Retry after short delay
                          setTimeout(() => confirmBooking(attempt + 1), 1000);
                        } else {
                          // The Stripe webhook creates the booking as a fallback.
                          setStatus("paid");
                          trackPurchase(finalPrice);
                        }
                      } catch {
                        if (attempt < 2) {
                          setTimeout(() => confirmBooking(attempt + 1), 1000);
                        } else {
                          // The Stripe webhook creates the booking as a fallback.
                          setStatus("paid");
                          trackPurchase(finalPrice);
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

              {/* Discount code */}
              <div className="mb-4">
                {appliedDiscount ? (
                  <div className="flex items-center justify-between bg-green-50 border-2 border-green-200 rounded-xl p-3">
                    <div>
                      <span className="text-[0.85rem] font-medium text-green-700">Code "{appliedDiscount.code}" applied</span>
                      <span className="text-[0.8rem] text-green-600 ml-2">−£{appliedDiscount.discountAmount.toFixed(2)}</span>
                    </div>
                    <button type="button" onClick={removeDiscount} className="text-[0.8rem] text-ink-soft hover:text-[#ff2d78]">Remove</button>
                  </div>
                ) : showDiscountField ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyDiscount())}
                      placeholder="Discount code"
                      className="flex-1 px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light uppercase"
                    />
                    <button
                      type="button"
                      onClick={applyDiscount}
                      disabled={discountChecking || !discountCode.trim()}
                      className="px-4 py-2.5 rounded-xl bg-ink/5 text-ink text-sm font-medium hover:bg-ink/10 disabled:opacity-60"
                    >
                      {discountChecking ? "..." : "Apply"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDiscountField(true)}
                    className="text-[0.8rem] text-sky-blue-light hover:underline"
                  >
                    Have a discount code?
                  </button>
                )}
                {discountError && (
                  <p className="text-[0.8rem] text-[#ff2d78] mt-1.5">{discountError}</p>
                )}
              </div>

              <div className="flex items-center justify-between bg-sky-blue-light/20 rounded-xl p-4 md:p-5 mb-6">
                <div className="text-xs md:text-sm text-ink-soft">
                  <div>Total ({people} × £{pricePerPerson.toFixed(2)})</div>
                  {appliedDiscount && (
                    <div className="text-green-600 text-[0.75rem]">Discount −£{appliedDiscount.discountAmount.toFixed(2)}</div>
                  )}
                </div>
                <span className="font-display text-xl md:text-2xl">£{finalPrice.toFixed(2)}</span>
              </div>

              {/* Terms & Consent */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowTerms(!showTerms)}
                  className="text-[0.85rem] text-sky-blue-light hover:underline mb-2"
                >
                  {showTerms ? "Hide" : "Read"} Participation Terms & Consent
                </button>
                {showTerms && (
                  <div className="bg-ink/[0.03] border border-ink/10 rounded-xl p-4 mb-3 text-[0.8rem] text-ink-soft leading-relaxed max-h-64 overflow-y-auto">
                    <p className="font-medium text-ink mb-2">Slime Making – Participation Terms & Consent</p>
                    <p className="mb-2">By booking and/or participating in a slime-making session at The Slime Studio, I confirm that I have read and agree to the following:</p>
                    <ul className="list-disc pl-4 space-y-1.5 mb-3">
                      <li>I understand that slime making is a hands-on activity involving craft materials and ingredients, including glue, activator, colours, scents, charms and decorative materials.</li>
                      <li>The items and materials used during slime making are not suitable for children under 3 years of age. Some items, including charms and decorations, may present a choking hazard to young children.</li>
                      <li>I agree that I, and any children in my care, will follow instructions given by The Slime Studio staff during the session.</li>
                      <li>Children remain the responsibility of their accompanying parent, guardian or responsible adult and must be appropriately supervised throughout their visit.</li>
                      <li>I am responsible for making The Slime Studio aware of any relevant allergies, sensitivities or reactions to ingredients, fragrances or craft materials before taking part.</li>
                      <li>Slime, charms and all slime-making ingredients and materials are not edible and must not be eaten or placed in or near the mouth or eyes.</li>
                      <li>I understand that slime making can be messy. The Slime Studio cannot accept responsibility for staining or damage to clothing or personal belongings, so suitable clothing should be worn.</li>
                    </ul>
                    <p className="font-medium text-ink mb-1">Taking Your Slime Home</p>
                    <p className="mb-2">Once slime, charms or other items made or supplied during a session have left The Slime Studio premises, their use, storage and supervision are the responsibility of the customer and/or the child's parent or guardian. The Slime Studio does not accept responsibility for how slime, charms or other items are played with or used once they have left the premises. Children should be appropriately supervised when playing with their slime and charms, particularly where small parts are present.</p>
                  </div>
                )}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="accent-[#ff2d78] w-5 h-5 mt-0.5 flex-shrink-0"
                  />
                  <span className="text-[0.8rem] text-ink-soft leading-relaxed">
                    I confirm that I am aged 18 or over and have read and agree to The Slime Studio Participation Terms & Consent. Where I am booking for or accompanying children, I confirm that I am authorised to accept these terms on their behalf.
                    {termsPreAgreed && (
                      <span className="block text-[0.75rem] text-green-600 mt-1">Previously agreed — you won't need to re-agree on future bookings.</span>
                    )}
                  </span>
                </label>
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
                  {status === "sending" ? "Processing..." : `Continue to Payment — £${finalPrice.toFixed(2)}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-8 md:py-10 px-4" style={{ backgroundColor: "#f9f5f0" }}>
        <div className="container max-w-2xl">
          <div className="bg-white rounded-2xl p-5 md:p-7 shadow-sm">
            <button
              type="button"
              onClick={() => setShowWhatToExpect(!showWhatToExpect)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="font-display text-[1.1rem] md:text-[1.3rem] text-ink">What to Expect</h2>
              <span className="text-ink-soft text-[1.2rem] transition-transform" style={{ transform: showWhatToExpect ? "rotate(180deg)" : "" }}>⌄</span>
            </button>
            {showWhatToExpect && (
              <div className="mt-4 space-y-3 text-[0.85rem] md:text-[0.9rem] text-ink-soft leading-relaxed">
                <div className="flex gap-3">
                  <span className="text-[1.1rem] flex-shrink-0">🕐</span>
                  <p>Each session lasts <strong className="text-ink">1 hour</strong>. Please arrive 5 minutes before your slot so we can get you set up and ready to squish!</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-[1.1rem] flex-shrink-0">🎨</span>
                  <p>Choose your slime type, pick your colours, add scents and decorations — everything is included in the price. Your creation is yours to take home.</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-[1.1rem] flex-shrink-0">👕</span>
                  <p>Slime-making can get a little messy! We provide aprons, but we recommend wearing clothes you don't mind getting a bit sticky.</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-[1.1rem] flex-shrink-0">👶</span>
                  <p>Suitable for all ages — toddlers to grandparents. Children under 5 may need a grown-up to help them.</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-[1.1rem] flex-shrink-0">📍</span>
                  <p>We're at <strong className="text-ink">Unit A, Feathers Yard, Holt, NR25 6BF</strong>. Walk-ins are welcome too, subject to availability.</p>
                </div>
              </div>
            )}
          </div>
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
