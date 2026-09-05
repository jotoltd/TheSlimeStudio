"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

export function useContent() {
  const [content, setContent] = useState<Record<string, string>>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("key, value")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
          setContent({ ...DEFAULTS, ...map });
        }
        setLoading(false);
      });
  }, []);

  return { content, loading };
}

export { DEFAULTS as CONTENT_DEFAULTS };
