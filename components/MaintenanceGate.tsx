"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase, type SiteSettings } from "@/lib/supabase";

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function tick() {
      const diff = Math.max(0, target.getTime() - Date.now());
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return timeLeft;
}

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [inMaintenance, setInMaintenance] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [launchDate, setLaunchDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const countdown = useCountdown(launchDate);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api") || pathname.startsWith("/dashboard")) {
      setChecked(true);
      return;
    }

    Promise.all([
      supabase.from("site_settings").select("*").eq("id", 1).single(),
      fetch("/api/session").then((res) => (res.ok ? res.json() : null)),
    ]).then(([{ data }, session]) => {
      if (data) {
        const s = data as SiteSettings;
        setInMaintenance(s.maintenance_mode);
        setLaunchDate(new Date(s.launch_date));
      }
      setIsAdmin(!!session?.authenticated);
      setChecked(true);
    });
  }, [pathname]);

  if (!checked) {
    return <div className="min-h-screen grid place-items-center bg-cream text-ink-soft">Loading...</div>;
  }

  if (!inMaintenance) {
    return <>{children}</>;
  }

  if (isAdmin) {
    return (
      <>
        <div className="bg-red-400 text-white text-center text-[0.8rem] py-2 px-4 sticky top-0 z-[2000]">
          🔧 Maintenance mode is ON for visitors — you're viewing the live site as admin.{" "}
          <a href="/dashboard" className="underline font-medium">Go to dashboard</a>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 text-center" style={{ background: "linear-gradient(135deg, #abf7dc 0%, #ffc4fb 100%)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-5xl mb-6">🫧✨🫧</div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-[#64d8ec] text-2xl">↝</span>
          <h2 className="font-display text-[1.3rem] tracking-wide text-[#64d8ec] uppercase">The Slime Studio</h2>
          <span className="text-[#64d8ec] text-2xl">↜</span>
        </div>
        <h1 className="font-display text-[2.4rem] md:text-[3.4rem] leading-[1.1] mb-4 text-ink">
          We&apos;ll Be Back Soon!
        </h1>
        <p className="text-[1.1rem] text-ink/75 mb-10 max-w-[480px] mx-auto">
          We&apos;re sprucing up the studio and adding something extra slimy. Check back soon!
        </p>

        <div className="flex gap-3 md:gap-5 justify-center mb-10">
          {[
            { label: "Days", value: countdown.days },
            { label: "Hours", value: countdown.hours },
            { label: "Minutes", value: countdown.minutes },
            { label: "Seconds", value: countdown.seconds },
          ].map((u) => (
            <div key={u.label} className="bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-5 md:px-7 md:py-6 min-w-[80px] md:min-w-[100px]">
              <div className="font-display text-[1.8rem] md:text-[2.4rem] text-ink leading-none">
                {String(u.value).padStart(2, "0")}
              </div>
              <div className="text-[0.7rem] md:text-[0.8rem] text-ink/60 uppercase tracking-wider mt-2">{u.label}</div>
            </div>
          ))}
        </div>

        <div className="inline-block bg-white/50 backdrop-blur-sm rounded-full px-6 py-3 text-[0.9rem] text-ink/80">
          ✨ Something slimy is on the way ✨
        </div>

        <div className="mt-10">
          <a href="/admin" className="text-[0.8rem] text-ink/40 hover:text-ink/70 transition-colors">Admin Login</a>
        </div>
      </div>
    </div>
  );
}
