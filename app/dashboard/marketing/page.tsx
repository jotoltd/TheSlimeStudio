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
  overlay: string;
  adCopy: { primary: string; headline: string; variants?: { primary: string; headline: string }[] };
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
      variants: [
        {
          primary: "1 hour of messy, colourful, glorious fun from just £15 🌈\n\nAt The Slime Studio in Holt, kids mix their own slime, load it with toppings and take it home in a pot.\n\nWeekend slots go fast 👇",
          headline: "Slime Sessions — From £15",
        },
        {
          primary: "Right here in Holt — no drive to Norwich needed 📍\n\nBook a 1-hour slime making session at The Slime Studio: choose colours, mix, stretch, and take home your creation.\n\nPerfect for ages 4+ 👇",
          headline: "Slime Making in Holt — Book Now",
        },
        {
          primary: "They make it. They take it home. You take the credit. 😉\n\n1-hour slime sessions at The Slime Studio, Holt — every child leaves with a pot of their own custom slime.\n\nBook their slot 👇",
          headline: "Make & Take Home Slime — Book Now",
        },
        {
          primary: "This weekend's plan: sorted 🙌\n\nGrab a slot at The Slime Studio in Holt — 1 hour of hands-on slime making, all materials included, slime goes home with them.\n\nSessions from £15 👇",
          headline: "Weekend Slime Sessions — Book Now",
        },
      ],
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
      variants: [
        {
          primary: "Costumes on, slime out 🎃👻\n\nCreepy-coloured slime, spooky toppings and an hour of Halloween fun at The Slime Studio, Holt. They take their monster creation home!\n\nOct 26–31 — spots are limited 👇",
          headline: "Halloween Slime Fun — Oct 26–31",
        },
        {
          primary: "Half term, sorted in one hour 🙌\n\nHalloween Slime Sessions at The Slime Studio — creepy slime making for kids, and they take it all home.\n\nRunning Oct 26–31 only. Book their spot 👇",
          headline: "Half Term Halloween Sessions — Book Now",
        },
        {
          primary: "Trick or treat? Choose slime 🎃\n\nOur Halloween sessions mix spooky colours and creepy toppings into slime they make themselves — and keep.\n\nThe Slime Studio, Holt — Oct 26–31 👇",
          headline: "Trick or Treat? Slime. — Book Now",
        },
        {
          primary: "Gone after Halloween 👻\n\nSpecial spooky slime sessions at The Slime Studio, Holt — one week only, Oct 26–31. Make it, take it home.\n\nDon't miss out — book now 👇",
          headline: "One Week Only — Halloween Slime",
        },
      ],
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
      variants: [
        {
          primary: "The gift that fits in an email 💌\n\nA Slime Studio gift card buys an hour of hands-on slime making in Holt — colours, toppings, take-home pot included.\n\nDelivered instantly. From £15 👇",
          headline: "Gift Cards — Instant Delivery",
        },
        {
          primary: "Last-minute gift? We've got you 🎁\n\nSlime Studio gift cards land in their inbox instantly — an hour of slime making fun whenever they fancy it.\n\nFrom just £15 👇",
          headline: "Last-Minute Gift Sorted — £15",
        },
        {
          primary: "Give them an hour of messy fun they'll actually remember 🌈\n\nSlime Studio gift cards — real slime making sessions in Holt, delivered by email the second you buy.\n\nFrom £15 👇",
          headline: "Give Slime This Christmas — £15",
        },
        {
          primary: "The easiest win on your Christmas list ✅\n\nOne click, one gift card, one very happy kid. Slime Studio gift cards from £15 — emailed instantly, no wrapping.\n\nGrab one 👇",
          headline: "Slime Gift Cards — From £15",
        },
      ],
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
      variants: [
        {
          primary: "Every guest takes home their own slime 🎈\n\nThat's a party bag sorted before you've even started. Slime parties at The Slime Studio, Holt — we host, they make, they keep.\n\nAges 4+ — plan their party 👇",
          headline: "Slime Parties — Party Bags Built In",
        },
        {
          primary: "The party they'll still be talking about at school on Monday 🎉\n\nSlime birthday parties at The Slime Studio — an hour of messy fun where everyone makes their own creation.\n\nWe handle the mess 👇",
          headline: "Unforgettable Birthday Parties",
        },
        {
          primary: "Stress-free party planning starts here 🎂\n\nBook a slime party at The Slime Studio, Holt — guided slime making, all materials included, every child takes home their slime.\n\nEasy for you, epic for them 👇",
          headline: "Slime Party Packages — Book Now",
        },
        {
          primary: "Zero mess at your house. Maximum fun at ours. 🎉\n\nSlime birthday parties at The Slime Studio — every child mixes, stretches and takes home their own slime.\n\nBook their big day 👇",
          headline: "Slime Birthday Parties — Ages 4+",
        },
      ],
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
      variants: [
        {
          primary: "Made for tiny hands 🖐️💕\n\nTuesday morning pre-school sessions at The Slime Studio — gentle, squishy sensory play, and they take their slime home.\n\nAges 3+ · £7.50 👇",
          headline: "Tiny Hands, Big Fun — £7.50",
        },
        {
          primary: "Sensory play they'll love — and it's not your carpet 😅\n\nPre-school slime sessions every Tuesday morning at The Slime Studio, Holt. Squish, stretch, explore, take it home.\n\nJust £7.50 👇",
          headline: "Pre-School Slime — Tuesdays £7.50",
        },
        {
          primary: "A Tuesday morning treat for you both ☕🌈\n\nRelaxed pre-school slime sessions at The Slime Studio — little ones play with slime, grown-ups get an easy morning out.\n\n£7.50 per child, ages 3+ 👇",
          headline: "Tuesday Treat — Slime Sessions",
        },
        {
          primary: "£7.50, one hour, one pot of slime to take home 🌈\n\nPre-school sessions at The Slime Studio, Holt — made for little hands and big imaginations.\n\nEvery Tuesday morning 👇",
          headline: "Pre-School Slime — From £7.50",
        },
      ],
    },
  },
  {
    id: "adults",
    name: "Adults Only Night",
    headline: "ADULTS ONLY\nSLIME NIGHT",
    sub: "Slime, drinks & zero kids — 18+",
    badge: "ADULTS ONLY",
    cta: "Grab your spot",
    image: "teal",
    overlay: "purple",
    adCopy: {
      primary: "Yes, it's a real thing — and yes, you need to try it 🍸\n\nOur Adults Only Slime Nights are BACK. Slime making, drinks, music and absolutely no children allowed. Bring your mates, leave your kids at home.\n\nThe most fun night out in Norfolk you didn't know existed 👇",
      headline: "Adults Only Slime Night — 18+",
      variants: [
        {
          primary: "Slime. Drinks. Zero kids. 🍸\n\nAdults Only Slime Night at The Slime Studio — an evening of gloriously messy fun with music and a strictly 18+ guest list.\n\nRound up your mates 👇",
          headline: "Slime Night — Strictly 18+",
        },
        {
          primary: "The night out you didn't know you needed 🥂\n\nMake slime, have a laugh, take your creation home — Adults Only Slime Night is Norfolk's most unusual evening out.\n\n18+ only. Grab your spot 👇",
          headline: "Adults Only Slime Night — Book Now",
        },
        {
          primary: "Leave the kids at home — this one's for you 🙌\n\nSlime making, drinks and music at our Adults Only Slime Night. No children allowed, no exceptions.\n\nLimited spots per night 👇",
          headline: "Grown-Ups Slime Night — 18+",
        },
        {
          primary: "Prosecco optional, slime mandatory 🍾\n\nAdults Only Slime Nights at The Slime Studio, Holt — bring your mates for an hour of child-free messy fun.\n\nBook your spot 👇",
          headline: "Slime Night for Grown-Ups",
        },
      ],
    },
  },
  {
    id: "afterschool",
    name: "After School Club",
    headline: "AFTER SCHOOL\nSLIME CLUB",
    sub: "Weekly sessions straight after school",
    badge: "AGES 5+",
    cta: "Join the club",
    image: "mixing",
    overlay: "teal",
    adCopy: {
      primary: "The after-school club kids actually want to go to 🌈\n\nWeekly slime club at The Slime Studio — they make, they play, they bring their slime home. You get an hour of peace.\n\nSpaces are limited each week — book ahead 👇",
      headline: "After School Slime Club — Book Now",
      variants: [
        {
          primary: "One hour of peace for you, one hour of slime for them 🙌\n\nAfter School Slime Club at The Slime Studio — weekly sessions straight after school, slime goes home with them.\n\nAges 5+ 👇",
          headline: "After School Club — Weekly",
        },
        {
          primary: "The club they actually ask to go back to 🌈\n\nWeekly After School Slime Club — new slime creations every session, always something to take home.\n\nBook their spot 👇",
          headline: "Weekly Slime Club — Ages 5+",
        },
        {
          primary: "Straight after school, every week 📚➡️🌈\n\nAfter School Slime Club at The Slime Studio — an hour of making, mixing and taking slime home.\n\nLimited spaces weekly 👇",
          headline: "After School Slime Club — Book",
        },
        {
          primary: "Screen-free after-school fun that actually works 📵\n\nWeekly slime club — hands-on making, zero screens, one happy kid with a pot of slime.\n\nEvery week at The Slime Studio 👇",
          headline: "Screen-Free After School Club",
        },
      ],
    },
  },
  {
    id: "christmas",
    name: "Christmas Sessions",
    headline: "CHRISTMAS\nSLIME SESSIONS",
    sub: "Festive slime making this December",
    badge: "BOOK EARLY",
    cta: "Book festive fun",
    image: "pink_action",
    overlay: "gold",
    adCopy: {
      primary: "Christmas sessions are coming to The Slime Studio! 🎄\n\nFestive slime making with sparkles, seasonal colours and all the Christmas vibes — the perfect festive treat that keeps them busy for an hour.\n\nDecember slots sell out every year — book early 👇",
      headline: "Christmas Slime Sessions — Book Early",
      variants: [
        {
          primary: "Sparkles, seasonal colours, Christmas slime ✨🎄\n\nFestive sessions at The Slime Studio this December — kids make their own Christmas slime and take it home.\n\nBook early — it sells out 👇",
          headline: "Festive Slime Sessions — December",
        },
        {
          primary: "The Christmas treat that keeps them busy for an hour 🎁\n\nFestive slime making at The Slime Studio — seasonal colours, all the sparkles, take-home pot included.\n\nDecember only 👇",
          headline: "Christmas Slime Fun — Book Now",
        },
        {
          primary: "December slots sell out every single year 🎄\n\nChristmas Slime Sessions at The Slime Studio, Holt — festive colours, sparkly toppings, slime to take home.\n\nBook early 👇",
          headline: "Christmas Sessions — Selling Fast",
        },
        {
          primary: "Add slime to the Christmas list — literally 🎅\n\nFestive slime making sessions this December at The Slime Studio. An hour of Christmas fun they make themselves.\n\nBook now 👇",
          headline: "Christmas Slime — December Only",
        },
      ],
    },
  },
  {
    id: "kits",
    name: "Slime Kits & Shop",
    headline: "SLIME KITS\nTO TAKE HOME",
    sub: "DIY kits & slime goodies from our shop",
    badge: "IN STORE & ONLINE",
    cta: "Shop slime",
    image: "toppings",
    overlay: "pink",
    adCopy: {
      primary: "Can't make it to the studio? Take the slime home with you 🏠\n\nOur DIY slime kits have everything they need to make proper slime at home — the same stuff we use in the studio.\n\nPerfect gifts, rainy day saviours, and party bag upgrades 👇",
      headline: "DIY Slime Kits — Shop Now",
      variants: [
        {
          primary: "Proper slime at home — the same stuff we use in the studio 🏠\n\nDIY slime kits from The Slime Studio: everything they need in one box.\n\nIn store & online 👇",
          headline: "Studio-Quality Slime Kits",
        },
        {
          primary: "Rainy day saviour in a box 🌧️➡️🌈\n\nDIY slime kits from The Slime Studio — everything included, proper slime at home, zero guesswork.\n\nShop now 👇",
          headline: "Slime Kits for Rainy Days",
        },
        {
          primary: "The party bag upgrade they'll actually use 🎁\n\nTake-home slime kits from The Slime Studio — proper slime making in a box.\n\nIn store & online 👇",
          headline: "Slime Kits — Great Gifts",
        },
        {
          primary: "Slime making at home, done right ✅\n\nOur DIY kits have everything you need — no hunting for ingredients, no failed batches.\n\nShop slime kits 👇",
          headline: "DIY Slime Kits — Shop Now",
        },
      ],
    },
  },
  {
    id: "halfterm",
    name: "School Holidays",
    headline: "SCHOOL HOLIDAY\nSORTED",
    sub: "Slime sessions running every day",
    badge: "FROM £15",
    cta: "Book a slot",
    image: "blue_close",
    overlay: "teal",
    adCopy: {
      primary: "Half term childcare? Sorted. Bored kids? Sorted. 🙌\n\nThe Slime Studio is open every day through the school holidays — 1-hour sessions where they make their own slime and take it home.\n\nBook ahead — holiday slots go fast 👇",
      headline: "School Holiday Sessions — From £15",
      variants: [
        {
          primary: "Every day of the holidays — 1-hour slime sessions 🌈\n\nThe Slime Studio, Holt — kids mix their own slime, load the toppings, take it home. From £15.\n\nHoliday slots go fast 👇",
          headline: "Open Every Day — School Holidays",
        },
        {
          primary: "Bored kids? We've got this 💪\n\n1-hour slime making sessions running every day of the school holidays at The Slime Studio.\n\nBook ahead 👇",
          headline: "School Holiday Sorted — £15",
        },
        {
          primary: "One hour out of the house they'll actually love 🙌\n\nSlime sessions every day through the holidays at The Slime Studio, Holt — make it, take it home.\n\nFrom £15 👇",
          headline: "Holiday Sessions — Book a Slot",
        },
        {
          primary: "School's out, slime's in 🌈\n\nDaily sessions through the school holidays at The Slime Studio — an hour of messy fun, slime to take home.\n\nFrom £15 — book ahead 👇",
          headline: "School's Out — Slime Sessions",
        },
      ],
    },
  },
  {
    id: "rainyday",
    name: "Rainy Day",
    headline: "RAINY DAY?\nSLIME DAY",
    sub: "Indoor family fun in Holt, Norfolk",
    badge: "OPEN WEEKENDS",
    cta: "Book now",
    image: "pink_stretch",
    overlay: "dark",
    adCopy: {
      primary: "Grey skies over Norfolk? We have the cure 🌧️➡️🌈\n\nAn hour of slime making at The Slime Studio turns a rainy day into the best day of the week. Indoor, warm, and gloriously messy (for them — not your house).\n\nWeekend sessions from £15 👇",
      headline: "Rainy Day? Make Slime Instead",
      variants: [
        {
          primary: "Indoor, warm, gloriously messy 🌧️➡️🌈\n\nWhen the Norfolk weather does its thing, an hour at The Slime Studio is the answer — kids make slime, you stay dry.\n\nWeekend sessions from £15 👇",
          headline: "Indoor Family Fun — From £15",
        },
        {
          primary: "Turn a grey day into the best day of the week 🌈\n\n1-hour slime making sessions at The Slime Studio, Holt — make it, take it home.\n\nBook for this weekend 👇",
          headline: "Rainy Day Rescue — Book Now",
        },
        {
          primary: "Norfolk weather can't be helped. Slime can. 😄\n\nAn hour indoors at The Slime Studio — kids make their own slime and take it home, whatever's falling from the sky.\n\nFrom £15 👇",
          headline: "Weatherproof Fun — Slime Sessions",
        },
        {
          primary: "Stuck inside? Make slime instead 🏠🌈\n\nThe Slime Studio in Holt — warm, indoor, messy fun for the kids on any grey Norfolk day.\n\nSessions from £15 👇",
          headline: "Stuck Inside? Slime Day",
        },
      ],
    },
  },
];

