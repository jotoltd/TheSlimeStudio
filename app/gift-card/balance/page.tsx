"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function GiftCardBalancePage() {
  const [code, setCode] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [initialValue, setInitialValue] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter a gift card code");
      return;
    }

    setLoading(true);
    setError("");
    setBalance(null);
    setChecked(false);

    try {
      const res = await fetch(`/api/gift-card-redeem?code=${encodeURIComponent(code.trim().toUpperCase())}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setBalance(data.balance);
        setInitialValue(data.initial_value);
        setStatus(data.status);
        setExpiryDate(data.expiry_date);
        setChecked(true);
      }
    } catch {
      setError("Failed to check balance. Please try again.");
    }

    setLoading(false);
  }

  return (
    <>
      <Navbar />
      <section className="section">
        <div className="container max-w-md">
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
            <h1 className="font-display text-[1.5rem] md:text-[1.8rem] text-ink mb-2">Check Gift Card Balance</h1>
            <p className="text-ink/70 text-sm mb-6">Enter your gift card code to see the current balance.</p>

            <form onSubmit={handleCheck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Gift Card Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SS-XXXXX"
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light uppercase"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-60"
              >
                {loading ? "Checking..." : "Check Balance"}
              </button>
            </form>

            {checked && balance !== null && (
              <div className="mt-6 bg-ink/[0.03] rounded-xl p-5">
                <div className="text-center">
                  <p className="text-sm text-ink-soft mb-1">Current Balance</p>
                  <p className="font-display text-3xl font-bold text-ink">£{balance.toFixed(2)}</p>
                  {initialValue !== null && (
                    <p className="text-xs text-ink-soft mt-1">of £{initialValue.toFixed(2)} initial value</p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-ink/10 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Status</span>
                    <span className={`font-medium ${
                      status === "active" ? "text-green-600" :
                      status === "used" ? "text-red-600" :
                      status === "expired" ? "text-orange-600" :
                      "text-gray-600"
                    }`}>
                      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
                    </span>
                  </div>
                  {expiryDate && (
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Expires</span>
                      <span className="font-medium">
                        {new Date(expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-6">
            <a href="/gift-card" className="text-sky-blue-light hover:underline text-sm">
              Buy a Gift Card
            </a>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
