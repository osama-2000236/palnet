import { KaramaReward, type KaramaReward as KaramaRewardDto } from "@baydar/shared";

export type KaramaRewardKey = "boost" | "premium" | "featured";

export const KARAMA_REWARDS: {
  reward: KaramaRewardDto;
  key: KaramaRewardKey;
  cost: number;
}[] = [
  { reward: KaramaReward.BOOST_APPLICATION, key: "boost", cost: 100 },
  { reward: KaramaReward.PREMIUM_30D, key: "premium", cost: 500 },
  { reward: KaramaReward.FEATURED_PROFILE_7D, key: "featured", cost: 1000 },
];
