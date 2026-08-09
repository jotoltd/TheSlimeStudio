"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase, TIME_SLOTS, SLOT_CAPACITY, MAX_DAILY_BOOKINGS } from "@/lib/supabase";

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

function priceForCount(count: number) {
  if (count <= 5) return 13.5;
  if (count <= 10) return 12.5;
  return 11.5;
}

const PRICE_TIERS = [
  { label: "5 Children", price: 13.5, color: "#ff6fae" },
  { label: "6–10 Children", price: 12.5, color: "#3fc9a0" },
  { label: "11–15 Children", price: 11.5, color: "#8b5fbf" },
];

const AGE_GROUPS = [
  { title: "Aged Up To 7", desc: "Maximum 10 children" },
  { title: "Aged 8+", desc: "Maximum 15 children" },
];

const INCLUDED = [
  { img: "/images/slime_mixing.jpg.jpeg", label: "1.5 Hours Private Studio Time" },
  { img: "/images/slime_studio_pink_slime_pot.jpg.jpeg", label: "Choose Your Slime" },
  { img: "/images/slime_studio_slime_toppings.jpg.jpeg", label: "Pick Your Colour & Scent" },
  { img: "/images/foam_beads.jpg.jpeg", label: "Add Charms & Decorations" },
  { img: "/images/purple_finished_slime.jpg.jpeg", label: "Take Your Slime Home" },
];

