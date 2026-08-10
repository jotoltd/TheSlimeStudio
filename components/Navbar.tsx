"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/parties", label: "Parties & Trips" },
  { href: "/shop", label: "Shop" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-[1000] backdrop-blur-md overflow-visible shadow-sm" style={{ backgroundColor: "#abf7dc" }}>
      <div className="container flex items-center justify-between py-4 gap-6">
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img
            src="/images/header_logo.png"
            alt="The Slime Studio"
            className="h-[76px] w-auto object-contain flex-shrink-0"
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

        <div className="hidden md:flex items-center">
          <Link href="/booking" className="btn-primary" style={{ padding: "10px 22px", fontSize: "0.9rem" }}>
            Book Now
          </Link>
        </div>

        <button
          className="md:hidden flex flex-col gap-1.5 bg-none border-none cursor-pointer p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span className="w-6 h-[3px] bg-ink rounded-full transition-all" style={{ transform: open ? "translateY(8px) rotate(45deg)" : "" }} />
          <span className="w-6 h-[3px] bg-ink rounded-full transition-all" style={{ opacity: open ? 0 : 1 }} />
          <span className="w-6 h-[3px] bg-ink rounded-full transition-all" style={{ transform: open ? "translateY(-8px) rotate(-45deg)" : "" }} />
        </button>
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
