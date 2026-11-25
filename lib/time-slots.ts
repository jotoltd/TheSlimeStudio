// Time-slot helpers shared by the public checkout routes and the customer
// reschedule route. Admin manual bookings are exempt — they may use any
// valid HH:MM time, including out-of-hours.

export const TIME_SLOT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeSlot(slot: unknown): slot is string {
  return typeof slot === "string" && TIME_SLOT_RE.test(slot.trim());
}

export function isValidDateString(date: unknown): date is string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date + "T00:00:00");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

// The slot one hour after `slot`, preserving minutes (18:30 → 19:30).
// Returns null when the result would fall on the next day (23:xx starts).
export function nextHourSlot(slot: string): string | null {
  const [h, m] = slot.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const total = h * 60 + m + 60;
  if (total >= 24 * 60) return null;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// The hour after `slot` on `date`, preserving minutes. Wraps past midnight
// into the next calendar day (23:30 on the 5th → 00:30 on the 6th).
// Returns null on invalid input.
export function nextHourSlotWithDate(date: string, slot: string): { date: string; slot: string } | null {
  if (!isValidDateString(date) || !isValidTimeSlot(slot)) return null;
  const [h, m] = slot.split(":").map(Number);
  const total = h * 60 + m + 60;
  const d = new Date(date + "T00:00:00");
  if (total >= 24 * 60) d.setDate(d.getDate() + 1);
  const mins = total % (24 * 60);
  const nextDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { date: nextDate, slot: `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}` };
}
