"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/session").then((res) => {
      if (res.ok) router.push("/dashboard");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      setError("Invalid username or password. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
      <div className="bg-white rounded-3xl shadow-lg p-12 max-w-md w-full text-center">
        <h1 className="font-display text-3xl mb-2">Admin Login</h1>
        <p className="text-ink-soft text-sm mb-8">Sign in to manage The Slime Studio</p>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm rounded-xl p-3 mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="text-left">
          <div className="mb-5">
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="lara"
              required
              className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full px-4 py-3 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-sky-blue-light text-ink font-display text-lg disabled:opacity-60 transition-transform hover:-translate-y-0.5 hover:shadow-md"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <a href="/" className="inline-block mt-6 text-sm text-ink-soft hover:text-ink">
          &larr; Back to website
        </a>
      </div>
    </div>
  );
}
