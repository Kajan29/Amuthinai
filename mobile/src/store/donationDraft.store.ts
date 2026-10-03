import { create } from 'zustand';

import type { CreateDonationPayload } from '@/api/donations.api';
import { DEFAULT_SAFE_HOURS } from '@/constants';

export type DonationDraft = Partial<CreateDonationPayload>;

interface DonationDraftState {
  draft: DonationDraft;
  update: (patch: DonationDraft) => void;
  reset: () => void;
  /** True once every field the API requires has been filled in. */
  isComplete: () => boolean;
}

const EMPTY: DonationDraft = { photoUrls: [], safeForHours: DEFAULT_SAFE_HOURS };

/**
 * Holds the donation being composed across the three wizard steps (FR2, FR3). Kept out of
 * route params so a step can be revisited without re-entering earlier answers.
 */
export const useDonationDraft = create<DonationDraftState>((set, get) => ({
  draft: EMPTY,

  update(patch) {
    set((state) => ({ draft: { ...state.draft, ...patch } }));
  },

  reset() {
    set({ draft: EMPTY });
  },

  isComplete() {
    const { title, foodType, servings, cookedAt, safeForHours, pickupAddress } = get().draft;
    return Boolean(title && foodType && servings && cookedAt && safeForHours && pickupAddress);
  },
}));
