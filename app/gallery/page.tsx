import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const emojis = ["🌈", "🫧", "✨", "🎨", "💜", "🍓", "☁️", "🦄", "⭐", "🍭", "🧁", "🌸"];

export default function GalleryPage() {
  return (
    <>
      <Navbar />
      <section className="py-[70px] text-center" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
        <div className="container">
          <h1 className="font-display text-[2rem] md:text-[3.2rem] mt-3 mb-3 text-ink">Our Gallery</h1>
          <p className="text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            Follow our journey from Holt, Norfolk — slime creations, workshop
            moments and fun from our studio.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {emojis.map((emoji, i) => (
              <div
                key={i}
                className={`reveal relative aspect-square rounded-[20px] overflow-hidden cursor-pointer transition-transform hover:scale-105 ${
                  i % 3 === 0 ? "bg-gradient-to-br from-[#abf7dc] to-[#64d8ec]" :
                  i % 3 === 1 ? "bg-gradient-to-br from-[#ffc4fb] to-[#CBC3E3]" :
                  "bg-gradient-to-br from-[#E0B0FF] to-[#abf7dc]"
                }`}
              >
                <div className="absolute inset-0 grid place-items-center text-[2.5rem]">{emoji}</div>
                <div className="absolute bottom-0 left-0 right-0 bg-ink/70 text-white text-[0.7rem] p-2 text-center opacity-0 transition-opacity hover:opacity-100">
                  Discover a world where style meets sunsets #LifeGallery
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
