import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CreateDonationPayload, DonorOpenRequest } from '@/api/donations.api';
import { DEFAULT_SAFE_HOURS } from '@/constants';
import { validatePrepareTime } from '@/utils/freshness';

/**
 * `requestSummary` is display-only: it lets every wizard step show who the donor is answering
 * without refetching, and is stripped before the donation is posted.
 */
export type DonationDraft = Partial<CreateDonationPayload> & {
  foodRequestId?: string;
  requestSummary?: DonorOpenRequest;
};

interface DonationDraftState {
  draft: DonationDraft;
  update: (patch: DonationDraft) => void;
  reset: () => void;
  /** True once every field the API requires has been filled in. */
  isComplete: () => boolean;
  hasSavedProgress: () => boolean;
}

const EMPTY: DonationDraft = { photoUrls: [], safeForHours: DEFAULT_SAFE_HOURS };

const STORAGE_KEY = 'amuthinai:donation-draft';

/**
 * Holds the donation being composed across the three wizard steps (FR2, FR3).
 * Persisted so Save Draft survives app restarts.
 */
export const useDonationDraft = create<DonationDraftState>()(
  persist(
    (set, get) => ({
      draft: EMPTY,

      update(patch) {
        set((state) => ({ draft: { ...state.draft, ...patch } }));
      },

      reset() {
        set({ draft: { ...EMPTY, photoUrls: [] } });
      },

      isComplete() {
        const { title, foodType, servings, cookedAt, safeForHours, pickupAddress } = get().draft;
        if (!title || !foodType || !servings || !cookedAt || !safeForHours || !pickupAddress) {
          return false;
        }
        return validatePrepareTime(cookedAt, foodType).ok;
      },

      hasSavedProgress() {
        const { title, photoUrls, cookedAt, pickupAddress } = get().draft;
        return Boolean(title?.trim() || photoUrls?.length || cookedAt || pickupAddress);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
