import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <header className="relative pt-[60px] pb-[70px] overflow-hidden text-center" style={{ backgroundColor: "#ffc4fb" }}>
        <div className="container relative z-[2]">
          <div className="max-w-lg mx-auto">
            <img
              src="/images/logo.png"
              alt="The Slime Studio — Make Your Own Slime"
              className="w-full max-w-[380px] mx-auto mb-10 object-contain rounded-full shadow-lg"
            />
            <h1 className="font-display text-[1.8rem] md:text-[2.4rem] leading-[1.15] mb-5 text-ink">
              Get Ready To Make Some Slime!
            </h1>
            <p className="text-[1.05rem] text-ink/75 mb-8 max-w-[480px] mx-auto leading-relaxed">
              Welcome to The Slime Studio — a colourful, hands-on experience
              where you can mix, stretch and create your very own slime.
              Choose your colours, add your favourite extras and make a slime
              that&apos;s completely yours to take home.
            </p>
            <div className="flex gap-4 flex-wrap justify-center">
              <Link
                href="/booking"
                className="btn-primary"
              >
                Book Now
              </Link>
              <Link
                href="/shop"
                className="btn-secondary"
              >
                Shop
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Brief Intro */}
      <section className="section text-center">
        <div className="container max-w-2xl">
          <h2 className="font-display text-[1.8rem] md:text-[2.6rem] mt-4 mb-4 text-ink">
            The Slime Studio
          </h2>
          <p className="text-[1.1rem] text-ink-soft">
            A hands-on creative space in Holt, Norfolk, where families come to
            squish, stretch and create their own slime. Every session is
            playful, sensory and totally squish-worthy — no experience needed.
          </p>
        </div>
      </section>

      {/* The Experience */}
      <section className="section">
        <div className="container">
          <div className="text-center mb-12 reveal">
            <h2 className="font-display text-[1.8rem] md:text-[2.8rem] mt-4 mb-3 text-ink">
              How It Works
            </h2>
            <p className="text-[1.05rem] text-ink-soft max-w-[620px] mx-auto">
              Booking your slime-making session takes less than a minute.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: "📅", title: "Pick a Slot", desc: "Choose a date and hour that suits you" },
              { icon: "🧪", title: "Mix & Create", desc: "Colours, scents and textures — all included" },
              { icon: "🫧", title: "Squish & Play", desc: "An hour of hands-on sensory fun" },
              { icon: "🎁", title: "Take It Home", desc: "Pack up your creation to keep" },
            ].map((step, i) => (
              <div
                key={step.title}
                className="reveal bg-white rounded-[20px] p-9 text-center shadow-sm hover:-translate-y-1.5 hover:shadow-lg transition-all"
              >
                <div className="w-[72px] h-[72px] rounded-full grid place-items-center text-[2rem] mx-auto mb-4" style={{ backgroundColor: i % 2 === 0 ? "#abf7dc" : "#ffc4fb" }}>
                  {step.icon}
                </div>
                <h3 className="font-display text-[1.15rem] mb-1.5">{step.title}</h3>
                <p className="text-[0.9rem] text-ink-soft">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/booking" className="btn-primary">
              Book Your Slot
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section">
        <div className="container">
          <div className="text-center mb-12 reveal">
            <span className="eyebrow">Why Choose Us</span>
            <h2 className="font-display text-[1.8rem] md:text-[2.8rem] mt-4 max-w-3xl mx-auto text-ink">
              Families love making memories at The Slime Studio
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "👨‍👩‍👧", title: "Family-Friendly", desc: "Fun for all ages, from toddlers to teens" },
              { icon: "🌿", title: "Skin-Safe Ingredients", desc: "Non-toxic, premium materials, every time" },
              { icon: "🎓", title: "Expert Guidance", desc: "Our team helps every step of the way" },
              { icon: "✨", title: "All Included", desc: "Everything you need is provided on arrival" },
            ].map((item) => (
              <div key={item.title} className="reveal bg-white rounded-[20px] p-8 shadow-sm text-center">
                <div className="text-[2.5rem] mb-3">{item.icon}</div>
                <h3 className="font-display text-[1.05rem] mb-2">{item.title}</h3>
                <p className="text-[0.9rem] text-ink-soft">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Studio Gallery */}
      <section className="section">
        <div className="container">
          <div className="text-center mb-12 reveal">
            <h2 className="font-display text-[1.8rem] md:text-[2.8rem] mt-4 mb-3 text-ink">
              A Peek Inside The Slime Studio
            </h2>
            <p className="text-[1.05rem] text-ink-soft max-w-[620px] mx-auto">
              Follow our journey from Holt, Norfolk — slime creations, sessions
              and studio moments.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              "/images/slime_studio_pink_slime_experience.jpg.jpeg",
              "/images/blue_slime_closeup.jpg.jpeg",
              "/images/pink_slime_stretch.jpg.jpeg",
              "/images/slime_studio_teal_slime.jpg.jpeg",
              "/images/purple_finished_slime.jpg.jpeg",
              "/images/slime_mixing.jpg.jpeg",
              "/images/slime_studio_pink_slime_pot.jpg.jpeg",
              "/images/slime_studio_slime_toppings.jpg.jpeg",
              "/images/foam_beads.jpg.jpeg",
              "/images/pink_slime_action.jpg.jpeg",
            ].map((src, i) => (
              <div
                key={i}
                className="reveal relative aspect-square rounded-[20px] overflow-hidden cursor-pointer transition-transform hover:scale-105"
              >
                <img src={src} alt={`Slime Studio creation ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="container my-20">
        <div className="reveal rounded-[32px] p-12 md:p-16 text-center shadow-lg" style={{ background: "linear-gradient(135deg, #2b2350 0%, #4a3f7a 100%)" }}>
          <h2 className="font-display text-[1.8rem] md:text-[2.6rem] mb-3.5 text-white">Ready to Get Squishing?</h2>
          <p className="text-[1.1rem] text-white/70 mb-8 max-w-xl mx-auto">
            Spots fill up fast — secure your slime-making slot today. Sessions
            run hourly, 1–10 people, £15 per person.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/booking" className="btn-primary">
              Book Now
            </Link>
            <Link href="/parties" className="btn-ghost" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)" }}>
              Plan a Birthday Party
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
