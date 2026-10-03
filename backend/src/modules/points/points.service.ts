import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { UsersService } from 'src/modules/users/users.service';

import { PointsEntry, PointsEntryDocument } from './schemas/points-entry.schema';

export type KarmaTier = 'seed' | 'sprout' | 'tree' | 'grove';

/** FR10 — points awarded per event. */
export const POINTS = {
  donationDelivered: 50,
  deliveryCompleted: 30,
  firstDonation: 100,
} as const;

const TIER_THRESHOLDS: { tier: KarmaTier; min: number }[] = [
  { tier: 'grove', min: 2000 },
  { tier: 'tree', min: 750 },
  { tier: 'sprout', min: 200 },
  { tier: 'seed', min: 0 },
];

export interface PointsSummary {
  balance: number;
  rank: number;
  tier: KarmaTier;
  entries: PointsEntryDocument[];
}

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    @InjectModel(PointsEntry.name) private readonly model: Model<PointsEntry>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * FR10 — writing the ledger entry and bumping the denormalised counter on the user are
   * separate steps; the unique index makes a repeated call a no-op rather than a double award.
   */
  async award(userId: string, reason: string, points: number, donationId?: string): Promise<void> {
    try {
      await this.model.create({
        userId: new Types.ObjectId(userId),
        reason,
        points,
        donationId: donationId ? new Types.ObjectId(donationId) : undefined,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        this.logger.debug(`Points for "${reason}" already awarded to ${userId}`);
        return;
      }
      throw error;
    }

    await this.usersService.addKarmaPoints(userId, points);
  }

  async balanceOf(userId: string): Promise<number> {
    const [result] = await this.model.aggregate<{ balance: number }>([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $group: { _id: null, balance: { $sum: '$points' } } },
    ]);

    return result?.balance ?? 0;
  }

  async summaryFor(userId: string): Promise<PointsSummary> {
    const [balance, entries] = await Promise.all([
      this.balanceOf(userId),
      this.model.find({ userId }).sort({ awardedAt: -1 }).limit(50).exec(),
    ]);

    return {
      balance,
      rank: await this.rankOf(balance),
      tier: this.tierFor(balance),
      entries,
    };
  }

  async leaderboard(limit = 20) {
    return this.model.aggregate<{ userId: string; name: string; points: number }>([
      { $group: { _id: '$userId', points: { $sum: '$points' } } },
      { $sort: { points: -1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 0, userId: '$_id', name: '$user.name', points: 1 } },
    ]);
  }

  private async rankOf(balance: number): Promise<number> {
    const ahead = await this.model.aggregate<{ count: number }>([
      { $group: { _id: '$userId', points: { $sum: '$points' } } },
      { $match: { points: { $gt: balance } } },
      { $count: 'count' },
    ]);

    return (ahead[0]?.count ?? 0) + 1;
  }

  private tierFor(balance: number): KarmaTier {
    return TIER_THRESHOLDS.find((entry) => balance >= entry.min)?.tier ?? 'seed';
  }
}
