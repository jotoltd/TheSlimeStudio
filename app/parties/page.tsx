import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PartiesPage() {
  return (
    <>
      <Navbar />

      <section className="bg-gradient-to-br from-blush-pop to-bright-lavender py-[70px] text-center">
        <div className="container">
          <span className="eyebrow">Celebrate With Us</span>
          <h1 className="font-display text-[2rem] md:text-[3.2rem] mt-3 mb-3">Parties & Birthdays</h1>
          <p className="text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            Make their birthday unforgettable with a hands-on slime-making
            party at our Norfolk studio.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-3xl">
          <div className="reveal mb-12 text-center">
            <h2 className="font-display text-2xl mb-4">A Party They&apos;ll Never Forget</h2>
            <p className="text-ink-soft">
              Ditch the usual party games — our slime-making sessions bring
              hands-on creativity, giggles and a take-home creation for every
              guest. Perfect for birthdays, celebrations and get-togethers.
            </p>
          </div>

          {/* What's Included */}
          <div className="bg-white rounded-3xl p-8 shadow-sm mb-8">
            <h2 className="font-display text-xl mb-6 text-center">What&apos;s Included</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {[
                { icon: "🧪", text: "All slime-making materials and tools" },
                { icon: "🎨", text: "A choice of colours, scents and textures" },
                { icon: "🎁", text: "Take-home tub for every slime maker" },
                { icon: "🧑‍🏫", text: "A dedicated studio host for the full hour" },
                { icon: "🎉", text: "Use of our decorated party space" },
                { icon: "📸", text: "Photo opportunities in our studio" },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <p className="text-sm text-ink-soft pt-1">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Group Sizes */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="text-3xl mb-3">👥</div>
              <h3 className="font-display text-lg mb-2">Group Sizes</h3>
              <p className="text-sm text-ink-soft">
                Each hourly slot holds up to 10 slime makers. Bigger party?
                Simply book multiple consecutive or adjoining slots and
                we&apos;ll seat your group together wherever possible.
              </p>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-display text-lg mb-2">Private Hire</h3>
              <p className="text-sm text-ink-soft">
                Want the whole studio to yourselves? Private hire is available
                for exclusive use of the space — get in touch to check
                availability and pricing for your date.
              </p>
            </div>
          </div>

          {/* Pricing reminder */}
          <div className="bg-sky-blue-light/20 rounded-3xl p-8 text-center mb-12">
            <h3 className="font-display text-lg mb-2">Simple Pricing</h3>
            <p className="text-ink-soft text-sm">
              £15 per slime maker, per hour session — no hidden extras.
            </p>
          </div>

          {/* CTA */}
          <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
            <h2 className="font-display text-xl mb-3">Ready to Book a Party?</h2>
            <p className="text-ink-soft text-sm mb-6">
              Book your slot online, or get in touch for private hire and
              larger group enquiries.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/booking" className="btn-primary">
                Book Now
              </Link>
              <Link href="/contact" className="btn-secondary">
                Enquire About Private Hire
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
