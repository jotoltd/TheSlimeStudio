"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/components/CartContext";

const DELIVERY_FEE = 3.95;
const FREE_DELIVERY_THRESHOLD = 30;

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [shippingMethod, setShippingMethod] = useState<"collection" | "delivery">("collection");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cancelled") === "true") {
      setCancelled(true);
    }
  }, []);

  const shippingCost = shippingMethod === "delivery" ? (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE) : 0;
  const total = subtotal + shippingCost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (items.length === 0) {
      setError("Your cart is empty");
      return;
    }
    if (!name || !email) {
      setError("Please fill in your name and email");
      return;
    }
    if (shippingMethod === "delivery" && (!address || !postcode)) {
      setError("Please fill in your delivery address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/shop-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            product_id: i.product.id,
            name: i.product.name,
            price: i.product.price,
            quantity: i.quantity,
            image_url: i.product.image_url,
          })),
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          shippingMethod,
          shippingAddress: address,
          shippingCity: city,
          shippingPostcode: postcode,
          notes,
        }),
      });
      const data = await res.json();
      if (data.url) {
        clearCart();
        window.location.href = data.url;
      } else {
        setError(data.error || "Checkout failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  if (items.length === 0 && !cancelled) {
    return (
      <>
        <Navbar />
        <div className="min-h-[50vh] grid place-items-center px-4">
          <div className="text-center">
            <div className="text-4xl mb-4">🛒</div>
            <h1 className="font-display text-[1.5rem] mb-2">Your cart is empty</h1>
            <p className="text-ink-soft mb-6">Add some products before checking out.</p>
            <Link href="/shop" className="btn-primary inline-block">Back to Shop</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <section className="py-[50px] md:py-[70px] text-center px-4" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
        <div className="container">
          <h1 className="font-display text-[1.5rem] md:text-[2.5rem] text-ink">Checkout</h1>
        </div>
      </section>

      <section className="section px-4">
        <div className="container max-w-4xl">
          {cancelled && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-center text-[0.9rem] text-red-700">
              Your payment was cancelled. Your cart has been preserved — try again when you're ready.
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Details */}
            <div className="space-y-6">
              {/* Shipping method */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-display text-[1.1rem] mb-4">Delivery Method</h2>
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${shippingMethod === "collection" ? "border-sky-blue-light bg-sky-blue-light/5" : "border-ink/10"}`}>
                    <input type="radio" name="shipping" value="collection" checked={shippingMethod === "collection"} onChange={() => setShippingMethod("collection")} className="accent-[#ff2d78]" />
                    <div className="flex-1">
                      <div className="font-medium text-[0.9rem]">Collect from Studio</div>
                      <div className="text-[0.8rem] text-ink-soft">Unit A, Feathers Yard, Holt, NR25 6BF — Free</div>
                    </div>
                    <span className="font-display text-[0.9rem]">£0.00</span>
                  </label>
                  <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${shippingMethod === "delivery" ? "border-sky-blue-light bg-sky-blue-light/5" : "border-ink/10"}`}>
                    <input type="radio" name="shipping" value="delivery" checked={shippingMethod === "delivery"} onChange={() => setShippingMethod("delivery")} className="accent-[#ff2d78]" />
                    <div className="flex-1">
                      <div className="font-medium text-[0.9rem]">UK Delivery</div>
                      <div className="text-[0.8rem] text-ink-soft">£{DELIVERY_FEE.toFixed(2)} · Free over £{FREE_DELIVERY_THRESHOLD}</div>
                    </div>
                    <span className="font-display text-[0.9rem]">{shippingCost === 0 ? "Free" : `£${DELIVERY_FEE.toFixed(2)}`}</span>
                  </label>
                </div>
              </div>

              {/* Contact details */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-display text-[1.1rem] mb-4">Your Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Full Name *</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Phone</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
                  </div>
                </div>
              </div>

              {/* Delivery address (conditional) */}
              {shippingMethod === "delivery" && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="font-display text-[1.1rem] mb-4">Delivery Address</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Address *</label>
                      <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">City</label>
                      <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Postcode *</label>
                      <input type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)} required className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <label className="block text-sm font-medium mb-1.5">Order Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any special instructions..." className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light resize-none" />
              </div>
            </div>

            {/* Right: Order summary */}
            <div className="lg:sticky lg:top-24 self-start">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-display text-[1.1rem] mb-4">Order Summary</h2>
                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#ffc4fb] to-[#abf7dc] grid place-items-center">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">🫧</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.85rem] font-medium truncate">{item.product.name}</div>
                        <div className="text-[0.8rem] text-ink-soft">£{item.product.price.toFixed(2)} × {item.quantity}</div>
                      </div>
                      <div className="text-[0.85rem] font-medium">
                        £{(item.product.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-ink/10 pt-4 space-y-2">
                  <div className="flex justify-between text-[0.9rem]">
                    <span className="text-ink-soft">Subtotal</span>
                    <span>£{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[0.9rem]">
                    <span className="text-ink-soft">Shipping</span>
                    <span>{shippingCost === 0 ? "Free" : `£${shippingCost.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between font-display text-[1.1rem] pt-2 border-t border-ink/10">
                    <span>Total</span>
                    <span>£{total.toFixed(2)}</span>
                  </div>
                </div>

                {error && <p className="text-red-600 text-[0.85rem] mt-4">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 px-5 py-3 rounded-full bg-[#ff2d78] text-white text-[0.9rem] font-medium disabled:opacity-60 hover:opacity-90 transition-opacity"
                >
                  {loading ? "Redirecting to payment..." : `Pay £${total.toFixed(2)}`}
                </button>

                <p className="text-[0.75rem] text-ink-soft text-center mt-3">
                  Secure payment via Stripe
                </p>
              </div>
            </div>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
}
