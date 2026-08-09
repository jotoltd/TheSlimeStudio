"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { supabase, type Product } from "@/lib/supabase";

const filters = [
  { key: "all", label: "All Products" },
  { key: "handmade", label: "Handmade Slimes" },
  { key: "diy", label: "DIY Kits" },
  { key: "textures", label: "Slime Textures" },
  { key: "accessories", label: "Accessories" },
];

// Flip to true once products are ready to launch.
const SHOP_LIVE = false;

// Set your shop launch date here.
const LAUNCH_DATE = new Date("2026-09-01T00:00:00");

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function tick() {
      const diff = Math.max(0, target.getTime() - Date.now());
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return timeLeft;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const countdown = useCountdown(LAUNCH_DATE);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (!error && data) {
        setProducts(data as Product[]);
      }
      setLoading(false);
    }
    fetchProducts();
  }, []);

  const filtered =
    activeFilter === "all"
      ? products
      : products.filter((p) => p.category === activeFilter);

  return (
    <>
      <Navbar />

      {/* Shop Hero */}
      {!SHOP_LIVE ? (
        <section className="py-[70px] text-center" style={{ backgroundColor: "#ffc4fb" }}>
          <div className="container max-w-2xl">
            <div className="text-2xl mb-2">💗</div>
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-[#64d8ec]">↝</span>
              <h2 className="font-display text-[1.3rem] tracking-wide text-[#64d8ec] uppercase">Shop</h2>
              <span className="text-[#64d8ec]">↜</span>
            </div>
            <h1 className="font-display text-[2.2rem] md:text-[3.2rem] leading-[1.1] mb-2 text-ink">
              Something Slimy
            </h1>
            <h1 className="font-display text-[2.2rem] md:text-[3.2rem] leading-[1.1] mb-6" style={{ color: "#E91E8C" }}>
              Is Coming...
            </h1>
            <div className="text-2xl mb-6">💚</div>
            <p className="text-[1.05rem] text-ink/80 mb-2">
              We&apos;re busy getting <span className="font-semibold" style={{ color: "#E91E8C" }}>The Slime Studio Shop</span> ready!
            </p>
            <p className="text-[1.05rem] text-ink/80 mb-6">
              Soon you&apos;ll be able to bring the Slime Studio experience home
              with our range of <span className="font-semibold" style={{ color: "#E91E8C" }}>DIY slime kits, ready-made slimes, accessories, charms, add-ins and more.</span>
            </p>
            <p className="text-[1.05rem] text-ink/80 mb-10">
              Perfect for slime lovers, gifts, rainy days or simply when you
              need a little more slime in your life.
            </p>

            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-[#64d8ec]">↝</span>
              <h3 className="font-display text-[1.1rem] tracking-wide text-[#64d8ec] uppercase">Coming Soon</h3>
              <span className="text-[#64d8ec]">↜</span>
            </div>

            <div className="grid grid-cols-4 gap-3 md:gap-5 mb-8">
              {[
                { label: "Days", value: countdown.days },
                { label: "Hours", value: countdown.hours },
                { label: "Minutes", value: countdown.minutes },
                { label: "Seconds", value: countdown.seconds },
              ].map((unit) => (
                <div key={unit.label} className="bg-white rounded-2xl py-4 shadow-md">
                  <div className="font-display text-[1.8rem] md:text-[2.4rem]" style={{ color: "#E91E8C" }}>
                    {String(unit.value).padStart(2, "0")}
                  </div>
                  <div className="text-[0.75rem] font-semibold text-ink uppercase tracking-wide">{unit.label}</div>
                </div>
              ))}
            </div>

            <p className="flex items-center justify-center gap-3 font-display text-[1rem] mb-10" style={{ color: "#E91E8C" }}>
              <span>★</span> Our online shop is almost ready! <span>★</span>
            </p>

            <div className="border-2 border-dashed rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-white/40" style={{ borderColor: "#E91E8C" }}>
              <div className="flex items-center gap-4 text-left">
                <span className="text-3xl">💬</span>
                <div>
                  <p className="font-display text-[1.05rem]" style={{ color: "#E91E8C" }}>Can&apos;t Wait?</p>
                  <p className="font-display text-[0.95rem] text-ink">Our gift cards are available!</p>
                  <p className="text-[0.85rem] text-ink-soft mt-1">Please send us a message.</p>
                </div>
              </div>

              {/* Gift card visual */}
              <div className="relative flex-shrink-0">
                <div
                  className="relative w-[150px] h-[95px] rounded-xl shadow-lg overflow-hidden flex flex-col items-center justify-center gap-1"
                  style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}
                >
                  <img src="/images/logo.png" alt="The Slime Studio" className="w-[70px] h-auto object-contain" />
                  <span className="font-display text-[0.55rem] tracking-wide text-ink/70 uppercase">Gift Card</span>
                </div>
                {/* Bow */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl select-none">🎀</div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="py-[70px] text-center" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
          <div className="container">
            <h1 className="font-display text-[2rem] md:text-[3.2rem] mt-3 mb-3 text-ink">Slime, Kits & Accessories</h1>
            <p className="text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
              Handmade in small batches in our Norfolk studio. Every slime is
              unique, scented and ready to squish.
            </p>
          </div>
        </section>
      )}

      {SHOP_LIVE && (
        /* Filters + Products */
        <section className="section">
          <div className="container">
            <div className="flex gap-3 flex-wrap justify-center mb-12">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`font-display px-5 py-2 rounded-full text-[0.9rem] transition-all ${
                    activeFilter === f.key
                      ? "bg-sky-blue-light text-ink shadow-sm"
                      : "bg-white text-ink hover:bg-sky-blue-light/20"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-20 text-ink-soft">Loading products...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-ink-soft">
                No products found in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}
