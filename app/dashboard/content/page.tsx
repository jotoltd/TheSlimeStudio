"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";

type TabKey = "homepage" | "parties" | "about" | "contact" | "footer" | "press" | "subscribe" | "faq" | "booking" | "shop";

const DEFAULTS: Record<string, string> = {
  hero_title: "Get Ready To Make Some Slime!",
  hero_text: "Welcome to The Slime Studio — a colourful, hands-on experience where you can mix, stretch and create your very own slime. Choose your colours, add your favourite extras and make a slime that's completely yours to take home.",
  intro_title: "The Slime Studio",
  intro_text: "A hands-on creative space in Holt, Norfolk, where families come to squish, stretch and create their own slime. Every session is playful, sensory and totally squish-worthy — no experience needed.",
  how_it_works_title: "How It Works",
  how_it_works_text: "Booking your slime-making session takes less than a minute.",
  how_it_works_step1_title: "Pick a Slot",
  how_it_works_step1_desc: "Choose a date and hour that suits you",
  how_it_works_step2_title: "Mix & Create",
  how_it_works_step2_desc: "Colours, scents and textures — all included",
  how_it_works_step3_title: "Squish & Play",
  how_it_works_step3_desc: "An hour of hands-on sensory fun",
  how_it_works_step4_title: "Take It Home",
  how_it_works_step4_desc: "Pack up your creation to keep",
  why_choose_title: "Families love making memories at The Slime Studio",
  why_choose_item1_title: "Family-Friendly",
  why_choose_item1_desc: "Fun for all ages, from toddlers to grandparents",
  why_choose_item2_title: "Expert Guidance",
  why_choose_item2_desc: "Our team helps every step of the way",
  why_choose_item3_title: "All Included",
  why_choose_item3_desc: "Everything you need is provided on arrival",
  gallery_title: "A Peek Inside The Slime Studio",
  gallery_text: "Follow our journey from Holt, Norfolk — slime creations, sessions and studio moments.",
  cta_title: "Ready to Get Squishing?",
  cta_text: "Spots fill up fast — secure your slime-making slot today. Sessions run hourly, 1–10 people, £15 per person.",
  parties_hero_title: "Make Their Celebration Extra Slimy!",
  parties_hero_text: "Celebrate at The Slime Studio with your own private slime-making experience. Our parties include 1 hour of private studio time, where every guest gets to choose their type of slime, add their own colour and scent, decorate it with charms and create something completely their own to take home.",
  parties_tagline: "Fun, creative and just the right amount of messy!",
  parties_base_price: "100",
  parties_base_children: "5",
  parties_additional_child_price: "12.50",
  parties_max_children: "15",
  parties_included_title: "What's Included",
  parties_contact_text: "Got questions? Contact us and we'll help arrange your Slime Studio party.",
  about_title: "About The Slime Studio",
  about_text: "The Slime Studio is a hands-on creative space in Holt, Norfolk where families come to squish, stretch and create their own slime. Every session is playful, sensory and totally squish-worthy.",
  about_feature1_title: "Create It Your Way",
  about_feature1_desc: "Pick your colours, mix, stretch and customise with a huge range of fun extras.",
  about_feature2_title: "Everyone Welcome",
  about_feature2_desc: "Whether you're obsessed with slime or trying it for the first time, everyone is welcome.",
  about_feature3_title: "Take It Home",
  about_feature3_desc: "Your finished slime is yours to take home and enjoy.",
  about_cta: "Ready to make your own?",
  contact_address: "Unit A, Feathers Yard, Holt, NR25 6BF",
  contact_hours: "Mon–Sat 10am–4pm, Sunday closed",
  contact_email: "studio@theslimestudio.co.uk",
  contact_intro: "Got questions? We'd love to hear from you.",
  footer_about: "Experience the magic of hands-on creativity. We bring kids and adults alike into the world of vibrant, tactile slime-making in Norfolk.",
  footer_copyright: "© 2026 The Slime Studio. All rights reserved.",
  press_title: "Press & Features",
  press_text: "The Slime Studio has been featured across Norfolk's leading publications and visitor guides. Here's where we've been spotted.",
  subscribe_title: "Slime Subscription Box",
  subscribe_subtitle: "A brand new themed slime, delivered to your door every month.",
  subscribe_disabled_title: "Slime Subscription Box",
  subscribe_disabled_text: "Our monthly slime subscription box isn't open for sign-ups just yet — check back soon or follow us for the launch!",
  faq_title: "Frequently Asked Questions",
  faq_subtitle: "Everything you need to know about our sessions, products and studio.",
  faq_cta_title: "Still Got Questions?",
  booking_title: "Book a Slime-Making Session",
  booking_subtitle: "Choose Your Session",
  booking_info: "One-hour sessions, every hour. Up to 5 slime makers per slot at £15.00 per person.",
  booking_walkins: "Walk-ins also welcome, subject to space",
  shop_title: "Slime, Kits & Accessories",
  shop_subtitle: "Handmade in small batches in our Norfolk studio. Every slime is unique, scented and ready to squish.",
  shop_comingsoon_title: "Something Slimy",
  shop_comingsoon_title2: "Is Coming...",
  shop_comingsoon_text1: "We're busy getting The Slime Studio Shop ready!",
  shop_comingsoon_text2: "Soon you'll be able to bring the Slime Studio experience home with our range of DIY slime kits, accessories, charms, add-ins and more.",
  shop_comingsoon_text3: "Perfect for slime lovers, gifts, rainy days or simply when you need a little more slime in your life.",
};

