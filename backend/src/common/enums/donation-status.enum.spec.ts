import { DonationStatus, canTransition } from './donation-status.enum';

describe('donation status transitions', () => {
  it('allows the happy path end to end', () => {
    const flow = [
      DonationStatus.PendingApproval,
      DonationStatus.Approved,
      DonationStatus.Assigned,
      DonationStatus.PickedUp,
      DonationStatus.InTransit,
      DonationStatus.Delivered,
    ];

    for (let index = 0; index < flow.length - 1; index += 1) {
      expect(canTransition(flow[index], flow[index + 1])).toBe(true);
    }
  });

  it('refuses to skip the admin review', () => {
    expect(canTransition(DonationStatus.PendingApproval, DonationStatus.Assigned)).toBe(false);
  });

  it('refuses to reopen a delivered donation', () => {
    expect(canTransition(DonationStatus.Delivered, DonationStatus.InTransit)).toBe(false);
  });

  it('lets a declined offer return the donation to the pool', () => {
    expect(canTransition(DonationStatus.Assigned, DonationStatus.Approved)).toBe(true);
  });
});
