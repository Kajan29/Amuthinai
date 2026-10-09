import { create } from 'zustand';

import type { CreateRequestPayload } from '@/api/requests.api';

export interface RequestDraft extends Omit<Partial<CreateRequestPayload>, 'deliveryMethod'> {
  hubId?: string;
  hubName?: string;
  hubAddress?: string;
  hubDistance?: string;
  mealCategory?: string;
  dietaryPreference?: string;
  deliveryMethod?: string;
}

interface RequestDraftState {
  draft: RequestDraft;
  update: (patch: Partial<RequestDraft>) => void;
  reset: () => void;
  isComplete: () => boolean;
}

/** Recipient request being composed across the three wizard steps (FR5). */
export const useRequestDraft = create<RequestDraftState>((set, get) => ({
  draft: {
    servingsNeeded: 1,
    neededBy: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  },

  update(patch) {
    set((state) => ({ draft: { ...state.draft, ...patch } }));
  },

  reset() {
    set({
      draft: {
        servingsNeeded: 1,
        neededBy: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      },
    });
  },

  isComplete() {
    const { servingsNeeded, dropAddress } = get().draft;
    return Boolean(servingsNeeded && dropAddress);
  },
}));
