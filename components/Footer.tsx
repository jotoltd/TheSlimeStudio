"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SocialLinks from "@/components/SocialLinks";
import { supabase } from "@/lib/supabase";

export default function Footer() {
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("loyalty_enabled")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setLoyaltyEnabled(!!data.loyalty_enabled);
      });
  }, []);

  return (
    <footer className="text-ink pt-[60px] pb-[30px]" style={{ backgroundColor: "#FBF8F5" }}>
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-6 md:gap-10 pb-8 md:pb-12 border-b border-ink/15">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="/images/header_logo.png"
                alt="The Slime Studio"
                className="w-[170px] h-auto object-contain"
              />
            </div>
            <p className="text-[0.9rem] leading-relaxed text-ink-soft">
              Experience the magic of hands-on creativity. We bring kids and
              adults alike into the world of vibrant, tactile slime-making in
              Norfolk.
            </p>
          </div>

          <div>
            <h4 className="font-display text-[1rem] mb-4 text-ink">Explore</h4>
            <ul className="space-y-2.5">
              <li><Link href="/" className="text-[0.9rem] hover:text-ink transition-colors">Home</Link></li>
              <li><Link href="/about" className="text-[0.9rem] hover:text-ink transition-colors">About</Link></li>
              <li><Link href="/parties" className="text-[0.9rem] hover:text-ink transition-colors">Parties</Link></li>
              <li><Link href="/shop" className="text-[0.9rem] hover:text-ink transition-colors">Shop</Link></li>
              {loyaltyEnabled && <li><Link href="/loyalty" className="text-[0.9rem] hover:text-ink transition-colors">Loyalty</Link></li>}
              <li><Link href="/faqs" className="text-[0.9rem] hover:text-ink transition-colors">FAQs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-[1rem] mb-4 text-ink">Visit</h4>
            <ul className="space-y-2.5">
              <li><Link href="/booking" className="text-[0.9rem] hover:text-ink transition-colors">Book Now</Link></li>
              <li><Link href="/contact" className="text-[0.9rem] hover:text-ink transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-[1rem] mb-4 text-ink">Find Us</h4>
            <ul className="space-y-2.5">
              <li className="text-[0.9rem] text-ink-soft">Unit A, Feathers Yard</li>
              <li className="text-[0.9rem] text-ink-soft">Holt, NR25 6BF</li>
              <li><a href="mailto:studio@theslimestudio.co.uk" className="text-[0.9rem] hover:text-ink transition-colors">studio@theslimestudio.co.uk</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-3 pt-6 text-[0.85rem] text-ink-soft">
          <p>© 2026 The Slime Studio. All rights reserved.</p>
          <div className="flex gap-4 items-center">
            <Link href="/admin" className="text-[0.8rem] text-ink-soft/60 hover:text-ink transition-colors">Admin</Link>
            <SocialLinks size={18} />
          </div>
        </div>
      </div>
    </footer>
  );
}
