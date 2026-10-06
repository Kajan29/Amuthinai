import { create } from 'zustand';

import type { CreateRequestPayload } from '@/api/requests.api';

export interface RequestDraft extends Partial<CreateRequestPayload> {
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
    hubId: '1',
    hubName: 'Jaffna Town Relief Hub',
    hubAddress: 'Hospital Road, Jaffna',
    hubDistance: '0.6 km away',
    mealCategory: 'Cooked Hot Meals (Rice, Sambar & Curry)',
    servingsNeeded: 3,
    dietaryPreference: 'Pure Vegetarian (No meat/eggs)',
    deliveryMethod: 'Volunteer Doorstep Delivery',
    neededBy: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    dropAddress: {
      line1: 'Hospital Road',
      city: 'Jaffna',
      location: { type: 'Point', coordinates: [80.0167, 9.6615] },
    },
  },

  update(patch) {
    set((state) => ({ draft: { ...state.draft, ...patch } }));
  },

  reset() {
    set({
      draft: {
        hubId: '1',
        hubName: 'Jaffna Town Relief Hub',
        hubAddress: 'Hospital Road, Jaffna',
        hubDistance: '0.6 km away',
        mealCategory: 'Cooked Hot Meals (Rice, Sambar & Curry)',
        servingsNeeded: 3,
        dietaryPreference: 'Pure Vegetarian (No meat/eggs)',
        deliveryMethod: 'Volunteer Doorstep Delivery',
        neededBy: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        dropAddress: {
          line1: 'Hospital Road',
          city: 'Jaffna',
          location: { type: 'Point', coordinates: [80.0167, 9.6615] },
        },
      },
    });
  },

  isComplete() {
    const { servingsNeeded, dropAddress } = get().draft;
    return Boolean(servingsNeeded && dropAddress);
  },
}));
