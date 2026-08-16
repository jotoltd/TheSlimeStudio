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

      <div className="bg-white rounded-[20px] p-8 shadow-sm">
        {loading ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading enquiries...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">No enquiries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[0.75rem] text-ink-soft uppercase tracking-wider">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Phone</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Preferred Date</th>
                  <th className="pb-3 pr-4">Message</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const status = e.status || "new";
                  return (
                    <tr key={e.id} className={`border-t border-ink/[0.08] ${status === "new" ? "bg-bright-lavender/[0.03]" : ""}`}>
                      <td className="py-3 pr-4 text-[0.9rem] font-medium">{e.name || "--"}</td>
                      <td className="py-3 pr-4 text-[0.9rem]">
                        {e.email ? <a href={`mailto:${e.email}`} className="hover:text-bright-lavender">{e.email}</a> : "--"}
                      </td>
                      <td className="py-3 pr-4 text-[0.9rem]">{e.phone || "--"}</td>
                      <td className="py-3 pr-4 text-[0.9rem]">{e.enquiry_type || "--"}</td>
                      <td className="py-3 pr-4 text-[0.9rem]">
                        {e.preferred_date ? new Date(e.preferred_date).toLocaleDateString("en-GB") : "--"}
                      </td>
                      <td className="py-3 pr-4 text-[0.9rem] max-w-[240px]">{e.message || "--"}</td>
                      <td className="py-3 pr-4">
                        <select
                          value={status}
                          onChange={(ev) => updateStatus(e.id, ev.target.value)}
                          className={`px-2 py-1 rounded-full text-[0.75rem] font-medium border-0 cursor-pointer ${
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
                      </td>
                      <td className="py-3 pr-4 text-[0.9rem]">
                        {e.created_at ? new Date(e.created_at).toLocaleDateString("en-GB") : "--"}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => deleteEnquiry(e.id, e.name)}
                          className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[0.8rem] hover:bg-red-200 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
