import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { POSTS, getPost } from "../posts";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.meta.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const { meta } = post;
  const url = `https://theslimestudio.co.uk/blog/${meta.slug}`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: meta.title,
      description: meta.description,
      url,
      publishedTime: meta.date,
      images: [{ url: meta.image }],
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const { meta, Content } = post;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    image: `https://theslimestudio.co.uk${meta.image}`,
    datePublished: meta.date,
    author: {
      "@type": "Organization",
      name: "The Slime Studio",
      url: "https://theslimestudio.co.uk",
    },
    publisher: {
      "@type": "Organization",
      name: "The Slime Studio",
      logo: {
        "@type": "ImageObject",
        url: "https://theslimestudio.co.uk/images/header_logo.png",
      },
    },
    mainEntityOfPage: `https://theslimestudio.co.uk/blog/${meta.slug}`,
  };

  const others = POSTS.filter((p) => p.meta.slug !== meta.slug).slice(0, 2);

  return (
    <div>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <article className="bg-pagebg">
        <div className="container max-w-3xl mx-auto pt-14 md:pt-20 px-4">
          <Link href="/blog" className="text-[0.85rem] text-ink-soft hover:text-ink">
            ← Back to the blog
          </Link>
          <div className="flex items-center gap-3 text-[0.8rem] text-ink-soft mt-6 mb-3">
            <span className="px-2.5 py-0.5 rounded-full bg-blush-pop/30 text-ink font-medium">
              {meta.category}
            </span>
            <span>
              {new Date(meta.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span>·</span>
            <span>{meta.readTime}</span>
          </div>
          <h1 className="font-display text-[2rem] md:text-[2.8rem] leading-tight text-ink mb-6">
            {meta.title}
          </h1>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl mb-10">
            <Image src={meta.image} alt={meta.title} fill className="object-cover" priority />
          </div>

          <div className="blog-content text-ink-soft text-[1rem] leading-[1.8] [&_h2]:font-display [&_h2]:text-ink [&_h2]:text-[1.5rem] [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-ink [&_h3]:text-[1.15rem] [&_h3]:mt-8 [&_h3]:mb-2 [&_p]:mb-5 [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-blush-pop [&_a]:underline [&_a]:font-medium [&_strong]:text-ink">
            <Content />
          </div>

          <div className="mt-12 mb-16 bg-white rounded-2xl p-8 text-center shadow-sm">
            <h2 className="font-display text-[1.4rem] text-ink mb-2">
              Ready to book your visit?
            </h2>
            <p className="text-ink-soft text-[0.95rem] mb-6 max-w-lg mx-auto">
              The Slime Studio is at Unit A, Feathers Yard, Holt — an easy drive from
              Norwich, Cromer, Fakenham and all of North Norfolk.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/booking" className="btn-primary text-[0.9rem]">
                Book a Session
              </Link>
              <Link
                href="/parties"
                className="px-6 py-3 rounded-full bg-ink/5 text-ink text-[0.9rem] font-medium hover:bg-ink/10"
              >
                Party Enquiries
              </Link>
            </div>
          </div>
        </div>

        {others.length > 0 && (
          <div className="container max-w-4xl mx-auto pb-16 px-4">
            <h2 className="font-display text-[1.4rem] text-ink mb-6">More from the blog</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {others.map(({ meta: m }) => (
                <Link
                  key={m.slug}
                  href={`/blog/${m.slug}`}
                  className="group bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-display text-[1.1rem] text-ink mb-2 group-hover:text-blush-pop transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-[0.9rem] text-ink-soft leading-relaxed">{m.description}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <Footer />
    </div>
  );
}
