"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ContentPage() {
  const [tab, setTab] = useState<"homepage" | "parties" | "about">("homepage");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Homepage content
  const [home, setHome] = useState({
    hero_title: "Get Ready To Make Some Slime!",
    hero_text: "Welcome to The Slime Studio — a colourful, hands-on experience where you can mix, stretch and create your very own slime. Choose your colours, add your favourite extras and make a slime that's completely yours to take home.",
    intro_title: "The Slime Studio",
    intro_text: "A hands-on creative space in Holt, Norfolk, where families come to squish, stretch and create their own slime. Every session is playful, sensory and totally squish-worthy — no experience needed.",
    cta_title: "Ready to Get Squishing?",
    cta_text: "Spots fill up fast — secure your slime-making slot today. Sessions run hourly, 1–10 people, £15 per person.",
  });

  // Parties content
  const [parties, setParties] = useState({
    hero_title: "Make Their Celebration Extra Slimy!",
    hero_text: "Celebrate at The Slime Studio with your own private slime-making experience. Our parties include 1.5 hours of private studio time, where every guest gets to choose their type of slime, add their own colour and scent, decorate it with charms and create something completely their own to take home.",
    price_5: "13.5",
    price_6_10: "12.5",
    price_11_15: "11.5",
    contact_text: "Got questions? Contact us and we'll help arrange your Slime Studio party.",
  });

  // About content
  const [about, setAbout] = useState({
    title: "About The Slime Studio",
    text: "The Slime Studio is a hands-on creative space in Holt, Norfolk where families come to squish, stretch and create their own slime. Every session is playful, sensory and totally squish-worthy.",
  });

  useEffect(() => { loadContent(); }, []);

  async function loadContent() {
    const { data } = await supabase.from("site_content").select("*");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
      setHome({
        hero_title: map.hero_title || home.hero_title,
        hero_text: map.hero_text || home.hero_text,
        intro_title: map.intro_title || home.intro_title,
        intro_text: map.intro_text || home.intro_text,
        cta_title: map.cta_title || home.cta_title,
        cta_text: map.cta_text || home.cta_text,
      });
      setParties({
        hero_title: map.parties_hero_title || parties.hero_title,
        hero_text: map.parties_hero_text || parties.hero_text,
        price_5: map.parties_price_5 || parties.price_5,
        price_6_10: map.parties_price_6_10 || parties.price_6_10,
        price_11_15: map.parties_price_11_15 || parties.price_11_15,
        contact_text: map.parties_contact_text || parties.contact_text,
      });
      setAbout({
        title: map.about_title || about.title,
        text: map.about_text || about.text,
      });
    }
  }

  async function saveContent(key: string, value: string) {
    setSaving(true); setMsg("");
    await supabase.from("site_content").upsert({ key, value }, { onConflict: "key" });
    setSaving(false);
  }

  async function saveAll() {
    setSaving(true); setMsg("");
    const entries = tab === "homepage" ? Object.entries(home) :
                    tab === "parties" ? Object.entries(parties) :
                    Object.entries(about);
    const prefixed = tab === "homepage" ? entries :
                     tab === "parties" ? entries.map(([k, v]) => [`parties_${k}`, v]) :
                     entries.map(([k, v]) => [`about_${k}`, v]);
    for (const [key, value] of prefixed) {
      await supabase.from("site_content").upsert({ key, value }, { onConflict: "key" });
    }
    setSaving(false);
    setMsg("Content saved successfully!");
  }

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Content Management</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">Edit text content across your site.</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {([{"key": "homepage", "icon": "🏠", "label": "Homepage"}, {"key": "parties", "icon": "🎉", "label": "Parties"}, {"key": "about", "icon": "ℹ️", "label": "About"}] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-full text-[0.9rem] font-medium transition-all flex items-center gap-2 ${tab === t.key ? "bg-sky-blue-light text-ink shadow-sm" : "bg-white text-ink hover:bg-sky-blue-light/20"}`}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[20px] p-8 shadow-sm">
        {tab === "homepage" && (
          <div className="space-y-5">
            <Field label="Hero Title" value={home.hero_title} onChange={(v) => setHome({ ...home, hero_title: v })} />
            <Field label="Hero Text" value={home.hero_text} onChange={(v) => setHome({ ...home, hero_text: v })} textarea />
            <Field label="Intro Title" value={home.intro_title} onChange={(v) => setHome({ ...home, intro_title: v })} />
            <Field label="Intro Text" value={home.intro_text} onChange={(v) => setHome({ ...home, intro_text: v })} textarea />
            <Field label="CTA Title" value={home.cta_title} onChange={(v) => setHome({ ...home, cta_title: v })} />
            <Field label="CTA Text" value={home.cta_text} onChange={(v) => setHome({ ...home, cta_text: v })} textarea />
          </div>
        )}
        {tab === "parties" && (
          <div className="space-y-5">
            <Field label="Hero Title" value={parties.hero_title} onChange={(v) => setParties({ ...parties, hero_title: v })} />
            <Field label="Hero Text" value={parties.hero_text} onChange={(v) => setParties({ ...parties, hero_text: v })} textarea />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Price (5 children) £" value={parties.price_5} onChange={(v) => setParties({ ...parties, price_5: v })} />
              <Field label="Price (6–10) £" value={parties.price_6_10} onChange={(v) => setParties({ ...parties, price_6_10: v })} />
              <Field label="Price (11–15) £" value={parties.price_11_15} onChange={(v) => setParties({ ...parties, price_11_15: v })} />
            </div>
            <Field label="Contact Text" value={parties.contact_text} onChange={(v) => setParties({ ...parties, contact_text: v })} textarea />
          </div>
        )}
        {tab === "about" && (
          <div className="space-y-5">
            <Field label="Title" value={about.title} onChange={(v) => setAbout({ ...about, title: v })} />
            <Field label="Text" value={about.text} onChange={(v) => setAbout({ ...about, text: v })} textarea rows={6} />
          </div>
        )}

        <div className="mt-6 flex items-center gap-4">
          <button onClick={saveAll} disabled={saving} className="px-6 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-60 hover:-translate-y-0.5 hover:shadow-sm transition-all">
            {saving ? "Saving..." : "Save Content"}
          </button>
          {msg && <p className="text-[0.85rem] text-green-600">{msg}</p>}
        </div>

      </div>
    </div>
  );
}

function Field({ label, value, onChange, textarea, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; rows?: number }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light resize-none" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
      )}
    </div>
  );
}
