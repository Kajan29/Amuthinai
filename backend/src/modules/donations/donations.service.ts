import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { paginate, type PaginatedDto } from 'src/common/dto/pagination.dto';
import {
  DonationStatus,
  TERMINAL_DONATION_STATUSES,
  canTransition,
} from 'src/common/enums/donation-status.enum';
import { Role } from 'src/common/enums/role.enum';
import { clampSafeHours, expiresAt } from 'src/common/utils/freshness.util';
import { nearSphere } from 'src/common/utils/geo.util';
import { StatusHistoryService } from 'src/modules/status-history/status-history.service';

import { CreateDonationDto } from './dto/create-donation.dto';
import { QueryDonationsDto } from './dto/query-donations.dto';
import { Donation, DonationDocument } from './schemas/donation.schema';

export interface DonorStats {
  totalDonations: number;
  servingsShared: number;
  karmaPoints: number;
}

@Injectable()
export class DonationsService {
  constructor(
    @InjectModel(Donation.name) private readonly donationModel: Model<Donation>,
    private readonly statusHistory: StatusHistoryService,
  ) {}

  /** FR2, FR3 */
  async create(donorId: string, dto: CreateDonationDto): Promise<DonationDocument> {
    const cookedAt = new Date(dto.cookedAt);
    if (cookedAt.getTime() > Date.now()) {
      throw new BadRequestException('Cooked time cannot be in the future');
    }

    // FR3 — the declared window is capped by the food type, and must not already be over.
    const safeForHours = clampSafeHours(dto.foodType, dto.safeForHours);
    const expiry = expiresAt(cookedAt, safeForHours);
    if (expiry.getTime() <= Date.now()) {
      throw new BadRequestException('This food has already passed its safe window');
    }

    const donation = await this.donationModel.create({
      ...dto,
      donorId: new Types.ObjectId(donorId),
      cookedAt,
      safeForHours,
      expiresAt: expiry,
      photoUrls: dto.photoUrls ?? [],
      status: DonationStatus.PendingApproval,
    });

    await this.statusHistory.append({
      donationId: donation.id as string,
      status: DonationStatus.PendingApproval,
      actorId: donorId,
      actorRole: Role.Donor,
      note: 'Donation submitted',
    });

    return donation;
  }

  async findAll(
    query: QueryDonationsDto,
    scope?: { donorId?: string },
  ): Promise<PaginatedDto<DonationDocument>> {
    const filter: FilterQuery<Donation> = {};
    if (query.status?.length) filter.status = { $in: query.status };
    if (scope?.donorId) filter.donorId = new Types.ObjectId(scope.donorId);

    const [items, total] = await Promise.all([
      this.donationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.pageSize),
      this.donationModel.countDocuments(filter),
    ]);

    return paginate(items, total, query);
  }

  async findById(id: string): Promise<DonationDocument> {
    const donation = await this.donationModel.findById(id).exec();
    if (!donation) throw new NotFoundException('Donation not found');
    return donation;
  }

  /** A donor may only read and act on their own donations; admins see everything. */
  async findOwned(id: string, donorId: string): Promise<DonationDocument> {
    const donation = await this.findById(id);
    if (donation.donorId.toString() !== donorId) {
      throw new ForbiddenException('This donation belongs to another donor');
    }
    return donation;
  }

  /** FR4 */
  async approve(id: string, adminId: string): Promise<DonationDocument> {
    const donation = await this.transition(id, DonationStatus.Approved, {
      actorId: adminId,
      actorRole: Role.Admin,
      note: 'Approved by admin',
    });

    donation.reviewedBy = new Types.ObjectId(adminId);
    donation.reviewedAt = new Date();
    return donation.save();
  }

  /** FR4 */
  async reject(id: string, adminId: string, reason: string): Promise<DonationDocument> {
    const donation = await this.transition(id, DonationStatus.Rejected, {
      actorId: adminId,
      actorRole: Role.Admin,
      note: reason,
    });

    donation.rejectionReason = reason;
    donation.reviewedBy = new Types.ObjectId(adminId);
    donation.reviewedAt = new Date();
    return donation.save();
  }

  async cancel(id: string, donorId: string): Promise<DonationDocument> {
    await this.findOwned(id, donorId);
    return this.transition(id, DonationStatus.Cancelled, {
      actorId: donorId,
      actorRole: Role.Donor,
      note: 'Cancelled by donor',
    });
  }

  /**
   * The single place a donation's status changes. Rejects illegal transitions and writes the
   * matching history entry, so the status field and the log can never disagree (FR12).
   */
  async transition(
    id: string,
    next: DonationStatus,
    actor: { actorId: string; actorRole: Role; note?: string },
  ): Promise<DonationDocument> {
    const donation = await this.findById(id);

    if (!canTransition(donation.status, next)) {
      throw new BadRequestException(`A donation that is ${donation.status} cannot become ${next}`);
    }

    donation.status = next;
    await donation.save();

    await this.statusHistory.append({
      donationId: id,
      status: next,
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      note: actor.note,
    });

    return donation;
  }

  timeline(donationId: string) {
    return this.statusHistory.findByDonation(donationId);
  }

  /** FR6 — approved donations near a point, freshest deadline first. */
  findApprovedNear(coordinates: [number, number], radiusKm: number) {
    return this.donationModel
      .find({
        status: DonationStatus.Approved,
        expiresAt: { $gt: new Date() },
        'pickupAddress.location': nearSphere(coordinates, radiusKm),
      })
      .limit(50)
      .exec();
  }

  /** FR3 — used by the scheduler to close out donations nobody collected in time. */
  findStale(now: Date = new Date()) {
    return this.donationModel
      .find({
        expiresAt: { $lte: now },
        status: { $nin: TERMINAL_DONATION_STATUSES },
      })
      .exec();
  }

  /** FR8 — donations whose window closes inside the given number of minutes. */
  findExpiringWithin(minutes: number, now: Date = new Date()) {
    return this.donationModel
      .find({
        status: { $in: [DonationStatus.Approved, DonationStatus.Assigned] },
        expiresAt: { $gt: now, $lte: new Date(now.getTime() + minutes * 60_000) },
      })
      .exec();
  }

  /** Every donation the donor has posted, newest first. Used by the donor home screen. */
  listForDonor(donorId: string): Promise<DonationDocument[]> {
    return this.donationModel
      .find({ donorId: new Types.ObjectId(donorId) })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  async statsFor(donorId: string): Promise<Omit<DonorStats, 'karmaPoints'>> {
    const [result] = await this.donationModel.aggregate<{
      totalDonations: number;
      servingsShared: number;
    }>([
      { $match: { donorId: new Types.ObjectId(donorId), status: DonationStatus.Delivered } },
      {
        $group: {
          _id: null,
          totalDonations: { $sum: 1 },
          servingsShared: { $sum: '$servings' },
        },
      },
    ]);

    return result ?? { totalDonations: 0, servingsShared: 0 };
  }
}
