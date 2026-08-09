"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase, type SubscriptionSettings } from "@/lib/supabase";

export default function SubscribePage() {
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", postcode: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("subscription_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as SubscriptionSettings);
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.address.trim() || !form.postcode.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    const { error: insertError } = await supabase.from("subscribers").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim(),
      postcode: form.postcode.trim(),
    });
    setSubmitting(false);
    if (insertError) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-[60vh] grid place-items-center text-ink-soft">Loading...</div>
        <Footer />
      </>
    );
  }

  if (!settings?.enabled) {
    return (
      <>
        <Navbar />
        <section className="py-[70px] text-center" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
          <div className="container">
            <h1 className="font-display text-[2rem] md:text-[3.2rem] mt-3 mb-3 text-ink">Slime Subscription Box</h1>
          </div>
        </section>
        <section className="section text-center">
          <div className="container max-w-xl">
            <p className="text-ink-soft text-lg">
              Our monthly slime subscription box isn&apos;t open for sign-ups
              just yet — check back soon or follow us for the launch!
            </p>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <section className="py-[70px] text-center" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
        <div className="container">
          <h1 className="font-display text-[2rem] md:text-[3.2rem] mt-3 mb-3 text-ink">{settings.box_name}</h1>
          <p className="text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            A brand new themed slime, delivered to your door every month.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-4xl grid md:grid-cols-2 gap-10">
          {/* Details */}
          <div>
            {settings.current_theme && (
              <div className="bg-white rounded-3xl p-8 shadow-sm mb-6">
                <span className="eyebrow">This Month&apos;s Theme</span>
                <h2 className="font-display text-xl mt-2 mb-3">{settings.current_theme}</h2>
                {settings.current_theme_description && (
                  <p className="text-sm text-ink-soft">{settings.current_theme_description}</p>
                )}
              </div>
            )}

            <div className="bg-white rounded-3xl p-8 shadow-sm mb-6">
              <div className="font-display text-3xl mb-1">
                £{Number(settings.price).toFixed(2)}
                <span className="text-sm text-ink-soft font-body"> / {settings.frequency}</span>
              </div>
              <p className="text-sm text-ink-soft">Cancel anytime. Free UK delivery.</p>
            </div>

            {settings.perks && settings.perks.length > 0 && (
              <div className="bg-white rounded-3xl p-8 shadow-sm">
                <h3 className="font-display text-lg mb-4">What&apos;s Included</h3>
                <ul className="space-y-3">
                  {settings.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-ink-soft">
                      <span className="text-bright-lavender">✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Signup form */}
          <div className="bg-white rounded-3xl p-8 shadow-sm">
            {submitted ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="font-display text-xl mb-2">You&apos;re In!</h3>
                <p className="text-sm text-ink-soft">
                  Thanks for subscribing — we&apos;ll be in touch with payment
                  details and your first box will be on its way soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-display text-lg mb-2">Subscribe Now</h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Delivery Address *</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Postcode *</label>
                  <input
                    value={form.postcode}
                    onChange={(e) => setForm({ ...form, postcode: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : `Subscribe for £${Number(settings.price).toFixed(2)}/${settings.frequency}`}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
