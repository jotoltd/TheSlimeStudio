import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const faqs = [
  { q: "What ages are the slime-making sessions suitable for?", a: "Our sessions are designed for children aged 4 and up. We provide age-appropriate tools and guidance for each group." },
  { q: "Are the ingredients safe?", a: "Yes! All our slimes are made with non-toxic, skin-safe ingredients. We avoid borax and use gentle activators instead." },
  { q: "Can I book a birthday party?", a: "Absolutely! We offer dedicated party slots with 1.5 hours of private studio time. Get in touch via our contact page and we'll tailor a package for you." },
  { q: "Do you sell DIY kits online?", a: "Yes — our DIY kits are available in the shop with everything you need to make slime at home." },
  { q: "Where are you located?", a: "We're at Unit A, Feathers Yard, Holt, NR25 2BF. Open Mon–Sat 10am–4pm." },
  { q: "How long do the slimes last?", a: "With proper care (keeping them in sealed containers and using activator spray), slimes can last several months." },
  { q: "How much does a session cost?", a: "Standard sessions are £15 per person for a 1-hour slot. Party pricing varies by group size — see our Parties & Birthdays page for details." },
  { q: "Do I need to book in advance?", a: "Yes, we recommend booking ahead to secure your preferred slot. You can book online via our Book Now page." },
];

export default function FAQsPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="pt-16 pb-14 md:pt-20 md:pb-16 text-center" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container">
          <h1 className="font-display text-[2.2rem] md:text-[3.4rem] text-ink mb-3 uppercase">
            FAQs
          </h1>
          <div className="text-2xl mb-4" style={{ color: "#ff2d78" }}>♥</div>
          <p className="text-[1rem] text-ink/75 max-w-[560px] mx-auto leading-relaxed">
            Everything you need to know about our sessions, products and studio.
          </p>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-14 md:py-16" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container max-w-3xl">
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="bg-white rounded-2xl p-6 shadow-sm group">
                <summary className="font-display text-[1.05rem] cursor-pointer list-none flex justify-between items-center gap-4">
                  <span>{faq.q}</span>
                  <span
                    className="text-2xl flex-shrink-0 transition-transform group-open:rotate-45"
                    style={{ color: "#ff2d78" }}
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 text-ink-soft text-[0.9rem] leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 text-center" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container">
          <h2 className="font-display text-[1.2rem] md:text-[1.5rem] text-ink mb-6 uppercase">
            Still Got Questions?
          </h2>
          <div className="flex gap-4 justify-center items-center flex-wrap">
            <Link
              href="/contact"
              className="px-8 py-3.5 rounded-full font-display text-[1rem] text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
              style={{ backgroundColor: "#ff2d78" }}
            >
              Contact Us
            </Link>
            <span style={{ color: "#ff2d78" }}>♥</span>
            <Link
              href="/booking"
              className="px-8 py-3.5 rounded-full font-display text-[1rem] text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
              style={{ backgroundColor: "#3fc9a0" }}
            >
              Book Now
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
