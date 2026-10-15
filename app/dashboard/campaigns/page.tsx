"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CampaignRow = {
  id: string; name: string; subject: string; audience: string;
  status: "sending" | "sent" | "failed"; total: number; sent: number; failed: number;
  remaining: number; createdAt: string; sentAt?: string;
  stats?: { opens: number; clicks: number; bounces: number };
};

const PRESETS = [
  {
    id: "sessions", label: "Session promo",
    name: "Session promo", subject: "Make your own slime at The Slime Studio",
    heading: "Time to get slimy, {{name}}!",
    body: "Just a quick one from us at The Slime Studio — if you're looking for something fun to do with the kids (or without them!), our slime-making sessions are running all week.\n\nPick your colour, mix your slime, pile on the toppings and take it home. One hour of glorious, squishy fun right here in Holt.\n\nSlots go fast at weekends — book ahead to grab yours!",
    ctaText: "Book a session", ctaUrl: "https://theslimestudio.co.uk/booking",
  },
  {
    id: "giftcards", label: "Gift cards",
    name: "Gift card push", subject: "The perfect gift for slime lovers",
    heading: "Stuck for a gift idea, {{name}}?",
    body: "A Slime Studio gift card is the present they'll actually love — an hour of slime-making fun they'll never forget.\n\nDelivered instantly by email, no wrapping required. Perfect for birthdays, stocking fillers, or just because.",
    ctaText: "Buy a gift card", ctaUrl: "https://theslimestudio.co.uk/gift-card",
  },
  {
    id: "holidays", label: "School holidays",
    name: "School holiday slots", subject: "School holiday sorted — slime sessions every day",
    heading: "School's out — slime's in!",
    body: "The school holidays are coming and we've got you covered, {{name}}.\n\nThe Slime Studio is open every day through the break with our famous 1-hour slime sessions — they make it, they play with it, they take it home. You get a coffee and an hour of peace.\n\nHoliday slots always sell out — book early to avoid disappointment.",
    ctaText: "See available slots", ctaUrl: "https://theslimestudio.co.uk/booking",
  },
  {
    id: "winback", label: "Win-back",
    name: "We miss you", subject: "We miss you — come back for slime!",
    heading: "It's been a while, {{name}}",
    body: "We haven't seen you at The Slime Studio for a while — and we'd love to welcome you back!\n\nWhether it's another slime session, a birthday party, or one of our special events, there's always something fun happening in Holt.\n\nCome and make some more gloriously messy memories with us.",
    ctaText: "Book your next visit", ctaUrl: "https://theslimestudio.co.uk/booking",
  },
];

