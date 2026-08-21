"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "🏠" },
      { href: "/dashboard/revenue", label: "Revenue", icon: "💰" },
    ],
  },
  {
    label: "Bookings",
    items: [
      { href: "/dashboard/bookings", label: "Bookings", icon: "📅" },
      { href: "/dashboard/opening-hours", label: "Opening Hours", icon: "🕐" },
    ],
  },
  {
    label: "Shop & Customers",
    items: [
      { href: "/dashboard/shop", label: "Shop", icon: "🛍️" },
      { href: "/dashboard/subscribers", label: "Subscribers", icon: "📦" },
      { href: "/dashboard/enquiries", label: "Enquiries", icon: "✉️" },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
      { href: "/dashboard/content", label: "Content", icon: "�" },
      { href: "/dashboard/email-logs", label: "Email Logs", icon: "�" },
      { href: "/dashboard/export", label: "Export Data", icon: "📤" },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/session").then(async (res) => {
      if (!res.ok) {
        router.push("/admin");
      } else {
        const data = await res.json();
        setAdminName(data.name || "Admin");
        setAuthed(true);
      }
    });
  }, [router]);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/admin");
  }

  if (!authed) {
    return (
      <div className="min-h-screen grid place-items-center bg-cream text-ink-soft">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream md:flex">
      {/* Mobile top bar */}
      <div className="md:hidden bg-ink flex items-center justify-between px-5 py-4 sticky top-0 z-50">
        <Link href="/dashboard" className="font-display text-[1.1rem] text-white">
          The Slime Studio
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 rounded-full bg-white/15 text-white grid place-items-center"
          aria-label="Toggle menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`bg-ink md:w-64 md:flex-shrink-0 md:min-h-screen md:flex md:flex-col md:sticky md:top-0 fixed inset-x-0 top-[57px] bottom-0 z-40 overflow-y-auto md:static md:top-0 ${
          mobileOpen ? "block" : "hidden md:flex"
        }`}
      >
        <div className="hidden md:block px-7 py-8">
          <h1 className="font-display text-[1.3rem] text-white leading-tight">The Slime Studio</h1>
          <p className="text-[0.8rem] text-white/70 mt-1">Admin Panel</p>
        </div>

        <nav className="px-4 py-4 md:py-0 flex-1 overflow-y-auto">
          {navSections.map((section, si) => (
            <div key={section.label} className={si > 0 ? "mt-5" : ""}>
              <div className="px-4 mb-1.5 text-[0.65rem] uppercase tracking-wider text-white/40 font-medium">{section.label}</div>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.9rem] font-medium transition-all ${
                          active ? "bg-white text-ink shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-4 md:px-4 pb-6 md:pb-8">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-white grid place-items-center font-display text-sm text-ink">L</div>
            <div>
              <div className="text-[0.85rem] font-medium text-white">{adminName}</div>
              <div className="text-[0.7rem] text-white/60">Studio Owner</div>
            </div>
          </div>
          <a
            href="/"
            className="block w-full px-4 py-2.5 rounded-xl bg-white/15 text-white text-[0.85rem] text-center hover:bg-white/25 transition-colors mb-2"
          >
            Preview Website
          </a>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2.5 rounded-xl bg-white/15 text-white text-[0.85rem] hover:bg-white/25 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
