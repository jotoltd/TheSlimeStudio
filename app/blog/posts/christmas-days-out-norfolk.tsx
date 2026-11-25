import Link from "next/link";
import type { PostMeta } from "../posts";

export const meta: PostMeta = {
  slug: "christmas-days-out-norfolk",
  title: "Christmas Days Out & Gifts in Norfolk: Festive Fun in Holt",
  description:
    "Looking for Christmas things to do in Norfolk? Festive slime sessions, Christmas gift cards and winter birthdays — here's what's on at The Slime Studio in Holt this Christmas.",
  date: "2026-11-19",
  category: "Days Out",
  readTime: "3 min read",
  image: "/images/purple_finished_slime.jpg.jpeg",
};

export default function Content() {
  return (
    <>
      <p>
        Christmas in Norfolk is lovely — light trails, markets, panto — but the
        same few events get booked up months ahead, and December weather isn't
        exactly reliable. If you're looking for a festive family activity that's
        indoors, hands-on and doesn't require wellies, come and make Christmas
        slime with us in Holt.
      </p>

      <h2>Festive slime sessions</h2>
      <p>
        Through December the studio goes full Christmas — festive scents,
        glittery toppings, and slime-making that keeps children properly
        entertained while you get five minutes' peace (or join in — no
        judgement, plenty of grown-ups do). Sessions are{" "}
        <strong>£15 per slime maker</strong> and suit all ages. Christmas-week
        slots always go quickly, so{" "}
        <Link href="/booking">book ahead</Link> if you've got a date in mind.
      </p>
      <p>
        We're a short walk from Holt's Christmas shopping — lots of families
        do a slime session then hit the town's independent shops and cafés.
        And if you're making a day of it, the North Norfolk Railway's steam
        trains pull into Holt station, which is magical enough on its own.
      </p>

      <h2>Christmas birthdays</h2>
      <p>
        December birthdays get a raw deal — squeezed between Christmas
        shopping and school plays, they can feel like an afterthought. A{" "}
        <Link href="/parties">private slime party</Link> fixes that: up to 15
        children, the whole studio to yourselves, balloons and a birthday
        banner included, and every guest leaves with a pot of slime. It's a
        genuinely memorable way to do a winter birthday — and the mess stays
        with us.
      </p>

      <h2>The gift that isn't more stuff</h2>
      <p>
        If you're shopping for grandchildren, nieces, nephews or the
        "impossible to buy for" age range,{" "}
        <Link href="/gift-card">Slime Studio gift cards</Link> are the answer:
        it's an experience, not more plastic for the toy box. They work for
        sessions, parties and the shop, get emailed instantly (so they're a
        brilliant last-minute gift), and they're valid for three months from
        purchase — plenty of time to use in the new year.
      </p>

      <h2>Where to find us</h2>
      <p>
        Unit A, Feathers Yard, Holt, NR25 6BF — about 40 minutes from Norwich,
        25 from Fakenham and 20 from Cromer. Free parking is a short walk away
        in the town.{" "}
        <Link href="/booking">Book your Christmas session</Link> or{" "}
        <Link href="/events">see what's on</Link> over the holidays.
      </p>
    </>
  );
}
