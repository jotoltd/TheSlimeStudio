"use client";

import { useEffect, useState } from "react";
import { supabase, type Booking, type Enquiry, type Subscriber } from "@/lib/supabase";

export default function ExportPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: bks } = await supabase.from("bookings").select("*").order("date", { ascending: false });
    if (bks) setBookings(bks as Booking[]);
    const { data: enqs } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false });
    if (enqs) setEnquiries(enqs as Enquiry[]);
    const { data: subs } = await supabase.from("subscribers").select("*").order("created_at", { ascending: false });
    if (subs) setSubscribers(subs as Subscriber[]);
    setLoading(false);
  }

  function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) { alert("No data to export."); return; }
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(",")),
    ];
    const csv = csvLines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Export Data</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">Download CSV files of your bookings, enquiries, and subscribers.</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <ExportCard
            title="Bookings"
            icon="📅"
            count={bookings.length}
            description="All booking records with date, time, people, price, payment status, and contact info."
            onExport={() => downloadCSV("bookings.csv", bookings as unknown as Record<string, unknown>[])}
          />
          <ExportCard
            title="Enquiries"
            icon="✉️"
            count={enquiries.length}
            description="All contact form submissions with name, email, phone, and message."
            onExport={() => downloadCSV("enquiries.csv", enquiries as unknown as Record<string, unknown>[])}
          />
          <ExportCard
            title="Subscribers"
            icon="📦"
            count={subscribers.length}
            description="All subscription box signups with name, contact, address, and status."
            onExport={() => downloadCSV("subscribers.csv", subscribers as unknown as Record<string, unknown>[])}
          />
        </div>
      )}
    </div>
  );
}

function ExportCard({ title, icon, count, description, onExport }: { title: string; icon: string; count: number; description: string; onExport: () => void }) {
  return (
    <div className="bg-white rounded-[20px] p-8 shadow-sm text-center">
      <div className="text-3xl mb-3">{icon}</div>
      <h2 className="font-display text-[1.2rem] mb-1">{title}</h2>
      <div className="font-display text-[2rem] text-bright-lavender mb-3">{count}</div>
      <p className="text-[0.85rem] text-ink-soft mb-5">{description}</p>
      <button onClick={onExport} disabled={count === 0}
        className="px-6 py-2.5 rounded-full bg-sky-blue-light text-ink text-[0.9rem] font-medium disabled:opacity-50 hover:-translate-y-0.5 hover:shadow-sm transition-all">
        Download CSV
      </button>
    </div>
  );
}
