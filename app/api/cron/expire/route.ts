import { NextRequest, NextResponse } from "next/server";
import { expireStalePendingBookings, expireStalePendingEventBookings, expireStalePendingGiftCards } from "@/lib/create-booking";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

// Runs the abandoned-checkout sweep on a schedule (vercel.json cron) —
// also accepts an admin session for manual runs.
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization");
  const cronOk = !!process.env.CRON_SECRET && bearer === `Bearer ${process.env.CRON_SECRET}`;
  const adminToken = req.cookies.get("admin_token")?.value;
  const adminOk = !!adminToken && !!verifyToken(adminToken);
  if (!cronOk && !adminOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await Promise.all([expireStalePendingBookings(), expireStalePendingEventBookings(), expireStalePendingGiftCards()]);
  return NextResponse.json({ success: true });
}
