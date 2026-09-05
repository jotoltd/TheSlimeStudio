"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AccountLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const redirect = searchParams.get("redirect");
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
    if (redirect === "dashboard") {
      fetch("/api/account/me")
        .then((r) => r.json())
        .then((data) => {
          if (data.authenticated) router.push("/account");
        });
    }
  }, [router, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/account/login" : "/api/account/register";
      const body =
        mode === "login"
          ? { email, password }
          : { name, email, phone, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/account");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <section
        className="py-[50px] md:py-[70px] text-center px-4"
        style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}
      >
        <div className="container">
          <h1 className="font-display text-[1.5rem] md:text-[3.2rem] mt-3 mb-3 text-ink">
            {mode === "login" ? "Welcome Back!" : "Create an Account"}
          </h1>
          <p className="text-[0.95rem] md:text-[1.1rem] text-ink/80 max-w-[560px] mx-auto">
            {mode === "login"
              ? "Sign in to manage your bookings and loyalty card."
              : "Join The Slime Studio to earn loyalty stamps and manage your bookings."}
          </p>
        </div>
      </section>

      <section className="section px-4">
        <div className="container max-w-md">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm">
            {/* Tab toggle */}
            <div className="flex gap-2 mb-6 bg-ink/[0.04] rounded-xl p-1">
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === "login"
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === "register"
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                      required
                      className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Phone (optional)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07123 456789"
                      className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Password{mode === "register" ? " (min 8 characters)" : ""}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={mode === "register" ? 8 : undefined}
                  className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
                />
              </div>

              {error && (
                <div className="bg-[#ff2d78]/10 border-2 border-[#ff2d78]/20 rounded-xl p-3 text-center">
                  <p className="text-[0.85rem] text-[#ff2d78]">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                    ? "Sign In"
                    : "Create Account"}
              </button>
            </form>

            {mode === "login" && (
              <p className="text-center text-[0.8rem] text-ink-soft mt-4">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className="text-bright-lavender font-medium hover:underline"
                >
                  Register here
                </button>
              </p>
            )}
            {mode === "register" && (
              <p className="text-center text-[0.8rem] text-ink-soft mt-4">
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="text-bright-lavender font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
