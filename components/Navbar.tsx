"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useCart } from "@/components/CartContext";
import { supabase } from "@/lib/supabase";
import SlimeHamburger from "@/components/SlimeHamburger";

const allNavLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/parties", label: "Parties" },
  { href: "/blog", label: "Blog" },
  { href: "/events", label: "Events" },
  { href: "/shop", label: "Shop" },
  { href: "/gift-card", label: "Gift Cards" },
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
  const [eventsOn, setEventsOn] = useState(true);
  const [subscribeOn, setSubscribeOn] = useState(true);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const { itemCount, openCart } = useCart();

  async function handleLogout() {
    await fetch("/api/account/logout", { method: "POST" });
    setCustomerName(null);
    window.location.href = "/";
  }

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
    supabase
      .from("special_events")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .then(({ count }) => setEventsOn((count || 0) > 0));
    supabase
      .from("subscription_settings")
      .select("enabled")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setSubscribeOn(!!data.enabled);
      });
    fetch("/api/account/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) setCustomerName(data.name);
      })
      .catch(() => {});
  }, []);

  const navLinks = allNavLinks.filter((l) => {
    if (!loyaltyEnabled && l.href === "/loyalty") return false;
    if (!shopLive && l.href === "/shop") return false;
    if (!eventsOn && l.href === "/events") return false;
    if (!subscribeOn && l.href === "/subscribe") return false;
    return true;
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <nav className="navbar-bg sticky top-0 z-[1000] relative backdrop-blur-md overflow-visible shadow-sm transition-all">
      <div className={`container flex items-center justify-between gap-6 transition-all ${scrolled ? "py-1.5" : "py-4"}`}>
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <Image
            src="/images/header_logo.png"
            alt="The Slime Studio"
            width={192}
            height={60}
            priority
            className="w-auto object-contain flex-shrink-0 transition-all duration-300 md:!h-[60px]"
            style={{ height: scrolled ? 40 : 48 }}
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
          {customerName ? (
            <>
              <Link
                href="/account"
                className={`flex items-center gap-1.5 font-display text-[0.9rem] px-2.5 py-2 rounded-full transition-all whitespace-nowrap ${
                  pathname === "/account"
                    ? "bg-ink/10 text-ink font-semibold"
                    : "text-ink/70 hover:bg-ink/8 hover:text-ink"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {customerName.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="text-ink/50 hover:text-hot-pink hover:bg-ink/5 rounded-full w-9 h-9 grid place-items-center transition-colors"
                aria-label="Sign out"
                title="Sign out"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </>
          ) : (
            <Link
              href="/account/login"
              className={`font-display text-[0.9rem] px-2.5 py-2 rounded-full transition-all whitespace-nowrap ${
                pathname === "/account/login"
                  ? "bg-ink/10 text-ink font-semibold"
                  : "text-ink/70 hover:bg-ink/8 hover:text-ink"
              }`}
            >
              Sign In
            </Link>
          )}
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
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-hot-pink text-on-accent text-[0.65rem] font-bold grid place-items-center">
                  {itemCount}
                </span>
              )}
            </button>
          )}
          <Link href="/booking" className="btn-primary btn-book-now">
            Book Now
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-2.5">
          {shopLive && (
            <button
              onClick={openCart}
              className="relative w-11 h-11 rounded-full bg-ink/5 grid place-items-center transition-colors flex-shrink-0"
              aria-label="Open cart"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/70">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-hot-pink text-on-accent text-[0.65rem] font-bold grid place-items-center">
                  {itemCount}
                </span>
              )}
            </button>
          )}
          <SlimeHamburger open={open} onClick={() => setOpen(!open)} />
        </div>
      </div>

      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-[2px] -z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="md:hidden absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto animate-[menuSlide_0.28s_cubic-bezier(0.2,0.9,0.3,1)]">
            <style>{`
              @keyframes menuSlide { from { opacity: 0; transform: translateY(-14px) scaleY(0.97); } to { opacity: 1; transform: translateY(0) scaleY(1); } }
              @keyframes linkIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
            `}</style>
            <div className="relative bg-white border-t border-ink/10 shadow-xl overflow-hidden">
              {/* pastel blob decorations */}
              <div className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-blush-pop/15 blur-2xl" />
              <div className="pointer-events-none absolute top-24 -left-12 w-32 h-32 rounded-full bg-aquamarine/20 blur-2xl" />
              <div className="pointer-events-none absolute bottom-16 right-6 w-20 h-20 rounded-full bg-hot-pink/10 blur-xl" />

              <div className="relative px-5 pt-4 pb-2">
                <Link href="/booking" onClick={() => setOpen(false)} className="btn-primary btn-book-now block text-center text-[1.05rem] shadow-md">
                  Book Now
                </Link>
              </div>

              <ul className="relative px-4 pt-2 pb-3 flex flex-col gap-1">
                {navLinks.map((link, i) => (
                  <li key={link.href} style={{ animation: `linkIn 0.3s ease-out ${60 + i * 35}ms both` }}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 py-2.5 font-display text-[1.1rem] px-4 rounded-2xl transition-all active:scale-[0.98] ${
                        pathname === link.href
                          ? "bg-blush-pop/20 text-ink font-semibold"
                          : "text-ink/80 hover:bg-ink/[0.05]"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: ["rgb(var(--c-hot-pink))", "rgb(var(--c-sky-blue-light))", "rgb(var(--c-blush-pop))", "rgb(var(--c-aquamarine))"][i % 4] }}
                      />
                      {link.label}
                      <span className="ml-auto text-ink/30 text-sm">›</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="relative border-t border-ink/10 px-4 py-3 flex items-center gap-2">
                <Link
                  href={customerName ? "/account" : "/account/login"}
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center py-2.5 rounded-2xl bg-ink/[0.05] font-display text-[0.9rem] text-ink hover:bg-ink/10 transition-colors"
                >
                  {customerName ? `Account (${customerName.split(" ")[0]})` : "Sign In"}
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center py-2.5 rounded-2xl bg-ink/[0.05] font-display text-[0.9rem] text-ink hover:bg-ink/10 transition-colors"
                >
                  Contact
                </Link>
                {customerName && (
                  <button
                    onClick={() => { setOpen(false); handleLogout(); }}
                    className="py-2.5 px-4 rounded-2xl bg-ink/[0.05] font-display text-[0.9rem] text-ink/70 hover:text-hot-pink transition-colors"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            </div>

            {/* slime drip edge */}
            <svg viewBox="0 0 360 22" preserveAspectRatio="none" className="block w-full h-[22px]" aria-hidden="true">
              <path fill="#ffffff" d="M0,0 H360 V6 C350,6 348,14 340,14 C332,14 330,7 322,7 C314,7 312,15 304,15 C296,15 295,8 288,8 C281,8 280,13 273,13 C266,13 265,5 257,5 C249,5 247,12 239,12 C231,12 230,6 222,6 C214,6 212,11 204,11 C196,11 195,4 187,4 C179,4 177,10 169,10 C161,10 160,6 152,6 C144,6 142,13 134,13 C126,13 125,7 117,7 C109,7 108,14 100,14 C92,14 91,8 84,8 C77,8 76,12 69,12 C62,12 61,5 53,5 C45,5 43,11 35,11 C27,11 26,6 18,6 C10,6 8,3 0,3 Z" />
            </svg>
          </div>
        </>
      )}
    </nav>
  );
}
