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

  let bookingsMap: Record<string, { count: number; total: number; upcoming: number }> = {};
  let loyaltyMap: Record<string, { stamps: number; rewards: number }> = {};

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
