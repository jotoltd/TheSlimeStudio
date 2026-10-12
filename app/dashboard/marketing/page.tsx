"use client";

import { useEffect, useRef, useState } from "react";

type AdSize = { id: string; label: string; use: string; w: number; h: number };
type Template = {
  id: string;
  name: string;
  headline: string;
  sub: string;
  badge: string;
  cta: string;
  image: string;
  overlay: "dark" | "pink" | "purple" | "orange";
  adCopy: { primary: string; headline: string };
};

const SIZES: AdSize[] = [
  { id: "square", label: "Square 1:1", use: "Facebook & Instagram feed", w: 1080, h: 1080 },
  { id: "story", label: "Story 9:16", use: "Stories & Reels", w: 1080, h: 1920 },
  { id: "landscape", label: "Wide 1.91:1", use: "Link ads & Facebook feed", w: 1200, h: 628 },
];

const PHOTOS = [
  { id: "pink_stretch", label: "Pink slime stretch", src: "/images/pink_slime_stretch.jpg.jpeg" },
  { id: "pink_action", label: "Pink slime in hands", src: "/images/pink_slime_action.jpg.jpeg" },
  { id: "teal", label: "Teal slime", src: "/images/slime_studio_teal_slime.jpg.jpeg" },
  { id: "pink_pot", label: "Pink slime pot", src: "/images/slime_studio_pink_slime_pot.jpg.jpeg" },
  { id: "toppings", label: "Slime toppings", src: "/images/slime_studio_slime_toppings.jpg.jpeg" },
  { id: "mixing", label: "Mixing slime", src: "/images/slime_mixing.jpg.jpeg" },
  { id: "beads", label: "Foam beads", src: "/images/foam_beads.jpg.jpeg" },
  { id: "blue_close", label: "Blue slime close-up", src: "/images/blue_slime_closeup.jpg.jpeg" },
  { id: "purple_done", label: "Finished purple slime", src: "/images/purple_finished_slime.jpg.jpeg" },
];

const TEMPLATES: Template[] = [
  {
    id: "session",
    name: "Book a Session",
    headline: "MAKE YOUR\nOWN SLIME",
    sub: "1-hour slime making sessions",
    badge: "FROM £15",
    cta: "Book now",
    image: "pink_stretch",
    overlay: "pink",
    adCopy: {
      primary: "The kids activity they actually beg to come back to. 🌈\n\nBook a 1-hour slime making session at The Slime Studio in Holt — pick your colour, mix your slime, add your toppings and take it home.\n\nWeekend & school holiday slots fill fast — grab yours 👇",
      headline: "Slime Making Sessions — Book Now",
    },
  },
  {
    id: "halloween",
    name: "Halloween Sessions",
    headline: "HALLOWEEN\nSLIME SESSIONS",
    sub: "October half term · spooky slime fun",
    badge: "OCT 26–31",
    cta: "Book a spooky slot",
    image: "purple_done",
    overlay: "purple",
    adCopy: {
      primary: "Something spooky is coming to Holt this half term… 🎃\n\nHalloween Slime Sessions at The Slime Studio — make your own creepy slime creation and take it home. Fancy dress welcome!\n\nOct 26–31 only. Limited spots per session 👇",
      headline: "Halloween Slime Sessions — Half Term",
    },
  },
  {
    id: "giftcards",
    name: "Gift Cards",
    headline: "THE PERFECT\nSTOCKING FILLER",
    sub: "Slime Studio gift cards",
    badge: "FROM £15",
    cta: "Buy a gift card",
    image: "pink_pot",
    overlay: "pink",
    adCopy: {
      primary: "Stuck for a Christmas gift they'll actually love? 🎁\n\nA Slime Studio gift card = an hour of slime making fun they'll never forget. Delivered instantly by email — no wrapping required.\n\nFrom just £15 👇",
      headline: "Slime Studio Gift Cards — From £15",
    },
  },
  {
    id: "parties",
    name: "Birthday Parties",
    headline: "SLIME\nBIRTHDAY PARTIES",
    sub: "The party they'll never forget",
    badge: "AGES 4+",
    cta: "Plan their party",
    image: "toppings",
    overlay: "purple",
    adCopy: {
      primary: "Planning a birthday party? 🎉\n\nOur slime parties are legendary — every child makes their own slime masterpiece to take home. We handle the mess, you take the credit.\n\nNorfolk's most talked-about kids party 👇",
      headline: "Slime Birthday Parties — Book Now",
    },
  },
  {
    id: "preschool",
    name: "Pre-School Sessions",
    headline: "LITTLE HANDS,\nBIG FUN",
    sub: "Pre-school slime sessions · Tuesday mornings",
    badge: "£7.50",
    cta: "Book a spot",
    image: "beads",
    overlay: "dark",
    adCopy: {
      primary: "Tuesday mornings just got better 💕\n\nOur pre-school slime sessions are perfect for little ones — squish, stretch and explore in a relaxed session made for tiny hands. Ages 3+, and they take their slime home!\n\nJust £7.50 per child 👇",
      headline: "Pre-School Slime Sessions — £7.50",
    },
  },
];

