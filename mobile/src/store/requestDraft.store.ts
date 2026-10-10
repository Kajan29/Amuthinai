import { create } from 'zustand';

import type { CreateRequestPayload } from '@/api/requests.api';
import type { ContactPreference, RequestDeliveryMethod } from '@/types';

export interface RequestDraft extends Partial<CreateRequestPayload> {
  hubId?: string;
  hubName?: string;
  hubAddress?: string;
  hubDistance?: string;
  mealCategory?: string;
  dietaryPreference?: string;
}

interface RequestDraftState {
  draft: RequestDraft;
  update: (patch: Partial<RequestDraft>) => void;
  reset: () => void;
  isComplete: () => boolean;
}

const EMPTY: RequestDraft = {
  servingsNeeded: 1,
  familySize: 1,
  neededBy: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  dietaryRequirements: [],
  contactPreference: 'in_app' as ContactPreference,
  deliveryMethod: 'doorstep' as RequestDeliveryMethod,
};

/** Recipient request being composed across the three wizard steps (FR5). */
export const useRequestDraft = create<RequestDraftState>((set, get) => ({
  draft: { ...EMPTY },

  update(patch) {
    set((state) => ({ draft: { ...state.draft, ...patch } }));
  },

  reset() {
    set({
      draft: {
        ...EMPTY,
        neededBy: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      },
    });
  },

  isComplete() {
    const { servingsNeeded, dropAddress, familySize } = get().draft;
    return Boolean(servingsNeeded && familySize && dropAddress);
  },
}));
