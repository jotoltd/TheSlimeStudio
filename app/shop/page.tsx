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

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

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
      <section className="bg-gradient-to-br from-blush-pop to-bright-lavender py-[70px] text-center">
        <div className="container">
          <span className="eyebrow">Our Shop</span>
          <h1 className="font-display text-[2rem] md:text-[3.2rem] mt-3 mb-3">Slime, Kits & Accessories</h1>
          <p className="text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            Handmade in small batches in our Norfolk studio. Every slime is
            unique, scented and ready to squish.
          </p>
        </div>
      </section>

      {SHOP_LIVE ? (
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
      ) : (
        /* Coming Soon */
        <section className="section">
          <div className="container max-w-2xl text-center">
            <div className="text-6xl mb-6">🛍️</div>
            <h2 className="font-display text-2xl mb-4">Coming Soon</h2>
            <p className="text-ink-soft mb-8">
              We&apos;re busy stocking the shelves! In the next month we&apos;ll be
              launching DIY slime kits, slime accessories, monthly subscription
              boxes and merchandise — all handmade with the same care as our
              in-studio sessions.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { icon: "📦", label: "DIY Slime Kits" },
                { icon: "🎁", label: "Slime Accessories" },
                { icon: "📬", label: "Subscription Boxes" },
                { icon: "👕", label: "Merchandise" },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <p className="text-sm text-ink-soft">{item.label}</p>
                </div>
              ))}
            </div>
            <a href="/booking" className="btn-primary">
              Book a Studio Session Instead
            </a>
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}