const OVERLAY_GRADIENTS: Record<Template["overlay"], [string, string]> = {
  pink: ["rgba(236,72,153,0)", "rgba(157,23,77,0.88)"],
  purple: ["rgba(124,58,237,0.05)", "rgba(46,16,101,0.9)"],
  orange: ["rgba(0,0,0,0)", "rgba(67,20,7,0.9)"],
  dark: ["rgba(0,0,0,0.05)", "rgba(15,10,30,0.88)"],
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function findPoppins(): string {
  const fams: string[] = [];
  document.fonts.forEach((f) => fams.push(f.family));
  return fams.find((f) => /poppins/i.test(f)) || "sans-serif";
}

export default function MarketingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tplId, setTplId] = useState("session");
  const [sizeId, setSizeId] = useState("square");
  const [imgId, setImgId] = useState(TEMPLATES[0].image);
  const [copied, setCopied] = useState("");
  const tpl = TEMPLATES.find((t) => t.id === tplId)!;
  const size = SIZES.find((s) => s.id === sizeId)!;
  const photo = PHOTOS.find((p) => p.id === imgId)!;

  function pickTemplate(id: string) {
    setTplId(id);
    setImgId(TEMPLATES.find((t) => t.id === id)!.image);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { w, h } = size;
      canvas.width = w;
      canvas.height = h;

      const family = findPoppins();
      await Promise.all([
        document.fonts.load(`700 100px ${family}`).catch(() => {}),
        document.fonts.load(`600 40px ${family}`).catch(() => {}),
      ]);
      if (cancelled) return;

      const [bg, logo] = await Promise.all([loadImage(photo.src), loadImage("/images/logo.png")]);
      if (cancelled) return;

      // Background — cover crop
      const scale = Math.max(w / bg.width, h / bg.height);
      const bw = bg.width * scale;
      const bh = bg.height * scale;
      ctx.drawImage(bg, (w - bw) / 2, (h - bh) / 2, bw, bh);

      const u = w / 1080; // scale unit
      const story = h / w > 1.4;
      const wide = w / h > 1.4;

      // Gradient overlay — from the left on wide ads, bottom-weighted otherwise
      const [gTop, gBot] = OVERLAY_GRADIENTS[tpl.overlay];
      const grad = wide
        ? ctx.createLinearGradient(0, 0, w * 0.75, 0)
        : ctx.createLinearGradient(0, h * 0.35, 0, h);
      if (wide) {
        grad.addColorStop(0, gBot);
        grad.addColorStop(1, gTop);
      } else {
        grad.addColorStop(0, gTop);
        grad.addColorStop(1, gBot);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const tx = wide ? 80 * u : w / 2; // text anchor
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.35)";

      // Logo — centered on square/story, top-right on wide
      ctx.shadowBlur = 0;
      if (wide) {
        const logoH = 150 * u;
        const logoW = (logo.width / logo.height) * logoH;
        ctx.drawImage(logo, w - logoW - 50 * u, 40 * u, logoW, logoH);
      } else {
        const logoW = story ? 400 * u : 360 * u;
        const logoH = (logo.height / logo.width) * logoW;
        ctx.drawImage(logo, (w - logoW) / 2, story ? 120 * u : 70 * u, logoW, logoH);
      }

      // Vertical stack: badge -> headline -> sub -> CTA
      const marginL = 80 * u;
      const contentX = (wContent: number) => (wide ? marginL : (w - wContent) / 2);
      let y = wide ? h * 0.22 : story ? h * 0.56 : h * 0.6;

      // Badge pill
      ctx.font = `600 ${Math.round(34 * u)}px ${family}`;
      const badgePad = 30 * u;
      const badgeW = ctx.measureText(tpl.badge).width + badgePad * 2;
      const badgeH = 66 * u;
      const badgeX = contentX(badgeW);
      ctx.fillStyle = "#ff2d78";
      ctx.beginPath();
      ctx.roundRect(badgeX, y, badgeW, badgeH, badgeH / 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.shadowBlur = 8 * u;
      ctx.fillText(tpl.badge, badgeX + badgeW / 2, y + badgeH / 2 + 2 * u);
      ctx.shadowBlur = 18 * u;
      y += badgeH + 44 * u;

      // Headline
      const headSize = Math.round((wide ? 78 : story ? 96 : 92) * u);
      ctx.font = `700 ${headSize}px ${family}`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = wide ? "left" : "center";
      const lines = tpl.headline.split("\n");
      const lh = headSize * 1.02;
      lines.forEach((line, i) => {
        ctx.fillText(line, tx, y + lh * i + headSize / 2);
      });
      y += lh * lines.length + 30 * u;

      // Sub
      ctx.font = `500 ${Math.round((wide ? 32 : 38) * u)}px ${family}`;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(tpl.sub, tx, y + 16 * u);
      y += (wide ? 70 : 100) * u;

      // CTA pill
      const ctaText = tpl.cta.toUpperCase();
      ctx.font = `600 ${Math.round(34 * u)}px ${family}`;
      const ctaPad = 46 * u;
      const ctaW = ctx.measureText(ctaText).width + ctaPad * 2;
      const ctaH = 78 * u;
      const ctaX = contentX(ctaW);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(ctaX, y, ctaW, ctaH, ctaH / 2);
      ctx.fill();
      ctx.fillStyle = "#c026d3";
      ctx.textAlign = "center";
      ctx.fillText(ctaText, ctaX + ctaW / 2, y + ctaH / 2 + 2 * u);

      // URL footer — below CTA on wide (bottom-left), bottom edge otherwise
      ctx.font = `500 ${Math.round(28 * u)}px ${family}`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.textAlign = wide ? "left" : "center";
      ctx.fillText("theslimestudio.co.uk", wide ? marginL : w / 2, wide ? h - 50 * u : h - 60 * u);
    })();
    return () => {
      cancelled = true;
    };
  }, [tpl, size, photo]);

  function download() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `slime-studio-${tpl.id}-${size.id}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <div className="mb-8">
        <h1 className="font-display text-[1.6rem] md:text-[2rem]">Marketing Materials</h1>
        <p className="text-ink-soft text-[0.9rem] mt-1">
          Ready-made adverts using your photos and logo. Pick a template and size, download the image, and paste the copy straight into Ads Manager.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
        <div>
          {/* Template picker */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm mb-6">
            <h2 className="font-display text-[1rem] mb-4">1 · Choose a template</h2>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t.id)}
                  className={`px-4 py-2.5 rounded-xl text-[0.85rem] font-medium transition-all ${
                    tplId === t.id ? "bg-ink text-white shadow-sm" : "bg-ink/[0.05] text-ink-soft hover:bg-ink/10"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Size picker */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm mb-6">
            <h2 className="font-display text-[1rem] mb-4">2 · Choose a size</h2>
            <div className="space-y-2">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSizeId(s.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${
                    sizeId === s.id ? "bg-ink text-white shadow-sm" : "bg-ink/[0.05] hover:bg-ink/10"
                  }`}
                >
                  <span className={`text-[0.88rem] font-medium ${sizeId === s.id ? "text-white" : "text-ink"}`}>
                    {s.label} <span className="opacity-60 font-normal">· {s.w}×{s.h}</span>
                  </span>
                  <span className={`text-[0.72rem] ${sizeId === s.id ? "text-white/60" : "text-ink-soft"}`}>{s.use}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo picker */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm mb-6">
            <h2 className="font-display text-[1rem] mb-4">3 · Swap the photo (optional)</h2>
            <div className="grid grid-cols-3 gap-2">
              {PHOTOS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setImgId(p.id)}
                  className={`relative rounded-xl overflow-hidden aspect-square transition-all ${imgId === p.id ? "ring-3 ring-bright-lavender ring-offset-2" : "opacity-80 hover:opacity-100"}`}
                  title={p.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Ad copy */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm">
            <h2 className="font-display text-[1rem] mb-1">4 · Ad text — paste into Ads Manager</h2>
            <p className="text-[0.75rem] text-ink-soft mb-4">Copy these into the "Primary text" and "Headline" fields when creating the ad.</p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold">Primary text</span>
                  <button onClick={() => copy(tpl.adCopy.primary, "primary")} className="text-[0.72rem] font-medium text-bright-lavender hover:underline">
                    {copied === "primary" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="bg-ink/[0.04] rounded-xl p-3.5 text-[0.82rem] whitespace-pre-line leading-relaxed">{tpl.adCopy.primary}</div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold">Headline</span>
                  <button onClick={() => copy(tpl.adCopy.headline, "headline")} className="text-[0.72rem] font-medium text-bright-lavender hover:underline">
                    {copied === "headline" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="bg-ink/[0.04] rounded-xl p-3.5 text-[0.82rem] font-medium">{tpl.adCopy.headline}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview + download */}
        <div className="lg:sticky lg:top-8 self-start">
          <div className="bg-white rounded-[20px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-[1rem]">Preview</h2>
              <button
                onClick={download}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-bright-lavender to-sky-blue-light text-white text-[0.85rem] font-semibold hover:opacity-90 transition-opacity"
              >
                Download PNG
              </button>
            </div>
            <div className="flex justify-center bg-ink/[0.03] rounded-2xl p-4">
              <canvas
                ref={canvasRef}
                className="rounded-lg shadow-md max-w-full h-auto"
                style={{ maxHeight: size.id === "story" ? "70vh" : "60vh" }}
              />
            </div>
            <p className="text-[0.72rem] text-ink-soft mt-3 text-center">
              {size.label} · {size.w}×{size.h}px · {size.use} — download and upload to Ads Manager
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