const OVERLAY_GRADIENTS: Record<string, [string, string]> = {
  pink: ["rgba(236,72,153,0)", "rgba(157,23,77,0.88)"],
  purple: ["rgba(124,58,237,0.05)", "rgba(46,16,101,0.9)"],
  teal: ["rgba(20,184,166,0)", "rgba(19,78,74,0.9)"],
  gold: ["rgba(0,0,0,0)", "rgba(120,53,15,0.9)"],
  orange: ["rgba(0,0,0,0)", "rgba(67,20,7,0.9)"],
  dark: ["rgba(0,0,0,0.05)", "rgba(15,10,30,0.88)"],
};

const OVERLAY_OPTIONS = [
  { id: "pink", label: "Pink", swatch: "#be185d" },
  { id: "purple", label: "Purple", swatch: "#5b21b6" },
  { id: "teal", label: "Teal", swatch: "#0f766e" },
  { id: "gold", label: "Gold", swatch: "#92400e" },
  { id: "orange", label: "Spooky", swatch: "#431407" },
  { id: "dark", label: "Dark", swatch: "#1e1b2e" },
];

// Session-booking ads land on /go — the dedicated ad-landing page whose
// visits are provably ad-channel. Gift card / party / shop / event ads keep
// their own pages because /go can only book slime sessions.
const LAUNCH_DESTINATIONS: Record<string, { link: string; ctaType: string }> = {
  session: { link: "https://theslimestudio.co.uk/go", ctaType: "BOOK_NOW" },
  halloween: { link: "https://theslimestudio.co.uk/events/halloween-slime-session", ctaType: "BOOK_NOW" },
  giftcards: { link: "https://theslimestudio.co.uk/gift-card", ctaType: "SHOP_NOW" },
  parties: { link: "https://theslimestudio.co.uk/parties", ctaType: "LEARN_MORE" },
  preschool: { link: "https://theslimestudio.co.uk/events", ctaType: "BOOK_NOW" },
  adults: { link: "https://theslimestudio.co.uk/events", ctaType: "BOOK_NOW" },
  afterschool: { link: "https://theslimestudio.co.uk/events", ctaType: "BOOK_NOW" },
  christmas: { link: "https://theslimestudio.co.uk/events", ctaType: "BOOK_NOW" },
  kits: { link: "https://theslimestudio.co.uk/shop", ctaType: "SHOP_NOW" },
  halfterm: { link: "https://theslimestudio.co.uk/go", ctaType: "BOOK_NOW" },
  rainyday: { link: "https://theslimestudio.co.uk/go", ctaType: "BOOK_NOW" },
};

