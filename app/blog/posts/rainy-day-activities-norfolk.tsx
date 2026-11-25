import Link from "next/link";
import type { PostMeta } from "../posts";

export const meta: PostMeta = {
  slug: "rainy-day-activities-norfolk",
  title: "Rainy Day Activities in Norfolk: What to Do When the Weather Turns",
  description:
    "Norfolk weather doing its thing? Indoor activities that actually keep kids happy — from slime-making in Holt to museums, trains and cafés worth the trip.",
  date: "2026-11-19",
  category: "Days Out",
  readTime: "4 min read",
  image: "/images/slime_studio_pink_slime_pot.jpg.jpeg",
};

export default function Content() {
  return (
    <>
      <p>
        Norfolk is beautiful, but let's be honest — it rains. A lot. And when
        you've got children bouncing off the walls on a grey Saturday, "just go
        to the beach" stops being a plan. Here's a genuinely useful list of
        rainy day activities in Norfolk, tried and tested by local families.
      </p>

      <h2>Make slime at The Slime Studio, Holt</h2>
      <p>
        Yes, we're first on our own list — but hear us out. A{" "}
        <Link href="/booking">one-hour slime session</Link> is exactly what a
        rainy day needs: indoors, fully hands-on, and every child leaves with
        a pot of slime they made themselves. £15 per slime maker, all ages
        welcome, and it's about 40 minutes from Norwich, 25 from Fakenham and
        20 from Cromer. Book ahead on wet weekends — the whole of Norfolk has
        the same idea.
      </p>

      <h2>Explore Holt town centre</h2>
      <p>
        Holt punches way above its size for a rainy afternoon — independent
        shops, proper cafés, galleries and Bakers &amp; Larners (the "Harrods
        of Norfolk" food hall). It pairs perfectly with a studio session since
        we're a two-minute walk from the centre.
      </p>

      <h2>Norwich Castle Museum</h2>
      <p>
        The recently refurbished castle keep is one of the best indoor days
        out in the county — history, art galleries, and enough space to burn
        off energy when outside isn't an option. Pair it with lunch in the
        city and you've got a full day sorted.
      </p>

      <h2>Steam trains on the Poppy Line</h2>
      <p>
        The North Norfolk Railway runs between Sheringham and Holt — steam
        engines, heritage carriages, and you're inside the whole time. It
        genuinely feels like an event rather than just transport, and Holt
        station is a short walk from the studio.
      </p>

      <h2>Sea Life &amp; other soft play staples</h2>
      <p>
        If you're nearer the coast, Great Yarmouth's Sea Life centre is a
        reliable wet-weather fallback, and there are soft plays scattered
        around Norwich, King's Lynn and Great Yarmouth for younger kids who
        just need to climb things.
      </p>

      <h2>Save it for later</h2>
      <p>
        Bookmark this for the next grey forecast — and if a birthday's coming
        up in the wetter months, our{" "}
        <Link href="/parties">private slime parties</Link> are fully indoors
        with the mess included.{" "}
        <Link href="/booking">Book a session here</Link> or{" "}
        <Link href="/events">see what's on</Link> over the holidays.
      </p>
    </>
  );
}
