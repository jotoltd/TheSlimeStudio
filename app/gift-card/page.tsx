"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PRESET_AMOUNTS = [10, 15, 25, 50, 75, 100];

export default function GiftCardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled");

  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [purchaserName, setPurchaserName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "sumup">("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("site_settings").select("payment_provider").eq("id", 1).single().then(({ data }) => {
      if (data && data.payment_provider) {
        setPaymentProvider(data.payment_provider as "stripe" | "sumup");
      }
    });
    fetch("/api/account/me").then(r => r.json()).then(data => {
      if (data.authenticated && data.customerId) {
        setCustomerId(data.customerId);
      }
    }).catch(() => {});
  }, []);

  function handlePresetClick(value: number) {
    setAmount(value);
    setCustomAmount("");
  }

  function handleCustomAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setCustomAmount(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setAmount(num);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (amount < 10) {
      setError("Gift card amount must be at least £10");
      return;
    }
    if (amount > 500) {
      setError("Gift card amount cannot exceed £500");
      return;
    }
    if (!purchaserName.trim() || !purchaserEmail.trim()) {
      setError("Please enter your name and email");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(purchaserEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    if (recipientEmail && !emailRegex.test(recipientEmail)) {
      setError("Please enter a valid recipient email address");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/gift-card-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          purchaserName: purchaserName.trim(),
          purchaserEmail: purchaserEmail.trim(),
          recipientName: recipientName.trim() || undefined,
          recipientEmail: recipientEmail.trim() || undefined,
          message: message.trim() || undefined,
          paymentMethod: paymentProvider,
          customerId,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError("Failed to create checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-sky-blue-light/20 via-white to-bright-lavender/20 py-12 px-4">
        <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-ink mb-3">Gift Cards</h1>
          <p className="text-ink-soft text-lg">
            Give the gift of slime! Perfect for birthdays, holidays, or just because.
          </p>
        </div>

        {cancelled && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
            Checkout was cancelled. Please try again.
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount Selection */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-3">Select Amount</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                {PRESET_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handlePresetClick(value)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      amount === value && !customAmount
                        ? "bg-sky-blue-light text-ink ring-2 ring-sky-blue-light"
                        : "bg-ink/5 text-ink hover:bg-ink/10"
                    }`}
                  >
                    £{value}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft font-medium text-sm">£</span>
                <input
                  type="number"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Custom amount (min £10, max £500)"
                  min="10"
                  max="500"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              {amount < 10 && (
                <p className="text-red-600 text-xs mt-1">Minimum amount is £10</p>
              )}
              {amount > 500 && (
                <p className="text-red-600 text-xs mt-1">Maximum amount is £500</p>
              )}
              <p className="text-ink-soft text-xs mt-3">
                Gift cards are valid for 3 months from the date of purchase.
              </p>
            </div>

            <div className="text-center mt-6">
              <Link href="/shop" className="btn-primary inline-block">Continue Shopping</Link>
            </div>

            <div className="text-center mt-4">
              <Link href="/gift-card/balance" className="text-sky-blue-light hover:underline text-sm">
                Check Gift Card Balance
              </Link>
            </div>

            {/* Purchaser Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-ink">Your Details</h3>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Your Name *</label>
                <input
                  type="text"
                  value={purchaserName}
                  onChange={(e) => setPurchaserName(e.target.value)}
                  placeholder="John Smith"
                  required
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Your Email *</label>
                <input
                  type="email"
                  value={purchaserEmail}
                  onChange={(e) => setPurchaserEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
            </div>

            {/* Recipient Details (Optional) */}
            <div className="space-y-4">
              <h3 className="font-semibold text-ink">Recipient Details (Optional)</h3>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Recipient Email</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Personal Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Happy Birthday! Hope you have a slime-tastic day!"
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light resize-none"
                />
                <p className="text-xs text-ink-soft mt-1">{message.length}/200 characters</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-ink/5 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Gift Card Value</span>
                <span className="font-semibold text-ink">£{amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Processing Fee</span>
                <span className="font-semibold text-ink">Free</span>
              </div>
              <div className="border-t border-ink/10 pt-2 flex justify-between">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-display font-bold text-ink text-lg">£{amount.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || amount < 10 || amount > 500}
              className="w-full py-3.5 rounded-xl bg-sky-blue-light text-ink font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Checkout..." : `Pay £${amount.toFixed(2)}`}
            </button>

            <p className="text-xs text-ink-soft text-center">
              Gift cards are valid for 3 months from the date of purchase. Cannot be refunded or exchanged for cash.
            </p>
          </form>
        </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
