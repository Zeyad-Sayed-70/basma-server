export const TIER_LIMITS = {
  FREE: { groups: 1, students: 10 },
  MID: { groups: 5, students: 50 },
  BIG: { groups: 20, students: 200 },
  HUGE: { groups: Infinity, students: Infinity },
} as const;

export type TierName = keyof typeof TIER_LIMITS;
