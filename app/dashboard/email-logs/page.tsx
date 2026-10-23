"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 25;

type EmailLog = {
  id: string;
  recipient: string;
  subject: string;
  type: string;
  status: string;
  created_at: string;
};

type EmailData = {
  configured: boolean;
  domainStatus: string;
  sent30: number;
  failed30: number;
  monthCount: number;
  todayCount: number;
  monthQuota: number | null;
  dayQuota: number | null;
  byType: Record<string, { sent: number; failed: number }>;
  settings: Record<string, boolean>;
  templates: Record<string, string>;
};

const EMAIL_TEMPLATES = [
  {
    id: "booking", label: "Booking confirmation", fields: [
      { key: "email_tpl_booking_subject", label: "Subject", placeholder: "Your Slime Studio booking is confirmed!" },
      { key: "email_tpl_booking_heading", label: "Heading", placeholder: "Booking Confirmed!" },
      { key: "email_tpl_booking_body", label: "Main message", placeholder: "Your slime-making session at The Slime Studio is confirmed! We can't wait to see you.", multi: true },
      { key: "email_tpl_booking_note", label: "Arrival note", placeholder: "Please arrive 5 minutes before your session. Everything you need is provided!", multi: true },
    ],
  },
  {
    id: "event", label: "Event booking confirmation", fields: [
      { key: "email_tpl_event_subject", label: "Subject", placeholder: "Event Booking Confirmed — [event] — The Slime Studio" },
      { key: "email_tpl_event_heading", label: "Heading", placeholder: "Event Booking Confirmed!" },
      { key: "email_tpl_event_body", label: "Main message", placeholder: "Your booking at The Slime Studio is confirmed! We can't wait to see you.", multi: true },
      { key: "email_tpl_event_note", label: "Arrival note", placeholder: "Please arrive 5 minutes before the event starts. Everything you need is provided!", multi: true },
    ],
  },
  {
    id: "cancellation", label: "Cancellation", fields: [
      { key: "email_tpl_cancellation_subject", label: "Subject", placeholder: "Your Booking Has Been Cancelled — The Slime Studio" },
      { key: "email_tpl_cancellation_heading", label: "Heading", placeholder: "Booking Cancelled" },
      { key: "email_tpl_cancellation_body", label: "Main message", placeholder: "We're writing to let you know that your Slime Studio booking has been cancelled.", multi: true },
    ],
  },
  {
    id: "order", label: "Order confirmation (shop)", fields: [
      { key: "email_tpl_order_subject", label: "Subject", placeholder: "Order Confirmed — [order no.] — The Slime Studio" },
      { key: "email_tpl_order_heading", label: "Heading", placeholder: "Order Confirmed!" },
      { key: "email_tpl_order_body", label: "Main message", placeholder: "Thank you for your order from The Slime Studio!", multi: true },
      { key: "email_tpl_order_note", label: "Delivery note", placeholder: "We'll dispatch your order as soon as possible and send you tracking information.", multi: true },
    ],
  },
];

const TOGGLES = [
  { key: "email_booking_confirmation", label: "Booking emails to customers", desc: "Confirmations, event bookings, and cancellations" },
  { key: "email_order_confirmation", label: "Order & gift card emails", desc: "Shop order confirmations and gift card deliveries" },
  { key: "email_admin_alerts", label: "Alerts to you", desc: "New booking, order, and event notifications to studio@" },
  { key: "email_reward_codes", label: "Loyalty reward emails", desc: "Reward codes sent when stamps are earned" },
];

const TYPE_LABELS: Record<string, string> = {
  booking_confirmation: "Booking confirmation",
  cancellation: "Cancellation",
  event_booking_confirmation: "Event confirmation",
  event_booking_admin: "Event admin alert",
  order_confirmation: "Order confirmation",
  admin_notification: "Admin alert",
  gift_card: "Gift card",
  subscription: "Subscription",
  reward_code: "Reward code",
  test: "Test",
};

