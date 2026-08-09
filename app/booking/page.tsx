"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase, TIME_SLOTS, SLOT_CAPACITY, PRICE_PER_PERSON } from "@/lib/supabase";
import type { BookingSettings } from "@/lib/supabase";

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

export default function BookingPage() {
  const [date, setDate] = useState(todayISO());
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [people, setPeople] = useState(1);
  const [remaining, setRemaining] = useState<Record<string, number>>({});
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [pricePerPerson, setPricePerPerson] = useState(PRICE_PER_PERSON);

  useEffect(() => {
    supabase.from("booking_settings").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) setPricePerPerson((data as BookingSettings).price_per_person);
    });
  }, []);

  useEffect(() => {
    loadAvailability(date);
    setTimeSlot("");
  }, [date]);

  async function loadAvailability(forDate: string) {
    setLoadingSlots(true);
    const { data } = await supabase.from("bookings").select("time_slot, people").eq("date", forDate);
    const used: Record<string, number> = {};
    (data || []).forEach((b: { time_slot: string; people: number }) => {
      used[b.time_slot] = (used[b.time_slot] || 0) + b.people;
    });
    const rem: Record<string, number> = {};
    TIME_SLOTS.forEach((slot) => {
      rem[slot] = Math.max(0, SLOT_CAPACITY - (used[slot] || 0));
    });
    setRemaining(rem);
    setLoadingSlots(false);
  }

  const maxPeopleForSlot = timeSlot ? remaining[timeSlot] ?? SLOT_CAPACITY : SLOT_CAPACITY;
  const totalPrice = useMemo(() => people * pricePerPerson, [people, pricePerPerson]);

  function selectSlot(slot: string) {
    setTimeSlot(slot);
    const rem = remaining[slot] ?? SLOT_CAPACITY;
    if (people > rem) setPeople(Math.max(1, rem));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!timeSlot) {
      setErrorMsg("Please select a time slot.");
      return;
    }
    if (people < 1 || people > 10) {
      setErrorMsg("Group size must be between 1 and 10.");
      return;
    }

    setStatus("sending");

    // Re-check capacity right before booking to avoid race conditions
    const { data: existing } = await supabase
      .from("bookings")
      .select("people")
      .eq("date", date)
      .eq("time_slot", timeSlot);
    const used = (existing || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);

    if (used + people > SLOT_CAPACITY) {
      setStatus("error");
      setErrorMsg(`Sorry, only ${Math.max(0, SLOT_CAPACITY - used)} spot(s) left in that slot. Please choose another.`);
      loadAvailability(date);
      return;
    }

    const { error } = await supabase.from("bookings").insert({
      date,
      time_slot: timeSlot,
      people,
      total_price: totalPrice,
      name,
      email,
      phone: phone || null,
    });

    if (error) {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    } else {
      setStatus("sent");
      setName("");
      setEmail("");
      setPhone("");
      setPeople(1);
      setTimeSlot("");
      loadAvailability(date);
    }
  }

  return (
    <>
      <Navbar />

      <section className="py-[70px] text-center" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
        <div className="container">
          <h1 className="font-display text-[2rem] md:text-[3.2rem] mt-3 mb-3 text-ink">Book a Slime-Making Session</h1>
          <p className="text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            One-hour sessions, every hour. Up to 10 slime makers per slot at
            £{pricePerPerson.toFixed(2)} per person.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-2xl">
          {status === "sent" ? (
            <div className="bg-white rounded-3xl p-10 shadow-sm text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="font-display text-2xl mb-3">Booking Confirmed!</h2>
              <p className="text-ink-soft mb-6">
                Thanks for booking with The Slime Studio. We&apos;ve sent a
                confirmation to your email — see you soon!
              </p>
              <button onClick={() => setStatus("idle")} className="btn-primary">
                Make Another Booking
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-sm">
              <h2 className="font-display text-xl mb-6 text-center">Choose Your Session</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Time Slot (1 hour)</label>
                {loadingSlots ? (
                  <div className="text-sm text-ink-soft py-4 text-center">Checking availability...</div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {TIME_SLOTS.map((slot) => {
                      const rem = remaining[slot] ?? SLOT_CAPACITY;
                      const full = rem === 0;
                      return (
                        <button
                          type="button"
                          key={slot}
                          disabled={full}
                          onClick={() => selectSlot(slot)}
                          className={`rounded-xl py-3 text-sm font-display transition-all ${
                            full
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : timeSlot === slot
                              ? "bg-sky-blue-light text-ink shadow-sm"
                              : "bg-ink/[0.04] text-ink hover:bg-sky-blue-light/30"
                          }`}
                        >
                          {slot}
                          <span className="block text-[0.65rem] font-body normal-case mt-0.5">
                            {full ? "Full" : `${rem} left`}
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
                    onClick={() => setPeople((p) => Math.min(10, maxPeopleForSlot, p + 1))}
                    className="w-10 h-10 rounded-full bg-ink/10 text-ink text-lg hover:bg-ink/15 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
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

              <div className="flex items-center justify-between bg-sky-blue-light/20 rounded-xl p-5 mb-6">
                <span className="text-sm text-ink-soft">Total ({people} × £{pricePerPerson.toFixed(2)})</span>
                <span className="font-display text-2xl">£{totalPrice.toFixed(2)}</span>
              </div>

              {errorMsg && (
                <div className="bg-red-100 text-red-700 text-sm rounded-xl p-3 mb-5">
                  {errorMsg}
                </div>
              )}

              <div className="text-center">
                <button type="submit" disabled={status === "sending"} className="btn-primary disabled:opacity-60 w-full justify-center">
                  {status === "sending" ? "Booking..." : `Confirm Booking — £${totalPrice.toFixed(2)}`}
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
