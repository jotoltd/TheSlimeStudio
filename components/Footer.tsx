import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#FAA989] text-ink pt-[60px] pb-[30px]">
      <div className="container">
        <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 pb-12 border-b border-ink/15">
          <div>
            <div className="flex items-center gap-2.5 font-display text-[1.3rem] text-ink mb-4">
              <img
                src="/images/logo.png"
                alt="The Slime Studio"
                className="w-[72px] h-auto object-contain"
              />
              The Slime Studio
            </div>
            <p className="text-[0.9rem] leading-relaxed text-ink">
              Experience the magic of hands-on creativity. We bring kids and
              adults alike into the world of vibrant, tactile slime-making in
              Norfolk.
            </p>
          </div>

          <div>
            <h4 className="font-display text-[1rem] mb-4">Explore</h4>
            <ul className="space-y-2.5">
              <li><Link href="/" className="text-[0.9rem] hover:text-sky-blue-light transition-colors">Home</Link></li>
              <li><Link href="/about" className="text-[0.9rem] hover:text-sky-blue-light transition-colors">About</Link></li>
              <li><Link href="/parties" className="text-[0.9rem] hover:text-sky-blue-light transition-colors">Parties & Birthdays</Link></li>
              <li><Link href="/shop" className="text-[0.9rem] hover:text-sky-blue-light transition-colors">Shop</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-[1rem] mb-4">Visit</h4>
            <ul className="space-y-2.5">
              <li><Link href="/booking" className="text-[0.9rem] hover:text-sky-blue-light transition-colors">Book Now</Link></li>
              <li><Link href="/contact" className="text-[0.9rem] hover:text-sky-blue-light transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-[1rem] mb-4">Find Us</h4>
            <ul className="space-y-2.5">
              <li className="text-[0.9rem]">Unit A, Feathers Yard</li>
              <li className="text-[0.9rem]">Holt, NR25 2BF</li>
              <li><a href="mailto:studio@theslimestudio.co.uk" className="text-[0.9rem] hover:text-sky-blue-light transition-colors">studio@theslimestudio.co.uk</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center pt-6 text-[0.85rem] text-ink">
          <p>© 2026 The Slime Studio. All rights reserved.</p>
          <div className="flex gap-3">
            <a href="#" aria-label="Instagram" className="w-[38px] h-[38px] rounded-full bg-bright-lavender/15 grid place-items-center text-lg hover:bg-bright-lavender transition-colors">📷</a>
            <a href="#" aria-label="TikTok" className="w-[38px] h-[38px] rounded-full bg-bright-lavender/15 grid place-items-center text-lg hover:bg-bright-lavender transition-colors">🎵</a>
            <a href="#" aria-label="Facebook" className="w-[38px] h-[38px] rounded-full bg-bright-lavender/15 grid place-items-center text-lg hover:bg-bright-lavender transition-colors">👍</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
