"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

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
      enquiry_type: formData.get("type"),
      preferred_date: formData.get("date") || null,
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
      <section className="bg-gradient-to-br from-blush-pop to-bright-lavender py-[70px] text-center">
        <div className="container">
          <span className="eyebrow">Get in Touch</span>
          <h1 className="font-display text-[2rem] md:text-[3.2rem] mt-3 mb-3">Contact Us</h1>
          <p className="text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            Visit us in Holt, Norfolk or send us a message — we'd love to hear
            from you.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-2xl">
          <div className="bg-white rounded-3xl p-8 shadow-sm mb-8">
            <h2 className="font-display text-xl mb-4">Visit the Studio</h2>
            <p className="text-ink-soft text-sm mb-2">12 Market Place, Holt, Norfolk, NR25 6BW</p>
            <p className="text-ink-soft text-sm mb-2">hello@theslimestudio.co.uk</p>
            <p className="text-ink-soft text-sm">07900 123456</p>
            <p className="text-ink-soft text-sm mt-4">
              <strong>Opening Hours:</strong><br />
              Saturday — 10am–4pm<br />
              School holidays — Mon–Sat, 10am–4pm
            </p>
            <div className="flex gap-3 mt-5">
              <a href="#" aria-label="Instagram" className="w-10 h-10 rounded-full bg-bright-lavender/15 grid place-items-center text-lg hover:bg-bright-lavender transition-colors">📷</a>
              <a href="#" aria-label="TikTok" className="w-10 h-10 rounded-full bg-bright-lavender/15 grid place-items-center text-lg hover:bg-bright-lavender transition-colors">🎵</a>
              <a href="#" aria-label="Facebook" className="w-10 h-10 rounded-full bg-bright-lavender/15 grid place-items-center text-lg hover:bg-bright-lavender transition-colors">👍</a>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-sm mb-8 aspect-[16/9]">
            <iframe
              title="The Slime Studio location map"
              src="https://www.google.com/maps?q=12+Market+Place,+Holt,+Norfolk,+NR25+6BW&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-sm">
            <h2 className="font-display text-xl mb-6 text-center">Send a Message</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <input name="name" type="text" required placeholder="Jane Smith"
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input name="email" type="email" required placeholder="jane@example.com"
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Enquiry Type</label>
                <select name="type"
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light">
                  <option>Book a Workshop</option>
                  <option>Birthday Party</option>
                  <option>School Visit</option>
                  <option>General Enquiry</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Preferred Date</label>
                <input name="date" type="date"
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea name="message" required rows={4} placeholder="Tell us about your group size, ages, and what you'd love to create..."
                className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
            </div>
            <div className="text-center">
              <button type="submit" disabled={status === "sending"}
                className="btn-primary disabled:opacity-60">
                {status === "sending" ? "Sending..." : status === "sent" ? "Sent! ✓" : status === "error" ? "Error — try again" : "Send Message"}
              </button>
            </div>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
}
