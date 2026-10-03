import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { Model, Types } from 'mongoose';

import { DonationStatus } from 'src/common/enums/donation-status.enum';
import { Role } from 'src/common/enums/role.enum';

import { StatusEvent, StatusEventDocument } from './schemas/status-event.schema';

/** Marks the first entry in a donation's chain. */
const GENESIS_HASH = '0'.repeat(64);

export interface AppendStatusInput {
  donationId: string;
  status: DonationStatus;
  actorId: string;
  actorRole: Role;
  note?: string;
}

@Injectable()
export class StatusHistoryService {
  private readonly logger = new Logger(StatusHistoryService.name);

  constructor(@InjectModel(StatusEvent.name) private readonly model: Model<StatusEvent>) {}

  /** FR12 — appends one entry and links it to the previous one. */
  async append(input: AppendStatusInput): Promise<StatusEventDocument> {
    const previous = await this.model
      .findOne({ donationId: input.donationId })
      .sort({ occurredAt: -1, _id: -1 })
      .exec();

    const prevHash = previous?.hash ?? GENESIS_HASH;
    const occurredAt = new Date();

    return this.model.create({
      donationId: new Types.ObjectId(input.donationId),
      status: input.status,
      note: input.note,
      actorId: new Types.ObjectId(input.actorId),
      actorRole: input.actorRole,
      occurredAt,
      prevHash,
      hash: this.digest({ ...input, occurredAt, prevHash }),
    });
  }

  findByDonation(donationId: string) {
    return this.model.find({ donationId }).sort({ occurredAt: 1, _id: 1 }).exec();
  }

  /**
   * NFR7 — recomputes every hash in order. Returns the index of the first entry that does
   * not match, or null when the chain is intact.
   */
  async verifyChain(donationId: string): Promise<{ isIntact: boolean; brokenAt: number | null }> {
    const events = await this.findByDonation(donationId);
    let expectedPrevHash = GENESIS_HASH;

    for (const [index, event] of events.entries()) {
      const recomputed = this.digest({
        donationId,
        status: event.status,
        actorId: event.actorId.toString(),
        actorRole: event.actorRole,
        note: event.note,
        occurredAt: event.occurredAt,
        prevHash: event.prevHash,
      });

      if (event.prevHash !== expectedPrevHash || event.hash !== recomputed) {
        this.logger.warn(`Status chain for donation ${donationId} breaks at entry ${index}`);
        return { isIntact: false, brokenAt: index };
      }

      expectedPrevHash = event.hash;
    }

    return { isIntact: true, brokenAt: null };
  }

  private digest(input: AppendStatusInput & { occurredAt: Date; prevHash: string }): string {
    const canonical = [
      input.prevHash,
      input.donationId,
      input.status,
      input.actorId,
      input.actorRole,
      input.note ?? '',
      input.occurredAt.toISOString(),
    ].join('|');

    return createHash('sha256').update(canonical).digest('hex');
  }
}