export default function EmailsPage() {
  const [data, setData] = useState<EmailData | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState("");
  const [tplId, setTplId] = useState("booking");
  const [tplDraft, setTplDraft] = useState<Record<string, string>>({});
  const [tplMsg, setTplMsg] = useState("");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewTick, setPreviewTick] = useState(0);
  const [page, setPage] = useState(1);

  const tplIdRef = useRef(tplId);
  tplIdRef.current = tplId;

  const loadAll = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/emails");
    if (res.ok) {
      const json = await res.json();
      setData(json);
      const tpl = EMAIL_TEMPLATES.find((t) => t.id === tplIdRef.current)!;
      const draft: Record<string, string> = {};
      tpl.fields.forEach((f) => { draft[f.key] = json.templates?.[f.key] || ""; });
      setTplDraft(draft);
    }
    // Engagement rows (campaign opens/clicks/bounces/complaints) come from the
    // Resend webhook, not real sends — keep them out of the "recent emails"
    // list and the type filter chips. Per-recipient engagement lives on the
    // Campaigns page.
    let query = supabase.from("email_logs").select("*")
      .not("type", "like", "campaign_open%")
      .not("type", "like", "campaign_click%")
      .not("type", "like", "campaign_bounce%")
      .not("type", "like", "campaign_complaint%");
    if (filter !== "all") query = query.eq("type", filter);
    const { data: logRows } = await query.order("created_at", { ascending: false }).limit(100);
    if (logRows) setLogs(logRows as EmailLog[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/admin/email-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tplId, overrides: tplDraft }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => j && setPreview(j));
    }, 400);
    return () => clearTimeout(t);
  }, [tplId, tplDraft, previewTick]);


  async function toggle(key: string, value: boolean) {
    setData((d) => d && { ...d, settings: { ...d.settings, [key]: value } });
    await fetch("/api/admin/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { [key]: value } }),
    });
  }

  function selectTemplate(id: string) {
    setTplId(id);
    setTplMsg("");
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === id)!;
    const draft: Record<string, string> = {};
    tpl.fields.forEach((f) => { draft[f.key] = data?.templates[f.key] || ""; });
    setTplDraft(draft);
  }

  async function saveTemplate() {
    setTplMsg("");
    const res = await fetch("/api/admin/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates: tplDraft }),
    });
    setTplMsg(res.ok ? "Saved — applies to new emails within a minute" : "Failed to save");
    if (res.ok) setPreviewTick((t) => t + 1);
  }

  async function sendTest() {
    setMsg("");
    const res = await fetch("/api/admin/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: testTo || true }),
    });
    const json = await res.json();
    setMsg(res.ok ? `Test sent to ${testTo || "studio@theslimestudio.co.uk"} — check the inbox` : json.error || "Failed");
    loadAll();
  }

  const types = Array.from(new Set([...Object.keys(data?.byType || {}), ...logs.map((l) => l.type)]));
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedLogs = logs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (loading && !data) return <div className="py-16 text-center text-ink-soft">Loading…</div>;
  if (!data) return <div className="py-16 text-center text-ink-soft">Failed to load</div>;

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Emails</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">Control which emails the site sends, and see what&apos;s going out.</p>
      </div>

      {/* Status + usage */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-[16px] p-5 shadow-sm">
          <div className="text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1">Status</div>
          <div className={`font-display text-[1.1rem] ${data.configured && data.domainStatus === "verified" ? "text-green-600" : "text-red-600"}`}>
            {data.configured ? (data.domainStatus === "verified" ? "Working" : data.domainStatus) : "Not set up"}
          </div>
        </div>
        <div className="bg-white rounded-[16px] p-5 shadow-sm">
          <div className="text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1">Sent today</div>
          <div className="font-display text-[1.6rem]">{data.todayCount}<span className="text-[0.85rem] text-ink-soft font-normal">{data.dayQuota != null ? ` / ${data.dayQuota} max` : " · no cap"}</span></div>
        </div>
        <div className="bg-white rounded-[16px] p-5 shadow-sm">
          <div className="text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1">This month</div>
          <div className="font-display text-[1.6rem]">{data.monthCount}<span className="text-[0.85rem] text-ink-soft font-normal">{data.monthQuota != null ? ` / ${data.monthQuota}` : ""}</span></div>
        </div>
        <div className="bg-white rounded-[16px] p-5 shadow-sm">
          <div className="text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1">Last 30 days</div>
          <div className="font-display text-[1.6rem]">{data.sent30}{data.failed30 > 0 && <span className="text-[0.85rem] text-red-600 font-normal"> ({data.failed30} failed)</span>}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Toggles */}
        <div className="bg-white rounded-[20px] p-6 shadow-sm">
          <h2 className="font-display text-[1rem] mb-1">What gets sent</h2>
          <p className="text-[0.78rem] text-ink-soft mb-4">Turn email types on or off. Changes apply within a minute.</p>
          <div className="space-y-1">
            {TOGGLES.map((t) => {
              const on = data.settings[t.key] !== false;
              return (
                <button
                  key={t.key}
                  onClick={() => toggle(t.key, !on)}
                  className="w-full flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-ink/[0.03] transition-colors text-left"
                >
                  <div>
                    <div className="text-[0.88rem] font-medium">{t.label}</div>
                    <div className="text-[0.75rem] text-ink-soft">{t.desc}</div>
                  </div>
                  <div className={`w-11 h-6 rounded-full flex-shrink-0 relative transition-colors ${on ? "bg-green-500" : "bg-ink/20"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "left-[22px]" : "left-0.5"}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Test + breakdown */}
        <div className="space-y-6">
          <div className="bg-white rounded-[20px] p-6 shadow-sm">
            <h2 className="font-display text-[1rem] mb-1">Send a test</h2>
            <p className="text-[0.78rem] text-ink-soft mb-3">Check emails actually arrive — useful after DNS or domain changes.</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={testTo}
                placeholder="studio@theslimestudio.co.uk"
                onChange={(e) => setTestTo(e.target.value)}
                className="flex-1 px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.85rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
              />
              <button onClick={sendTest} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-bright-lavender to-sky-blue-light text-white font-semibold text-[0.85rem] hover:opacity-90">
                Send
              </button>
            </div>
            {msg && <div className="mt-3 text-[0.8rem] text-ink-soft">{msg}</div>}
          </div>

          <div className="bg-white rounded-[20px] p-6 shadow-sm">
            <h2 className="font-display text-[1rem] mb-3">By type — last 30 days</h2>
            {Object.keys(data.byType).length === 0 ? (
              <div className="text-[0.85rem] text-ink-soft">No emails logged yet.</div>
            ) : (
              <div className="space-y-2">
                {Object.entries(data.byType).sort((a, b) => b[1].sent - a[1].sent).map(([type, c]) => (
                  <div key={type} className="flex items-center justify-between text-[0.85rem]">
                    <span>{TYPE_LABELS[type] || type.replace(/_/g, " ")}</span>
                    <span className="font-medium">{c.sent}{c.failed > 0 && <span className="text-red-600"> +{c.failed} failed</span>}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template editor */}
      <div className="bg-white rounded-[20px] p-6 shadow-sm mb-8">
        <h2 className="font-display text-[1rem] mb-1">Edit what the emails say</h2>
        <p className="text-[0.78rem] text-ink-soft mb-4">Change the wording customers see. Leave a field blank to use the standard text. Booking details (names, dates, prices) are still filled in automatically.</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {EMAIL_TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => selectTemplate(t.id)}
              className={`px-3.5 py-1.5 rounded-full text-[0.78rem] font-medium transition-all ${tplId === t.id ? "bg-sky-blue-light text-ink shadow-sm" : "bg-ink/[0.04] text-ink hover:bg-sky-blue-light/20"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {EMAIL_TEMPLATES.find((t) => t.id === tplId)!.fields.map((f) => (
              <div key={f.key}>
                <label className="block text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">{f.label}</label>
                {f.multi ? (
                  <textarea
                    rows={2}
                    value={tplDraft[f.key] || ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setTplDraft({ ...tplDraft, [f.key]: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.85rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50 resize-y"
                  />
                ) : (
                  <input
                    type="text"
                    value={tplDraft[f.key] || ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setTplDraft({ ...tplDraft, [f.key]: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.85rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
                  />
                )}
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <button onClick={saveTemplate} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-bright-lavender to-sky-blue-light text-white font-semibold text-[0.85rem] hover:opacity-90">
                Save wording
              </button>
              {tplMsg && <span className="text-[0.8rem] text-ink-soft">{tplMsg}</span>}
            </div>
          </div>

          <div>
            <div className="text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">Preview (updates as you type)</div>
            {preview ? (
              <div className="border border-ink/10 rounded-xl overflow-hidden">
                <div className="bg-ink/[0.04] px-4 py-2.5 border-b border-ink/10">
                  <span className="text-[0.72rem] uppercase tracking-wider text-ink-soft font-semibold">Subject: </span>
                  <span className="text-[0.82rem] font-medium">{preview.subject}</span>
                </div>
                <iframe
                  title="Email preview"
                  srcDoc={preview.html}
                  className="w-full h-[520px] bg-white"
                  sandbox=""
                />
              </div>
            ) : (
              <div className="h-[520px] rounded-xl bg-ink/[0.03] flex items-center justify-center text-ink-soft text-[0.85rem]">Loading preview…</div>
            )}
          </div>
        </div>
      </div>

      {/* Log */}
      <div className="bg-white rounded-[20px] p-4 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-[1rem]">Recent emails</h2>
          <div className="flex gap-2 flex-wrap">
            {["all", ...types].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-[0.78rem] font-medium capitalize transition-all ${filter === f ? "bg-sky-blue-light text-ink shadow-sm" : "bg-ink/[0.04] text-ink hover:bg-sky-blue-light/20"}`}>
                {f === "all" ? "All" : (TYPE_LABELS[f] || f.replace(/_/g, " "))}
              </button>
            ))}
          </div>
        </div>
        {logs.length === 0 ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">No emails logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[0.75rem] text-ink-soft uppercase tracking-wider">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Recipient</th>
                  <th className="pb-3 pr-4">Subject</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log) => (
                  <tr key={log.id} className="border-t border-ink/[0.08]">
                    <td className="py-3 pr-4 text-[0.9rem] whitespace-nowrap">{new Date(log.created_at).toLocaleString("en-GB")}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">{log.recipient}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">{log.subject}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">{TYPE_LABELS[log.type] || log.type.replace(/_/g, " ")}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[0.75rem] font-medium ${log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{log.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={safePage} total={logs.length} pageSize={PAGE_SIZE} onPage={setPage} />
      </div>
    </div>
  );
}