export default function CampaignsPage() {
  const [data, setData] = useState<{ configured: boolean; segments: Record<string, string>; counts: Record<string, number>; campaigns: CampaignRow[]; unsubscribed: number } | null>(null);
  const [form, setForm] = useState({ name: "", audience: "customers", subject: "", heading: "", body: "", ctaText: "", ctaUrl: "" });
  const [preview, setPreview] = useState("");
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState<string | null>(null); // campaign id while batches run
  const [testing, setTesting] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/campaigns");
    if (res.ok) setData(await res.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  // Debounced live preview
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", heading: form.heading, body: form.body, ctaText: form.ctaText, ctaUrl: form.ctaUrl }),
      });
      if (res.ok) setPreview((await res.json()).html);
    }, 400);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [form.heading, form.body, form.ctaText, form.ctaUrl]);

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setForm((f) => ({ ...f, name: p.name, subject: p.subject, heading: p.heading, body: p.body, ctaText: p.ctaText, ctaUrl: p.ctaUrl }));
  }

  async function sendTest() {
    setTesting(true); setMsg("");
    const res = await fetch("/api/admin/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", to: testTo, subject: form.subject, heading: form.heading, body: form.body, ctaText: form.ctaText, ctaUrl: form.ctaUrl }),
    });
    const j = await res.json();
    setMsg(res.ok ? `Test sent to ${testTo}` : j.error || "Test failed");
    setTesting(false);
  }

  async function sendCampaign() {
    const count = data?.counts?.[form.audience] || 0;
    if (!confirm(`Send "${form.subject}" to ${count} recipient${count === 1 ? "" : "s"}? This can't be undone.`)) return;
    setSending("new"); setMsg("");
    try {
      let res = await fetch("/api/admin/campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", ...form }),
      });
      let j = await res.json();
      if (!res.ok) { setMsg(j.error || "Send failed"); setSending(null); return; }
      // Keep sending batches until the queue drains
      let c = j.campaign;
      while (c && c.remaining > 0) {
        setSending(c.id);
        res = await fetch("/api/admin/campaigns", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send_batch", id: c.id }),
        });
        j = await res.json();
        if (!res.ok) break;
        c = j.campaign;
        load();
      }
      setMsg(c ? `Done — ${c.sent} sent${c.failed ? `, ${c.failed} failed` : ""}` : "Send interrupted");
      setForm({ ...form, name: "", subject: "", heading: "", body: "" });
    } finally {
      setSending(null);
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this campaign record?")) return;
    await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    load();
  }

  const field = "w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-[0.85rem] focus:outline-none focus:border-bright-lavender bg-white";

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Email Campaigns</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">Send marketing emails to your customers. Every email includes an unsubscribe link.</p>
      </div>

      {data && !data.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-5 mb-6 text-[0.85rem] text-amber-900">Resend isn&apos;t configured — set RESEND_API_KEY.</div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Composer */}
        <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
          <h2 className="font-display text-[1.1rem] mb-4">New campaign</h2>

          <div className="mb-4">
            <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider mb-2">Start from a preset</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p.id} onClick={() => applyPreset(p.id)} className="px-3 py-1.5 rounded-full text-[0.78rem] font-medium bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <input className={field} placeholder="Campaign name (internal)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div>
              <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider mb-1.5">Audience</div>
              <select className={field} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                {data && Object.entries(data.segments).map(([id, label]) => (
                  <option key={id} value={id}>{label} — {data.counts[id] ?? 0} people</option>
                ))}
              </select>
              {data && data.unsubscribed > 0 && (
                <div className="text-[0.72rem] text-ink-soft mt-1">{data.unsubscribed} unsubscribed {data.unsubscribed === 1 ? "person is" : "people are"} excluded automatically</div>
              )}
            </div>
            <input className={field} placeholder="Subject line — use {{name}} for first name" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <input className={field} placeholder="Heading (shown at top of email)" value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} />
            <textarea className={`${field} min-h-[180px]`} placeholder={"Email body — blank line = new paragraph.\nUse {{name}} to personalise."} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className={field} placeholder="Button text (optional)" value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} />
              <input className={field} placeholder="Button link (https://…)" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-5">
            <input className={`${field} flex-1`} placeholder="you@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            <button onClick={sendTest} disabled={testing || !testTo} className="px-4 py-2.5 rounded-xl bg-ink/[0.06] text-[0.8rem] font-semibold hover:bg-ink/[0.1] disabled:opacity-40 whitespace-nowrap">
              {testing ? "Sending…" : "Send test"}
            </button>
          </div>
          <button
            onClick={sendCampaign}
            disabled={!!sending || !form.subject || !form.heading || !form.body}
            className="w-full mt-3 px-4 py-3 rounded-xl bg-gradient-to-r from-[#ff2d78] to-[#a855f7] text-white text-[0.9rem] font-semibold disabled:opacity-40"
          >
            {sending ? "Sending…" : `Send to ${data?.counts?.[form.audience] ?? 0} people`}
          </button>
          {msg && <p className="text-[0.8rem] text-ink-soft mt-3 text-center">{msg}</p>}
        </div>

        {/* Live preview */}
        <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
          <h2 className="font-display text-[1.1rem] mb-4">Preview <span className="text-[0.7rem] text-ink-soft font-sans font-normal">(as "Sam")</span></h2>
          <div className="rounded-xl border border-ink/10 overflow-hidden bg-[#fdf6fb]">
            <iframe title="preview" srcDoc={preview} className="w-full h-[560px] bg-white" />
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
        <h2 className="font-display text-[1.1rem] mb-5">Campaign history</h2>
        {data?.campaigns?.length ? (
          <div className="space-y-2">
            {data.campaigns.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 py-3 border-b border-ink/5 last:border-0 text-[0.85rem]">
                <div className="flex-1 min-w-[180px]">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-[0.75rem] text-ink-soft">{c.subject}</div>
                </div>
                <div className="text-ink-soft text-[0.78rem]">{new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                <div className="text-ink-soft text-[0.78rem]">{data.segments[c.audience] || c.audience}</div>
                <div className={`px-2.5 py-1 rounded-full text-[0.72rem] font-semibold ${c.status === "sent" ? "bg-green-100 text-green-700" : c.status === "sending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                  {c.status === "sending" ? `sending ${c.sent}/${c.total}` : c.status}
                </div>
                <div className="text-[0.78rem] text-ink-soft w-40 text-right">
                  {c.sent} sent{c.failed ? ` · ${c.failed} failed` : ""}
                  {c.stats && c.sent > 0 && (
                    <div className="text-[0.72rem]">{c.stats.opens} opens · {c.stats.clicks} clicks{c.stats.bounces ? ` · ${c.stats.bounces} bounced` : ""}</div>
                  )}
                </div>
                <button onClick={() => remove(c.id)} className="text-[0.72rem] text-ink-soft hover:text-red-600">Delete</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[0.85rem] text-ink-soft">No campaigns sent yet.</p>
        )}
      </div>
    </div>
  );
}