const AD_AUDIENCES = [
  { id: "checkout", label: "Checkout Starters — 30d (retargeting)" },
  { id: "visitors", label: "Site Visitors — 30d (retargeting)" },
  { id: "lookalike_customers", label: "Lookalike — your customers (new people)" },
  { id: "lookalike_purchasers", label: "Lookalike — pixel purchasers" },
  { id: "customers", label: "Past customers (repeat bookings)" },
  { id: "purchasers", label: "Pixel purchasers (repeat bookings)" },
  { id: "local", label: "Local area — 25 miles around Holt" },
];

const LOGO_POSITIONS = [
  { id: "hidden", label: "Hidden" },
  { id: "tl", label: "Top left" },
  { id: "tc", label: "Top centre" },
  { id: "tr", label: "Top right" },
  { id: "bl", label: "Bottom left" },
  { id: "bc", label: "Bottom centre" },
  { id: "br", label: "Bottom right" },
];

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
  const [overlayId, setOverlayId] = useState(TEMPLATES[0].overlay);
  const [logoPos, setLogoPos] = useState("tc");
  const [txt, setTxt] = useState({ headline: TEMPLATES[0].headline, sub: TEMPLATES[0].sub, badge: TEMPLATES[0].badge, cta: TEMPLATES[0].cta });
  const [copied, setCopied] = useState("");
  const [launch, setLaunch] = useState({ audience: "checkout", budget: "3", name: "", link: "", start: "", end: "", msg: "", ok: false });
  const [launching, setLaunching] = useState(false);
  // Editable ad text variations for the launch — Meta tests them and
  // favours the best performer. Seeded from the template's adCopy.
  const seedVariants = (t: Template) =>
    [{ primary: t.adCopy.primary, headline: t.adCopy.headline }, ...(t.adCopy.variants || [])].slice(0, 5);
  const [variants, setVariants] = useState(() => seedVariants(TEMPLATES[0]));
  const tpl = TEMPLATES.find((t) => t.id === tplId)!;
  const size = SIZES.find((s) => s.id === sizeId)!;
  const photo = PHOTOS.find((p) => p.id === imgId)!;

  function pickTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id)!;
    setTplId(id);
    setImgId(t.image);
    setOverlayId(t.overlay);
    setTxt({ headline: t.headline, sub: t.sub, badge: t.badge, cta: t.cta });
    setVariants(seedVariants(t));
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
      const [gTop, gBot] = OVERLAY_GRADIENTS[overlayId] || OVERLAY_GRADIENTS.pink;
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

      // Logo — position chosen in the panel
      ctx.shadowBlur = 0;
      if (logoPos !== "hidden") {
        const logoW = wide ? 170 * u : story ? 400 * u : 360 * u;
        const logoH = (logo.height / logo.width) * logoW;
        const mX = 55 * u;
        const topY = wide ? 45 * u : story ? 110 * u : 70 * u;
        const botY = h - logoH - (wide ? 110 : 120) * u; // clear of the URL footer
        const lx = logoPos.endsWith("l") ? mX : logoPos.endsWith("r") ? w - logoW - mX : (w - logoW) / 2;
        const ly = logoPos.startsWith("t") ? topY : botY;
        ctx.drawImage(logo, lx, ly, logoW, logoH);
      }

      // Vertical stack: badge -> headline -> sub -> CTA
      const marginL = 80 * u;
      const contentX = (wContent: number) => (wide ? marginL : (w - wContent) / 2);
      let y = wide ? h * 0.22 : story ? h * 0.56 : h * 0.6;

      // Badge pill
      if (txt.badge.trim()) {
        ctx.font = `600 ${Math.round(34 * u)}px ${family}`;
        const badgePad = 30 * u;
        const badgeW = ctx.measureText(txt.badge).width + badgePad * 2;
        const badgeH = 66 * u;
        const badgeX = contentX(badgeW);
        ctx.fillStyle = "#ff2d78";
        ctx.beginPath();
        ctx.roundRect(badgeX, y, badgeW, badgeH, badgeH / 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.shadowBlur = 8 * u;
        ctx.fillText(txt.badge, badgeX + badgeW / 2, y + badgeH / 2 + 2 * u);
        ctx.shadowBlur = 18 * u;
        y += badgeH + 44 * u;
      }

      // Headline — shrink until the longest line fits the canvas
      const lines = txt.headline.split("\n").filter((l) => l.trim());
      let headSize = Math.round((wide ? 78 : story ? 96 : 92) * u);
      const maxW = wide ? w - 160 * u : w * 0.88;
      const setHeadFont = () => { ctx.font = `700 ${Math.round(headSize)}px ${family}`; };
      setHeadFont();
      while (headSize > 34 * u && lines.some((l) => ctx.measureText(l).width > maxW)) {
        headSize -= 4 * u;
        setHeadFont();
      }
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = wide ? "left" : "center";
      const lh = headSize * 1.02;
      lines.forEach((line, i) => {
        ctx.fillText(line, tx, y + lh * i + headSize / 2);
      });
      y += lh * Math.max(lines.length, 1) + 30 * u;

      // Sub — shrink to fit too
      let subSize = Math.round((wide ? 32 : 38) * u);
      const setSubFont = () => { ctx.font = `500 ${Math.round(subSize)}px ${family}`; };
      setSubFont();
      while (subSize > 20 * u && ctx.measureText(txt.sub).width > maxW) {
        subSize -= 3 * u;
        setSubFont();
      }
      if (txt.sub.trim()) {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fillText(txt.sub, tx, y + 16 * u);
      }
      y += (wide ? 70 : 100) * u;

      const ctaText = txt.cta.toUpperCase();
      if (ctaText.trim()) {
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
      }

      // URL footer — below CTA on wide (bottom-left), bottom edge otherwise
      ctx.font = `500 ${Math.round(28 * u)}px ${family}`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.textAlign = wide ? "left" : "center";
      ctx.fillText("theslimestudio.co.uk", wide ? marginL : w / 2, wide ? h - 50 * u : h - 60 * u);
    })();
    return () => {
      cancelled = true;
    };
  }, [tpl, size, photo, overlayId, txt, logoPos]);

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

  async function launchAd() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setLaunching(true);
    setLaunch({ ...launch, msg: "" });
    try {
      const dest = LAUNCH_DESTINATIONS[tpl.id] || LAUNCH_DESTINATIONS.session;
      const res = await fetch("/api/admin/create-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: canvas.toDataURL("image/png"),
          name: launch.name || `${tpl.name} — ${size.label}`,
          primaryTexts: variants.map((v) => v.primary),
          headlines: variants.map((v) => v.headline),
          link: launch.link || dest.link,
          ctaType: dest.ctaType,
          audience: launch.audience === "local" ? undefined : launch.audience,
          dailyBudget: parseFloat(launch.budget) || 3,
          startTime: launch.start || undefined,
          endTime: launch.end || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) setLaunch({ ...launch, msg: json.error || "Failed", ok: false });
      else setLaunch({ ...launch, msg: `Created (paused) — campaign ${json.campaignId}${json.textOptions > 1 ? ` with ${json.textOptions} text variations Meta will test` : ""}. Switch it on in Ads Manager or the Ads page.`, ok: true });
    } catch {
      setLaunch({ ...launch, msg: "Network error", ok: false });
    }
    setLaunching(false);
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

          {/* Photo + colour picker */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm mb-6">
            <h2 className="font-display text-[1rem] mb-4">3 · Swap photo & colour (optional)</h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
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
            <div className="flex flex-wrap gap-2 mb-4">
              {OVERLAY_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOverlayId(o.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[0.8rem] font-medium transition-all ${
                    overlayId === o.id ? "bg-ink text-white shadow-sm" : "bg-ink/[0.05] text-ink-soft hover:bg-ink/10"
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: o.swatch }} />
                  {o.label}
                </button>
              ))}
            </div>
            <div className="text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-2">Logo</div>
            <div className="flex flex-wrap gap-2">
              {LOGO_POSITIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setLogoPos(p.id)}
                  className={`px-3 py-2 rounded-xl text-[0.8rem] font-medium transition-all ${
                    logoPos === p.id ? "bg-ink text-white shadow-sm" : "bg-ink/[0.05] text-ink-soft hover:bg-ink/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom text */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm mb-6">
            <h2 className="font-display text-[1rem] mb-4">4 · Write your own text (optional)</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">Headline — press Enter for a second line</label>
                <textarea
                  rows={2}
                  value={txt.headline}
                  onChange={(e) => setTxt({ ...txt, headline: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.9rem] font-bold resize-none focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
                />
              </div>
              <div>
                <label className="block text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">Sub-heading</label>
                <input
                  type="text"
                  value={txt.sub}
                  onChange={(e) => setTxt({ ...txt, sub: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.9rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">Pink badge</label>
                  <input
                    type="text"
                    value={txt.badge}
                    onChange={(e) => setTxt({ ...txt, badge: e.target.value })}
                    placeholder="e.g. FROM £15"
                    className="w-full px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.9rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
                  />
                </div>
                <div>
                  <label className="block text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">Button text</label>
                  <input
                    type="text"
                    value={txt.cta}
                    onChange={(e) => setTxt({ ...txt, cta: e.target.value })}
                    placeholder="e.g. Book now"
                    className="w-full px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.9rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
                  />
                </div>
              </div>
              <button
                onClick={() => setTxt({ headline: tpl.headline, sub: tpl.sub, badge: tpl.badge, cta: tpl.cta })}
                className="text-[0.75rem] font-medium text-ink-soft hover:text-ink underline"
              >
                Reset to template text
              </button>
            </div>
          </div>

          {/* Ad copy */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm">
            <h2 className="font-display text-[1rem] mb-1">5 · Ad text — paste into Ads Manager</h2>
            <p className="text-[0.75rem] text-ink-soft mb-4">Copy these into the &quot;Primary text&quot; and &quot;Headline&quot; fields when creating the ad.</p>
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

          {/* Launch as ad */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm mt-6 border-2 border-bright-lavender/30">
            <h2 className="font-display text-[1rem] mb-1">6 · Launch as a Meta ad</h2>
            <p className="text-[0.75rem] text-ink-soft mb-4">Creates the whole campaign on Facebook & Instagram, <strong>paused</strong> — review it, then switch it on in the Ads page or Ads Manager.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">Who sees it</label>
                <select
                  value={launch.audience}
                  onChange={(e) => setLaunch({ ...launch, audience: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.88rem] bg-white focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
                >
                  {AD_AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">Daily budget £</label>
                  <input
                    type="number" min="1" step="0.5"
                    value={launch.budget}
                    onChange={(e) => setLaunch({ ...launch, budget: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.88rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
                  />
                </div>
                <div>
                  <label className="block text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">Ad name</label>
                  <input
                    type="text"
                    value={launch.name}
                    placeholder={`${tpl.name} — ${size.label}`}
                    onChange={(e) => setLaunch({ ...launch, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.88rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">Starts (optional)</label>
                  <input
                    type="datetime-local"
                    value={launch.start}
                    onChange={(e) => setLaunch({ ...launch, start: e.target.value })}
                    className="w-full px-3 py-2.5 border border-ink/15 rounded-xl text-[0.8rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
                  />
                </div>
                <div>
                  <label className="block text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">Ends (optional)</label>
                  <input
                    type="datetime-local"
                    value={launch.end}
                    onChange={(e) => setLaunch({ ...launch, end: e.target.value })}
                    className="w-full px-3 py-2.5 border border-ink/15 rounded-xl text-[0.8rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">Link (where clicks go)</label>
                <input
                  type="text"
                  value={launch.link}
                  placeholder={(LAUNCH_DESTINATIONS[tpl.id] || LAUNCH_DESTINATIONS.session).link}
                  onChange={(e) => setLaunch({ ...launch, link: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-ink/15 rounded-xl text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[0.7rem] uppercase tracking-wider text-ink-soft font-semibold">Text variations ({variants.length}/5)</label>
                  {variants.length < 5 && (
                    <button
                      onClick={() => setVariants([...variants, { primary: "", headline: "" }])}
                      className="text-[0.72rem] font-medium text-bright-lavender hover:underline"
                    >
                      + Add variation
                    </button>
                  )}
                </div>
                <p className="text-[0.72rem] text-ink-soft mb-2.5">
                  Meta rotates the variations and pushes budget toward whichever performs best — different angles beat more of the same.
                </p>
                <div className="space-y-3">
                  {variants.map((v, i) => (
                    <div key={i} className="border border-ink/10 rounded-xl p-3 relative">
                      {variants.length > 1 && (
                        <button
                          onClick={() => setVariants(variants.filter((_, x) => x !== i))}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-ink/5 grid place-items-center text-ink/40 text-[0.8rem]"
                          title="Remove variation"
                        >
                          ✕
                        </button>
                      )}
                      <div className="text-[0.65rem] uppercase tracking-wider text-ink-soft font-semibold mb-1.5">Variation {i + 1}</div>
                      <textarea
                        rows={3}
                        value={v.primary}
                        placeholder="Primary text — the main body of the ad"
                        onChange={(e) => setVariants(variants.map((x, j) => j === i ? { ...x, primary: e.target.value } : x))}
                        className="w-full px-3 py-2 border border-ink/15 rounded-lg text-[0.8rem] resize-none focus:outline-none focus:ring-2 focus:ring-bright-lavender/50 mb-2"
                      />
                      <input
                        type="text"
                        value={v.headline}
                        placeholder="Headline — the bold line under the image"
                        onChange={(e) => setVariants(variants.map((x, j) => j === i ? { ...x, headline: e.target.value } : x))}
                        className="w-full px-3 py-2 border border-ink/15 rounded-lg text-[0.8rem] font-medium focus:outline-none focus:ring-2 focus:ring-bright-lavender/50"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={launchAd}
                disabled={launching}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-bright-lavender to-sky-blue-light text-white font-semibold text-[0.9rem] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {launching ? "Creating campaign…" : "Create ad (paused)"}
              </button>
              {launch.msg && (
                <div className={`rounded-xl px-4 py-3 text-[0.8rem] ${launch.ok ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                  {launch.msg}
                </div>
              )}
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
