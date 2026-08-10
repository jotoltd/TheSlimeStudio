"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type EmailLog = {
  id: string;
  recipient: string;
  subject: string;
  type: string;
  status: string;
  created_at: string;
};

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "booking_confirmation" | "cancellation" | "subscription">("all");

  useEffect(() => { loadLogs(); }, [filter]);

  async function loadLogs() {
    setLoading(true);
    let query = supabase.from("email_logs").select("*");
    if (filter !== "all") query = query.eq("type", filter);
    const { data } = await query.order("created_at", { ascending: false }).limit(100);
    if (data) setLogs(data as EmailLog[]);
    setLoading(false);
  }

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="font-display text-[1.6rem] md:text-[2rem]">Email Logs</h1>
          <p className="text-ink-soft text-[0.9rem] mt-1">Track confirmation and cancellation emails sent to customers.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "booking_confirmation", "cancellation", "subscription"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-[0.85rem] font-medium capitalize transition-all ${filter === f ? "bg-sky-blue-light text-ink shadow-sm" : "bg-white text-ink hover:bg-sky-blue-light/20"}`}>
              {f.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[20px] p-4 md:p-8 shadow-sm">
        {loading ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">
            <div className="text-3xl mb-3">📧</div>
            No email logs yet. Logs will appear here when booking confirmations or cancellations are sent.
            <p className="text-[0.8rem] mt-3">Note: The email_logs table needs to be created in Supabase. Run this SQL in the SQL Editor:</p>
            <pre className="text-left bg-ink/5 rounded-xl p-4 mt-2 text-[0.75rem] overflow-x-auto">{`CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can select email_logs" ON public.email_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert email_logs" ON public.email_logs FOR INSERT TO anon WITH CHECK (true);`}</pre>
          </div>
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
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-ink/[0.08]">
                    <td className="py-3 pr-4 text-[0.9rem]">{new Date(log.created_at).toLocaleString("en-GB")}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">{log.recipient}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">{log.subject}</td>
                    <td className="py-3 pr-4 text-[0.9rem] capitalize">{log.type.replace(/_/g, " ")}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[0.75rem] font-medium ${log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{log.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
