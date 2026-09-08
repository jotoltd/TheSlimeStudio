"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function GiftCardSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [giftCard, setGiftCard] = useState<{ code: string; amount: number } | null>(null);

  useEffect(() => {
    async function loadGiftCard() {
      if (!sessionId) {
        setError("No session ID found");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/gift-card-success?session_id=${sessionId}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else if (data.giftCard) {
          setGiftCard(data.giftCard);
        }
      } catch (err) {
        setError("Failed to load gift card details");
      }
      setLoading(false);
    }

    loadGiftCard();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-blue-light/20 via-white to-bright-lavender/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-blue-light mx-auto mb-4"></div>
          <p className="text-ink-soft">Loading your gift card...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-blue-light/20 via-white to-bright-lavender/20 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="font-display text-2xl text-ink mb-3">Something went wrong</h1>
          <p className="text-ink-soft mb-6">{error}</p>
          <a href="/gift-card" className="inline-block px-6 py-3 rounded-xl bg-sky-blue-light text-ink font-semibold text-sm hover:opacity-90">
            Try Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-blue-light/20 via-white to-bright-lavender/20 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-green-500 text-5xl mb-4">🎉</div>
        <h1 className="font-display text-2xl text-ink mb-3">Gift Card Purchased!</h1>
        <p className="text-ink-soft mb-6">
          Your gift card is ready. Here are the details:
        </p>

        {giftCard && (
          <div className="bg-gradient-to-br from-sky-blue-light/10 to-bright-lavender/10 rounded-xl p-6 mb-6 border-2 border-ink/10">
            <div className="text-sm text-ink-soft mb-1">Gift Card Code</div>
            <div className="font-display text-3xl text-ink mb-4 tracking-wider">{giftCard.code}</div>
            <div className="text-sm text-ink-soft mb-1">Balance</div>
            <div className="font-display text-2xl text-ink">£{giftCard.amount.toFixed(2)}</div>
          </div>
        )}

        <div className="space-y-3 mb-6 text-left text-sm text-ink-soft">
          <p>• Gift cards are valid for 1 year from purchase</p>
          <p>• Use at checkout for bookings or shop orders</p>
          <p>• Share the code with the recipient</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              if (giftCard) {
                navigator.clipboard.writeText(giftCard.code);
                alert("Gift card code copied!");
              }
            }}
            className="w-full py-3 rounded-xl bg-sky-blue-light text-ink font-semibold text-sm hover:opacity-90"
          >
            Copy Gift Card Code
          </button>
          <a href="/gift-card/balance" className="block text-center text-sky-blue-light text-sm hover:underline">
            Check Balance
          </a>
          <a href="/" className="block text-center text-ink-soft text-sm hover:underline">
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
}
