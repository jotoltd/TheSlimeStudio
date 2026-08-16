"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const carouselImages = [
  "/images/slime_studio_pink_slime_experience.jpg.jpeg",
  "/images/pink_slime_stretch.jpg.jpeg",
  "/images/blue_slime_closeup.jpg.jpeg",
  "/images/slime_mixing.jpg.jpeg",
];

const features = [
  {
    img: "/images/pink_slime_action.jpg.jpeg",
    gradient: "from-[#64d8ec] to-[#abf7dc]",
    title: "Create It Your Way",
    desc: "Pick your colours, mix, stretch and customise with a huge range of fun extras.",
  },
  {
    img: "/images/slime_studio_teal_slime.jpg.jpeg",
    gradient: "from-[#ffc4fb] to-[#E0B0FF]",
    title: "Everyone Welcome",
    desc: "Whether you're obsessed with slime or trying it for the first time, everyone is welcome.",
  },
  {
    img: "/images/purple_finished_slime.jpg.jpeg",
    gradient: "from-[#CBC3E3] to-[#abf7dc]",
    title: "Take It Home",
    desc: "Your finished slime is yours to take home and enjoy.",
  },
];

export default function AboutPage() {
  const [slide, setSlide] = useState(0);

  function prevSlide() {
    setSlide((s) => (s - 1 + carouselImages.length) % carouselImages.length);
  }

  function nextSlide() {
    setSlide((s) => (s + 1) % carouselImages.length);
  }

  return (
    <>
      <Navbar />

      {/* Hero Carousel */}
      <div className="relative w-full aspect-[16/7] md:aspect-[16/5] overflow-hidden bg-ink">
        {carouselImages.map((src, i) => (
          <img
            key={src}
            src={src}
            alt="The Slime Studio"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              i === slide ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        <button
          onClick={prevSlide}
          aria-label="Previous slide"
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 text-ink grid place-items-center hover:bg-white transition-colors shadow-sm"
        >
          &#8249;
        </button>
        <button
          onClick={nextSlide}
          aria-label="Next slide"
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 text-ink grid place-items-center hover:bg-white transition-colors shadow-sm"
        >
          &#8250;
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {carouselImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === slide ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      </div>

      {/* About Section */}
      <section className="relative py-16 md:py-20 overflow-hidden" style={{ backgroundColor: "#ffc4fb" }}>
        {/* Decorative blob top-right */}
        <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-90">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path
              d="M60 0 C120 0 200 20 200 80 C200 140 150 170 100 160 C50 150 0 120 10 60 C15 30 30 0 60 0 Z"
              fill="#64d8ec"
            />
          </svg>
          <span className="absolute top-10 left-10 text-3xl">⭐</span>
          <span className="absolute top-24 left-28 w-3 h-3 rounded-full bg-[#E0B0FF]" />
          <span className="absolute top-16 right-10 w-4 h-4 rounded-full bg-[#ff6fae]" />
          <span className="absolute bottom-6 left-16 w-5 h-5 rounded-full bg-[#64d8ec]" />
        </div>

        <div className="container relative z-[1] text-center max-w-2xl px-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-ink/40">↝</span>
            <h2 className="font-display text-[1rem] md:text-[1.1rem] tracking-wide text-ink/50 uppercase">About</h2>
            <span className="text-ink/40">↜</span>
          </div>
          <h1 className="font-display text-[1.6rem] md:text-[2.8rem] leading-[1.15] mb-6 text-ink">
            The Slime Studio
          </h1>
          <p className="text-[0.95rem] md:text-[1.05rem] text-ink/80 mb-4 leading-relaxed">
            The Slime Studio is a colourful, hands-on experience where you can
            mix, stretch and create your very own slime.
          </p>
          <p className="text-[0.95rem] md:text-[1.05rem] text-ink/80 mb-4 leading-relaxed">
            Choose your colours, experiment with textures and add your
            favourite extras to make something completely your own — then
            take your creation home with you.
          </p>
          <div className="inline-flex items-center gap-2 bg-white/50 rounded-full px-4 py-2 text-[0.85rem] text-ink mb-10 md:mb-14">
            <span>📍</span>
            <span className="font-medium">Unit A, Feathers Yard, Holt, NR25 6BF</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 mb-10 md:mb-16 text-left sm:text-center">
            {features.map((f) => (
              <div key={f.title} className="flex flex-col items-center">
                <div
                  className={`w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden bg-gradient-to-br ${f.gradient} border-4 border-white shadow-md mb-5`}
                >
                  <img src={f.img} alt={f.title} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-display text-[1.1rem] text-ink uppercase tracking-wide mb-2">
                  {f.title}
                </h3>
                <p className="text-[0.9rem] text-ink/70 leading-relaxed max-w-[220px]">{f.desc}</p>
              </div>
            ))}
          </div>

          <p className="font-display text-[1.1rem] md:text-[1.6rem] text-ink mb-6 italic">
            Ready to make your own?
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="/booking"
              className="btn-primary"
            >
              Book Now
            </a>
            <a
              href="/shop"
              className="btn-secondary"
            >
              Shop
            </a>
          </div>
        </div>

        {/* Decorative blob bottom-left */}
        <div className="absolute -bottom-10 -left-10 w-56 h-56 pointer-events-none opacity-90">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path
              d="M40 200 C0 160 -10 100 40 60 C90 20 160 30 180 80 C200 130 160 180 110 195 C85 202 60 200 40 200 Z"
              fill="#CBC3E3"
            />
          </svg>
          <span className="absolute top-10 left-16 w-3 h-3 rounded-full bg-[#64d8ec]" />
          <span className="absolute top-24 left-8 w-4 h-4 rounded-full bg-[#E0B0FF]" />
        </div>

        {/* Decorative blob bottom-right */}
        <div className="absolute -bottom-10 -right-10 w-56 h-56 pointer-events-none opacity-90">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path
              d="M160 200 C200 160 210 100 160 60 C110 20 40 30 20 80 C0 130 40 180 90 195 C115 202 140 200 160 200 Z"
              fill="#ff6fae"
            />
          </svg>
        </div>
      </section>

      <Footer />
    </>
  );
}
