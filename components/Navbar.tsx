"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/parties", label: "Parties & Birthdays" },
  { href: "/shop", label: "Shop" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-[1000] bg-[#FFDAB3] backdrop-blur-md overflow-visible">
      <div className="container flex items-center justify-between py-4 gap-6">
        <Link href="/" className="flex items-center gap-2.5 font-display text-[1.3rem] text-ink flex-shrink-0">
          <img
            src="/images/logo.png"
            alt="The Slime Studio"
            className="w-[72px] h-auto object-contain flex-shrink-0"
          />
          The Slime Studio
        </Link>

        <ul className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`font-display text-[0.95rem] px-4 py-2 rounded-full transition-all ${
                  pathname === link.href
                    ? "bg-bright-lavender/15 text-bright-lavender"
                    : "text-ink hover:bg-bright-lavender/12 hover:text-bright-lavender"
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

      {/* Navbar drips */}
      <div className="absolute bottom-[-38px] left-0 w-full h-[40px] pointer-events-none z-[1]">
        <svg viewBox="0 0 1200 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full block">
          <path className="drip-drop" fill="#64d8ec" d="M0,0 L0,12 Q20,34 40,16 Q60,4 80,24 Q100,38 120,12 Q140,6 160,28 Q180,38 200,10 Q220,4 240,30 Q260,38 280,16 Q300,6 320,24 Q340,34 360,12 Q380,4 400,28 Q420,38 440,16 Q460,6 480,24 Q500,34 520,10 Q540,4 560,30 Q580,38 600,16 Q620,6 640,28 Q660,34 680,12 Q700,4 720,24 Q740,38 760,16 Q780,6 800,28 Q820,34 840,10 Q860,4 880,30 Q900,38 920,16 Q940,6 960,24 Q980,34 1000,12 Q1020,4 1040,28 Q1060,38 1080,16 Q1100,6 1120,24 Q1140,34 1160,12 Q1180,4 1200,24 L1200,0 Z" />
          <circle className="drip-drop" fill="#64d8ec" cx="80" cy="28" r="5" />
          <circle className="drip-drop" fill="#64d8ec" cx="240" cy="34" r="6" />
          <circle className="drip-drop" fill="#64d8ec" cx="400" cy="30" r="5" />
          <circle className="drip-drop" fill="#64d8ec" cx="560" cy="34" r="7" />
          <circle className="drip-drop" fill="#64d8ec" cx="720" cy="28" r="5" />
          <circle className="drip-drop" fill="#64d8ec" cx="880" cy="34" r="6" />
          <circle className="drip-drop" fill="#64d8ec" cx="1040" cy="30" r="5" />
          <circle className="drip-drop" fill="#64d8ec" cx="160" cy="30" r="4" />
          <circle className="drip-drop" fill="#64d8ec" cx="640" cy="30" r="4" />
        </svg>
      </div>

      {open && (
        <ul className="md:hidden bg-[#FFDAB3] px-6 pb-4 flex flex-col gap-1">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block py-2 font-display text-[0.95rem] px-4 rounded-full transition-all ${
                  pathname === link.href
                    ? "bg-bright-lavender/15 text-bright-lavender"
                    : "text-ink hover:bg-bright-lavender/12"
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
