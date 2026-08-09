"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

const INFO_CARDS = [
  {
    bg: "#ff2d78",
    icon: "📍",
    title: "Visit Us",
    lines: ["The Slime Studio", "Unit A Feathers Yard", "Holt", "NR25 6BF"],
  },
  {
    bg: "#3fc9a0",
    icon: "🕐",
    title: "Opening Hours",
    lines: ["Mon–Sat 10am–4pm", "Sunday closed"],
  },
  {
    bg: "#8b5fbf",
    icon: "✉️",
    title: "Email",
    lines: ["hello@theslimestudio.co.uk"],
  },
  {
    bg: "#3fa9f5",
    icon: "📞",
    title: "Telephone",
    lines: ["01263 123 456"],
  },
];

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const formData = new FormData(form);

    const { error } = await supabase.from("enquiries").insert({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone") || null,
      message: formData.get("message"),
    });

    if (error) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    } else {
      form.reset();
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="pt-16 pb-14 md:pt-20 md:pb-16 text-center" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container">
          <h1 className="font-display text-[2.2rem] md:text-[3.4rem] text-ink mb-3 uppercase">
            Contact Us
          </h1>
          <div className="text-2xl mb-4" style={{ color: "#ff2d78" }}>♥</div>
          <p className="text-[1rem] text-ink/75 max-w-[560px] mx-auto leading-relaxed">
            Got a question about visiting The Slime Studio, your booking or
            anything else? Drop us a message and we&apos;ll get back to you soon.
          </p>
        </div>
      </section>

      {/* Form + Info */}
      <section className="py-14 md:py-16" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container grid lg:grid-cols-[1.6fr_1fr] gap-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40">👤</span>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Your name"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-white bg-white text-sm focus:outline-none focus:border-[#ff2d78]"
                />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40">✉️</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Your email"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-white bg-white text-sm focus:outline-none focus:border-[#ff2d78]"
                />
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40">📞</span>
              <input
                name="phone"
                type="tel"
                placeholder="Your phone number"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-white bg-white text-sm focus:outline-none focus:border-[#ff2d78]"
              />
            </div>

            <div className="relative">
              <span className="absolute left-4 top-4 text-ink/40">💬</span>
              <textarea
                name="message"
                required
                rows={5}
                placeholder="How can we help?"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-white bg-white text-sm focus:outline-none focus:border-[#ff2d78] resize-none"
              />
            </div>

            <div className="text-center pt-2">
              <button
                type="submit"
                disabled={status === "sending"}
                className="px-10 py-3.5 rounded-full font-display text-[1rem] text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all disabled:opacity-60"
                style={{ backgroundColor: "#ff2d78" }}
              >
                {status === "sending" ? "Sending..." : status === "sent" ? "Sent! ✓" : status === "error" ? "Error — try again" : "Send Message"}
              </button>
            </div>
          </form>

          <div className="space-y-6">
            {INFO_CARDS.map((card) => (
              <div key={card.title} className="flex items-start gap-4">
                <div
                  className="w-11 h-11 rounded-full grid place-items-center flex-shrink-0 text-lg text-white shadow-sm"
                  style={{ backgroundColor: card.bg }}
                >
                  {card.icon}
                </div>
                <div>
                  <h3 className="font-display text-[0.95rem] uppercase tracking-wide text-ink mb-1">
                    {card.title}
                  </h3>
                  {card.lines.map((line) => (
                    <p key={line} className="text-[0.9rem] text-ink/75 leading-snug">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 text-center" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container">
          <h2 className="font-display text-[1.2rem] md:text-[1.5rem] text-ink mb-6 uppercase">
            Ready To Make Some Slime?
          </h2>
          <div className="flex gap-4 justify-center items-center flex-wrap">
            <Link
              href="/booking"
              className="px-8 py-3.5 rounded-full font-display text-[1rem] text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
              style={{ backgroundColor: "#ff2d78" }}
            >
              Book Now
            </Link>
            <span style={{ color: "#ff2d78" }}>♥</span>
            <Link
              href="/shop"
              className="px-8 py-3.5 rounded-full font-display text-[1rem] text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
              style={{ backgroundColor: "#3fc9a0" }}
            >
              Shop
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
