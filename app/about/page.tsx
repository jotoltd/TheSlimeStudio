import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <section className="py-[70px] text-center" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
        <div className="container">
          <h1 className="font-display text-[2rem] md:text-[3.2rem] mt-3 mb-3 text-ink">About The Slime Studio</h1>
          <p className="text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            From a kitchen table hobby to a beloved Norfolk studio — discover how
            our slime-making journey began.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-3xl">
          <div className="reveal mb-12">
            <h2 className="font-display text-2xl mb-4">How It All Started</h2>
            <p className="text-ink-soft mb-4">
              In 2024, what began as a rainy-day activity with the kids quickly
              turned into an obsession. We spent months perfecting recipes,
              experimenting with scents, colours and textures — and soon, friends
              and neighbours were asking for their own batches.
            </p>
            <p className="text-ink-soft mb-4">
              Today, The Slime Studio is a dedicated creative space in Holt,
              Norfolk, where families come to squish, stretch and create
              together. Every slime is handmade in small batches with
              skin-safe, non-toxic ingredients.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: "🎨", title: "Creative Play", desc: "We encourage hands-on creativity and sensory exploration for all ages." },
              { icon: "🌿", title: "Skin-Safe", desc: "All our slimes use non-toxic, skin-safe ingredients you can trust." },
              { icon: "💜", title: "Small Batch", desc: "Every batch is handmade with care in our Norfolk studio." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 text-center shadow-sm">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-display text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-ink-soft">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
            <h2 className="font-display text-2xl mb-4">Visit Us in Holt</h2>
            <p className="text-ink-soft mb-2">12 Market Place, Holt, Norfolk, NR25 6BW</p>
            <p className="text-ink-soft mb-6">Open Saturdays 10am–4pm and daily during school holidays.</p>
            <a href="/contact" className="btn-primary">Get in Touch</a>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
