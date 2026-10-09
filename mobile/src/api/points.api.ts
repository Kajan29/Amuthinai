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
  summary: () => request<PointsSummary>(client.get('/points/me')),

  leaderboard: () =>
    request<{ userId: string; name: string; points: number }[]>(client.get('/points/leaderboard')),
};