const TAB_FIELDS: Record<TabKey, { key: string; label: string; textarea?: boolean; rows?: number }[]> = {
  homepage: [
    { key: "hero_title", label: "Hero Title" },
    { key: "hero_text", label: "Hero Text", textarea: true, rows: 4 },
    { key: "intro_title", label: "Intro Section Title" },
    { key: "intro_text", label: "Intro Section Text", textarea: true, rows: 3 },
    { key: "how_it_works_title", label: "How It Works — Title" },
    { key: "how_it_works_text", label: "How It Works — Subtitle" },
    { key: "how_it_works_step1_title", label: "Step 1 Title" },
    { key: "how_it_works_step1_desc", label: "Step 1 Description" },
    { key: "how_it_works_step2_title", label: "Step 2 Title" },
    { key: "how_it_works_step2_desc", label: "Step 2 Description" },
    { key: "how_it_works_step3_title", label: "Step 3 Title" },
    { key: "how_it_works_step3_desc", label: "Step 3 Description" },
    { key: "how_it_works_step4_title", label: "Step 4 Title" },
    { key: "how_it_works_step4_desc", label: "Step 4 Description" },
    { key: "why_choose_title", label: "Why Choose Us — Title" },
    { key: "why_choose_item1_title", label: "Feature 1 Title" },
    { key: "why_choose_item1_desc", label: "Feature 1 Description" },
    { key: "why_choose_item2_title", label: "Feature 2 Title" },
    { key: "why_choose_item2_desc", label: "Feature 2 Description" },
    { key: "why_choose_item3_title", label: "Feature 3 Title" },
    { key: "why_choose_item3_desc", label: "Feature 3 Description" },
    { key: "gallery_title", label: "Gallery Section Title" },
    { key: "gallery_text", label: "Gallery Section Text", textarea: true, rows: 2 },
    { key: "cta_title", label: "CTA Title" },
    { key: "cta_text", label: "CTA Text", textarea: true, rows: 3 },
  ],
  parties: [
    { key: "parties_hero_title", label: "Hero Title" },
    { key: "parties_hero_text", label: "Hero Text", textarea: true, rows: 4 },
    { key: "parties_tagline", label: "Tagline" },
    { key: "parties_base_price", label: "Base Price (£)" },
    { key: "parties_base_children", label: "Children Included in Base Price" },
    { key: "parties_additional_child_price", label: "Each Additional Child (£)" },
    { key: "parties_max_children", label: "Maximum Children" },
    { key: "parties_included_title", label: "What's Included — Title" },
    { key: "parties_contact_text", label: "Contact Text", textarea: true, rows: 2 },
  ],
  about: [
    { key: "about_title", label: "Title" },
    { key: "about_text", label: "Main Text", textarea: true, rows: 5 },
    { key: "about_feature1_title", label: "Feature 1 Title" },
    { key: "about_feature1_desc", label: "Feature 1 Description", textarea: true, rows: 2 },
    { key: "about_feature2_title", label: "Feature 2 Title" },
    { key: "about_feature2_desc", label: "Feature 2 Description", textarea: true, rows: 2 },
    { key: "about_feature3_title", label: "Feature 3 Title" },
    { key: "about_feature3_desc", label: "Feature 3 Description", textarea: true, rows: 2 },
    { key: "about_cta", label: "Call to Action Text" },
  ],
  contact: [
    { key: "contact_intro", label: "Intro Text", textarea: true, rows: 2 },
    { key: "contact_address", label: "Address" },
    { key: "contact_hours", label: "Opening Hours" },
    { key: "contact_email", label: "Email Address" },
  ],
  footer: [
    { key: "footer_about", label: "About Text", textarea: true, rows: 3 },
    { key: "footer_copyright", label: "Copyright Text" },
  ],
  press: [
    { key: "press_title", label: "Page Title" },
    { key: "press_text", label: "Page Intro Text", textarea: true, rows: 3 },
  ],
  subscribe: [
    { key: "subscribe_title", label: "Page Title" },
    { key: "subscribe_subtitle", label: "Subtitle", textarea: true, rows: 2 },
    { key: "subscribe_disabled_title", label: "Disabled State — Title" },
    { key: "subscribe_disabled_text", label: "Disabled State — Message", textarea: true, rows: 3 },
  ],
  faq: [
    { key: "faq_title", label: "Page Title" },
    { key: "faq_subtitle", label: "Subtitle", textarea: true, rows: 2 },
    { key: "faq_cta_title", label: "CTA Title" },
  ],
  booking: [
    { key: "booking_title", label: "Hero Title" },
    { key: "booking_subtitle", label: "Hero Subtitle" },
    { key: "booking_info", label: "Session Info Text", textarea: true, rows: 2 },
    { key: "booking_walkins", label: "Walk-ins Text" },
  ],
  shop: [
    { key: "shop_title", label: "Live — Hero Title" },
    { key: "shop_subtitle", label: "Live — Hero Subtitle", textarea: true, rows: 2 },
    { key: "shop_comingsoon_title", label: "Coming Soon — Title Line 1" },
    { key: "shop_comingsoon_title2", label: "Coming Soon — Title Line 2" },
    { key: "shop_comingsoon_text1", label: "Coming Soon — Text 1", textarea: true, rows: 2 },
    { key: "shop_comingsoon_text2", label: "Coming Soon — Text 2", textarea: true, rows: 3 },
    { key: "shop_comingsoon_text3", label: "Coming Soon — Text 3", textarea: true, rows: 2 },
  ],
};

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: "homepage", icon: "🏠", label: "Homepage" },
  { key: "parties", icon: "🎉", label: "Parties" },
  { key: "about", icon: "ℹ️", label: "About" },
  { key: "contact", icon: "✉️", label: "Contact" },
  { key: "footer", icon: "📄", label: "Footer" },
  { key: "press", icon: "📰", label: "Press" },
  { key: "subscribe", icon: "📦", label: "Subscribe" },
  { key: "faq", icon: "❓", label: "FAQ" },
  { key: "booking", icon: "📅", label: "Booking" },
  { key: "shop", icon: "🛍️", label: "Shop" },
];

