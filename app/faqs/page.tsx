import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const faqs = [
  { q: "What ages are the slime-making sessions suitable for?", a: "Our sessions are designed for children aged 4 and up. We provide age-appropriate tools and guidance for each group." },
  { q: "Are the ingredients safe?", a: "Yes! All our slimes are made with non-toxic, skin-safe ingredients. We avoid borax and use gentle activators instead." },
  { q: "Can I book a birthday party?", a: "Absolutely! We offer dedicated party slots. Get in touch via our contact page and we'll tailor a package for you." },
  { q: "Do you sell DIY kits online?", a: "Yes — our DIY kits are available in the shop with everything you need to make slime at home." },
  { q: "Where are you located?", a: "We're at 12 Market Place, Holt, Norfolk, NR25 6BW. Open Saturdays 10am–4pm and daily during school holidays." },
  { q: "How long do the slimes last?", a: "With proper care (keeping them in sealed containers and using activator spray), slimes can last several months." },
];

export default function FAQsPage() {
  return (
    <>
      <Navbar />
      <section className="bg-gradient-to-br from-blush-pop to-bright-lavender py-[70px] text-center">
        <div className="container">
          <span className="eyebrow">Questions</span>
          <h1 className="font-display text-[2rem] md:text-[3.2rem] mt-3 mb-3">Frequently Asked Questions</h1>
          <p className="text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            Everything you need to know about our sessions, products and studio.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-3xl">
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="bg-white rounded-2xl p-6 shadow-sm group">
                <summary className="font-display text-lg cursor-pointer list-none flex justify-between items-center">
                  {faq.q}
                  <span className="text-2xl text-bright-lavender group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-ink-soft text-sm">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