export default function PartiesPage() {
  const [date, setDate] = useState(todayISO());
  const [timeSlot, setTimeSlot] = useState("");
  const [children, setChildren] = useState(5);
  const [remaining, setRemaining] = useState<Record<string, number>>({});
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [dateFull, setDateFull] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadAvailability(date);
    setTimeSlot("");
  }, [date]);

  async function loadAvailability(forDate: string) {
    setLoadingSlots(true);
    setDateFull(false);
    const { data } = await supabase.from("bookings").select("time_slot, people").eq("date", forDate);
    const used: Record<string, number> = {};
    let totalBookings = 0;
    (data || []).forEach((b: { time_slot: string; people: number }) => {
      used[b.time_slot] = (used[b.time_slot] || 0) + b.people;
      totalBookings++;
    });
    if (totalBookings >= MAX_DAILY_BOOKINGS) {
      setDateFull(true);
    }
    const rem: Record<string, number> = {};
    TIME_SLOTS.forEach((slot) => {
      rem[slot] = Math.max(0, SLOT_CAPACITY - (used[slot] || 0));
    });
    setRemaining(rem);
    setLoadingSlots(false);
  }

  const totalPrice = children * priceForCount(children);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!timeSlot) {
      setErrorMsg("Please select a time slot.");
      return;
    }
    if (children < 5 || children > 15) {
      setErrorMsg("Party size must be between 5 and 15 children.");
      return;
    }

    setStatus("sending");

    // Check total bookings for this date (daily cap)
    const { data: dailyBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("date", date);
    if ((dailyBookings || []).length >= MAX_DAILY_BOOKINGS) {
      setStatus("error");
      setErrorMsg("Sorry, this date is fully booked. Please choose another date.");
      loadAvailability(date);
      return;
    }

    // Re-check slot capacity
    const { data: existing } = await supabase
      .from("bookings")
      .select("people")
      .eq("date", date)
      .eq("time_slot", timeSlot);
    const used = (existing || []).reduce((sum: number, b: { people: number }) => sum + b.people, 0);

    if (used + children > SLOT_CAPACITY) {
      setStatus("error");
      setErrorMsg(`Sorry, only ${Math.max(0, SLOT_CAPACITY - used)} spot(s) left in that slot. Please choose another.`);
      loadAvailability(date);
      return;
    }

    const { error } = await supabase.from("bookings").insert({
      date,
      time_slot: timeSlot,
      people: children,
      total_price: totalPrice,
      name,
      email,
      phone: phone || null,
      is_party: true,
    });

    if (error) {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    } else {
      setStatus("sent");
      setName("");
      setEmail("");
      setPhone("");
      setChildren(5);
      setTimeSlot("");
      loadAvailability(date);
    }
  }

  return (
    <>
      <Navbar />

      {/* Hero image */}
      <div className="relative w-full aspect-[16/7] md:aspect-[16/5] overflow-hidden bg-ink">
        <img
          src="/images/slime_studio_pink_slime_experience.jpg.jpeg"
          alt="Parties & Birthdays at The Slime Studio"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Intro */}
      <section className="text-center py-14 md:py-16 px-6" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container max-w-2xl">
          <h1 className="font-display text-[1.8rem] md:text-[2.6rem] leading-[1.2] mb-3 text-ink">
            Make Their Celebration <span style={{ color: "#ff2d78" }}>Extra Slimy!</span> 🥳
          </h1>
          <p className="text-[1rem] text-ink/80 leading-relaxed mb-4">
            Celebrate at The Slime Studio with your own private slime-making
            experience. Our parties include 1.5 hours of private studio time,
            where every guest gets to choose their type of slime, add their
            own colour and scent, decorate it with charms and create
            something completely their own to take home.
          </p>
          <p className="font-display text-[1.05rem]" style={{ color: "#ff2d78" }}>
            Fun, creative and just the right amount of messy!
          </p>
        </div>
      </section>

      {/* Party Prices */}
      <section className="py-14 md:py-16" style={{ backgroundColor: "#fdeef7" }}>
        <div className="container max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className="text-ink/40">↝</span>
            <h2 className="font-display text-[1.4rem] md:text-[1.7rem] text-ink">Party Prices</h2>
            <span className="text-ink/40">↜</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            {PRICE_TIERS.map((tier) => (
              <div key={tier.label} className="bg-white rounded-2xl p-7 text-center shadow-sm">
                <div className="text-2xl mb-2" style={{ color: tier.color }}>♥</div>
                <h3 className="font-display text-[1rem] uppercase tracking-wide mb-2" style={{ color: tier.color }}>
                  {tier.label}
                </h3>
                <div className="text-ink/20 mb-2">♥</div>
                <div className="font-display text-[1.8rem] text-ink mb-1">£{tier.price.toFixed(2)}</div>
                <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider">per child</div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {AGE_GROUPS.map((g) => (
              <div key={g.title} className="bg-white/70 rounded-2xl p-6 flex items-center gap-4 border border-ink/5">
                <div className="text-2xl" style={{ color: "#ff2d78" }}>♥</div>
                <div>
                  <div className="font-display text-[0.95rem] text-[#8b5fbf] uppercase tracking-wide">{g.title}</div>
                  <div className="text-[0.85rem] text-ink-soft">{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-14 md:py-16" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className="text-ink/40">↝</span>
            <h2 className="font-display text-[1.4rem] md:text-[1.7rem] text-ink">What&apos;s Included</h2>
            <span className="text-ink/40">↜</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
            {INCLUDED.map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-white grid place-items-center mb-3 shadow-sm">
                  <img src={item.img} alt={item.label} className="w-full h-full object-cover" />
                </div>
                <p className="text-[0.85rem] text-ink/80 leading-snug">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Book a Party */}
      <section className="py-14 md:py-16" style={{ backgroundColor: "#fdeef7" }}>
        <div className="container max-w-2xl">
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="text-ink/40">↝</span>
            <h2 className="font-display text-[1.4rem] md:text-[1.7rem] text-ink">Book Your Party</h2>
            <span className="text-ink/40">↜</span>
          </div>

          {status === "sent" ? (
            <div className="bg-white rounded-3xl p-10 shadow-sm text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="font-display text-2xl mb-3">Party Booking Confirmed!</h3>
              <p className="text-ink-soft mb-6">
                Thanks for booking your Slime Studio party. We&apos;ve sent a
                confirmation to your email — see you soon!
              </p>
              <button onClick={() => setStatus("idle")} className="btn-primary">
                Book Another Party
              </button>
            </div>
          ) : dateFull ? (
            <div className="bg-white rounded-3xl p-10 shadow-sm text-center">
              <div className="text-3xl mb-4" style={{ color: "#ff2d78" }}>♥</div>
              <h3 className="font-display text-xl mb-3">Date Fully Booked</h3>
              <p className="text-ink-soft mb-6">
                Sorry, this date is fully booked. Please choose another date.
              </p>
              <input
                type="date"
                value={date}
                min={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full max-w-xs mx-auto px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-[#ff2d78] text-center"
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-[#ff2d78]"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Time Slot (1.5 hours)</label>
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
                          onClick={() => setTimeSlot(slot)}
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
                <label className="block text-sm font-medium mb-2">Number of Children (5–15)</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setChildren((c) => Math.max(5, c - 1))}
                    className="w-10 h-10 rounded-full bg-ink/10 text-ink text-lg hover:bg-ink/15 transition-colors"
                  >
                    −
                  </button>
                  <span className="font-display text-2xl w-10 text-center">{children}</span>
                  <button
                    type="button"
                    onClick={() => setChildren((c) => Math.min(15, c + 1))}
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
                    className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-[#ff2d78]"
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
                    className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-[#ff2d78]"
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
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-[#ff2d78]"
                />
              </div>

              <div className="flex items-center justify-between bg-sky-blue-light/20 rounded-xl p-5 mb-6">
                <span className="text-sm text-ink-soft">Total ({children} × £{priceForCount(children).toFixed(2)})</span>
                <span className="font-display text-2xl">£{totalPrice.toFixed(2)}</span>
              </div>

              {errorMsg && (
                <div className="bg-red-100 text-red-700 text-sm rounded-xl p-3 mb-5">
                  {errorMsg}
                </div>
              )}

              <div className="text-center">
                <button type="submit" disabled={status === "sending"} className="btn-primary disabled:opacity-60 w-full justify-center">
                  {status === "sending" ? "Booking..." : `Confirm Party Booking — £${totalPrice.toFixed(2)}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Contact */}
      <section className="py-14 md:py-16" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container max-w-3xl">
          <div className="bg-white rounded-[28px] p-8 md:p-10 shadow-sm text-center">
            <h2 className="font-display text-[1.3rem] mb-2 text-ink">Get In Touch</h2>
            <p className="text-ink-soft text-[0.95rem] mb-6">
              Got questions? Contact us and we&apos;ll help arrange your Slime Studio party.
            </p>
            <div className="flex flex-col items-center gap-3 mb-8">
              <a href="https://instagram.com/theslimestudioexperience" target="_blank" rel="noopener noreferrer" className="text-[0.95rem] text-ink hover:text-[#ff2d78] transition-colors">
                <span style={{ color: "#ff2d78" }}>♥</span> Instagram: @theslimestudioexperience
              </a>
              <a href="mailto:studio@theslimestudio.co.uk" className="text-[0.95rem] text-ink hover:text-[#ff2d78] transition-colors">
                <span style={{ color: "#ff2d78" }}>♥</span> Email: studio@theslimestudio.co.uk
              </a>
              <a href="https://www.theslimestudio.co.uk" target="_blank" rel="noopener noreferrer" className="text-[0.95rem] text-ink hover:text-[#ff2d78] transition-colors">
                <span style={{ color: "#ff2d78" }}>♥</span> Website: www.theslimestudio.co.uk
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
