"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";

type EventInstance = {
  id: string;
  event_id: string;
  date: string;
  start_time: string;
  capacity: number;
  status: string;
  booked_count: number;
};

type SpecialEvent = {
  id: string;
  title: string;
  description: string;
  event_type: string;
  category: string;
  pricing_model: string;
  price: number;
  capacity: number;
  duration_minutes: number;
  image_url: string | null;
  slug: string | null;
  is_active: boolean;
  created_at: string;
  instances: EventInstance[];
};

const CATEGORIES = [
  { value: "adult_evening", label: "Adult Only Evening" },
  { value: "after_school", label: "After School Club" },
  { value: "workshop", label: "Workshop" },
  { value: "special", label: "Special Event" },
];

const CATEGORY_COLORS: Record<string, string> = {
  adult_evening: "bg-purple-100 text-purple-700",
  after_school: "bg-blue-100 text-blue-700",
  workshop: "bg-green-100 text-green-700",
  special: "bg-pink-100 text-pink-700",
};

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

export default function EventsPage() {
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SpecialEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "one_off" as "one_off" | "recurring",
    category: "special",
    pricing_model: "per_person" as "per_person" | "fixed_ticket",
    price: "15",
    capacity: "10",
    duration_minutes: "60",
    image_url: "",
    slug: "",
    is_active: true,
  });

  // Instance form (one-off)
  const [instDate, setInstDate] = useState(todayISO());
  const [instTime, setInstTime] = useState("18:00");

  // Recurring form
  const [recurStart, setRecurStart] = useState(todayISO());
  const [recurEnd, setRecurEnd] = useState("");
  const [recurDays, setRecurDays] = useState<number[]>([3]); // Wednesday by default
  const [recurTime, setRecurTime] = useState("16:00");

  const [showRecur, setShowRecur] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      if (data.events) setEvents(data.events);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setForm({
      title: "",
      description: "",
      event_type: "one_off",
      category: "special",
      pricing_model: "per_person",
      price: "15",
      capacity: "10",
      duration_minutes: "60",
      image_url: "",
      slug: "",
      is_active: true,
    });
    setEditing(null);
    setShowForm(false);
    setMsg(null);
    setInstDate(todayISO());
    setInstTime("18:00");
    setRecurStart(todayISO());
    setRecurEnd("");
    setRecurDays([3]);
    setRecurTime("16:00");
    setShowRecur(false);
  }

  function startEdit(e: SpecialEvent) {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description,
      event_type: e.event_type as any,
      category: e.category,
      pricing_model: e.pricing_model as any,
      price: String(e.price),
      capacity: String(e.capacity),
      duration_minutes: String(e.duration_minutes),
      image_url: e.image_url || "",
      slug: e.slug || "",
      is_active: e.is_active,
    });
    setShowForm(true);
    setMsg(null);
  }

  async function save() {
    if (!form.title.trim()) { setMsg({ type: "err", text: "Title is required." }); return; }
    if (parseFloat(form.price) <= 0) { setMsg({ type: "err", text: "Price must be greater than 0." }); return; }

    setSaving(true);
    setMsg(null);

    const eventData = {
      title: form.title.trim(),
      description: form.description.trim(),
      event_type: form.event_type,
      category: form.category,
      pricing_model: form.pricing_model,
      price: parseFloat(form.price),
      capacity: parseInt(form.capacity) || 10,
      duration_minutes: parseInt(form.duration_minutes) || 60,
      image_url: form.image_url.trim() || null,
      slug: form.slug.trim() || undefined,
      is_active: form.is_active,
    };

    try {
      if (editing) {
        // Update existing event
        const res = await fetch("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", id: editing.id, event: eventData }),
        });
        const data = await res.json();
        if (data.error) {
          setMsg({ type: "err", text: data.error });
        } else {
          setMsg({ type: "ok", text: "Event updated!" });
          setTimeout(() => resetForm(), 1500);
          load();
        }
      } else {
        // Create new event with initial instance(s)
        let instances: { date: string; start_time: string; capacity?: number }[] = [];
        if (form.event_type === "one_off") {
          instances = [{ date: instDate, start_time: instTime, capacity: parseInt(form.capacity) }];
        }

        const res = await fetch("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", event: eventData, instances }),
        });
        const data = await res.json();
        if (data.error) {
          setMsg({ type: "err", text: data.error });
        } else {
          // If recurring, generate instances
          if (form.event_type === "recurring" && data.event && recurEnd) {
            await fetch("/api/admin/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "generate_recurring",
                event_id: data.event.id,
                start_date: recurStart,
                end_date: recurEnd,
                days_of_week: recurDays,
                start_time: recurTime,
                capacity: parseInt(form.capacity),
              }),
            });
          }
          setMsg({ type: "ok", text: "Event created!" });
          setTimeout(() => resetForm(), 1500);
          load();
        }
      }
    } catch {
      setMsg({ type: "err", text: "Network error. Please try again." });
    }
    setSaving(false);
  }

  async function deleteEvent(e: SpecialEvent) {
    if (!confirm(`Delete "${e.title}"? This will remove all instances and bookings. This cannot be undone.`)) return;
    await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: e.id }),
    });
    load();
  }

  async function cancelInstance(inst: EventInstance) {
    if (!confirm(`Cancel this instance on ${inst.date} at ${inst.start_time}?`)) return;
    await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel_instance", id: inst.id }),
    });
    load();
  }

  async function deleteInstance(inst: EventInstance) {
    if (!confirm(`Delete this instance on ${inst.date}?`)) return;
    await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_instance", id: inst.id }),
    });
    load();
  }

  async function generateRecurring(e: SpecialEvent) {
    setShowRecur(true);
    setEditing(e);
    setRecurStart(todayISO());
    setRecurEnd("");
    setRecurDays([3]);
    setRecurTime("16:00");
  }

  async function submitRecurring() {
    if (!editing || !recurEnd) { toast("Select an end date", "error"); return; }
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_recurring",
        event_id: editing.id,
        start_date: recurStart,
        end_date: recurEnd,
        days_of_week: recurDays,
        start_time: recurTime,
        capacity: editing.capacity,
      }),
    });
    const data = await res.json();
    if (data.error) { toast(data.error, "error"); }
    else {
      toast(`Generated ${data.count} sessions!`);
      setShowRecur(false);
      setEditing(null);
      load();
    }
  }

  function toggleRecurDay(dow: number) {
    setRecurDays((prev) => (prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]));
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Special Events"
        subtitle="Manage adult-only evenings, after school clubs, workshops and special events"
        actions={
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary text-[0.85rem]"
          >
            + New Event
          </button>
        }
      />

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-display text-[1.1rem] mb-4">
            {editing ? "Edit Event" : "Create New Event"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Adult Slime & Sip Evening"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the event..."
                rows={3}
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Event Type</label>
              <select
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value as any })}
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              >
                <option value="one_off">One-off (single date)</option>
                <option value="recurring">Recurring (weekly)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Pricing Model</label>
              <select
                value={form.pricing_model}
                onChange={(e) => setForm({ ...form, pricing_model: e.target.value as any })}
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              >
                <option value="per_person">Per Person</option>
                <option value="fixed_ticket">Fixed Ticket Price</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {form.pricing_model === "per_person" ? "Price per Person (£)" : "Ticket Price (£)"}
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="15.00"
                step="0.01"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Capacity</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="10"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Duration (minutes)</label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                placeholder="60"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
            </div>

            {/* One-off: date/time */}
            {!editing && form.event_type === "one_off" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Date</label>
                  <input
                    type="date"
                    value={instDate}
                    min={todayISO()}
                    onChange={(e) => setInstDate(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={instTime}
                    onChange={(e) => setInstTime(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
              </>
            )}

            {/* Recurring: date range */}
            {!editing && form.event_type === "recurring" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={recurStart}
                    min={todayISO()}
                    onChange={(e) => setRecurStart(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={recurEnd}
                    min={recurStart || todayISO()}
                    onChange={(e) => setRecurEnd(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Time</label>
                  <input
                    type="time"
                    value={recurTime}
                    onChange={(e) => setRecurTime(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Days of Week</label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
                      <button
                        key={dow}
                        type="button"
                        onClick={() => toggleRecurDay(dow)}
                        className={`px-3 py-1.5 rounded-full text-[0.8rem] font-medium transition-colors ${
                          recurDays.includes(dow) ? "bg-sky-blue-light text-ink" : "bg-ink/5 text-ink-soft hover:bg-ink/10"
                        }`}
                      >
                        {DAY_SHORT[dow]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">URL Slug (optional)</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-") })}
                placeholder="sip-and-slime"
                className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
              />
              <p className="text-[0.75rem] text-ink-soft mt-1">
                Auto-generated from title if left blank. URL: /events/{form.slug || "auto-generated"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Event Image (optional)</label>
              {form.image_url ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-ink/15">
                  <img src={form.image_url} alt="Event" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image_url: "" })}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-ink/60 text-white grid place-items-center text-sm hover:bg-ink/80"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    const ext = file.name.split(".").pop();
                    const fileName = `events/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
                    const { error } = await supabase.storage.from("event-images").upload(fileName, file);
                    if (!error) {
                      const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(fileName);
                      setForm({ ...form, image_url: urlData.publicUrl });
                    } else {
                      toast(`Upload failed: ${error.message}`, "error");
                    }
                    setUploading(false);
                  }}
                  className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              )}
              {uploading && <p className="text-[0.8rem] text-ink-soft mt-1">Uploading...</p>}
            </div>
            <div className="flex items-center gap-3 pt-6">
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`relative w-12 h-7 rounded-full transition-colors ${form.is_active ? "bg-green-400" : "bg-ink/15"}`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${form.is_active ? "translate-x-5" : ""}`} />
              </button>
              <span className="text-sm font-medium">{form.is_active ? "Active" : "Inactive"}</span>
            </div>
          </div>

          {msg && (
            <p className={`text-sm mt-4 ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
          )}
          <div className="flex gap-3 mt-5">
            <button onClick={save} disabled={saving} className="btn-primary text-[0.85rem] disabled:opacity-60">
              {saving ? "Saving..." : editing ? "Update Event" : "Create Event"}
            </button>
            <button onClick={resetForm} className="px-5 py-2.5 rounded-full bg-ink/5 text-ink text-[0.85rem] font-medium hover:bg-ink/10">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Recurring generator modal */}
      {showRecur && editing && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => { setShowRecur(false); setEditing(null); }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg mb-4">Generate Recurring Sessions</h3>
            <p className="text-sm text-ink-soft mb-4">For: {editing.title}</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Start Date</label>
                <input type="date" value={recurStart} min={todayISO()} onChange={(e) => setRecurStart(e.target.value)} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">End Date</label>
                <input type="date" value={recurEnd} min={recurStart || todayISO()} onChange={(e) => setRecurEnd(e.target.value)} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Time</label>
              <input type="time" value={recurTime} onChange={(e) => setRecurTime(e.target.value)} className="w-full px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Days of Week</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
                  <button key={dow} type="button" onClick={() => toggleRecurDay(dow)}
                    className={`px-3 py-1.5 rounded-full text-[0.8rem] font-medium ${recurDays.includes(dow) ? "bg-sky-blue-light text-ink" : "bg-ink/5 text-ink-soft hover:bg-ink/10"}`}>
                    {DAY_SHORT[dow]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={submitRecurring} className="btn-primary text-[0.85rem]">Generate Sessions</button>
              <button onClick={() => { setShowRecur(false); setEditing(null); }} className="px-5 py-2.5 rounded-full bg-ink/5 text-ink text-[0.85rem] font-medium hover:bg-ink/10">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-ink-soft text-sm">Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-ink-soft text-sm">
          No events yet. Click "New Event" to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-[1rem] text-ink">{e.title}</h3>
                      <span className={`text-[0.7rem] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[e.category] || CATEGORY_COLORS.special}`}>
                        {CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
                      </span>
                      {e.event_type === "recurring" && (
                        <span className="text-[0.7rem] px-2 py-0.5 rounded-full bg-ink/5 text-ink-soft font-medium">Recurring</span>
                      )}
                      {!e.is_active && (
                        <span className="text-[0.7rem] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Inactive</span>
                      )}
                    </div>
                    {e.description && <p className="text-[0.85rem] text-ink-soft mb-2">{e.description}</p>}
                    <div className="flex flex-wrap gap-3 text-[0.8rem] text-ink-soft">
                      <span>{e.pricing_model === "per_person" ? `£${e.price} per person` : `£${e.price} per ticket`}</span>
                      <span>·</span>
                      <span>Capacity: {e.capacity}</span>
                      <span>·</span>
                      <span>{e.duration_minutes} min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {e.event_type === "recurring" && (
                      <button onClick={() => generateRecurring(e)} className="text-[0.8rem] text-sky-blue-light hover:underline">
                        + Add Sessions
                      </button>
                    )}
                    <a href={`/events/${e.slug || e.id}`} target="_blank" className="text-[0.8rem] text-sky-blue-light hover:underline">View</a>
                    <button onClick={() => startEdit(e)} className="text-[0.8rem] text-sky-blue-light hover:underline">Edit</button>
                    <button onClick={() => deleteEvent(e)} className="text-[0.8rem] text-red-500 hover:underline">Delete</button>
                  </div>
                </div>

                {/* Instances */}
                {e.instances && e.instances.length > 0 && (
                  <div className="border-t border-ink/10 pt-3 mt-3">
                    <div className="text-[0.75rem] text-ink-soft uppercase tracking-wider font-semibold mb-2">Upcoming Sessions</div>
                    <div className="flex flex-wrap gap-2">
                      {e.instances.map((inst) => {
                        const remaining = (inst.capacity || e.capacity) - (inst.booked_count || 0);
                        const isFull = remaining <= 0;
                        const isCancelled = inst.status === "cancelled";
                        return (
                          <div
                            key={inst.id}
                            className={`rounded-lg px-3 py-2 text-[0.8rem] border ${
                              isCancelled ? "border-red-200 bg-red-50 opacity-60" : isFull ? "border-orange-200 bg-orange-50" : "border-ink/10 bg-ink/[0.02]"
                            }`}
                          >
                            <div className="font-medium text-ink">
                              {new Date(inst.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {inst.start_time}
                            </div>
                            <div className="text-ink-soft text-[0.75rem]">
                              {isCancelled ? "Cancelled" : isFull ? "Full" : `${remaining} spots left`} · {inst.booked_count || 0} booked
                            </div>
                            {!isCancelled && (
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => cancelInstance(inst)} className="text-[0.7rem] text-orange-600 hover:underline">Cancel</button>
                                <button onClick={() => deleteInstance(inst)} className="text-[0.7rem] text-red-500 hover:underline">Delete</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
