"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Product } from "@/lib/supabase";
import { trackAddToCart } from "@/lib/ad-tracking";

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on mount — validate the shape before trusting
  // it: a corrupted/hand-edited entry with NaN prices or quantities would
  // otherwise produce NaN subtotals and broken checkout totals.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("slime_cart");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;
      const merged = new Map<string, CartItem>();
      for (const raw of parsed) {
        const p = raw?.product;
        const qty = Math.floor(Number(raw?.quantity));
        if (
          !p || typeof p.id !== "string" || typeof p.name !== "string" ||
          !Number.isFinite(Number(p.price)) || Number(p.price) < 0 ||
          !Number.isFinite(qty) || qty < 1
        ) continue;
        const existing = merged.get(p.id);
        if (existing) {
          existing.quantity = Math.min(existing.quantity + qty, p.stock || 99);
        } else {
          merged.set(p.id, { product: { ...p, price: Number(p.price) }, quantity: Math.min(qty, p.stock || 99) });
        }
      }
      setItems(Array.from(merged.values()));
    } catch {}
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("slime_cart", JSON.stringify(items));
    } catch {}
  }, [items]);

  function addItem(product: Product, quantity: number = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock || 99) }
            : i
        );
      }
      return [...prev, { product, quantity: Math.min(quantity, product.stock || 99) }];
    });
    setIsCartOpen(true);
    trackAddToCart(product.price * quantity, "GBP", product.name);
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function updateQuantity(productId: string, quantity: number) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: Math.min(quantity, i.product.stock || 99) }
          : i
      )
    );
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
