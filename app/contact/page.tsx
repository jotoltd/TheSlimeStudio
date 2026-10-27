"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Heart } from "@/components/Heart";
import { supabase, STUDIO_MAPS_URL } from "@/lib/supabase";
import { useContent } from "@/lib/useContent";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const { content: c } = useContent();

  const INFO_CARDS = [
    {
      bg: "bg-hot-pink",
      icon: "📍",
      title: "Visit Us",
      lines: c.contact_address.split(","),
    },
    {
      bg: "bg-[#3fc9a0]",
      icon: "🕐",
      title: "Opening Hours",
      lines: c.contact_hours.split(","),
    },
    {
      bg: "bg-[#8b5fbf]",
      icon: "✉️",
      title: "Email",
      lines: [c.contact_email],
    },
    {
      bg: "bg-[#e8a13a]",
      icon: "🅿️",
      title: "Parking",
      lines: ["Budgens — 30-second walk", "Albert Street — ~5-minute walk"],
    },
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const formData = new FormData(form);

    const { error } = await supabase.from("enquiries").insert({
      name: formData.get("name"),
      email: String(formData.get("email") || "").trim().toLowerCase(),
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
      <section className="bg-pagebg pt-16 pb-14 md:pt-20 md:pb-16 text-center px-4">
        <div className="container">
          <h1 className="font-display text-[1.5rem] md:text-[3.4rem] text-ink mb-3 uppercase">
            Contact Us
          </h1>
          <div className="mb-4 flex justify-center"><Heart size={28} /></div>
          <p className="text-[1rem] text-ink/75 max-w-[560px] mx-auto leading-relaxed">
            Got a question about visiting The Slime Studio, your booking or
            anything else? Drop us a message and we&apos;ll get back to you soon.
          </p>
        </div>
      </section>

      {/* Form + Info */}
      <section className="bg-pagebg py-14 md:py-16 px-4">
        <div className="container grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 md:gap-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40">👤</span>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Your name"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-white bg-white text-sm focus:outline-none focus:border-hot-pink"
                />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40">✉️</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Your email"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-white bg-white text-sm focus:outline-none focus:border-hot-pink"
                />
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-4 text-ink/40">💬</span>
              <textarea
                name="message"
                required
                rows={5}
                placeholder="How can we help?"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-white bg-white text-sm focus:outline-none focus:border-hot-pink resize-none"
              />
            </div>

            <div className="text-center pt-2">
              <button
                type="submit"
                disabled={status === "sending"}
                className="btn-primary disabled:opacity-60"
              >
                {status === "sending" ? "Sending..." : status === "sent" ? "Sent! ✓" : status === "error" ? "Error — try again" : "Send Message"}
              </button>
            </div>
          </form>

          <div className="space-y-6 flex flex-col items-center text-center">
            {INFO_CARDS.map((card) => (
              <div key={card.title} className="flex items-start gap-4">
                <div
                  className={`w-11 h-11 rounded-full grid place-items-center flex-shrink-0 text-lg text-white shadow-sm ${card.bg}`}
                >
                  {card.icon}
                </div>
                <div className="text-left">
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

            <a
              href={STUDIO_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-block mt-2"
            >
              Get Directions
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-pagebg py-12 text-center">
        <div className="container">
          <h2 className="font-display text-[1.2rem] md:text-[1.5rem] text-ink mb-6 uppercase">
            Ready To Make Some Slime?
          </h2>
          <div className="flex gap-4 justify-center items-center flex-wrap">
            <Link
              href="/booking"
              className="btn-primary btn-book-now"
            >
              Book Now
            </Link>
            <Heart size={20} />
            <Link
              href="/shop"
              className="btn-secondary"
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
