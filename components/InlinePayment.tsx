"use client";

import { useEffect, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;
let stripePromiseKey: string = "";

function loadStripeInstance(key: string): Promise<Stripe | null> {
  if (!stripePromise || stripePromiseKey !== key) {
    stripePromiseKey = key;
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

function PaymentForm({
  clientSecret,
  amount,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrMsg("");

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: typeof window !== "undefined" ? window.location.href : "",
      },
    });

    if (error) {
      setErrMsg(error.message || "Payment failed. Please try again.");
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {errMsg && (
        <div className="bg-red-100 text-red-700 text-sm rounded-xl p-3">{errMsg}</div>
      )}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="text-sm text-ink-soft hover:text-ink transition-colors"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="btn-primary disabled:opacity-60 flex-1 justify-center"
        >
          {processing ? "Processing..." : `Pay £${amount.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}

export default function InlinePayment({
  clientSecret,
  publishableKey,
  amount,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  publishableKey: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    if (publishableKey) {
      loadStripeInstance(publishableKey).then(setStripe);
    }
  }, [publishableKey]);

  if (!stripe || !clientSecret) {
    return (
      <div className="py-8 text-center text-ink-soft text-sm">Loading payment form...</div>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#64d8ec",
            borderRadius: "12px",
          },
        },
      }}
    >
      <PaymentForm
        clientSecret={clientSecret}
        amount={amount}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}
