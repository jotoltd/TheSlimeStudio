import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = 50;

  let query = supabaseAdmin
    .from("customers")
    .select("id, name, email, phone, created_at, terms_agreed_at", { count: "exact" });

  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  query = query.order("created_at", { ascending: false }).range((page - 1) * perPage, page * perPage - 1);

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const customerEmails = (data || []).map((c) => c.email);

  const bookingsMap: Record<string, { count: number; total: number; upcoming: number }> = {};
  const loyaltyMap: Record<string, { stamps: number; rewards: number }> = {};

  if (customerEmails.length > 0) {
    const [{ data: bookings }, { data: loyalty }] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select("email, people, total_price, date, payment_status")
        .in("email", customerEmails)
        .eq("payment_status", "paid"),
      supabaseAdmin
        .from("loyalty_cards")
        .select("email, stamps, rewards_earned, rewards_redeemed")
        .in("email", customerEmails),
    ]);

    const todayStr = new Date().toISOString().split("T")[0];
    (bookings || []).forEach((b) => {
      const existing = bookingsMap[b.email] || { count: 0, total: 0, upcoming: 0 };
      existing.count += 1;
      existing.total += Number(b.total_price);
      if (b.date >= todayStr) existing.upcoming += 1;
      bookingsMap[b.email] = existing;
    });

    (loyalty || []).forEach((l) => {
      loyaltyMap[l.email] = {
        stamps: l.stamps,
        rewards: (l.rewards_earned || 0) - (l.rewards_redeemed || 0),
      };
    });
  }

  const customers = (data || []).map((c) => ({
    ...c,
    bookingCount: bookingsMap[c.email]?.count || 0,
    totalSpent: bookingsMap[c.email]?.total || 0,
    upcomingBookings: bookingsMap[c.email]?.upcoming || 0,
    loyaltyStamps: loyaltyMap[c.email]?.stamps || 0,
    loyaltyRewards: loyaltyMap[c.email]?.rewards || 0,
  }));

  // Fetch full booking history for a specific customer if requested
  const customerEmail = searchParams.get("email");
  if (customerEmail) {
    const { data: customerBookings } = await supabaseAdmin
      .from("bookings")
      .select("id, date, time_slot, people, total_price, payment_status, is_party, created_at")
      .eq("email", customerEmail)
      .order("date", { ascending: false });

    return NextResponse.json({
      customers,
      total: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage),
      bookings: customerBookings || [],
    });
  }

  return NextResponse.json({
    customers,
    total: count || 0,
    page,
    perPage,
    totalPages: Math.ceil((count || 0) / perPage),
  });
}

// DELETE /api/admin/customers?id=...&email=... — GDPR erasure. Deletes the
// customer account and loyalty/subscriber/waitlist rows, and anonymises
// personal details everywhere else they can appear: bookings, orders, gift
// cards, enquiries, special event bookings and the email log (financial
// records are kept for accounting, minus the identifying fields).
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  if (!id || !email) {
    return NextResponse.json({ error: "Missing id or email" }, { status: 400 });
  }

  const anonEmail = `deleted-${id.slice(0, 8)}@removed.invalid`;

  // Emails are stored with whatever casing the customer typed, so match
  // case-insensitively. Escape LIKE wildcards — _ and % are legal in email
  // local parts and would otherwise match other people's rows.
  const emailLike = email.replace(/[\\%_]/g, (c) => `\\${c}`);

  // Anonymise PII on records we retain for accounting/analytics
  const { error: bkErr } = await supabaseAdmin
    .from("bookings")
    .update({ name: "[deleted]", email: anonEmail, phone: null, notes: null })
    .ilike("email", emailLike);
  if (bkErr) console.error("GDPR: bookings anonymise failed:", bkErr);

  const { error: ordErr } = await supabaseAdmin
    .from("shop_orders")
    .update({
      customer_name: "[deleted]",
      customer_email: anonEmail,
      customer_phone: null,
      shipping_address: null,
      shipping_city: null,
      shipping_postcode: null,
      notes: null,
    })
    .ilike("customer_email", emailLike);
  if (ordErr) console.error("GDPR: orders anonymise failed:", ordErr);

  const { error: gcPurchErr } = await supabaseAdmin
    .from("gift_cards")
    .update({ purchaser_email: anonEmail, purchaser_name: "[deleted]", message: null })
    .ilike("purchaser_email", emailLike);
  if (gcPurchErr) console.error("GDPR: gift cards (purchaser) anonymise failed:", gcPurchErr);
  const { error: gcRecipErr } = await supabaseAdmin
    .from("gift_cards")
    .update({ recipient_email: anonEmail, recipient_name: "[deleted]" })
    .ilike("recipient_email", emailLike);
  if (gcRecipErr) console.error("GDPR: gift cards (recipient) anonymise failed:", gcRecipErr);

  const { error: enqErr } = await supabaseAdmin
    .from("enquiries")
    .update({ name: "[deleted]", email: anonEmail, phone: null, message: null })
    .ilike("email", emailLike);
  if (enqErr) console.error("GDPR: enquiries anonymise failed:", enqErr);

  const { error: evtErr } = await supabaseAdmin
    .from("special_event_bookings")
    .update({ name: "[deleted]", email: anonEmail, phone: null, customer_id: null })
    .ilike("email", emailLike);
  if (evtErr) console.error("GDPR: event bookings anonymise failed:", evtErr);

  // Sent-mail log rows key off the recipient; subjects can also embed the
  // person's name (e.g. "X sent you a gift card"), so clear both.
  const { error: logErr } = await supabaseAdmin
    .from("email_logs")
    .update({ recipient: anonEmail, subject: "[personal data removed]" })
    .ilike("recipient", emailLike);
  if (logErr) console.error("GDPR: email log anonymise failed:", logErr);

  // Delete rows that exist purely to serve this person
  await supabaseAdmin.from("loyalty_cards").delete().ilike("email", emailLike);
  await supabaseAdmin.from("subscribers").delete().ilike("email", emailLike);
  await supabaseAdmin.from("waitlist").delete().ilike("email", emailLike);

  const { error: custErr } = await supabaseAdmin.from("customers").delete().eq("id", id);
  if (custErr) {
    return NextResponse.json({ error: "Failed to delete customer record" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
