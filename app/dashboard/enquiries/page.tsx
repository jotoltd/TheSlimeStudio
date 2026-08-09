"use client";

import { useEffect, useState } from "react";
import { supabase, type Enquiry } from "@/lib/supabase";

export default function EnquiriesAdminPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnquiries();
  }, []);

  async function loadEnquiries() {
    setLoading(true);
    const { data } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false });
    if (data) setEnquiries(data as Enquiry[]);
    setLoading(false);
  }

  async function deleteEnquiry(id: string, name: string | null) {
    if (!confirm(`Delete enquiry from "${name || "this contact"}"? This cannot be undone.`)) return;
    await supabase.from("enquiries").delete().eq("id", id);
    loadEnquiries();
  }

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Enquiries</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">All messages submitted through the contact form.</p>
      </div>

      <div className="bg-white rounded-[20px] p-8 shadow-sm">
        {loading ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading enquiries...</div>
        ) : enquiries.length === 0 ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">No enquiries yet.</div>
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
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((e) => (
                  <tr key={e.id} className="border-t border-ink/[0.08]">
                    <td className="py-3 pr-4 text-[0.9rem]">{e.name || "--"}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">
                      {e.email ? <a href={`mailto:${e.email}`} className="hover:text-bright-lavender">{e.email}</a> : "--"}
                    </td>
                    <td className="py-3 pr-4 text-[0.9rem]">{e.phone || "--"}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">{e.enquiry_type || "--"}</td>
                    <td className="py-3 pr-4 text-[0.9rem]">
                      {e.preferred_date ? new Date(e.preferred_date).toLocaleDateString("en-GB") : "--"}
                    </td>
                    <td className="py-3 pr-4 text-[0.9rem] max-w-[240px]">{e.message || "--"}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
