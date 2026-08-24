"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useCart } from "@/components/CartContext";
import { supabase } from "@/lib/supabase";
import SlimeHamburger from "@/components/SlimeHamburger";

const allNavLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/parties", label: "Parties" },
  { href: "/shop", label: "Shop" },
  { href: "/gallery", label: "Gallery" },
  { href: "/loyalty", label: "Loyalty" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [shopLive, setShopLive] = useState(false);
  const { itemCount, openCart } = useCart();

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("loyalty_enabled")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setLoyaltyEnabled(!!data.loyalty_enabled);
      });
    supabase
      .from("shop_settings")
      .select("live")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setShopLive(!!data.live);
      });
  }, []);

  const navLinks = allNavLinks.filter((l) => {
    if (!loyaltyEnabled && l.href === "/loyalty") return false;
    if (!shopLive && l.href === "/shop") return false;
    return true;
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="sticky top-0 z-[1000] backdrop-blur-md overflow-visible shadow-sm transition-all" style={{ backgroundColor: "#abf7dc" }}>
      <div className={`container flex items-center justify-between gap-6 transition-all ${scrolled ? "py-1.5" : "py-4"}`}>
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img
            src="/images/header_logo.png"
            alt="The Slime Studio"
            className="w-auto object-contain flex-shrink-0 transition-all duration-300"
            style={{ height: scrolled ? 48 : 76 }}
          />
        </Link>

        <ul className="hidden md:flex items-center gap-0 whitespace-nowrap">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`font-display text-[0.9rem] px-2.5 py-2 rounded-full transition-all whitespace-nowrap ${
                  pathname === link.href
                    ? "bg-ink/10 text-ink font-semibold"
                    : "text-ink/70 hover:bg-ink/8 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          {shopLive && (
            <button
              onClick={openCart}
              className="relative w-10 h-10 rounded-full hover:bg-ink/10 grid place-items-center transition-colors"
              aria-label="Open cart"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/70">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#ff2d78] text-white text-[0.65rem] font-bold grid place-items-center">
                  {itemCount}
                </span>
              )}
            </button>
          )}
          <Link href="/booking" className="btn-primary" style={{ padding: "10px 22px", fontSize: "0.9rem" }}>
            Book Now
          </Link>
        </div>

        <SlimeHamburger open={open} onClick={() => setOpen(!open)} />
      </div>

      {open && (
        <ul className="md:hidden px-6 pb-4 flex flex-col gap-1" style={{ backgroundColor: "#abf7dc" }}>
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block py-2 font-display text-[1.1rem] px-4 rounded-full transition-all ${
                  pathname === link.href
                    ? "bg-ink/10 text-ink font-semibold"
                    : "text-ink/70 hover:bg-ink/8"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/booking" onClick={() => setOpen(false)} className="btn-primary block text-center mt-2" style={{ padding: "10px 22px", fontSize: "0.9rem" }}>
              Book Now
            </Link>
          </li>
        </ul>
      )}
    </nav>
  );
}
