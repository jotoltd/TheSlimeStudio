"use client";

import { useEffect, useState } from "react";
import { supabase, type Enquiry } from "@/lib/supabase";

export default function EnquiriesAdminPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "read" | "responded">("all");

  useEffect(() => {
    loadEnquiries();
  }, []);

  async function loadEnquiries() {
    setLoading(true);
    const { data } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false });
    if (data) setEnquiries(data as Enquiry[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/update-enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    }
  }

  async function deleteEnquiry(id: string, name: string | null) {
    if (!confirm(`Delete enquiry from "${name || "this contact"}"? This cannot be undone.`)) return;
    const res = await fetch("/api/delete-enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
    }
  }

  const filtered = enquiries.filter((e) => {
    if (statusFilter === "all") return true;
    return (e.status || "new") === statusFilter;
  });

  const newCount = enquiries.filter((e) => (e.status || "new") === "new").length;

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Enquiries</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">All messages submitted through the contact form.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "new", "read", "responded"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-2 rounded-full text-[0.85rem] font-medium capitalize transition-all ${
              statusFilter === f ? "bg-sky-blue-light text-ink shadow-sm" : "bg-white text-ink hover:bg-sky-blue-light/20"
            }`}
          >
            {f === "all" ? "All" : f}
            {f === "new" && newCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-bright-lavender text-white text-[0.7rem]">{newCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
        {loading ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading enquiries...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">
            <div className="text-3xl mb-2">✉️</div>
            No enquiries found.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((e) => {
              const status = e.status || "new";
              return (
                <div key={e.id} className={`rounded-xl p-5 border transition-colors ${status === "new" ? "border-bright-lavender/30 bg-bright-lavender/[0.03]" : "border-ink/[0.08] hover:border-ink/15"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-[0.95rem] font-medium">{e.name || "--"}</div>
                      <div className="text-[0.8rem] text-ink-soft mt-0.5">
                        {e.enquiry_type || "General"} · {e.created_at ? new Date(e.created_at).toLocaleDateString("en-GB") : "--"}
                      </div>
                    </div>
                    <select
                      value={status}
                      onChange={(ev) => updateStatus(e.id, ev.target.value)}
                      className={`px-2.5 py-1 rounded-full text-[0.75rem] font-medium border-0 cursor-pointer ${
                        status === "new" ? "bg-bright-lavender/20 text-bright-lavender" :
                        status === "read" ? "bg-sky-blue-light/20 text-ink" :
                        status === "responded" ? "bg-green-100 text-green-700" :
                        "bg-ink/5 text-ink-soft"
                      }`}
                    >
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="responded">Responded</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[0.8rem] text-ink-soft mb-3">
                    {e.email && <a href={`mailto:${e.email}`} className="hover:text-bright-lavender transition-colors">📧 {e.email}</a>}
                    {e.phone && <span>📞 {e.phone}</span>}
                    {e.preferred_date && <span>🗓️ {new Date(e.preferred_date).toLocaleDateString("en-GB")}</span>}
                  </div>
                  {e.message && (
                    <p className="text-[0.85rem] text-ink bg-ink/[0.03] rounded-lg px-3 py-2.5 mb-3">{e.message}</p>
                  )}
                  <button
                    onClick={() => deleteEnquiry(e.id, e.name)}
                    className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] font-medium hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
