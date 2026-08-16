"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { supabase, type Product, type ShopSettings } from "@/lib/supabase";

const filters = [
  { key: "all", label: "All Products" },
  { key: "handmade", label: "Handmade Slimes" },
  { key: "diy", label: "DIY Kits" },
  { key: "textures", label: "Slime Textures" },
  { key: "accessories", label: "Accessories" },
];

const DEFAULT_LAUNCH_DATE = new Date("2026-09-01T00:00:00");

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
  const [shopLive, setShopLive] = useState(false);
  const [launchDate, setLaunchDate] = useState(DEFAULT_LAUNCH_DATE);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const countdown = useCountdown(launchDate);

  useEffect(() => {
    supabase
      .from("shop_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) {
          const s = data as ShopSettings;
          setShopLive(s.live);
          setLaunchDate(new Date(s.launch_date));
        }
        setSettingsLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!shopLive) return;
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
  }, [shopLive]);

  const filtered =
    activeFilter === "all"
      ? products
      : products.filter((p) => p.category === activeFilter);

  return (
    <>
      <Navbar />

      {/* Loading state */}
      {!settingsLoaded ? (
        <div className="min-h-[60vh] grid place-items-center text-ink-soft">Loading...</div>
      ) : !shopLive ? (
        <section className="py-[50px] md:py-[70px] text-center px-4" style={{ backgroundColor: "#ffc4fb" }}>
          <div className="container max-w-2xl">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-ink/40">↝</span>
              <h2 className="font-display text-[1.3rem] tracking-wide text-ink/50 uppercase">Shop</h2>
              <span className="text-ink/40">↜</span>
            </div>
            <h1 className="font-display text-[1.6rem] md:text-[3.2rem] leading-[1.1] mb-2 text-ink">
              Something Slimy
            </h1>
            <h1 className="font-display text-[1.6rem] md:text-[3.2rem] leading-[1.1] mb-4 md:mb-6" style={{ color: "#E91E8C" }}>
              Is Coming...
            </h1>
            <div className="mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#ff2d78" className="mx-auto"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
            <p className="text-[0.9rem] md:text-[1.05rem] text-ink/80 mb-2">
              We&apos;re busy getting <span className="font-semibold" style={{ color: "#E91E8C" }}>The Slime Studio Shop</span> ready!
            </p>
            <p className="text-[0.9rem] md:text-[1.05rem] text-ink/80 mb-6">
              Soon you&apos;ll be able to bring the Slime Studio experience home
              with our range of <span className="font-semibold" style={{ color: "#E91E8C" }}>DIY slime kits, accessories, charms, add-ins and more.</span>
            </p>
            <p className="text-[0.9rem] md:text-[1.05rem] text-ink/80 mb-8 md:mb-10">
              Perfect for slime lovers, gifts, rainy days or simply when you
              need a little more slime in your life.
            </p>

            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-ink/40">↝</span>
              <h3 className="font-display text-[1.1rem] tracking-wide text-ink/50 uppercase">Coming Soon</h3>
              <span className="text-ink/40">↜</span>
            </div>

            <div className="grid grid-cols-4 gap-2 md:gap-5 mb-6 md:mb-8">
              {[
                { label: "Days", value: countdown.days },
                { label: "Hours", value: countdown.hours },
                { label: "Minutes", value: countdown.minutes },
                { label: "Seconds", value: countdown.seconds },
              ].map((unit) => (
                <div key={unit.label} className="bg-white rounded-xl md:rounded-2xl py-3 md:py-4 shadow-md">
                  <div className="font-display text-[1.2rem] md:text-[2.4rem]" style={{ color: "#E91E8C" }}>
                    {String(unit.value).padStart(2, "0")}
                  </div>
                  <div className="text-[0.75rem] font-semibold text-ink uppercase tracking-wide">{unit.label}</div>
                </div>
              ))}
            </div>

            <p className="flex items-center justify-center gap-2 md:gap-3 font-display text-[0.85rem] md:text-[1rem] mb-8 md:mb-10" style={{ color: "#E91E8C" }}>
              <span>★</span> Our online shop is almost ready! <span>★</span>
            </p>

            <div className="border-2 border-dashed rounded-2xl p-4 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 bg-white/40" style={{ borderColor: "#E91E8C" }}>
              <div className="flex items-center gap-4 text-left">
                <span className="text-3xl">💬</span>
                <div>
                  <p className="font-display text-[1.05rem]" style={{ color: "#E91E8C" }}>Can&apos;t Wait?</p>
                  <p className="font-display text-[0.95rem] text-ink">Our gift cards are available!</p>
                  <p className="text-[0.85rem] md:text-[0.9rem] text-ink-soft mt-6 md:mt-8">Please send us a message.</p>
                </div>
              </div>

              {/* Gift card visual */}
              <div className="relative flex-shrink-0">
                <div
                  className="relative w-[150px] h-[95px] rounded-xl shadow-lg overflow-hidden flex flex-col items-center justify-center gap-1"
                  style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}
                >
                  <img src="/images/header_logo.png" alt="The Slime Studio" className="w-[100px] h-auto object-contain" />
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

      {shopLive && (
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
