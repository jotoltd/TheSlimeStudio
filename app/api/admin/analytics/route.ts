import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { ga4Analytics } from "@/lib/google-analytics";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = req.nextUrl.searchParams.get("range") || "30d";
  const days = range === "today" ? 1 : range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const now = new Date();
  const until = fmt(now);
  const since = fmt(new Date(now.getTime() - (days - 1) * 86400000));

  const analytics = await ga4Analytics(since, until);
  return NextResponse.json({ range: { key: range, since, until }, analytics });
}
