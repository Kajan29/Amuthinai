export enum DonationStatus {
  PendingApproval = 'pending_approval',
  Approved = 'approved',
  Rejected = 'rejected',
  Assigned = 'assigned',
  PickedUp = 'picked_up',
  InTransit = 'in_transit',
  Delivered = 'delivered',
  Expired = 'expired',
  Cancelled = 'cancelled',
}

/**
 * Allowed status transitions. The donations service checks this map before writing, so an
 * out-of-order update is rejected rather than silently corrupting the timeline (FR12).
 */
export const DONATION_TRANSITIONS: Record<DonationStatus, DonationStatus[]> = {
  [DonationStatus.PendingApproval]: [
    DonationStatus.Approved,
    DonationStatus.Rejected,
    DonationStatus.Expired,
    DonationStatus.Cancelled,
  ],
  [DonationStatus.Approved]: [
    DonationStatus.Assigned,
    DonationStatus.Expired,
    DonationStatus.Cancelled,
  ],
  [DonationStatus.Assigned]: [
    DonationStatus.PickedUp,
    DonationStatus.Approved,
    DonationStatus.Expired,
    DonationStatus.Cancelled,
  ],
  // A recipient collecting in person receives the food at the moment it is collected.
  [DonationStatus.PickedUp]: [
    DonationStatus.InTransit,
    DonationStatus.Delivered,
    DonationStatus.Cancelled,
  ],
  [DonationStatus.InTransit]: [DonationStatus.Delivered, DonationStatus.Cancelled],
  [DonationStatus.Delivered]: [],
  [DonationStatus.Rejected]: [],
  [DonationStatus.Expired]: [],
  [DonationStatus.Cancelled]: [],
};

export const TERMINAL_DONATION_STATUSES = [
  DonationStatus.Delivered,
  DonationStatus.Rejected,
  DonationStatus.Expired,
  DonationStatus.Cancelled,
];

export function canTransition(from: DonationStatus, to: DonationStatus): boolean {
  return DONATION_TRANSITIONS[from].includes(to);
}
