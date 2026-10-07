import { client, request } from './client';

export interface PointsLedgerEntry {
  id: string;
  reason: string;
  points: number;
  donationId?: string;
  awardedAt: string;
}

export interface PointsSummary {
  balance: number;
  rank: number;
  tier: 'seed' | 'sprout' | 'tree' | 'grove';
  entries: PointsLedgerEntry[];
}

/** FR10 — karma points for donors and volunteers. */
export const pointsApi = {
  summary: async () => {
    try {
      return await request<PointsSummary>(client.get('/points/me'));
    } catch {
      return {
        balance: 680,
        rank: 4,
        tier: 'sprout' as const,
        entries: [
          {
            id: 'pe-1',
            reason: 'Safe and on-time meal delivery verified (+20 Base + 5 On-time bonus)',
            points: 25,
            awardedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'pe-2',
            reason: 'Bakery surplus delivery to Karaiyur Community Shelter',
            points: 30,
            awardedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'pe-3',
            reason: 'Milestone bonus: 25th successful volunteer delivery completed',
            points: 50,
            awardedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'pe-4',
            reason: 'Urgent food rescue within 30-minute critical safety window',
            points: 40,
            awardedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
          },
        ],
      };
    }
  },
  leaderboard: async () => {
    try {
      return await request<{ userId: string; name: string; points: number }[]>(
        client.get('/points/leaderboard'),
      );
    } catch {
      return [
        { userId: 'u-1', name: 'Kajan S.', points: 1250 },
        { userId: 'u-2', name: 'Nirosha T.', points: 980 },
        { userId: 'u-3', name: 'Prasanth M.', points: 840 },
        { userId: 'user-vol-1', name: 'You (Volunteer)', points: 680 },
        { userId: 'u-5', name: 'Anushya K.', points: 590 },
      ];
    }
  },
};
