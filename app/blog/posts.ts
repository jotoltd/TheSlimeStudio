import type { ComponentType } from "react";
import KidsBirthdayPartiesNorwich, { meta as m1 } from "./posts/kids-birthday-parties-norwich";
import ThingsToDoKidsNorfolk, { meta as m2 } from "./posts/things-to-do-with-kids-norfolk";
import SlimePartyNorfolk, { meta as m3 } from "./posts/slime-party-norfolk";
import ChristmasDaysOutNorfolk, { meta as m4 } from "./posts/christmas-days-out-norfolk";
import RainyDayNorfolk, { meta as m5 } from "./posts/rainy-day-activities-norfolk";
import SlimeVsSoftPlay, { meta as m6 } from "./posts/slime-party-vs-soft-play";
import PartyBagIdeas, { meta as m7 } from "./posts/party-bag-ideas-kids";

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  readTime: string;
  image: string;
};

export type Post = { meta: PostMeta; Content: ComponentType };

export const POSTS: Post[] = [
  { meta: m4, Content: ChristmasDaysOutNorfolk },
  { meta: m1, Content: KidsBirthdayPartiesNorwich },
  { meta: m6, Content: SlimeVsSoftPlay },
  { meta: m3, Content: SlimePartyNorfolk },
  { meta: m5, Content: RainyDayNorfolk },
  { meta: m2, Content: ThingsToDoKidsNorfolk },
  { meta: m7, Content: PartyBagIdeas },
];

export function getPost(slug: string) {
  return POSTS.find((p) => p.meta.slug === slug);
}
