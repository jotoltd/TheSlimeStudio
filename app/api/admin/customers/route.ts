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
// customer account and loyalty/subscriber rows, and anonymises personal
// details on their bookings, orders and gift cards (financial records are
// kept for accounting, minus the identifying fields).
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

  // Anonymise PII on records we retain for accounting/analytics
  const { error: bkErr } = await supabaseAdmin
    .from("bookings")
    .update({ name: "[deleted]", email: anonEmail, phone: null, notes: null })
    .eq("email", email);
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
    .eq("customer_email", email);
  if (ordErr) console.error("GDPR: orders anonymise failed:", ordErr);

  const { error: gcPurchErr } = await supabaseAdmin
    .from("gift_cards")
    .update({ purchaser_email: anonEmail, purchaser_name: "[deleted]", message: null })
    .eq("purchaser_email", email);
  if (gcPurchErr) console.error("GDPR: gift cards (purchaser) anonymise failed:", gcPurchErr);
  const { error: gcRecipErr } = await supabaseAdmin
    .from("gift_cards")
    .update({ recipient_email: anonEmail, recipient_name: "[deleted]" })
    .eq("recipient_email", email);
  if (gcRecipErr) console.error("GDPR: gift cards (recipient) anonymise failed:", gcRecipErr);

  // Delete rows that exist purely to serve this person
  await supabaseAdmin.from("loyalty_cards").delete().eq("email", email);
  await supabaseAdmin.from("subscribers").delete().eq("email", email);
  await supabaseAdmin.from("waitlist").delete().eq("email", email);

  const { error: custErr } = await supabaseAdmin.from("customers").delete().eq("id", id);
  if (custErr) {
    return NextResponse.json({ error: "Failed to delete customer record" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
