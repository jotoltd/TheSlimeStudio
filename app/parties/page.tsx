"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Heart } from "@/components/Heart";
import { supabase } from "@/lib/supabase";

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
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleEnquiry(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "");
    const email = String(formData.get("email") || "");
    const phone = String(formData.get("phone") || "");
    const partyDate = String(formData.get("party_date") || "");
    const childrenCount = String(formData.get("children") || "");
    const message = String(formData.get("message") || "");

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    const { error } = await supabase.from("enquiries").insert({
      name,
      email,
      message: `Party Enquiry — Date: ${partyDate || "TBD"}, Children: ${childrenCount || "TBD"}, Phone: ${phone || "N/A"}\n\n${message}`,
    });

    if (error) {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    } else {
      form.reset();
      setStatus("sent");
    }
  }

  return (
    <>
      <Navbar />

      {/* Hero image */}
      <div className="relative w-full aspect-[16/7] md:aspect-[16/5] overflow-hidden bg-ink">
        <img
          src="/images/pink_slime_stretch.jpg.jpeg"
          alt="Parties & Trips at The Slime Studio"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Intro */}
      <section className="text-center py-10 md:py-16 px-4" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container max-w-2xl">
          <h1 className="font-display text-[1.4rem] md:text-[2.6rem] leading-[1.2] mb-3 text-ink">
            Make Their Celebration <span style={{ color: "#ff2d78" }}>Extra Slimy!</span> 🥳
          </h1>
          <p className="text-[0.9rem] md:text-[1rem] text-ink/80 leading-relaxed mb-4">
            Celebrate at The Slime Studio with your own private slime-making
            experience. Our parties and trips include 1.5 hours of private studio time,
            where every guest gets to choose their type of slime, add their
            own colour and scent, decorate it with charms and create
            something completely their own to take home.
          </p>
          <p className="font-display text-[1.05rem] mb-4" style={{ color: "#ff2d78" }}>
            Fun, creative and just the right amount of messy!
          </p>
          <div className="inline-flex items-center gap-2 bg-white/50 rounded-full px-4 py-2 text-[0.85rem] text-ink">
            <span>📍</span>
            <span className="font-medium">Unit A, Feathers Yard, Holt, NR25 6BF</span>
          </div>
        </div>
      </section>

      {/* Party Prices */}
      <section className="py-14 md:py-16" style={{ backgroundColor: "#fdeef7" }}>
        <div className="container max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className="text-ink/40">↝</span>
            <h2 className="font-display text-[1.4rem] md:text-[1.7rem] text-ink">Party & Trip Prices</h2>
            <span className="text-ink/40">↜</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mb-8">
            {PRICE_TIERS.map((tier) => (
              <div key={tier.label} className="bg-white rounded-2xl p-7 text-center shadow-sm">
                <div className="mb-2 flex justify-center"><Heart size={24} color={tier.color} /></div>
                <h3 className="font-display text-[1rem] uppercase tracking-wide mb-2" style={{ color: tier.color }}>
                  {tier.label}
                </h3>
                <div className="mb-2 flex justify-center"><Heart size={16} color="#ccc" /></div>
                <div className="font-display text-[1.8rem] text-ink mb-1">£{tier.price.toFixed(2)}</div>
                <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider">per child</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {AGE_GROUPS.map((g) => (
              <div key={g.title} className="bg-white/70 rounded-2xl p-6 flex items-center gap-4 border border-ink/5">
                <Heart size={24} />
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

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-6">
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

      {/* Enquiry Form */}
      <section className="py-14 md:py-16" style={{ backgroundColor: "#fdeef7" }}>
        <div className="container max-w-2xl">
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="text-ink/40">↝</span>
            <h2 className="font-display text-[1.4rem] md:text-[1.7rem] text-ink">Enquire About a Party</h2>
            <span className="text-ink/40">↜</span>
          </div>

          {status === "sent" ? (
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm text-center">
              <div className="text-4xl md:text-5xl mb-4">🎉</div>
              <h3 className="font-display text-lg md:text-2xl mb-3">Enquiry Sent!</h3>
              <p className="text-ink-soft mb-6">
                Thanks for your enquiry! We&apos;ll get back to you soon to arrange your Slime Studio party.
              </p>
              <button onClick={() => setStatus("idle")} className="btn-primary">
                Send Another Enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleEnquiry} className="bg-white rounded-3xl p-5 md:p-8 shadow-sm">
              <p className="text-sm text-ink-soft mb-6 text-center">
                Interested in a party or trip? Send us your details and we&apos;ll be in touch to arrange everything.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Jane Smith"
                    className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-[#ff2d78]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-[#ff2d78]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="07900 123456"
                    className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-[#ff2d78]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Preferred Date</label>
                  <input
                    type="date"
                    name="party_date"
                    className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-[#ff2d78]"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Number of Children</label>
                <input
                  type="number"
                  name="children"
                  min={5}
                  max={15}
                  placeholder="e.g. 8"
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-[#ff2d78]"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Message (optional)</label>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Tell us about the occasion, any special requests, etc."
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-[#ff2d78] resize-none"
                />
              </div>

              {errorMsg && (
                <div className="bg-red-100 text-red-700 text-sm rounded-xl p-3 mb-5">
                  {errorMsg}
                </div>
              )}

              <div className="text-center">
                <button type="submit" disabled={status === "sending"} className="btn-primary disabled:opacity-60 w-full justify-center">
                  {status === "sending" ? "Sending..." : "Send Enquiry"}
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
              Got questions? Contact us and we&apos;ll help arrange your Slime Studio party or trip.
            </p>
            <div className="flex flex-col items-center gap-3 mb-8">
              <a href="https://instagram.com/theslimestudioexperience" target="_blank" rel="noopener noreferrer" className="text-[0.95rem] text-ink hover:text-[#ff2d78] transition-colors">
                <Heart size={14} /> Instagram: @theslimestudioexperience
              </a>
              <a href="mailto:studio@theslimestudio.co.uk" className="text-[0.95rem] text-ink hover:text-[#ff2d78] transition-colors">
                <Heart size={14} /> Email: studio@theslimestudio.co.uk
              </a>
              <a href="https://www.theslimestudio.co.uk" target="_blank" rel="noopener noreferrer" className="text-[0.95rem] text-ink hover:text-[#ff2d78] transition-colors">
                <Heart size={14} /> Website: www.theslimestudio.co.uk
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
