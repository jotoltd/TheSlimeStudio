import { NextRequest, NextResponse } from "next/server";
import { sendPush } from "@/lib/apns";
import { verifyToken } from "@/lib/auth";
import { rateLimited, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Sends a fixed test push to a given device token. Admin-only — without auth
// this was a free relay for pushing arbitrary notifications to any device.
export async function POST(req: NextRequest) {
  const adminToken = req.cookies.get("admin_token")?.value;
  if (!adminToken || !verifyToken(adminToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (rateLimited(`push-test:${clientIp(req)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = String(body.token || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const result = await sendPush(token, {
    title: "Slime Studio test",
    body: "Push notifications are working!",
    data: { kind: "test" },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || result.reason || "Push failed", status: result.status },
      { status: result.status && result.status >= 400 && result.status < 600 ? result.status : 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
