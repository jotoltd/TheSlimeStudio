"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PRICE_TIERS = [
  { label: "Up to 5 children", min: 1, max: 5, price: 13.5 },
  { label: "6–10 children", min: 6, max: 10, price: 12.5 },
  { label: "11–15 children", min: 11, max: 15, price: 11.5 },
];

function priceForCount(count: number) {
  return PRICE_TIERS.find((t) => count >= t.min && count <= t.max)?.price ?? null;
}

export default function PartiesPage() {
  const [ageBand, setAgeBand] = useState<"under8" | "over8">("under8");
  const [children, setChildren] = useState(10);

  const maxCapacity = ageBand === "under8" ? 10 : 15;
  // Age 8 and above use the 15-max band
  const pricePerChild = useMemo(() => priceForCount(Math.min(children, maxCapacity)), [children, maxCapacity]);
  const total = pricePerChild ? pricePerChild * children : null;
  const overCapacity = children > maxCapacity;

  return (
    <>
      <Navbar />

      <section className="py-[70px] text-center" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
        <div className="container">
          <h1 className="font-display text-[2rem] md:text-[3.2rem] mt-3 mb-3 text-ink">Parties & Birthdays</h1>
          <p className="text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            Make their birthday unforgettable with 1.5 hours of private
            slime-making fun at our Norfolk studio.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-3xl">
          <div className="reveal mb-12 text-center">
            <h2 className="font-display text-2xl mb-4">A Party They&apos;ll Never Forget</h2>
            <p className="text-ink-soft">
              Ditch the usual party games — our slime-making parties bring
              hands-on creativity, giggles and a take-home creation for every
              guest, all in our own private studio space.
            </p>
          </div>

          {/* The Party Experience */}
          <div className="bg-white rounded-3xl p-8 shadow-sm mb-8">
            <h2 className="font-display text-xl mb-6 text-center">Each Child&apos;s Party Experience</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { icon: "🧪", title: "Choose", desc: "Their type of slime" },
                { icon: "🎨", title: "Colour", desc: "Add their favourite colour" },
                { icon: "�", title: "Scent", desc: "Pick a fun scent to mix in" },
                { icon: "✨", title: "Decorate", desc: "Finish with charms" },
              ].map((step) => (
                <div key={step.title} className="text-center">
                  <div className="w-16 h-16 rounded-full grid place-items-center text-2xl mx-auto mb-3 bg-sky-blue-light">
                    {step.icon}
                  </div>
                  <h3 className="font-display text-sm mb-1">{step.title}</h3>
                  <p className="text-xs text-ink-soft">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Studio Time & Group Sizes */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="text-3xl mb-3">⏱️</div>
              <h3 className="font-display text-lg mb-2">Private Studio Time</h3>
              <p className="text-sm text-ink-soft">
                Every party gets 1.5 hours of exclusive, private use of our
                studio — just your group, no one else.
              </p>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="text-3xl mb-3">👥</div>
              <h3 className="font-display text-lg mb-2">Group Sizes by Age</h3>
              <p className="text-sm text-ink-soft">
                Up to age 7 — maximum 10 children.<br />
                Age 8 and above — maximum 15 children.
              </p>
            </div>
          </div>

          {/* Pricing Table */}
          <div className="bg-white rounded-3xl p-8 shadow-sm mb-8">
            <h2 className="font-display text-xl mb-6 text-center">Party Pricing</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {PRICE_TIERS.map((tier) => (
                <div key={tier.label} className="bg-sky-blue-light/20 rounded-2xl p-6 text-center">
                  <div className="font-display text-2xl mb-1">£{tier.price.toFixed(2)}</div>
                  <div className="text-xs text-ink-soft uppercase tracking-wider mb-2">per child</div>
                  <div className="text-sm text-ink-soft">{tier.label}</div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-ink-soft">
              Pricing includes 1.5 hours private studio hire and all party materials.
            </p>
          </div>

          {/* Price Calculator */}
          <div className="bg-white rounded-3xl p-8 shadow-sm mb-12">
            <h2 className="font-display text-xl mb-6 text-center">Estimate Your Party Price</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 text-center">Guest Age Group</label>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setAgeBand("under8")}
                  className={`px-5 py-2.5 rounded-full text-sm font-display transition-all ${
                    ageBand === "under8" ? "bg-sky-blue-light text-ink shadow-sm" : "bg-ink/[0.05] text-ink hover:bg-sky-blue-light/30"
                  }`}
                >
                  Up to age 7 (max 10)
                </button>
                <button
                  type="button"
                  onClick={() => setAgeBand("over8")}
                  className={`px-5 py-2.5 rounded-full text-sm font-display transition-all ${
                    ageBand === "over8" ? "bg-sky-blue-light text-ink shadow-sm" : "bg-ink/[0.05] text-ink hover:bg-sky-blue-light/30"
                  }`}
                >
                  Age 8+ (max 15)
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-center">Number of Children</label>
              <div className="flex items-center gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => setChildren((c) => Math.max(1, c - 1))}
                  className="w-10 h-10 rounded-full bg-ink/10 text-ink text-lg hover:bg-ink/15 transition-colors"
                >
                  −
                </button>
                <span className="font-display text-2xl w-10 text-center">{children}</span>
                <button
                  type="button"
                  onClick={() => setChildren((c) => Math.min(15, c + 1))}
                  className="w-10 h-10 rounded-full bg-ink/10 text-ink text-lg hover:bg-ink/15 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {overCapacity ? (
              <div className="bg-red-100 text-red-700 text-sm rounded-xl p-3 text-center mb-2">
                Max group size for this age band is {maxCapacity} children. Please get in touch for larger groups.
              </div>
            ) : (
              <div className="flex items-center justify-between bg-sky-blue-light/20 rounded-xl p-5">
                <span className="text-sm text-ink-soft">
                  {children} × £{pricePerChild?.toFixed(2)} per child
                </span>
                <span className="font-display text-2xl">£{total?.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
            <h2 className="font-display text-xl mb-3">Ready to Book a Party?</h2>
            <p className="text-ink-soft text-sm mb-6">
              Get in touch with your preferred date, age group and guest count
              and we&apos;ll confirm availability and pricing.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/contact" className="btn-primary">
                Enquire About a Party
              </Link>
              <Link href="/booking" className="btn-secondary">
                Book a Standard Session
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
