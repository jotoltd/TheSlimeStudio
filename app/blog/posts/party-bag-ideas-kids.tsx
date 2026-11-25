import Link from "next/link";
import type { PostMeta } from "../posts";

export const meta: PostMeta = {
  slug: "party-bag-ideas-kids",
  title: "Party Bag Ideas Kids Actually Want (Not Plastic Tat)",
  description:
    "Fed up filling party bags with rubbish that goes straight in the bin? Better party bag and party favour ideas — including the one that's free with a slime party.",
  date: "2026-11-19",
  category: "Parties",
  readTime: "3 min read",
  image: "/images/slime_studio_slime_toppings.jpg.jpeg",
};

export default function Content() {
  return (
    <>
      <p>
        Every parent knows the party bag dilemma: spend £40 on plastic toys
        that break before bedtime, or face the guilt of sending kids home
        empty-handed. Here are party bag ideas children actually keep — plus
        the cheat code that skips the whole problem.
      </p>

      <h2>The best party bag is one they made themselves</h2>
      <p>
        At a <Link href="/parties">Slime Studio party</Link>, every child
        takes home a sealed pot of the slime they made — their colours, their
        scent, their charms. It's the activity <em>and</em> the party bag in
        one, and parents tell us it's the first party favour that's still
        being played with weeks later.
      </p>

      <h2>If you're doing bags anyway, keep it simple</h2>
      <ul>
        <li>
          <strong>One good thing beats ten tats.</strong> A mini slime pot, a
          small craft kit, or a proper little toy they'll actually use.
        </li>
        <li>
          <strong>Edible always works.</strong> A packet of sweets or a slice
          of cake wrapped up — zero waste, zero complaints.
        </li>
        <li>
          <strong>Books for younger kids.</strong> A £2-3 paperback feels
          generous and parents genuinely appreciate it.
        </li>
        <li>
          <strong>Skip the plastic.</strong> No whistles, no bouncy balls, no
          tiny figures that end up in the footwell of your car.
        </li>
      </ul>

      <h2>What about favours for a slime party specifically?</h2>
      <p>
        Honestly, you don't need extras — but if you want them, keep it
        on-theme: a small bag of slime charms or glitter to add to their pot
        at home goes down well. We sell{" "}
        <Link href="/shop">slime-making kits and supplies</Link> in the shop
        too if you want a bigger take-home gift for the birthday child.
      </p>

      <h2>The budget maths</h2>
      <p>
        Typical party bag spend: £3-5 per child × 15 kids = £45-75 of mostly
        landfill. A slime party wraps the favour into the package — up to 15
        children, private studio hire, balloons and banner, take-home pots
        included. When you add up venue hire + entertainment + bags + food
        prep elsewhere, it's usually comparable or cheaper.
      </p>
      <p>
        Planning a party in Norfolk?{" "}
        <Link href="/parties">Send us an enquiry</Link> with your date and
        numbers — or read{" "}
        <Link href="/blog/slime-party-norfolk">what a slime party actually
        involves</Link> first.
      </p>
    </>
  );
}
