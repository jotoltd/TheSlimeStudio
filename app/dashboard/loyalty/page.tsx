"use client";

import { useEffect, useState } from "react";
import { supabase, type LoyaltyCard, STAMPS_PER_REWARD as DEFAULT_STAMPS } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import PageHeader from "@/components/PageHeader";

export default function LoyaltyAdminPage() {
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stampsPerReward, setStampsPerReward] = useState(DEFAULT_STAMPS);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("loyalty_cards").select("*").order("updated_at", { ascending: false });
    if (data) setCards(data as LoyaltyCard[]);
    const { data: settings } = await supabase.from("site_settings").select("stamps_per_reward").eq("id", 1).single();
    if (settings?.stamps_per_reward) setStampsPerReward(settings.stamps_per_reward);
    setLoading(false);
  }

  const filtered = search
    ? cards.filter((c) =>
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : cards;

  const totalMembers = cards.length;
  const totalStamps = cards.reduce((s, c) => s + c.total_stamps, 0);
  const totalRewardsEarned = cards.reduce((s, c) => s + c.rewards_earned, 0);
  const totalRewardsRedeemed = cards.reduce((s, c) => s + c.rewards_redeemed, 0);
  const availableRewards = totalRewardsEarned - totalRewardsRedeemed;

  async function redeemReward(card: LoyaltyCard) {
    if (card.rewards_earned - card.rewards_redeemed <= 0) return;
    if (!confirm(`Redeem a free session reward for ${card.name}?`)) return;
    const { error } = await supabase
      .from("loyalty_cards")
      .update({ rewards_redeemed: card.rewards_redeemed + 1, updated_at: new Date().toISOString() })
      .eq("id", card.id);
    if (error) { toast("Failed to redeem: " + error.message, "error"); return; }
    toast("Reward redeemed!");
    load();
  }

  async function addStamp(card: LoyaltyCard) {
    const newStamps = card.stamps + 1;
    const newTotal = card.total_stamps + 1;
    let newRewards = card.rewards_earned;
    let stampCount = newStamps;
    if (newStamps >= stampsPerReward) {
      newRewards += 1;
      stampCount = newStamps - stampsPerReward;
    }
    const { error } = await supabase
      .from("loyalty_cards")
      .update({ stamps: stampCount, total_stamps: newTotal, rewards_earned: newRewards, updated_at: new Date().toISOString() })
      .eq("id", card.id);
    if (error) { toast("Failed to add stamp: " + error.message, "error"); return; }
    toast("Stamp added!");
    load();
  }

  async function removeStamp(card: LoyaltyCard) {
    if (card.stamps <= 0) return;
    const { error } = await supabase
      .from("loyalty_cards")
      .update({ stamps: card.stamps - 1, total_stamps: Math.max(0, card.total_stamps - 1), updated_at: new Date().toISOString() })
      .eq("id", card.id);
    if (error) { toast("Failed to remove stamp: " + error.message, "error"); return; }
    toast("Stamp removed");
    load();
  }

  return (
    <div className="py-8 md:py-10 px-5 md:px-10">
      <PageHeader title="Loyalty Programme" subtitle={`Digital stamp cards — ${stampsPerReward} stamps = 1 free session`} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider mb-1">Members</div>
          <div className="font-display text-[1.5rem]">{loading ? "--" : totalMembers}</div>
        </div>
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider mb-1">Total Stamps</div>
          <div className="font-display text-[1.5rem]">{loading ? "--" : totalStamps}</div>
        </div>
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider mb-1">Rewards Earned</div>
          <div className="font-display text-[1.5rem]">{loading ? "--" : totalRewardsEarned}</div>
        </div>
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <div className="text-[0.7rem] text-ink-soft uppercase tracking-wider mb-1">Available to Redeem</div>
          <div className="font-display text-[1.5rem]">{loading ? "--" : availableRewards}</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full max-w-md px-4 py-2.5 border-2 border-ink/15 rounded-xl text-sm focus:outline-none focus:border-sky-blue-light"
        />
      </div>

      {/* Cards */}
      <div className="bg-white rounded-[20px] p-6 md:p-8 shadow-sm">
        {loading ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">Loading loyalty cards...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-ink-soft text-[0.9rem]">
            {search ? "No members found." : "No loyalty members yet. Stamps are automatically awarded when customers book online."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((card) => {
              const availableRewards = card.rewards_earned - card.rewards_redeemed;
              return (
                <div key={card.id} className="rounded-xl border-2 border-ink/[0.08] p-4 hover:border-ink/15 transition-colors">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                    <div>
                      <div className="font-medium text-[0.95rem]">{card.name}</div>
                      <div className="text-[0.8rem] text-ink-soft">{card.email}</div>
                      <div className="text-[0.7rem] text-ink-soft mt-0.5">
                        Member since {new Date(card.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                      </div>
                    </div>
                    {availableRewards > 0 && (
                      <span className="px-3 py-1 rounded-full text-[0.75rem] bg-bright-lavender/20 text-bright-lavender font-medium">
                        {availableRewards} free session{availableRewards > 1 ? "s" : ""} available
                      </span>
                    )}
                  </div>

                  {/* Stamp visual */}
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {Array.from({ length: stampsPerReward }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full grid place-items-center text-[0.7rem] font-bold ${
                          i < card.stamps
                            ? "bg-bright-lavender text-white"
                            : "bg-ink/5 text-ink/30 border-2 border-dashed border-ink/10"
                        }`}
                      >
                        {i < card.stamps ? "★" : i + 1}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-[0.8rem] text-ink-soft mb-3">
                    <span>Current stamps: <strong className="text-ink">{card.stamps}</strong></span>
                    <span>Lifetime stamps: <strong className="text-ink">{card.total_stamps}</strong></span>
                    <span>Rewards redeemed: <strong className="text-ink">{card.rewards_redeemed}</strong></span>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => addStamp(card)}
                      className="px-3 py-1.5 rounded-lg bg-sky-blue-light/30 text-ink text-[0.8rem] hover:bg-sky-blue-light/50 transition-colors"
                    >
                      + Add Stamp
                    </button>
                    <button
                      onClick={() => removeStamp(card)}
                      disabled={card.stamps <= 0}
                      className="px-3 py-1.5 rounded-lg bg-ink/5 text-ink-soft text-[0.8rem] hover:bg-ink/10 transition-colors disabled:opacity-40"
                    >
                      − Remove Stamp
                    </button>
                    {availableRewards > 0 && (
                      <button
                        onClick={() => redeemReward(card)}
                        className="px-3 py-1.5 rounded-lg bg-bright-lavender text-white text-[0.8rem] hover:opacity-90 transition-opacity"
                      >
                        Redeem Free Session
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
