import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { getResend, EMAIL_FROM, cancellationHtml, logEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Verify admin auth
  const token = req.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await req.json();
  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });
  }

  // Fetch booking details before deleting (try admin first, then anon)
  let booking: Record<string, unknown> | null = null;
  const { data: adminData } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (adminData) {
    booking = adminData;
  } else {
    const { data: anonData } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();
    booking = anonData;
  }

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Delete the booking — try admin (service role) first, then anon
  let deleteError: { message: string } | null = null;
  const { error: adminErr } = await supabaseAdmin
    .from("bookings")
    .delete()
    .eq("id", bookingId);
  if (adminErr) {
    // Fallback to anon client (works if RLS policy allows anon delete)
    const { error: anonErr } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);
    deleteError = anonErr;
  }

  if (deleteError) {
    return NextResponse.json({
      error: "Failed to cancel booking. You need to run this SQL in your Supabase SQL Editor:\n\n" +
        "drop policy if exists \"Anon can delete bookings\" on public.bookings;\n" +
        "create policy \"Anon can delete bookings\" on public.bookings for delete to anon using (true);"
    }, { status: 500 });
  }

  // Send cancellation email
  const b = booking as { email?: string; name?: string; date?: string; time_slot?: string; people?: number; is_party?: boolean };
  if (b.email) {
    try {
      const r = getResend();
      if (r) {
        await r.emails.send({
          from: EMAIL_FROM,
          to: b.email,
          subject: "Your Booking Has Been Cancelled — The Slime Studio",
          html: cancellationHtml({
            name: b.name || "",
            date: b.date || "",
            timeSlot: b.time_slot || "",
            people: b.people || 0,
            isParty: b.is_party,
          }),
        });
        await logEmail(b.email, "Booking Cancelled — The Slime Studio", "cancellation", "sent");
      }
    } catch (e) {
      console.error("Failed to send cancellation email:", e);
      if (b.email) await logEmail(b.email, "Booking Cancelled — The Slime Studio", "cancellation", "failed");
    }
  }

  return NextResponse.json({ success: true });
}
