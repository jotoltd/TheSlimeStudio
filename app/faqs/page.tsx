import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const faqs = [
  { q: "How much is The Slime Studio experience?", a: "The experience is £15 per slime maker, including everything you need to create your slime and take it home." },
  { q: "Do I need to book?", a: "We recommend booking in advance to make sure we have space for you. Walk-ins are welcome where availability allows." },
  { q: "What ages is The Slime Studio suitable for?", a: "The Slime Studio is for all ages. Whether it's your first time making slime or you're already slime obsessed, everyone can get involved." },
  { q: "How long does the experience take?", a: "Allow around 45–60 minutes to create and customise your slime." },
  { q: "What do I get to make?", a: "You'll create your own slime, choosing your colours and extras to make it completely your own. Your finished slime is yours to take home." },
  { q: "Can adults make slime too?", a: "Absolutely. The experience isn't just for children — adults are very welcome to book as slime makers too." },
  { q: "Can I bring more than one person?", a: "Yes. When booking, simply select the number of slime makers attending." },
  { q: "Do you offer birthday parties?", a: "Yes! We offer private Slime Studio parties for up to 15 slime makers, depending on age. Visit our Parties & Birthdays page for full details and prices." },
  { q: "Where are you?", a: "The Slime Studio, Unit A, Feathers Yard, Holt, NR25 6BF." },
  { q: "What are your opening hours?", a: "Monday–Saturday: 10am–4pm. Sunday: Closed." },
];

export default function FAQsPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="pt-16 pb-14 md:pt-20 md:pb-16 text-center" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container">
          <h1 className="font-display text-[2.2rem] md:text-[3.4rem] text-ink mb-3 uppercase">
            Frequently Asked Questions
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
              className="btn-primary"
            >
              Contact Us
            </Link>
            <span style={{ color: "#ff2d78" }}>♥</span>
            <Link
              href="/booking"
              className="btn-secondary"
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
