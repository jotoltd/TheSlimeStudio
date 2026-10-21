import { supabaseAdmin } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Special Events — The Slime Studio",
  description: "Adult evenings, after-school clubs, seasonal sessions and more at The Slime Studio.",
};

export default async function EventsPage() {
  const today = new Date().toISOString().split("T")[0];

  const { data: events } = await supabaseAdmin
    .from("special_events")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  type EventRow = {
    id: string;
    slug: string | null;
    image_url: string | null;
    category: string | null;
    title: string;
    description: string | null;
    price: number | string | null;
    pricing_model: string | null;
  };
  type InstanceRow = { id: string; event_id: string; date: string; start_time: string | null };

  const eventIds = (events || []).map((e: EventRow) => e.id);
  const { data: instances } = eventIds.length
    ? await supabaseAdmin
        .from("special_event_instances")
        .select("*")
        .in("event_id", eventIds)
        .eq("status", "open")
        .gte("date", today)
        .order("date", { ascending: true })
    : { data: [] as InstanceRow[] };

  const byEvent: Record<string, InstanceRow[]> = {};
  ((instances || []) as InstanceRow[]).forEach((i) => {
    (byEvent[i.event_id] = byEvent[i.event_id] || []).push(i);
  });

  const upcoming = (events || []).filter((e: EventRow) => (byEvent[e.id] || []).length > 0);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream">
        <div className="max-w-5xl mx-auto px-5 py-12 md:py-16">
          <h1 className="font-display text-3xl md:text-4xl mb-2">Special Events</h1>
          <p className="text-ink-soft mb-10">Adult evenings, after-school clubs, seasonal sessions and more.</p>

          {upcoming.length === 0 ? (
            <div className="bg-white rounded-[20px] p-10 shadow-sm text-center text-ink-soft">
              <p className="font-display text-lg mb-2">Nothing scheduled right now</p>
              <p className="text-[0.9rem]">New events are added regularly — check back soon, or <Link href="/booking" className="text-sky-blue-light hover:underline">book a regular slime session</Link>.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {upcoming.map((e: EventRow) => {
                const inst = byEvent[e.id];
                const first = inst[0];
                const when = new Date(first.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
                return (
                  <Link key={e.id} href={`/events/${e.slug || e.id}`} className="bg-white rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-shadow block">
                    {e.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.image_url} alt="" className="w-full h-48 object-cover" />
                    )}
                    <div className="p-6">
                      {e.category && <span className="text-[0.65rem] uppercase tracking-wider bg-bright-lavender/20 text-ink px-2 py-1 rounded-full font-semibold">{e.category}</span>}
                      <h2 className="font-display text-xl mt-2 mb-1">{e.title}</h2>
                      {e.description && <p className="text-[0.85rem] text-ink-soft line-clamp-2 mb-3">{e.description}</p>}
                      <div className="flex items-center justify-between text-[0.85rem]">
                        <span className="text-ink-soft">{when}{first.start_time ? ` · ${first.start_time}` : ""}{inst.length > 1 ? ` +${inst.length - 1} more date${inst.length > 2 ? "s" : ""}` : ""}</span>
                        {e.price != null && <span className="font-semibold">£{Number(e.price).toFixed(0)}{e.pricing_model === "per_person" ? "/person" : ""}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
