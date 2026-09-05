"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useContent } from "@/lib/useContent";

const pressFeatures = [
  {
    title: "Visit North Norfolk",
    description:
      "Featured on Visit North Norfolk's official what's on guide — highlighting The Slime Studio as a must-do family activity in the region.",
    url: "https://www.visitnorthnorfolk.com/whats-on/the-slime-studio-make-your-own-slime-experience-p2640321",
    source: "visitnorthnorfolk.com",
    date: "2025",
  },
  {
    title: "North Norfolk News",
    description:
      "Covered by North Norfolk News on the opening of The Slime Studio in Holt — sharing the story behind Norfolk's dedicated slime-making experience.",
    url: "https://www.northnorfolknews.co.uk/news/26438561.slime-studio-holt-north-norfolk-opened/",
    source: "northnorfolknews.co.uk",
    date: "2025",
  },
  {
    title: "All Things Norfolk",
    description:
      "Listed on All Things Norfolk's events directory — showcasing The Slime Studio experience as a top attraction for families visiting Norfolk.",
    url: "https://allthingsnorfolk.com/events/the-slime-studio-experience/",
    source: "allthingsnorfolk.com",
    date: "2025",
  },
];

export default function PressPage() {
  const { content: c } = useContent();

  return (
    <>
      <Navbar />

      <section
        className="py-[50px] md:py-[70px] text-center px-4"
        style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}
      >
        <div className="container">
          <h1 className="font-display text-[1.5rem] md:text-[3.2rem] mt-3 mb-3 text-ink">
            {c.press_title}
          </h1>
          <p className="text-[0.95rem] md:text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            {c.press_text}
          </p>
        </div>
      </section>

      <section className="section px-4">
        <div className="container max-w-3xl">
          <div className="space-y-5">
            {pressFeatures.map((feature, i) => (
              <a
                key={i}
                href={feature.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-[20px] p-6 md:p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="font-display text-[1.15rem] text-ink">
                        {feature.title}
                      </h2>
                      <span className="text-[0.7rem] bg-sky-blue-light/30 text-ink-soft px-2 py-0.5 rounded-full">
                        {feature.date}
                      </span>
                    </div>
                    <p className="text-[0.9rem] text-ink-soft leading-relaxed mb-3">
                      {feature.description}
                    </p>
                    <span className="text-[0.8rem] text-ink-soft/70 font-mono">
                      {feature.source}
                    </span>
                  </div>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sky-blue-light/20 grid place-items-center">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-ink/60"
                    >
                      <path d="M7 17l9.2-9.2M17 17V7H7" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-8 bg-sky-blue-light/10 rounded-2xl p-5 text-center">
            <p className="text-[0.9rem] text-ink-soft">
              For press enquiries, interviews, or collaboration opportunities,
              please contact us at{" "}
              <a
                href="mailto:studio@theslimestudio.co.uk"
                className="text-ink font-medium underline hover:text-bright-lavender transition-colors"
              >
                studio@theslimestudio.co.uk
              </a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
