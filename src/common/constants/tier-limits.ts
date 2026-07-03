import { Tier } from '@prisma/client';

export const TIER_LIMITS: Record<
  Tier,
  {
    groups: number;
    students: number;
    courses: number;
    sessionsPerMonth: number;
    quizzes: number;
    assignments: number;
    fileStorageMB: number;
    whatsappNotifsPerMonth: number;
  }
> = {
  MUBTADI: {
    groups: 1,
    students: 20,
    courses: 3,
    sessionsPerMonth: 10,
    quizzes: 10,
    assignments: 10,
    fileStorageMB: 5120,
    whatsappNotifsPerMonth: 60,
  },
  MUHTARIF: {
    groups: 3,
    students: 300,
    courses: 10,
    sessionsPerMonth: 100,
    quizzes: 30,
    assignments: 30,
    fileStorageMB: 51200,
    whatsappNotifsPerMonth: 1000,
  },
  KHEBIR: {
    groups: 10,
    students: 1000,
    courses: 30,
    sessionsPerMonth: 500,
    quizzes: 150,
    assignments: 150,
    fileStorageMB: 204800,
    whatsappNotifsPerMonth: 5000,
  },
  HOUT: {
    groups: Infinity,
    students: Infinity,
    courses: Infinity,
    sessionsPerMonth: Infinity,
    quizzes: Infinity,
    assignments: Infinity,
    fileStorageMB: 512000,
    whatsappNotifsPerMonth: Infinity,
  },
} as const;

export type ResourceType = keyof (typeof TIER_LIMITS)[Tier];

export const TIER_FEATURES: Record<
  Tier,
  {
    whiteLabel: boolean;
    customDomain: boolean;
    paymentManagement: boolean;
    aiAgent: boolean;
    bulkImport: boolean;
    curriculum: boolean;
    liveChat: boolean;
    sessionNotifications: boolean;
  }
> = {
  MUBTADI: {
    whiteLabel: true,
    customDomain: false,
    paymentManagement: true,
    aiAgent: false,
    bulkImport: false,
    curriculum: true,
    liveChat: true,
    sessionNotifications: false,
  },
  MUHTARIF: {
    whiteLabel: true,
    customDomain: true,
    paymentManagement: true,
    aiAgent: false,
    bulkImport: true,
    curriculum: true,
    liveChat: true,
    sessionNotifications: true,
  },
  KHEBIR: {
    whiteLabel: true,
    customDomain: true,
    paymentManagement: true,
    aiAgent: true,
    bulkImport: true,
    curriculum: true,
    liveChat: true,
    sessionNotifications: true,
  },
  HOUT: {
    whiteLabel: true,
    customDomain: true,
    paymentManagement: true,
    aiAgent: true,
    bulkImport: true,
    curriculum: true,
    liveChat: true,
    sessionNotifications: true,
  },
} as const;

export type FeatureFlag = keyof (typeof TIER_FEATURES)[Tier];

export const TIER_PRICING: Record<
  Tier,
  { monthly: number; halfYearly: number; yearly: number }
> = {
  MUBTADI: { monthly: 0, halfYearly: 0, yearly: 0 },
  MUHTARIF: { monthly: 35000, halfYearly: 199500, yearly: 378000 },
  KHEBIR: { monthly: 55000, halfYearly: 313500, yearly: 594000 },
  HOUT: { monthly: 95000, halfYearly: 541500, yearly: 1026000 },
} as const;

export const TIER_DISPLAY_NAMES: Record<Tier, { ar: string; en: string }> = {
  MUBTADI: { ar: 'مبتدئ', en: 'Beginner' },
  MUHTARIF: { ar: 'محترف', en: 'Professional' },
  KHEBIR: { ar: 'خبير', en: 'Expert' },
  HOUT: { ar: 'حوت', en: 'Whale' },
};

export const TIER_ORDER: Tier[] = ['MUBTADI', 'MUHTARIF', 'KHEBIR', 'HOUT'];

export function isUpgrade(current: Tier, target: Tier): boolean {
  return TIER_ORDER.indexOf(target) > TIER_ORDER.indexOf(current);
}

export const GRACE_PERIOD_DAYS = 7;

export function calculateExpiry(periodMonths: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + periodMonths);
  return date;
}
