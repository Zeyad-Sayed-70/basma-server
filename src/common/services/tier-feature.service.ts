import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TIER_LIMITS,
  TIER_FEATURES,
  TIER_PRICING,
  TIER_DISPLAY_NAMES,
  TIER_ORDER,
  isUpgrade,
  ResourceType,
  FeatureFlag,
  GRACE_PERIOD_DAYS,
  calculateExpiry,
} from '../constants/tier-limits';
import { Tier } from '@prisma/client';

@Injectable()
export class TierFeatureService {
  constructor(private readonly prisma: PrismaService) {}

  async getTier(instanceId: string): Promise<Tier> {
    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      select: { tier: true, tierExpiresAt: true },
    });
    if (!instance) throw new ForbiddenException('Instance not found');
    return instance.tier;
  }

  async getLimits(instanceId: string) {
    const tier = await this.getTier(instanceId);
    return TIER_LIMITS[tier];
  }

  getLimitsForTier(tier: Tier) {
    return TIER_LIMITS[tier];
  }

  async getFeatures(instanceId: string) {
    const tier = await this.getTier(instanceId);
    return TIER_FEATURES[tier];
  }

  getFeaturesForTier(tier: Tier) {
    return TIER_FEATURES[tier];
  }

  async requireFeature(instanceId: string, feature: FeatureFlag) {
    const tier = await this.getTier(instanceId);
    const features = TIER_FEATURES[tier];
    if (!features[feature]) {
      const display = TIER_DISPLAY_NAMES[tier];
      throw new ForbiddenException(
        `"${feature}" is not available on the ${display.ar} (${display.en}) plan. Please upgrade your plan.`,
      );
    }
  }

  async checkResource(
    instanceId: string,
    resource: ResourceType,
    currentCount: number,
  ) {
    const tier = await this.getTier(instanceId);
    const limit = TIER_LIMITS[tier][resource];
    if (currentCount >= limit) {
      const display = TIER_DISPLAY_NAMES[tier];
      throw new ForbiddenException(
        `Your ${display.ar} (${display.en}) plan allows a maximum of ${limit} ${resource}. Upgrade your plan to increase this limit.`,
      );
    }
  }

  getPricing(tier: Tier) {
    return TIER_PRICING[tier];
  }

  getDisplayName(tier: Tier) {
    return TIER_DISPLAY_NAMES[tier];
  }

  isUpgrade(current: Tier, target: Tier): boolean {
    return isUpgrade(current, target);
  }

  async checkExpiry(instanceId: string): Promise<{
    expired: boolean;
    expiresAt: Date | null;
    daysRemaining: number;
    graceEndsAt: Date | null;
  }> {
    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      select: { tier: true, tierExpiresAt: true },
    });
    if (!instance || instance.tier === 'MUBTADI' || !instance.tierExpiresAt) {
      return {
        expired: false,
        expiresAt: instance?.tierExpiresAt ?? null,
        daysRemaining: Infinity,
        graceEndsAt: null,
      };
    }

    const now = new Date();
    const expiresAt = instance.tierExpiresAt;
    const graceEnd = new Date(expiresAt.getTime());
    graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);

    const msRemaining = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / 86400000));

    return {
      expired: now > graceEnd,
      expiresAt,
      daysRemaining,
      graceEndsAt: graceEnd,
    };
  }

  async activateAllStudents(instanceId: string) {
    await this.prisma.student.updateMany({
      where: { instanceId, status: 'INACTIVE' },
      data: { status: 'ACTIVE' },
    });
  }

  calculateExpiry(periodMonths: number): Date {
    return calculateExpiry(periodMonths);
  }

  getOrderedTiers(): Tier[] {
    return [...TIER_ORDER];
  }
}
