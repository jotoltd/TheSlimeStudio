import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { POSTS } from "./posts";

export const metadata: Metadata = {
  title: "Blog — Kids' Parties & Family Days Out in Norfolk",
  description:
    "Party ideas, things to do with kids in Norwich and Norfolk, and news from The Slime Studio in Holt — Norfolk's home of hands-on slime fun.",
  alternates: { canonical: "https://theslimestudio.co.uk/blog" },
  openGraph: {
    title: "The Slime Studio Blog — Norfolk Family Fun",
    description:
      "Party ideas, things to do with kids in Norwich and Norfolk, and news from The Slime Studio in Holt.",
    url: "https://theslimestudio.co.uk/blog",
  },
};

export default function BlogIndex() {
  return (
    <div>
      <Navbar />

      <section className="bg-pagebg pt-16 pb-10 md:pt-20 md:pb-14 text-center px-4">
        <h1 className="font-display text-[2.2rem] md:text-[3rem] text-ink mb-4">
          The Slime Studio Blog
        </h1>
        <p className="max-w-2xl mx-auto text-[1.05rem] text-ink-soft leading-relaxed">
          Party ideas, family days out in Norfolk, and everything slime —
          straight from our studio in Holt.
        </p>
      </section>

      <section className="bg-pagebg pb-16 px-4">
        <div className="container max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
          {POSTS.map(({ meta }) => (
            <Link
              key={meta.slug}
              href={`/blog/${meta.slug}`}
              className="group bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <Image
                  src={meta.image}
                  alt={meta.title}
                  fill
                  className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-3 text-[0.75rem] text-ink-soft mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blush-pop/30 text-ink font-medium">
                    {meta.category}
                  </span>
                  <span>{meta.readTime}</span>
                </div>
                <h2 className="font-display text-[1.25rem] text-ink mb-2 group-hover:text-blush-pop transition-colors">
                  {meta.title}
                </h2>
                <p className="text-[0.9rem] text-ink-soft leading-relaxed flex-1">
                  {meta.description}
                </p>
                <p className="text-[0.8rem] text-ink-soft mt-4">
                  {new Date(meta.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
