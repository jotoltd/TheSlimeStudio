import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PRICE_TIERS = [
  { label: "5 Slime Makers", price: 13.5, color: "#ff6fae" },
  { label: "6–10 Slime Makers", price: 12.5, color: "#3fc9a0" },
  { label: "11–15 Slime Makers", price: 11.5, color: "#8b5fbf" },
];

const AGE_GROUPS = [
  { icon: "👧", title: "Aged Up To 7", desc: "Maximum 10 slime makers" },
  { icon: "🧑", title: "Aged 8+", desc: "Maximum 15 slime makers" },
];

const INCLUDED = [
  { icon: "⏰", label: "1.5 Hours Private Studio Time" },
  { icon: "🎨", label: "Choose Your Slime" },
  { icon: "🖌️", label: "Pick Your Colour & Scent" },
  { icon: "⭐", label: "Add Charms & Decorations" },
  { icon: "🛍️", label: "Take Your Slime Home" },
];

export default function PartiesPage() {
  return (
    <>
      <Navbar />

      {/* Hero image */}
      <div className="relative w-full aspect-[16/7] md:aspect-[16/5] overflow-hidden bg-ink">
        <img
          src="/images/354d8145-92ae-4c3d-bd51-2e6db44e18c8.JPG"
          alt="Parties & Birthdays at The Slime Studio"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Intro */}
      <section className="text-center py-14 md:py-16 px-6" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container max-w-2xl">
          <h1 className="font-display text-[1.8rem] md:text-[2.6rem] leading-[1.2] mb-3 text-ink">
            Make Their Celebration <span style={{ color: "#ff2d78" }}>Extra Slimy!</span> 💗
          </h1>
          <p className="text-[1rem] text-ink/80 leading-relaxed mb-4">
            Celebrate at The Slime Studio with your own private slime-making
            experience. Our parties include 1.5 hours of private studio time,
            where every guest gets to choose their type of slime, add their
            own colour and scent, decorate it with charms and create
            something completely their own to take home.
          </p>
          <p className="font-display text-[1.05rem]" style={{ color: "#ff2d78" }}>
            Fun, creative and just the right amount of messy!
          </p>
        </div>
      </section>

      {/* Party Prices */}
      <section className="py-14 md:py-16" style={{ backgroundColor: "#fdeef7" }}>
        <div className="container max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className="text-ink/40">↝</span>
            <h2 className="font-display text-[1.4rem] md:text-[1.7rem] text-ink">Party Prices</h2>
            <span className="text-ink/40">↜</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            {PRICE_TIERS.map((tier) => (
              <div key={tier.label} className="bg-white rounded-2xl p-7 text-center shadow-sm">
                <div className="text-3xl mb-2">👥</div>
                <h3 className="font-display text-[1rem] uppercase tracking-wide mb-2" style={{ color: tier.color }}>
                  {tier.label}
                </h3>
                <div className="text-ink/20 mb-2">♥</div>
                <div className="font-display text-[1.8rem] text-ink mb-1">£{tier.price.toFixed(2)}</div>
                <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider">per slime maker</div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {AGE_GROUPS.map((g) => (
              <div key={g.title} className="bg-white/70 rounded-2xl p-6 flex items-center gap-4 border border-ink/5">
                <div className="text-3xl">{g.icon}</div>
                <div>
                  <div className="font-display text-[0.95rem] text-[#8b5fbf] uppercase tracking-wide">{g.title}</div>
                  <div className="text-[0.85rem] text-ink-soft">{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-14 md:py-16" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className="text-ink/40">↝</span>
            <h2 className="font-display text-[1.4rem] md:text-[1.7rem] text-ink">What&apos;s Included</h2>
            <span className="text-ink/40">↜</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
            {INCLUDED.map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-white grid place-items-center text-2xl mb-3 shadow-sm">
                  {item.icon}
                </div>
                <p className="text-[0.85rem] text-ink/80 leading-snug">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 md:py-16" style={{ backgroundColor: "#fdeef7" }}>
        <div className="container max-w-3xl">
          <div className="bg-white rounded-[28px] p-8 md:p-10 shadow-sm flex flex-col md:flex-row items-center gap-8">
            <div className="text-5xl flex-shrink-0">🫧</div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-display text-[1.3rem] mb-2 text-ink">Ready to Party?</h2>
              <p className="text-ink-soft text-[0.95rem]">
                Get in touch with us and we&apos;ll help arrange your Slime Studio party.
              </p>
            </div>
            <Link
              href="/contact"
              className="px-8 py-3.5 rounded-full font-display text-[1rem] text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all flex-shrink-0"
              style={{ backgroundColor: "#ff2d78" }}
            >
              Party Enquiry
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
