import Link from "next/link";
import type { PostMeta } from "../posts";

export const meta: PostMeta = {
  slug: "slime-party-norfolk",
  title: "What Is a Slime Party? Norfolk's Messiest Birthday Idea",
  description:
    "Slime parties are the kids' birthday craze sweeping Norfolk. Here's exactly what happens at a Slime Studio party in Holt — and why parents love it as much as the children.",
  date: "2026-11-17",
  category: "Parties",
  readTime: "3 min read",
  image: "/images/slime_studio_slime_toppings.jpg.jpeg",
};

export default function Content() {
  return (
    <>
      <p>
        Every parent who's hosted a kids' birthday party knows the maths: hire
        somewhere, keep 15 children entertained for two hours, feed them, and
        somehow get them out the door with a party bag — ideally without your
        house ending up covered in cake and glitter. A{" "}
        <strong>slime party</strong> solves most of that, and it's become one of
        the most popular birthday ideas in Norfolk.
      </p>

      <h2>So what actually happens at one?</h2>
      <p>
        At The Slime Studio in Holt, a party means{" "}
        <strong>private hire of the whole studio</strong>. Each child gets
        their own workstation and a slime base, then picks a colour and a scent
        — the scent bar is always a favourite (marshmallow vs. bubblegum debates
        can get heated). From there it's hands-on: mixing, stretching, pulling
        and kneading until the texture is just right.
      </p>
      <p>
        Then comes the toppings bar. Charms, glitters, foam beads, sprinkles —
        every child's slime ends up completely different, which is half the fun.
        The session usually ends with <strong>giant slime bubbles</strong>,
        which reliably gets even the too-cool-for-this tweens laughing.
      </p>

      <h2>Why parents love it</h2>
      <ul>
        <li>
          <strong>The party bag is built in.</strong> Every child takes their
          slime home in a sealed pot — no trawling Amazon for filler.
        </li>
        <li>
          <strong>The mess isn't yours.</strong> Glue, glitter and sticky hands
          stay in our studio, not your kitchen.
        </li>
        <li>
          <strong>It works for mixed ages.</strong> Siblings, cousins and school
          friends of different ages can all join in together.
        </li>
        <li>
          <strong>It's actually engaging.</strong> No herding kids round a
          hall — they're focused, creative and surprisingly calm (for a
          birthday party, anyway).
        </li>
        <li>
          <strong>It's already decorated.</strong> Balloons and a birthday
          banner are included.
        </li>
      </ul>

      <h2>The practical bits</h2>
      <p>
        Parties take up to <strong>15 slime makers</strong> and run as a private
        session — it's just your group and our team running the activity. We're
        based at Feathers Yard in Holt, North Norfolk, and host families from
        across the county — Norwich, Cromer, Fakenham, Sheringham, Dereham and
        beyond. Birthday weekends fill fast, especially in the run-up to
        Christmas and during school holidays.
      </p>
      <p>
        Not planning a full party? Our{" "}
        <Link href="/booking">standard slime sessions</Link> are £15 per slime
        maker — a lovely option for a low-key birthday treat with a couple of
        friends. And if you're stuck for a gift,{" "}
        <Link href="/gift-card">Slime Studio gift cards</Link> are very popular
        with grandparents.
      </p>
      <p>
        Fancy it? <Link href="/parties">Send a party enquiry</Link> and we'll
        get back to you with dates and details.
      </p>
    </>
  );
}
