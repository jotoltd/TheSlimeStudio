import Link from "next/link";
import type { PostMeta } from "../posts";

export const meta: PostMeta = {
  slug: "kids-birthday-parties-norwich",
  title: "Kids' Birthday Party Ideas in Norwich & Norfolk",
  description:
    "Looking for a children's birthday party venue near Norwich? Here's why families travel from across Norfolk to The Slime Studio in Holt — and what makes a slime party different.",
  date: "2026-11-19",
  category: "Parties",
  readTime: "4 min read",
  image: "/images/pink_slime_stretch.jpg.jpeg",
};

export default function Content() {
  return (
    <>
      <p>
        If you've Googled "kids' birthday party Norwich" or "children's party
        venues Norfolk" recently, you'll know the list can feel a bit samey —
        soft play, bowling, a village hall and a mountain of sandwiches. If you
        want something genuinely different that the kids will still be talking
        about at school on Monday, a <strong>slime party</strong> is hard to
        beat.
      </p>
      <p>
        The Slime Studio is in Holt, about 40 minutes from Norwich city centre —
        and we regularly welcome families who make the trip from Norwich,
        Wymondham, Attleborough, Fakenham, Cromer and right across Norfolk.
        Some of our birthday families have driven over an hour, which still
        slightly amazes (and delights) us.
      </p>

      <h2>What is a slime party?</h2>
      <p>
        Your group gets <strong>private hire of the whole studio</strong> — no
        sharing with the public, no queuing behind strangers. Up to 15 slime
        makers each choose their own slime base, pick a colour and scent, then
        get hands-on mixing, stretching and bubbling. There's a whole toppings
        bar of charms, glitters and decorations, giant slime bubbles, balloons
        and a birthday banner — and every child takes their finished slime home
        in a pot, so you don't even need to do party bags.
      </p>
      <p>
        Best bit for parents: <strong>the mess stays with us.</strong> All the
        sticky hands, glue spills and glitter explosions happen here, not in
        your living room.
      </p>

      <h2>What ages does it suit?</h2>
      <p>
        Slime is one of those rare activities that genuinely works across ages —
        younger children love the tactile mixing, while tweens and teens get
        competitive over bubble sizes and colour combos. It's one of the few
        party formats where a 7-year-old and a 12-year-old sibling can both have
        a brilliant time, which makes family parties much easier.
      </p>

      <h2>How far is The Slime Studio from Norwich?</h2>
      <p>
        We're at Unit A, Feathers Yard in Holt, North Norfolk — roughly{" "}
        <strong>40 minutes from Norwich</strong>, 25 minutes from Fakenham, 20
        from Cromer and just over an hour from King's Lynn. Holt itself is a
        lovely Georgian market town, so plenty of parents turn the trip into a
        day out: party first, then lunch, cake or a wander round the shops.
      </p>

      <h2>What does it include?</h2>
      <ul>
        <li>Private hire of the studio for your group only</li>
        <li>Up to 15 slime makers, each with their own workstation</li>
        <li>Every child makes and takes home their own pot of slime</li>
        <li>Full toppings bar — charms, glitters, scents and colours</li>
        <li>Slime bubble-making fun</li>
        <li>Balloons and a birthday banner</li>
        <li>All the mess stays with us</li>
      </ul>

      <h2>How do I book?</h2>
      <p>
        Party slots fill up quickly at weekends and in the school holidays —{" "}
        <Link href="/parties">send us a party enquiry</Link> with your preferred
        date and roughly how many slime makers you're expecting, and we'll come
        back to you. Or if you're planning something smaller, our{" "}
        <Link href="/booking">standard slime sessions</Link> (£15 per slime
        maker) are a great low-key birthday option too.
      </p>
    </>
  );
}
