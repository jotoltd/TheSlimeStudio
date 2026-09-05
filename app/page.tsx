"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RefCapture from "@/components/RefCapture";
import { useContent } from "@/lib/useContent";

export default function HomePage() {
  const { content: c } = useContent();

  return (
    <>
      <RefCapture />
      <Navbar />

      {/* Hero */}
      <header className="relative pt-[40px] pb-[50px] md:pt-[60px] md:pb-[70px] overflow-hidden text-center">
        <div className="absolute inset-0 z-[1]">
          <img
            src="/images/slime_mixing.jpg.jpeg"
            alt="Children mixing colourful slime at The Slime Studio in Holt, Norfolk"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,196,251,0.85) 0%, rgba(171,247,220,0.75) 100%)" }} />
        </div>
        <div className="container relative z-[2]">
          <div className="max-w-lg mx-auto">
            <img
              src="/images/logo.png"
              alt="The Slime Studio — Make Your Own Slime"
              className="w-full max-w-[240px] md:max-w-[480px] mx-auto mb-6 md:mb-10 object-contain rounded-full shadow-lg"
              style={{ backgroundColor: "#ffffff" }}
            />
            <h1 className="font-display text-[1.5rem] md:text-[2.4rem] leading-[1.15] mb-4 md:mb-5 text-ink">
              {c.hero_title}
            </h1>
            <p className="text-[0.95rem] md:text-[1.05rem] text-ink/80 mb-6 md:mb-8 max-w-[480px] mx-auto leading-relaxed">
              {c.hero_text}
            </p>
            <div className="flex gap-4 flex-wrap justify-center">
              <Link
                href="/booking"
                className="btn-primary btn-book-now"
              >
                Book Now
              </Link>
              <Link
                href="/shop"
                className="btn-secondary"
              >
                Shop
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Brief Intro */}
      <section className="section text-center">
        <div className="container max-w-2xl">
          <h2 className="font-display text-[1.8rem] md:text-[2.6rem] mt-4 mb-4 text-ink">
            {c.intro_title}
          </h2>
          <p className="text-[1.1rem] text-ink-soft">
            {c.intro_text}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 bg-white/70 rounded-full px-5 py-2.5 text-[0.9rem] text-ink">
            <span className="text-base">📍</span>
            <span className="font-medium">{c.contact_address}</span>
          </div>
        </div>
      </section>

      {/* The Experience */}
      <section className="section">
        <div className="container">
          <div className="text-center mb-12 reveal">
            <h2 className="font-display text-[1.8rem] md:text-[2.8rem] mt-4 mb-3 text-ink">
              {c.how_it_works_title}
            </h2>
            <p className="text-[1.05rem] text-ink-soft max-w-[620px] mx-auto">
              {c.how_it_works_text}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {[
              { img: "/images/slime_studio_slime_toppings.jpg.jpeg", title: c.how_it_works_step1_title, desc: c.how_it_works_step1_desc },
              { img: "/images/slime_mixing.jpg.jpeg", title: c.how_it_works_step2_title, desc: c.how_it_works_step2_desc },
              { img: "/images/pink_slime_action.jpg.jpeg", title: c.how_it_works_step3_title, desc: c.how_it_works_step3_desc },
              { img: "/images/purple_finished_slime.jpg.jpeg", title: c.how_it_works_step4_title, desc: c.how_it_works_step4_desc },
            ].map((step) => (
              <div
                key={step.title}
                className="reveal bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-9 text-center shadow-sm hover:-translate-y-1.5 hover:shadow-lg transition-all"
              >
                <div className="w-[56px] h-[56px] md:w-[72px] md:h-[72px] rounded-full overflow-hidden mx-auto mb-3 md:mb-4">
                  <img src={step.img} alt={step.title} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-display text-[0.9rem] md:text-[1.15rem] mb-1 md:mb-1.5">{step.title}</h3>
                <p className="text-[0.75rem] md:text-[0.9rem] text-ink-soft">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/booking" className="btn-primary btn-book-now">
              Book Your Slot
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section">
        <div className="container">
          <div className="text-center mb-12 reveal">
            <h2 className="font-display text-[1.8rem] md:text-[2.8rem] mt-4 max-w-3xl mx-auto text-ink">
              {c.why_choose_title}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 max-w-3xl mx-auto">
            {[
              { icon: "👨‍👩‍👧", title: c.why_choose_item1_title, desc: c.why_choose_item1_desc },
              { icon: "🎓", title: c.why_choose_item2_title, desc: c.why_choose_item2_desc },
              { icon: "✨", title: c.why_choose_item3_title, desc: c.why_choose_item3_desc },
            ].map((item) => (
              <div key={item.title} className="reveal bg-white rounded-[16px] md:rounded-[20px] p-5 md:p-8 shadow-sm text-center">
                <div className="text-[1.8rem] md:text-[2.5rem] mb-2 md:mb-3">{item.icon}</div>
                <h3 className="font-display text-[0.85rem] md:text-[1.05rem] mb-1.5 md:mb-2">{item.title}</h3>
                <p className="text-[0.75rem] md:text-[0.9rem] text-ink-soft">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Studio Gallery */}
      <section className="section">
        <div className="container">
          <div className="text-center mb-12 reveal">
            <h2 className="font-display text-[1.8rem] md:text-[2.8rem] mt-4 mb-3 text-ink">
              {c.gallery_title}
            </h2>
            <p className="text-[1.05rem] text-ink-soft max-w-[620px] mx-auto">
              {c.gallery_text}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
            {[
              { src: "/images/slime_studio_pink_slime_experience.jpg.jpeg", alt: "Child making pink slime at The Slime Studio" },
              { src: "/images/blue_slime_closeup.jpg.jpeg", alt: "Close-up of blue slime with sparkles" },
              { src: "/images/pink_slime_stretch.jpg.jpeg", alt: "Stretching pink slime at The Slime Studio" },
              { src: "/images/slime_studio_teal_slime.jpg.jpeg", alt: "Teal slime creation at The Slime Studio" },
              { src: "/images/purple_finished_slime.jpg.jpeg", alt: "Finished purple slime in a pot" },
              { src: "/images/slime_mixing.jpg.jpeg", alt: "Children mixing slime together at The Slime Studio" },
              { src: "/images/slime_studio_pink_slime_pot.jpg.jpeg", alt: "Pink slime in a pot with decorations" },
              { src: "/images/slime_studio_slime_toppings.jpg.jpeg", alt: "Slime toppings and add-ons at The Slime Studio" },
              { src: "/images/foam_beads.jpg.jpeg", alt: "Foam beads for slime making" },
              { src: "/images/pink_slime_action.jpg.jpeg", alt: "Hands-on pink slime making at The Slime Studio" },
            ].map((img, i) => (
              <div
                key={i}
                className="reveal relative aspect-square rounded-[20px] overflow-hidden cursor-pointer transition-transform hover:scale-105"
              >
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="container my-10 md:my-20 px-4">
        <div className="reveal rounded-[24px] md:rounded-[32px] p-8 md:p-16 text-center shadow-lg" style={{ backgroundColor: "#64d8ec" }}>
          <h2 className="font-display text-[1.5rem] md:text-[2.6rem] mb-3 md:mb-3.5 text-white">{c.cta_title}</h2>
          <p className="text-[0.95rem] md:text-[1.1rem] text-white/70 mb-6 md:mb-8 max-w-xl mx-auto">
            {c.cta_text}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/booking" className="btn-primary btn-book-now">
              Book Now
            </Link>
            <Link href="/parties" className="btn-ghost" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)" }}>
              Plan a Party or Trip
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
