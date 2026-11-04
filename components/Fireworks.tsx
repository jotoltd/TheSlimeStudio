"use client";

import { useEffect, useRef } from "react";

// Bonfire Night overlay — live until the end of Nov 5th, then it renders
// nothing and can be removed in a later cleanup. Canvas particles (rockets +
// bursts), pointer-events none, honours prefers-reduced-motion.
const SHOW_UNTIL = new Date("2026-11-06T00:00:00");

type Particle = {
  x: number; y: number;
  px: number; py: number;
  vx: number; vy: number;
  alpha: number;
  decay: number;
  hue: number;
  flicker: number;
};

type Rocket = {
  x: number; y: number;
  vy: number;
  targetY: number;
  hue: number;
};

const HUES = [45, 15, 355, 200, 130, 275, 35]; // gold, orange, red, blue, green, violet

export default function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (Date.now() >= SHOW_UNTIL.getTime()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rockets: Rocket[] = [];
    const particles: Particle[] = [];
    const isSmall = w < 768;
    const MAX_ROCKETS = isSmall ? 2 : 3;
    const BURST_COUNT = isSmall ? 46 : 72;

    const explode = (x: number, y: number, hue: number) => {
      for (let i = 0; i < BURST_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / BURST_COUNT + (Math.random() - 0.5) * 0.3;
        const speed = 1.2 + Math.random() * 3.4;
        particles.push({
          x, y, px: x, py: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: 0.008 + Math.random() * 0.012,
          hue: hue + (Math.random() - 0.5) * 30,
          flicker: Math.random() * Math.PI * 2,
        });
      }
      // A few slow willow-style trails that hang and droop
      for (let i = 0; i < BURST_COUNT / 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.4 + Math.random() * 1.2;
        particles.push({
          x, y, px: x, py: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: 0.004 + Math.random() * 0.006,
          hue: 45,
          flicker: Math.random() * Math.PI * 2,
        });
      }
    };

    const launch = () => {
      if (rockets.length >= MAX_ROCKETS) return;
      rockets.push({
        x: w * 0.1 + Math.random() * w * 0.8,
        y: h,
        vy: -(6 + Math.random() * 2.5),
        // Bursts stay in the top ~65% so they never cover forms/buttons
        targetY: h * 0.12 + Math.random() * h * 0.4,
        hue: HUES[Math.floor(Math.random() * HUES.length)],
      });
    };

    // Stagger the first rockets so it doesn't look mechanical
    launch();
    let nextLaunch = 600 + Math.random() * 1200;
    let last = performance.now();
    let raf = 0;
    let running = true;

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min(now - last, 50);
      last = now;
      nextLaunch -= dt;
      if (nextLaunch <= 0) {
        launch();
        nextLaunch = 1100 + Math.random() * 1600;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      // Rockets rise with a faint trail
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy * (dt / 16.7);
        r.vy *= 0.996;
        ctx.strokeStyle = `hsla(${r.hue}, 90%, 70%, 0.55)`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y + 14);
        ctx.lineTo(r.x, r.y);
        ctx.stroke();
        if (r.y <= r.targetY) {
          explode(r.x, r.y, r.hue);
          rockets.splice(i, 1);
        }
      }

      // Particles: gravity + fade + flicker, drawn as streaks
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.px = p.x;
        p.py = p.y;
        const step = dt / 16.7;
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.vy += 0.045 * step; // gravity
        p.vx *= 0.985;
        p.alpha -= p.decay * step;
        p.flicker += 0.3 * step;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        const tw = 0.7 + 0.3 * Math.sin(p.flicker);
        ctx.strokeStyle = `hsla(${p.hue}, 100%, 65%, ${(p.alpha * tw).toFixed(3)})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (Date.now() >= SHOW_UNTIL.getTime()) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5,
        pointerEvents: "none",
        opacity: 0.9,
      }}
    />
  );
}
