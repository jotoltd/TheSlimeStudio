import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load env from .env.local
const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
const env = {};
envFile.split("\n").forEach((line) => {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("=== Booking Cleanup Script ===\n");

  // Step 1: Fetch all bookings with stripe_session_id
  const { data: bookings, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, stripe_session_id, created_at, name, date, time_slot, people")
    .not("stripe_session_id", "is", null)
    .order("created_at", { ascending: true });

  if (fetchErr) {
    console.error("Failed to fetch bookings:", fetchErr.message);
    process.exit(1);
  }

  console.log(`Total bookings with stripe_session_id: ${bookings.length}\n`);

  // Step 2: Find duplicates
  const seen = new Map();
  const toDelete = [];
  let duplicateCount = 0;

  for (const b of bookings) {
    const sid = b.stripe_session_id;
    if (!sid || sid.startsWith("manual_")) continue;

    if (seen.has(sid)) {
      toDelete.push(b);
      duplicateCount++;
      const original = seen.get(sid);
      console.log(`DUPLICATE: ${b.name} | ${b.date} @ ${b.time_slot} | ${b.people} ppl`);
      console.log(`  Original:  id=${original.id} created=${original.created_at}`);
      console.log(`  Duplicate: id=${b.id} created=${b.created_at}`);
      console.log(`  stripe_session_id: ${sid}\n`);
    } else {
      seen.set(sid, b);
    }
  }

  if (toDelete.length === 0) {
    console.log("✅ No duplicate bookings found.");
  } else {
    console.log(`Found ${duplicateCount} duplicate(s). Deleting...\n`);

    const { error: deleteErr } = await supabase
      .from("bookings")
      .delete()
      .in("id", toDelete.map((b) => b.id));

    if (deleteErr) {
      console.error("Failed to delete duplicates:", deleteErr.message);
      process.exit(1);
    }

    console.log(`✅ Deleted ${toDelete.length} duplicate booking(s).`);
  }

  // Step 3: Show remaining bookings summary
  const { data: remaining } = await supabase
    .from("bookings")
    .select("id, name, date, time_slot, people, payment_status, stripe_session_id")
    .order("date", { ascending: true });

  console.log(`\n=== Remaining bookings: ${remaining?.length || 0} ===`);
  if (remaining) {
    const byDate = {};
    remaining.forEach((b) => {
      if (!byDate[b.date]) byDate[b.date] = [];
      byDate[b.date].push(b);
    });
    Object.keys(byDate).sort().forEach((date) => {
      const dayBookings = byDate[date];
      const totalPeople = dayBookings.reduce((s, b) => s + b.people, 0);
      console.log(`\n${date} (${totalPeople} people total):`);
      dayBookings.forEach((b) => {
        console.log(`  ${b.time_slot} | ${b.people}ppl | ${b.name} | ${b.payment_status} | ${b.stripe_session_id?.substring(0, 20) || "no-id"}...`);
      });
    });
  }

  console.log("\n=== DONE ===");
  console.log("\n⚠️  IMPORTANT: Now add the unique constraint in Supabase Dashboard → SQL Editor:");
  console.log("   ALTER TABLE bookings ADD CONSTRAINT bookings_stripe_session_id_unique UNIQUE (stripe_session_id);");
}

run().catch(console.error);