export default function ContentPage() {
  const [tab, setTab] = useState<TabKey>("homepage");
  const [content, setContent] = useState<Record<string, string>>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/content");
      const data = await res.json();
      if (data.content) {
        setContent({ ...DEFAULTS, ...data.content });
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  function setValue(key: string, value: string) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  async function saveAll() {
    setSaving(true);
    setMsg("");
    const fields = TAB_FIELDS[tab];
    const entries: Record<string, string> = {};
    for (const f of fields) {
      entries[f.key] = content[f.key] ?? DEFAULTS[f.key] ?? "";
    }
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (data.error) {
        setMsg("Error: " + data.error);
      } else {
        setMsg("Content saved successfully!");
      }
    } catch {
      setMsg("Network error. Please try again.");
    }
    setSaving(false);
  }

  const fields = TAB_FIELDS[tab];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Content Management"
        subtitle="Edit text content across your site"
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setMsg(""); }}
            className={`px-4 py-2.5 rounded-full text-[0.85rem] font-medium transition-all flex items-center gap-2 ${tab === t.key ? "bg-sky-blue-light text-ink shadow-sm" : "bg-white text-ink hover:bg-sky-blue-light/20"}`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="space-y-5">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1.5">{f.label}</label>
              {f.textarea ? (
                <textarea
                  value={content[f.key] ?? ""}
                  onChange={(e) => setValue(f.key, e.target.value)}
                  rows={f.rows || 3}
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light resize-none"
                />
              ) : (
                <input
                  value={content[f.key] ?? ""}
                  onChange={(e) => setValue(f.key, e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={saveAll}
            disabled={saving}
            className="btn-primary text-[0.85rem] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Content"}
          </button>
          {msg && (
            <p className={`text-[0.85rem] ${msg.includes("Error") || msg.includes("Network") ? "text-red-600" : "text-green-600"}`}>{msg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
