"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Heart } from "@/components/Heart";
import { InstagramIcon } from "@/components/SocialLinks";
import { supabase } from "@/lib/supabase";

const BASE_PRICE = 100;
const BASE_CHILDREN = 5;
const ADDITIONAL_CHILD_PRICE = 12.5;
const MAX_CHILDREN = 15;

function partyTotal(count: number) {
  if (count <= BASE_CHILDREN) return BASE_PRICE;
  return BASE_PRICE + (count - BASE_CHILDREN) * ADDITIONAL_CHILD_PRICE;
}

const EXAMPLES = [5, 8, 10, 12, 15];

const INCLUDED = [
  { img: "/images/slime_mixing.jpg.jpeg", label: "1 Hour Private Studio Time" },
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
          alt="Parties at The Slime Studio"
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
            experience. Our parties include 1 hour of private studio time,
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
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-ink/40">↝</span>
            <h2 className="font-display text-[1.4rem] md:text-[1.7rem] text-ink">Party Prices</h2>
            <span className="text-ink/40">↜</span>
          </div>
          <p className="text-center text-[0.9rem] text-ink-soft mb-9">
            Exclusive hire of the studio, just for you!
          </p>

          {/* Three headline boxes — mirrors the poster */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mb-6">
            <div className="bg-white rounded-2xl p-7 text-center shadow-sm border-2 border-[#ff6fae]/30">
              <div className="inline-block rounded-full px-4 py-1 mb-3 text-[0.7rem] font-semibold uppercase tracking-wider text-white" style={{ backgroundColor: "#ff2d78" }}>
                Minimum
              </div>
              <div className="font-display text-[2.4rem] leading-none mb-2" style={{ color: "#ff2d78" }}>£100</div>
              <div className="text-[0.85rem] text-ink-soft leading-snug">
                Includes up to<br />
                <span className="font-semibold text-ink">{BASE_CHILDREN} children</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-7 text-center shadow-sm border-2 border-[#64d8ec]/40">
              <div className="inline-block rounded-full px-4 py-1 mb-3 text-[0.7rem] font-semibold uppercase tracking-wider text-white" style={{ backgroundColor: "#2ba7c4" }}>
                Each Additional Child
              </div>
              <div className="font-display text-[2.4rem] leading-none mb-2" style={{ color: "#2ba7c4" }}>£12.50</div>
              <div className="text-[0.85rem] text-ink-soft leading-snug">
                Per child<br />
                <span className="font-semibold text-ink">Maximum {MAX_CHILDREN} children</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-7 text-center shadow-sm border-2 border-[#8b5fbf]/30">
              <div className="mb-3 text-2xl">🕐</div>
              <div className="font-display text-[2.4rem] leading-none mb-2" style={{ color: "#8b5fbf" }}>1 Hour</div>
              <div className="text-[0.85rem] text-ink-soft leading-snug">
                Private<br />
                <span className="font-semibold text-ink">studio time</span>
              </div>
            </div>
          </div>

          {/* Worked examples so the pricing is crystal clear */}
          <div className="bg-white rounded-2xl p-6 md:p-7 shadow-sm mb-5">
            <h3 className="font-display text-[1rem] text-center mb-1 text-ink">What You&apos;ll Pay</h3>
            <p className="text-center text-[0.8rem] text-ink-soft mb-5">
              £100 covers your first {BASE_CHILDREN} children, then just £12.50 for each extra child.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {EXAMPLES.map((count) => (
                <div key={count} className="rounded-xl px-3 py-4 text-center" style={{ backgroundColor: "#fdeef7" }}>
                  <div className="text-[0.78rem] text-ink-soft uppercase tracking-wider mb-1">
                    {count} {count === 1 ? "child" : "children"}
                  </div>
                  <div className="font-display text-[1.25rem] text-ink">£{partyTotal(count).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Key info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            <div className="bg-white/70 rounded-2xl p-6 flex items-center gap-4 border border-ink/5">
              <Heart size={24} />
              <div>
                <div className="font-display text-[0.95rem] text-ink uppercase tracking-wide">Every Child Creates</div>
                <div className="text-[0.85rem] text-ink-soft">Makes and takes home their own unique slime</div>
              </div>
            </div>
            <div className="bg-white/70 rounded-2xl p-6 flex items-center gap-4 border border-ink/5">
              <Heart size={24} />
              <div>
                <div className="font-display text-[0.95rem] text-ink uppercase tracking-wide">50% Deposit</div>
                <div className="text-[0.85rem] text-ink-soft">Required to secure your date</div>
              </div>
            </div>
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
                  min={1}
                  max={MAX_CHILDREN}
                  placeholder="e.g. 8"
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-[#ff2d78]"
                />
                <p className="text-[0.78rem] text-ink-soft mt-2">
                  £100 for up to {BASE_CHILDREN} children, then £12.50 per extra child (max {MAX_CHILDREN}).
                </p>
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
              Got questions? Contact us and we&apos;ll help arrange your Slime Studio party.
            </p>
            <div className="flex flex-col items-center gap-3 mb-8">
              <a href="https://instagram.com/theslimestudioexperience" target="_blank" rel="noopener noreferrer" className="text-[0.95rem] text-ink hover:text-[#ff2d78] transition-colors inline-flex items-center gap-1.5">
                <InstagramIcon size={16} /> Instagram: @theslimestudioexperience
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
