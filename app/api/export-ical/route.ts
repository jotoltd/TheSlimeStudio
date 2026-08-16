import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

function escapeICal(text: string): string {
  return text.replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .neq("payment_status", "refunded")
    .order("date", { ascending: true })
    .order("time_slot", { ascending: true });

  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  let ical = "BEGIN:VCALENDAR\r\n";
  ical += "VERSION:2.0\r\n";
  ical += "PRODID:-//The Slime Studio//Booking Calendar//EN\r\n";
  ical += "CALSCALE:GREGORIAN\r\n";
  ical += "METHOD:PUBLISH\r\n";

  for (const b of bookings || []) {
    const [h, m] = b.time_slot.split(":").map(Number);
    const start = new Date(`${b.date}T00:00:00`);
    start.setHours(h, m, 0, 0);
    const end = new Date(start);
    end.setHours(h + 1, m, 0, 0);

    const dtStart = start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const dtEnd = end.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    ical += "BEGIN:VEVENT\r\n";
    ical += `UID:${b.id}@theslimestudio.co.uk\r\n`;
    ical += `DTSTAMP:${now}\r\n`;
    ical += `DTSTART:${dtStart}\r\n`;
    ical += `DTEND:${dtEnd}\r\n`;
    ical += `SUMMARY:${escapeICal(`${b.is_party ? "Party" : "Booking"} — ${b.name} (${b.people} ppl)`)}\r\n`;
    let desc = `Name: ${b.name}\nPeople: ${b.people}\nPayment: ${b.payment_status || "unknown"}`;
    if (b.email) desc += `\nEmail: ${b.email}`;
    if (b.phone) desc += `\nPhone: ${b.phone}`;
    if (b.notes) desc += `\nNotes: ${b.notes}`;
    ical += `DESCRIPTION:${escapeICal(desc)}\r\n`;
    ical += `STATUS:CONFIRMED\r\n`;
    ical += "END:VEVENT\r\n";
  }

  ical += "END:VCALENDAR\r\n";

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=slime-studio-bookings.ics",
    },
  });
}
