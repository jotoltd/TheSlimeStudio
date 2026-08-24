import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { getPaymentProvider, clearPaymentProviderCache } from "@/lib/payment";

export const runtime = "nodejs";

export async function GET() {
  const provider = await getPaymentProvider();
  return NextResponse.json({ provider });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await req.json() as { provider: "stripe" | "sumup" };
  if (provider !== "stripe" && provider !== "sumup") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await supabase.from("site_settings").update({ payment_provider: provider }).eq("id", 1);
  clearPaymentProviderCache();

  return NextResponse.json({ success: true, provider });
}
