// In-memory fixed-window rate limiter for public API routes. Per-instance on
// serverless (like the admin login throttle) — imperfect but raises the cost
// of brute-force/guessing attacks from free to impractical.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimited(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 5000) {
    buckets.forEach((v, k) => { if (now > v.resetAt) buckets.delete(k); });
  }
  const rec = buckets.get(key);
  if (!rec || now > rec.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  rec.count += 1;
  return rec.count > maxAttempts;
}

export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
