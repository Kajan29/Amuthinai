import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import { DonationStatus } from 'src/common/enums/donation-status.enum';
import { Role } from 'src/common/enums/role.enum';
import { URGENT_THRESHOLD_MINUTES, minutesUntilExpiry } from 'src/common/utils/freshness.util';
import { AssignmentsService } from 'src/modules/assignments/assignments.service';
import { DonationsService } from 'src/modules/donations/donations.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { UsersService } from 'src/modules/users/users.service';

/**
 * FR3 — runs on the schedule in FRESHNESS_CRON (every 15 minutes by default). It alerts on
 * donations about to pass their safe window, expires the ones that already have, and flags
 * deliveries that are stuck at one step for too long.
 */
@Injectable()
export class FreshnessTask {
  private readonly logger = new Logger(FreshnessTask.name);
  private readonly systemActorId: string;
  /** Alerts already sent in this process, so a 15-minute cron does not repeat them. */
  private readonly alerted = new Set<string>();

  constructor(
    private readonly donationsService: DonationsService,
    private readonly assignmentsService: AssignmentsService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    config: ConfigService,
  ) {
    // Status entries need an actor; the scheduler writes as the first admin account.
    this.systemActorId = config.get<string>('systemActorId') ?? '';
  }

  @Cron(process.env.FRESHNESS_CRON ?? '0 */15 * * * *', { name: 'freshness' })
  async run(): Promise<void> {
    await Promise.all([this.alertOnUrgent(), this.expireStale(), this.alertOnDelays()]);
  }

  /** FR8 — warn the donor, the assigned volunteer and the admins while there is still time. */
  private async alertOnUrgent(): Promise<void> {
    const donations = await this.donationsService.findExpiringWithin(URGENT_THRESHOLD_MINUTES);
    const fresh = donations.filter((donation) => !this.alerted.has(`urgent:${donation.id as string}`));
    if (fresh.length === 0) return;

    this.logger.log(`${fresh.length} donation(s) entering the urgent window`);
    const live = await this.assignmentsService.findLiveForDonations(
      fresh.map((donation) => donation.id as string),
    );

    for (const donation of fresh) {
      const id = donation.id as string;
      this.alerted.add(`urgent:${id}`);
      const minutes = minutesUntilExpiry(donation.expiresAt);
      const payload = {
        title: 'Urgent: food nearing its safe limit',
        body: `${donation.title} must be delivered within ${minutes} minutes.`,
        type: 'urgent' as const,
        data: { donationId: id },
      };

      const carrierIds = live
        .filter((assignment) => assignment.donationId.toString() === id)
        .map((assignment) => assignment.volunteerId.toString());

      await this.notificationsService.sendToUsers([donation.donorId.toString(), ...carrierIds], payload);

      if (donation.status === DonationStatus.PendingApproval) {
        await this.notificationsService.sendToAdmins({
          ...payload,
          title: 'Urgent: review this donation now',
          body: `${donation.title} is still waiting for approval and is safe for ${minutes} more minutes.`,
        });
      } else if (carrierIds.length === 0) {
        // Nobody is moving it yet: admins and nearby available volunteers both hear about it.
        await this.donationsService.alertQuickCollection(donation);
      } else {
        await this.notificationsService.sendToAdmins(payload);
      }
    }
  }

  /** FR3 — anything past its window is closed out and recorded in the status log (FR12). */
  private async expireStale(): Promise<void> {
    const stale = await this.donationsService.findStale();
    if (stale.length === 0) return;

    const actorId = this.systemActorId || (await this.firstAdminId());
    if (!actorId) {
      this.logger.warn('No admin account exists; cannot write expiry status entries');
      return;
    }

    let expired = 0;
    for (const donation of stale) {
      const id = donation.id as string;
      try {
        await this.donationsService.transition(id, DonationStatus.Expired, {
          actorId,
          actorRole: Role.Admin,
          note: 'Safe consumption window closed',
        });
        expired += 1;
        await this.assignmentsService.closeForExpiredDonation(id);
        await this.notificationsService.sendToUsers([donation.donorId.toString()], {
          title: 'Donation expired',
          body: `${donation.title} passed its safe window before it could be delivered.`,
          type: 'urgent',
          data: { donationId: id },
        });
      } catch (error) {
        // Picked-up food cannot expire automatically; an admin follows up via delay alerts.
        this.logger.debug(`Skipped expiring ${id}: ${(error as Error).message}`);
      }
    }

    if (expired > 0) this.logger.log(`Expired ${expired} donation(s)`);
  }

  /** Live monitoring — tell admins about tasks stuck waiting for acceptance, pickup or delivery. */
  private async alertOnDelays(): Promise<void> {
    const delayed = await this.assignmentsService.findDelayed();
    for (const assignment of delayed) {
      const key = `delay:${assignment.id as string}:${assignment.status}:${assignment.pickedUpAt ? 'transit' : 'pickup'}`;
      if (this.alerted.has(key)) continue;
      this.alerted.add(key);

      const donation = await this.donationsService
        .findById(assignment.donationId.toString())
        .catch(() => null);
      if (!donation) continue;

      const stage =
        assignment.status === 'offered'
          ? 'is still waiting for a volunteer to accept'
          : assignment.pickedUpAt
            ? 'has not been delivered yet'
            : 'has not been picked up yet';

      await this.notificationsService.sendToAdmins({
        title: 'Delivery delayed',
        body: `${donation.title} ${stage}.`,
        type: 'delay',
        data: { assignmentId: assignment.id as string, donationId: donation.id as string },
      });
    }
  }

  private async firstAdminId(): Promise<string | null> {
    const admins = await this.usersService.adminIds();
    return admins[0] ?? null;
  }
}
