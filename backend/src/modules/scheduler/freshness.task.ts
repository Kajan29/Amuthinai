import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import { DonationStatus } from 'src/common/enums/donation-status.enum';
import { Role } from 'src/common/enums/role.enum';
import { URGENT_THRESHOLD_MINUTES, minutesUntilExpiry } from 'src/common/utils/freshness.util';
import { DonationsService } from 'src/modules/donations/donations.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { UsersService } from 'src/modules/users/users.service';

/**
 * FR3 — runs on the schedule in FRESHNESS_CRON (every 15 minutes by default) and does two
 * things: alerts on donations about to pass their safe window, and expires the ones that
 * already have so they stop appearing in volunteer task lists.
 */
@Injectable()
export class FreshnessTask {
  private readonly logger = new Logger(FreshnessTask.name);
  private readonly systemActorId: string;

  constructor(
    private readonly donationsService: DonationsService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    config: ConfigService,
  ) {
    // Status entries need an actor; the scheduler writes as the first admin account.
    this.systemActorId = config.get<string>('systemActorId') ?? '';
  }

  @Cron(process.env.FRESHNESS_CRON ?? '0 */15 * * * *', { name: 'freshness' })
  async run(): Promise<void> {
    await Promise.all([this.alertOnUrgent(), this.expireStale()]);
  }

  /** FR8 — nudge the assigned volunteer while there is still time to deliver. */
  private async alertOnUrgent(): Promise<void> {
    const donations = await this.donationsService.findExpiringWithin(URGENT_THRESHOLD_MINUTES);
    if (donations.length === 0) return;

    this.logger.log(`${donations.length} donation(s) entering the urgent window`);

    for (const donation of donations) {
      await this.notificationsService.sendToUsers([donation.donorId.toString()], {
        title: 'Food is nearing its safe limit',
        body: `${donation.title} expires in ${minutesUntilExpiry(donation.expiresAt)} minutes.`,
        data: { donationId: donation.id as string },
      });
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

    for (const donation of stale) {
      try {
        await this.donationsService.transition(donation.id as string, DonationStatus.Expired, {
          actorId,
          actorRole: Role.Admin,
          note: 'Safe consumption window closed',
        });
      } catch (error) {
        // An illegal transition here means another actor already closed it out.
        this.logger.debug(`Skipped expiring ${donation.id as string}: ${(error as Error).message}`);
      }
    }

    this.logger.log(`Expired ${stale.length} donation(s)`);
  }

  private async firstAdminId(): Promise<string | null> {
    const admins = await this.usersService.findAll({
      role: Role.Admin,
      page: 1,
      pageSize: 1,
      skip: 0,
    });

    return (admins.items[0]?.id as string | undefined) ?? null;
  }
}
