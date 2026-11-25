import Link from "next/link";
import type { PostMeta } from "../posts";

export const meta: PostMeta = {
  slug: "things-to-do-with-kids-norfolk",
  title: "Things to Do With Kids in Norfolk: A Local's Honest List",
  description:
    "Rainy day? School holiday? Weekend to fill? Our pick of genuinely fun things to do with children in Norfolk — including why a slime-making session in Holt is worth the drive.",
  date: "2026-11-15",
  category: "Days Out",
  readTime: "4 min read",
  image: "/images/slime_mixing.jpg.jpeg",
};

export default function Content() {
  return (
    <>
      <p>
        Norfolk has beaches, broads and stately homes by the bucketload — but
        any parent will tell you the real challenge is finding something the
        kids will actually enjoy <em>and</em> that works in November weather.
        Here's our honest list of things to do with kids in Norfolk, starting
        with our favourite (we would say that).
      </p>

      <h2>1. Make slime at The Slime Studio, Holt</h2>
      <p>
        Obviously we're biased, but a{" "}
        <Link href="/booking">slime-making session</Link> ticks a lot of boxes:
        it's indoors (rainproof), it's hands-on (screens off), and every child
        goes home with their own pot of slime they actually made. Sessions are{" "}
        <strong>£15 per slime maker</strong>, suit all ages, and run throughout
        the week — we get families driving in from Norwich, Fakenham, Cromer,
        Sheringham and Dereham, and plenty making a day of it in Holt itself.
      </p>
      <p>
        Got a birthday coming up? Our{" "}
        <Link href="/parties">private parties</Link> take up to 15 slime makers
        and come with balloons and a banner included.
      </p>

      <h2>2. Holt town &amp; country park</h2>
      <p>
        Holt is a proper hidden gem — a Georgian market town packed with
        independent shops, cafés and ice cream. Holt Country Park has woodland
        trails and a great playground, free to visit and five minutes from the
        studio. A lot of families book a slime session then spend the rest of
        the day here.
      </p>

      <h2>3. Beaches, whatever the weather</h2>
      <p>
        Cromer, Sheringham and Wells-next-the-Sea are all within half an hour of
        us. Off-season beaches are honestly underrated — fewer crowds, dramatic
        skies, and kids don't actually care about the temperature when there's
        sand to dig. Wrap up, take a flask, done.
      </p>

      <h2>4. North Norfolk Railway</h2>
      <p>
        The Poppy Line runs steam trains between Sheringham and Holt — the
        station is right in town, so you can literally catch a steam train to
        your slime session. Children (and let's be honest, grandparents) love it.
      </p>

      <h2>5. Norwich for a bigger day out</h2>
      <p>
        If you're coming from further afield, Norwich has the castle museum,
        the cathedral, Chantry Place for shopping and the Riverside entertainment
        area — an easy way to turn a Norfolk trip into a full weekend.
      </p>

      <h2>6. Special events at the studio</h2>
      <p>
        We run themed sessions through the year — Halloween slime, Christmas
        specials, school holiday events — which often sell out in advance.{" "}
        <Link href="/events">Check the events page</Link> before you plan your
        week, and{" "}
        <Link href="/subscribe">join the mailing list</Link> if you want first
        dibs on new dates.
      </p>

      <h2>Planning a visit?</h2>
      <p>
        We're at Unit A, Feathers Yard, Holt, NR25 6BF — easy to reach from
        across North Norfolk, and about 40 minutes from Norwich. Book ahead at
        weekends and in school holidays as sessions fill up.{" "}
        <Link href="/booking">Book a slime session</Link> or{" "}
        <Link href="/contact">get in touch</Link> with any questions.
      </p>
    </>
  );
}
