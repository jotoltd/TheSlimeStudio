"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SubscribePage() {
  return (
    <>
      <Navbar />
      <section className="section min-h-[60vh] flex items-center justify-center">
        <div className="container max-w-xl text-center">
          <div className="text-5xl md:text-6xl mb-6">📬</div>
          <h1 className="font-display text-2xl md:text-4xl mb-4 text-ink">
            Coming Soon
          </h1>
          <p className="text-ink-soft text-[0.95rem] md:text-[1.1rem] mb-8">
            Our slime subscription box is on its way! Get monthly deliveries of
            exclusive handmade slimes, DIY kits, and accessories straight to your door.
            We&apos;ll be launching soon — watch this space!
          </p>
          <a href="/" className="btn-primary">Back to Home</a>
        </div>
      </section>
      <Footer />
    </>
  );
}
