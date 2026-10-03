import { create } from 'zustand';

import type { CreateRequestPayload } from '@/api/requests.api';

export type RequestDraft = Partial<CreateRequestPayload>;

interface RequestDraftState {
  draft: RequestDraft;
  update: (patch: RequestDraft) => void;
  reset: () => void;
  isComplete: () => boolean;
}

/** Recipient request being composed across the three wizard steps (FR5). */
export const useRequestDraft = create<RequestDraftState>((set, get) => ({
  draft: {},

  update(patch) {
    set((state) => ({ draft: { ...state.draft, ...patch } }));
  },

  reset() {
    set({ draft: {} });
  },

  isComplete() {
    const { servingsNeeded, neededBy, dropAddress } = get().draft;
    return Boolean(servingsNeeded && neededBy && dropAddress);
  },
}));
