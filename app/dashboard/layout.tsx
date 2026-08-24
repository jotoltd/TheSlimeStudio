"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ToastProvider } from "@/components/Toast";
import {
  HomeIcon, DollarIcon, CalendarIcon, ClockIcon, ShoppingBagIcon,
  PackageIcon, MailIcon, UsersIcon, SettingsIcon, FileTextIcon,
  InboxIcon, DownloadIcon, GiftIcon, PhotoIcon,
} from "@/components/AdminIcons";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
      { href: "/dashboard/revenue", label: "Revenue", Icon: DollarIcon },
    ],
  },
  {
    label: "Bookings",
    items: [
      { href: "/dashboard/bookings", label: "Bookings", Icon: CalendarIcon },
      { href: "/dashboard/opening-hours", label: "Opening Hours", Icon: ClockIcon },
    ],
  },
  {
    label: "Shop & Customers",
    items: [
      { href: "/dashboard/shop", label: "Shop", Icon: ShoppingBagIcon },
      { href: "/dashboard/orders", label: "Orders", Icon: PackageIcon },
      { href: "/dashboard/subscribers", label: "Subscribers", Icon: UsersIcon },
      { href: "/dashboard/loyalty", label: "Loyalty", Icon: GiftIcon },
      { href: "/dashboard/gallery", label: "Gallery", Icon: PhotoIcon },
      { href: "/dashboard/enquiries", label: "Enquiries", Icon: MailIcon },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/dashboard/settings", label: "Settings", Icon: SettingsIcon },
      { href: "/dashboard/content", label: "Content", Icon: FileTextIcon },
      { href: "/dashboard/email-logs", label: "Email Logs", Icon: InboxIcon },
      { href: "/dashboard/export", label: "Export Data", Icon: DownloadIcon },
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

  const initials = adminName.charAt(0).toUpperCase();

  if (!authed) {
    return (
      <div className="min-h-screen grid place-items-center bg-cream text-ink-soft">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-ink/20 border-t-bright-lavender rounded-full animate-spin" />
          <span className="text-[0.9rem]">Loading admin panel...</span>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-cream md:flex">
        {/* Mobile top bar */}
        <div className="md:hidden bg-ink flex items-center justify-between px-5 py-3.5 sticky top-0 z-50">
          <Link href="/dashboard" className="font-display text-[1.1rem] text-white">
            Slime Studio
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 rounded-full bg-white/15 text-white grid place-items-center transition-colors hover:bg-white/25"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            )}
          </button>
        </div>

        {/* Sidebar */}
        <aside
          className={`bg-ink md:w-64 md:flex-shrink-0 md:min-h-screen md:flex md:flex-col md:sticky md:top-0 fixed inset-x-0 top-[53px] bottom-0 z-40 overflow-y-auto md:static md:top-0 transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          {/* Desktop header */}
          <div className="hidden md:block px-6 py-7">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-bright-lavender to-sky-blue-light grid place-items-center text-white font-display text-[0.9rem]">
                S
              </div>
              <div>
                <h1 className="font-display text-[1.15rem] text-white leading-tight">Slime Studio</h1>
                <p className="text-[0.7rem] text-white/50 mt-0.5">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-3 py-4 md:py-0 flex-1 overflow-y-auto">
            {navSections.map((section, si) => (
              <div key={section.label} className={si > 0 ? "mt-5" : ""}>
                <div className="px-4 mb-1.5 text-[0.65rem] uppercase tracking-wider text-white/35 font-semibold">{section.label}</div>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = pathname === item.href;
                    const { Icon } = item;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.88rem] font-medium transition-all ${
                            active ? "bg-white text-ink shadow-sm" : "text-white/65 hover:bg-white/8 hover:text-white"
                          }`}
                        >
                          <Icon size={18} className={active ? "text-ink" : "text-white/50"} />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* User + actions */}
          <div className="px-3 pb-5 md:pb-6 pt-4 border-t border-white/8 md:border-0">
            <div className="flex items-center gap-3 px-4 py-2.5 mb-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-bright-lavender to-sky-blue-light grid place-items-center font-display text-sm text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-[0.85rem] font-medium text-white truncate">{adminName}</div>
                <div className="text-[0.7rem] text-white/50">Studio Owner</div>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="/"
                className="flex-1 px-3 py-2.5 rounded-xl bg-white/10 text-white text-[0.8rem] text-center hover:bg-white/20 transition-colors"
              >
                View Site
              </a>
              <button
                onClick={handleLogout}
                className="flex-1 px-3 py-2.5 rounded-xl bg-white/10 text-white text-[0.8rem] hover:bg-white/20 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-ink/30 z-30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </ToastProvider>
  );
}
