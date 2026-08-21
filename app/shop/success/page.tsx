"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import type { ShopOrder } from "@/lib/supabase";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    supabase
      .from("shop_orders")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .single()
      .then(({ data }) => {
        if (data) setOrder(data as ShopOrder);
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-[50vh] grid place-items-center text-ink-soft">Loading...</div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <section className="py-[50px] md:py-[70px] text-center" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
        <div className="container max-w-2xl">
          <div className="text-5xl md:text-6xl mb-4">🎉</div>
          <h1 className="font-display text-[1.5rem] md:text-[2.5rem] text-ink mb-3">Order Confirmed!</h1>
          <p className="text-[0.95rem] md:text-[1.1rem] text-ink/80 mb-2">
            Thank you{order ? `, ${order.customer_name}` : ""}! Your order has been placed successfully.
          </p>
          {order && (
            <p className="text-[0.9rem] text-ink/70">
              Order number: <span className="font-medium">{order.order_number}</span>
            </p>
          )}
        </div>
      </section>

      {order && (
        <section className="section">
          <div className="container max-w-2xl">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="font-display text-[1.1rem] mb-4">Order Details</h2>
              <div className="space-y-3 mb-4">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-[0.9rem]">
                    <span>{item.name} × {item.quantity}</span>
                    <span>£{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-ink/10 pt-3 space-y-2">
                <div className="flex justify-between text-[0.9rem] text-ink-soft">
                  <span>Subtotal</span>
                  <span>£{Number(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[0.9rem] text-ink-soft">
                  <span>Shipping</span>
                  <span>{Number(order.shipping_cost) === 0 ? "Free" : `£${Number(order.shipping_cost).toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-display text-[1.1rem] pt-2 border-t border-ink/10">
                  <span>Total</span>
                  <span>£{Number(order.total).toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 bg-ink/[0.03] rounded-xl p-4 text-[0.85rem] text-ink-soft">
                <p className="mb-1"><strong className="text-ink">Delivery:</strong> {order.shipping_method === "collection" ? "Collection from studio" : "Delivery"}</p>
                {order.shipping_method === "delivery" && order.shipping_address && (
                  <p className="mb-1">
                    {order.shipping_address}{order.shipping_city ? `, ${order.shipping_city}` : ""}{order.shipping_postcode ? `, ${order.shipping_postcode}` : ""}
                  </p>
                )}
                <p><strong className="text-ink">Email:</strong> {order.customer_email}</p>
              </div>

              <p className="text-[0.85rem] text-ink-soft mt-4 text-center">
                We've sent a confirmation email to {order.customer_email}.
              </p>
            </div>

            <div className="text-center mt-6">
              <Link href="/shop" className="btn-primary inline-block">Continue Shopping</Link>
            </div>
          </div>
        </section>
      )}

      {!order && (
        <section className="section">
          <div className="container max-w-2xl text-center">
            <p className="text-ink-soft mb-6">Your payment was successful. We've sent a confirmation email.</p>
            <Link href="/shop" className="btn-primary inline-block">Continue Shopping</Link>
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}

export default function ShopSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] grid place-items-center text-ink-soft">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
