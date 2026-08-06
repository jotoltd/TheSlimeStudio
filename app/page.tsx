import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <header className="relative pt-[60px] pb-[80px] overflow-hidden">
        <img
          src="/images/hero.JPG"
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        <div className="container relative z-[2]">
          <div className="max-w-lg bg-white/40 backdrop-blur-md rounded-[32px] p-8 shadow-md">
            <span className="eyebrow">Norfolk's Slime-Making Studio</span>
            <h1 className="font-display text-[2.2rem] md:text-[3.6rem] leading-[1.15] mt-3 mb-5 text-ink">
              Book Your Slime-Making Adventure Today
            </h1>
            <p className="text-[1.15rem] text-ink/85 mb-8 max-w-[480px]">
              Hands-on, hour-long slime-making experiences for children and
              families. Choose your slot, bring your crew, and get squishing.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/booking" className="btn-primary">
                Book Now — £15pp
              </Link>
              <Link href="/parties" className="btn-secondary">
                Birthday Parties
              </Link>
            </div>
          </div>
        </div>
        {/* Slime drips */}
        <div className="absolute bottom-[-1px] left-0 w-full h-[60px] pointer-events-none z-[2]">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full block">
            <path className="drip-drop" fill="#fffd74" d="M0,0 L0,30 Q30,50 60,30 Q90,10 120,35 Q150,55 180,30 Q210,5 240,40 Q270,60 300,30 Q330,15 360,38 Q390,52 420,28 Q450,8 480,35 Q510,55 540,30 Q570,12 600,40 Q630,58 660,30 Q690,5 720,36 Q750,54 780,28 Q810,10 840,38 Q870,50 900,30 Q930,12 960,35 Q990,55 1020,30 Q1050,8 1080,38 Q1110,52 1140,28 Q1170,12 1200,35 L1200,0 Z" />
            <circle className="drip-drop" fill="#fffd74" cx="150" cy="48" r="6" />
            <circle className="drip-drop" fill="#fffd74" cx="450" cy="46" r="5" />
            <circle className="drip-drop" fill="#fffd74" cx="750" cy="47" r="7" />
            <circle className="drip-drop" fill="#fffd74" cx="1050" cy="45" r="5" />
            <circle className="drip-drop" fill="#fffd74" cx="300" cy="50" r="4" />
            <circle className="drip-drop" fill="#fffd74" cx="900" cy="48" r="6" />
          </svg>
        </div>
      </header>

      {/* Brief Intro */}
      <section className="section bg-sky-blue-light text-center">
        <div className="container max-w-2xl">
          <span className="eyebrow">Welcome</span>
          <h2 className="font-display text-[1.8rem] md:text-[2.6rem] mt-4 mb-4">
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
      <section className="section bg-gradient-to-b from-sky-blue-light to-[#d4f5ee]">
        <div className="container">
          <div className="text-center mb-12 reveal">
            <span className="eyebrow">The Experience</span>
            <h2 className="font-display text-[1.8rem] md:text-[2.8rem] mt-4 mb-3">
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
            ].map((step) => (
              <div
                key={step.title}
                className="reveal bg-white rounded-[20px] p-9 text-center shadow-sm hover:-translate-y-1.5 hover:shadow-lg transition-all"
              >
                <div className="w-[72px] h-[72px] rounded-full grid place-items-center text-[2rem] mx-auto mb-4 bg-sky-blue-light">
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
      <section className="section bg-gradient-to-b from-[#d4f5ee] to-sky-blue-light">
        <div className="container">
          <div className="text-center mb-12 reveal">
            <span className="eyebrow">Why Choose Us</span>
            <h2 className="font-display text-[1.8rem] md:text-[2.8rem] mt-4 max-w-3xl mx-auto">
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
      <section className="section bg-sky-blue-light">
        <div className="container">
          <div className="text-center mb-12 reveal">
            <span className="eyebrow">Our Studio</span>
            <h2 className="font-display text-[1.8rem] md:text-[2.8rem] mt-4 mb-3">
              A Peek Inside The Slime Studio
            </h2>
            <p className="text-[1.05rem] text-ink-soft max-w-[620px] mx-auto">
              Follow our journey from Holt, Norfolk — slime creations, sessions
              and studio moments.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {["🌈", "🫧", "✨", "🎨", "💜", "🍓", "☁️", "🦄", "⭐", "🍭"].map((emoji, i) => (
              <div
                key={i}
                className={`reveal relative aspect-square rounded-[20px] overflow-hidden cursor-pointer transition-transform hover:scale-105 ${
                  i % 3 === 0 ? "bg-gradient-to-br from-sky-blue-light to-sky-blue-light" :
                  i % 3 === 1 ? "bg-gradient-to-br from-blush-pop to-bright-lavender" :
                  "bg-gradient-to-br from-canary-yellow to-sky-blue-light"
                }`}
              >
                <div className="absolute inset-0 grid place-items-center text-[2.5rem]">{emoji}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="container my-20">
        <div className="reveal bg-gradient-to-br from-bright-lavender to-blush-pop rounded-[32px] p-12 md:p-16 text-center shadow-lg">
          <h2 className="font-display text-[1.8rem] md:text-[2.6rem] mb-3.5">Ready to Get Squishing?</h2>
          <p className="text-[1.1rem] text-ink/90 mb-8 max-w-xl mx-auto">
            Spots fill up fast — secure your slime-making slot today. Sessions
            run hourly, 1–10 people, £15 per person.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/booking" className="btn-secondary">
              Book Now
            </Link>
            <Link href="/parties" className="btn-ghost">
              Plan a Birthday Party
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
