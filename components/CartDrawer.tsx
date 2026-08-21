"use client";

import Link from "next/link";
import { useCart } from "@/components/CartContext";

export default function CartDrawer() {
  const { items, isCartOpen, closeCart, removeItem, updateQuantity, subtotal, itemCount } = useCart();

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/40 z-[1100] transition-opacity"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[1101] shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10">
          <h2 className="font-display text-[1.1rem]">
            Your Cart {itemCount > 0 && <span className="text-ink-soft text-[0.85rem]">({itemCount})</span>}
          </h2>
          <button
            onClick={closeCart}
            className="w-8 h-8 rounded-full hover:bg-ink/5 grid place-items-center text-ink/60"
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="text-center py-16 text-ink-soft">
              <div className="text-4xl mb-3">🛒</div>
              <p className="text-[0.9rem]">Your cart is empty</p>
              <button
                onClick={closeCart}
                className="mt-4 px-5 py-2 rounded-full bg-sky-blue-light text-ink text-[0.85rem] font-medium"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 items-center">
                  {/* Image / placeholder */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#ffc4fb] to-[#abf7dc] grid place-items-center">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🫧</span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[0.9rem] truncate">{item.product.name}</h3>
                    <p className="text-[0.85rem] text-ink-soft">£{item.product.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-full bg-ink/10 text-ink text-sm hover:bg-ink/15"
                      >
                        −
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= (item.product.stock || 99)}
                        className="w-6 h-6 rounded-full bg-ink/10 text-ink text-sm hover:bg-ink/15 disabled:opacity-40"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="ml-2 text-[0.75rem] text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Line total */}
                  <div className="font-display text-[0.9rem] flex-shrink-0">
                    £{(item.product.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-ink/10 px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[0.9rem] text-ink-soft">Subtotal</span>
              <span className="font-display text-[1.1rem]">£{subtotal.toFixed(2)}</span>
            </div>
            <p className="text-[0.75rem] text-ink-soft">Shipping calculated at checkout</p>
            <Link
              href="/shop/checkout"
              onClick={closeCart}
              className="block w-full text-center px-5 py-3 rounded-full bg-[#ff2d78] text-white text-[0.9rem] font-medium hover:opacity-90 transition-opacity"
            >
              Checkout
            </Link>
            <button
              onClick={closeCart}
              className="block w-full text-center text-[0.85rem] text-ink-soft hover:text-ink"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
