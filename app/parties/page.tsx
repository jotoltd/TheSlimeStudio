import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PRICE_TIERS = [
  { label: "5 Children", price: 13.5, color: "#ff6fae" },
  { label: "6–10 Children", price: 12.5, color: "#3fc9a0" },
  { label: "11–15 Children", price: 11.5, color: "#8b5fbf" },
];

const AGE_GROUPS = [
  { title: "Aged Up To 7", desc: "Maximum 10 children" },
  { title: "Aged 8+", desc: "Maximum 15 children" },
];

const INCLUDED = [
  { img: "/images/slime_mixing.jpg.jpeg", label: "1.5 Hours Private Studio Time" },
  { img: "/images/slime_studio_pink_slime_pot.jpg.jpeg", label: "Choose Your Slime" },
  { img: "/images/slime_studio_slime_toppings.jpg.jpeg", label: "Pick Your Colour & Scent" },
  { img: "/images/foam_beads.jpg.jpeg", label: "Add Charms & Decorations" },
  { img: "/images/purple_finished_slime.jpg.jpeg", label: "Take Your Slime Home" },
];

export default function PartiesPage() {
  return (
    <>
      <Navbar />

      {/* Hero image */}
      <div className="relative w-full aspect-[16/7] md:aspect-[16/5] overflow-hidden bg-ink">
        <img
          src="/images/slime_studio_pink_slime_experience.jpg.jpeg"
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
                <div className="text-2xl mb-2" style={{ color: tier.color }}>♥</div>
                <h3 className="font-display text-[1rem] uppercase tracking-wide mb-2" style={{ color: tier.color }}>
                  {tier.label}
                </h3>
                <div className="text-ink/20 mb-2">♥</div>
                <div className="font-display text-[1.8rem] text-ink mb-1">£{tier.price.toFixed(2)}</div>
                <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider">per child</div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {AGE_GROUPS.map((g) => (
              <div key={g.title} className="bg-white/70 rounded-2xl p-6 flex items-center gap-4 border border-ink/5">
                <div className="text-2xl" style={{ color: "#ff2d78" }}>♥</div>
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
                <div className="w-16 h-16 rounded-full overflow-hidden bg-white grid place-items-center mb-3 shadow-sm">
                  <img src={item.img} alt={item.label} className="w-full h-full object-cover" />
                </div>
                <p className="text-[0.85rem] text-ink/80 leading-snug">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + Contact */}
      <section className="py-14 md:py-16" style={{ backgroundColor: "#fdeef7" }}>
        <div className="container max-w-3xl">
          <div className="bg-white rounded-[28px] p-8 md:p-10 shadow-sm text-center">
            <h2 className="font-display text-[1.3rem] mb-2 text-ink">Get In Touch</h2>
            <p className="text-ink-soft text-[0.95rem] mb-6">
              Ready to party? Contact us and we&apos;ll help arrange your Slime Studio party.
            </p>
            <div className="flex flex-col items-center gap-3 mb-8">
              <a href="https://instagram.com/theslimestudioexperience" target="_blank" rel="noopener noreferrer" className="text-[0.95rem] text-ink hover:text-[#ff2d78] transition-colors">
                <span style={{ color: "#ff2d78" }}>♥</span> Instagram: @theslimestudioexperience
              </a>
              <a href="mailto:studio@theslimestudio.co.uk" className="text-[0.95rem] text-ink hover:text-[#ff2d78] transition-colors">
                <span style={{ color: "#ff2d78" }}>♥</span> Email: studio@theslimestudio.co.uk
              </a>
              <a href="https://www.theslimestudio.co.uk" target="_blank" rel="noopener noreferrer" className="text-[0.95rem] text-ink hover:text-[#ff2d78] transition-colors">
                <span style={{ color: "#ff2d78" }}>♥</span> Website: www.theslimestudio.co.uk
              </a>
            </div>
            <Link
              href="/contact"
              className="btn-primary"
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
