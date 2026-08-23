"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase, STAMPS_PER_REWARD } from "@/lib/supabase";
import type { LoyaltyCard } from "@/lib/supabase";

export default function LoyaltyPage() {
  const [email, setEmail] = useState("");
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [checkingEnabled, setCheckingEnabled] = useState(true);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("loyalty_enabled")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setLoyaltyEnabled(!!data.loyalty_enabled);
        setCheckingEnabled(false);
      });
  }, []);

  async function lookupCard() {
    if (!email.trim()) return;
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .from("loyalty_cards")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .single();
    setCard(data as LoyaltyCard | null);
    setLoading(false);
  }

  const availableRewards = card ? card.rewards_earned - card.rewards_redeemed : 0;
  const stampsNeeded = card ? STAMPS_PER_REWARD - card.stamps : STAMPS_PER_REWARD;

  return (
    <>
      <Navbar />

      <section className="py-[50px] md:py-[70px] text-center" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
        <div className="container">
          <h1 className="font-display text-[1.5rem] md:text-[3.2rem] mt-3 mb-3 text-ink">Loyalty Card</h1>
          <p className="text-[0.95rem] md:text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            Book {STAMPS_PER_REWARD} sessions, get your next one free! Enter your email below to check your stamps.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-lg">
          {checkingEnabled ? (
            <div className="text-center py-10 text-ink-soft">Loading...</div>
          ) : !loyaltyEnabled ? (
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm text-center">
              <div className="text-4xl mb-4">😴</div>
              <h2 className="font-display text-xl mb-2">Loyalty Programme Paused</h2>
              <p className="text-ink-soft text-[0.9rem] mb-6">
                Our loyalty programme is currently being updated. Check back soon!
              </p>
              <a href="/booking" className="btn-primary inline-block" style={{ padding: "10px 28px", fontSize: "0.9rem" }}>
                Book a Session
              </a>
            </div>
          ) : (
          <>
          {/* Email lookup */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm mb-6">
            <label className="block text-sm font-medium mb-2">Enter your email</label>
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupCard()}
                placeholder="jane@example.com"
                className="flex-1 px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
              <button
                onClick={lookupCard}
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-sky-blue-light text-ink text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? "Checking..." : "Check"}
              </button>
            </div>
          </div>

          {/* Results */}
          {searched && !loading && (
            card ? (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="text-center mb-6">
                  <h2 className="font-display text-xl mb-1">{card.name}</h2>
                  <p className="text-[0.85rem] text-ink-soft">{card.email}</p>
                </div>

                {/* Stamp card visual */}
                <div className="bg-gradient-to-br from-sky-blue-light/20 to-bright-lavender/10 rounded-2xl p-5 mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-display text-[0.9rem] text-ink">Your Stamp Card</span>
                    <span className="text-[0.8rem] text-ink-soft">{card.stamps} / {STAMPS_PER_REWARD}</span>
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {Array.from({ length: STAMPS_PER_REWARD }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-12 h-12 rounded-full grid place-items-center text-lg font-bold transition-all ${
                          i < card.stamps
                            ? "bg-bright-lavender text-white shadow-md scale-100"
                            : "bg-white/60 text-ink/20 border-2 border-dashed border-ink/15"
                        }`}
                      >
                        {i < card.stamps ? "★" : ""}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="text-center bg-ink/[0.03] rounded-xl py-3">
                    <div className="font-display text-[1.3rem] text-ink">{card.stamps}</div>
                    <div className="text-[0.7rem] text-ink-soft uppercase tracking-wide">Current Stamps</div>
                  </div>
                  <div className="text-center bg-ink/[0.03] rounded-xl py-3">
                    <div className="font-display text-[1.3rem] text-ink">{card.total_stamps}</div>
                    <div className="text-[0.7rem] text-ink-soft uppercase tracking-wide">Lifetime Stamps</div>
                  </div>
                  <div className="text-center bg-ink/[0.03] rounded-xl py-3">
                    <div className="font-display text-[1.3rem] text-bright-lavender">{availableRewards}</div>
                    <div className="text-[0.7rem] text-ink-soft uppercase tracking-wide">Free Sessions</div>
                  </div>
                </div>

                {/* Status message */}
                {availableRewards > 0 ? (
                  <div className="bg-bright-lavender/10 border-2 border-bright-lavender/30 rounded-xl p-4 text-center">
                    <p className="font-display text-[0.95rem] text-bright-lavender mb-1">You have a free session!</p>
                    <p className="text-[0.85rem] text-ink-soft">Mention this at your next visit to redeem your reward.</p>
                  </div>
                ) : (
                  <div className="bg-sky-blue-light/10 rounded-xl p-4 text-center">
                    <p className="text-[0.9rem] text-ink">
                      {stampsNeeded === 1
                        ? "Just 1 more stamp to earn a free session!"
                        : `${stampsNeeded} more stamps to earn a free session!`}
                    </p>
                    <p className="text-[0.8rem] text-ink-soft mt-1">Book another session to collect your next stamp.</p>
                  </div>
                )}

                <div className="mt-5 text-center">
                  <a href="/booking" className="btn-primary inline-block" style={{ padding: "10px 28px", fontSize: "0.9rem" }}>
                    Book Next Session
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm text-center">
                <div className="w-12 h-12 rounded-full bg-ink/5 grid place-items-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/40">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="text-[0.95rem] text-ink mb-1">No loyalty card found</p>
                <p className="text-[0.85rem] text-ink-soft mb-4">
                  You'll automatically get a stamp when you book a paid session online. Make sure to use the same email each time!
                </p>
                <a href="/booking" className="btn-primary inline-block" style={{ padding: "10px 28px", fontSize: "0.9rem" }}>
                  Book a Session
                </a>
              </div>
            )
          )}

          {/* How it works */}
          <div className="bg-sky-blue-light/10 rounded-2xl p-5 mt-6">
            <h3 className="font-display text-[0.95rem] mb-3 text-center">How It Works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-sky-blue-light/30 grid place-items-center mx-auto mb-2">
                  <span className="font-display text-[0.9rem] text-ink">1</span>
                </div>
                <p className="text-[0.8rem] text-ink-soft">Book a session online and pay online</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-sky-blue-light/30 grid place-items-center mx-auto mb-2">
                  <span className="font-display text-[0.9rem] text-ink">2</span>
                </div>
                <p className="text-[0.8rem] text-ink-soft">Earn 1 stamp per paid booking</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-bright-lavender/20 grid place-items-center mx-auto mb-2">
                  <span className="font-display text-[0.9rem] text-bright-lavender">{STAMPS_PER_REWARD}</span>
                </div>
                <p className="text-[0.8rem] text-ink-soft">Collect {STAMPS_PER_REWARD} stamps for a free session</p>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
