import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { paginate, type PaginatedDto } from 'src/common/dto/pagination.dto';
import { DeliveryMethod } from 'src/common/enums/donation-details.enum';
import {
  DonationStatus,
  TERMINAL_DONATION_STATUSES,
  canTransition,
} from 'src/common/enums/donation-status.enum';
import { RequestStatus } from 'src/common/enums/request-status.enum';
import { Role } from 'src/common/enums/role.enum';
import {
  URGENT_THRESHOLD_MINUTES,
  assertPrepareTimeForPost,
  clampSafeHours,
  expiresAt,
  minutesUntilExpiry,
} from 'src/common/utils/freshness.util';
import { distanceKm, nearSphere } from 'src/common/utils/geo.util';
import {
  FoodRequest,
  type FoodRequestDocument,
} from 'src/modules/food-requests/schemas/food-request.schema';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { StatusHistoryService } from 'src/modules/status-history/status-history.service';
import { UsersService } from 'src/modules/users/users.service';

import { ClaimDonationDto } from './dto/claim-donation.dto';
import { CreateDonationDto } from './dto/create-donation.dto';
import { QueryDonationsDto } from './dto/query-donations.dto';
import { Donation, DonationDocument } from './schemas/donation.schema';

export interface DonorStats {
  totalDonations: number;
  servingsShared: number;
  karmaPoints: number;
}

/** A general donation as a recipient sees it before claiming: no donor contact details. */
export interface AvailableDonationView {
  id: string;
  title: string;
  foodType: string;
  servings: number;
  quantityUnit: string | null;
  dietaryTags: string[];
  description: string | null;
  photoUrl: string | null;
  status: DonationStatus;
  areaLabel: string;
  pickupLocation: [number, number] | null;
  distanceKm: number | null;
  cookedAt: string;
  expiresAt: string;
  minutesLeft: number;
  isUrgent: boolean;
  donorName: string;
  preferredDeliveryMethod: DeliveryMethod | null;
}

/** Volunteers this close to an urgent pickup are pinged directly. */
const QUICK_COLLECTION_RADIUS_KM = 15;

/** Donations a recipient can still claim. Rejected/assigned/closed food is never offered. */
const CLAIMABLE_STATUSES = [DonationStatus.PendingApproval, DonationStatus.Approved];

@Injectable()
export class DonationsService {
  constructor(
    @InjectModel(Donation.name) private readonly donationModel: Model<Donation>,
    @InjectModel(FoodRequest.name) private readonly requestModel: Model<FoodRequest>,
    private readonly statusHistory: StatusHistoryService,
    private readonly notifications: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  /** FR2, FR3 */
  async create(donorId: string, dto: CreateDonationDto): Promise<DonationDocument> {
    const cookedAt = new Date(dto.cookedAt);
    assertPrepareTimeForPost(dto.foodType, cookedAt);

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
      foodRequestId: dto.foodRequestId ? new Types.ObjectId(dto.foodRequestId) : undefined,
      claimedAt: dto.foodRequestId ? new Date() : undefined,
      status: DonationStatus.PendingApproval,
    });

    let request: FoodRequest | null = null;
    if (dto.foodRequestId) {
      try {
        request = await this.claimRequest(dto.foodRequestId, donation.id as string);
      } catch (error) {
        await this.donationModel.deleteOne({ _id: donation._id }).exec();
        throw error;
      }
    }

    await this.statusHistory.append({
      donationId: donation.id as string,
      status: DonationStatus.PendingApproval,
      actorId: donorId,
      actorRole: Role.Donor,
      note: request ? 'Donation submitted for a recipient request' : 'General donation submitted',
    });

    const urgent = minutesUntilExpiry(expiry) <= URGENT_THRESHOLD_MINUTES;
    await this.notifications.sendToAdmins({
      title: urgent ? 'Urgent: review this donation quickly' : 'New donation awaiting approval',
      body: `${donation.title} — ${donation.servings} servings, safe until ${formatTime(expiry)}${
        request ? ' · answers a recipient request' : ' · general donation'
      }`,
      type: urgent ? 'urgent' : 'donation',
      data: { donationId: donation.id as string },
    });

    if (request) {
      await this.notifications.sendToUsers([request.recipientId.toString()], {
        title: 'A donor answered your request',
        body: `${donation.title} (${donation.servings} servings) is waiting for admin approval.`,
        type: 'request',
        data: { requestId: dto.foodRequestId as string, donationId: donation.id as string },
      });
    }

    return donation;
  }

  /**
   * A recipient claims a general donation. The donation is taken with a single conditional
   * update, so two recipients tapping "Claim" at once can never both win.
   */
  async claim(
    donationId: string,
    recipientId: string,
    dto: ClaimDonationDto,
  ): Promise<{ donation: DonationDocument; requestId: string }> {
    const active = await this.requestModel.exists({
      recipientId: new Types.ObjectId(recipientId),
      status: { $in: [RequestStatus.Open, RequestStatus.Matched] },
    });
    if (active) {
      throw new BadRequestException(
        'You already have a request in progress. Finish or cancel it before claiming more food.',
      );
    }

    const recipient = await this.usersService.findById(recipientId);
    const dropAddress = dto.dropAddress ?? recipient.address;
    if (!dropAddress?.location?.coordinates?.length) {
      throw new BadRequestException('Add your address so the food can reach you');
    }

    const requestId = new Types.ObjectId();
    const now = new Date();
    const claimed = await this.donationModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(donationId),
          foodRequestId: { $exists: false },
          status: { $in: CLAIMABLE_STATUSES },
          expiresAt: { $gt: now },
        },
        { $set: { foodRequestId: requestId, claimedAt: now } },
        { new: true },
      )
      .exec();

    if (!claimed) {
      const exists = await this.donationModel.exists({ _id: donationId });
      if (!exists) throw new NotFoundException('Donation not found');
      throw new ConflictException('Another recipient has already claimed this food');
    }

    try {
      await this.requestModel.create({
        _id: requestId,
        recipientId: new Types.ObjectId(recipientId),
        servingsNeeded: Math.min(dto.servingsNeeded ?? claimed.servings, claimed.servings),
        neededBy: claimed.expiresAt,
        notes: dto.notes,
        familySize: dto.servingsNeeded ?? claimed.servings,
        contactPhone: dto.contactPhone ?? recipient.phone,
        dropAddress,
        status: RequestStatus.Matched,
        matchedDonationId: claimed._id,
        origin: 'claim',
      });
    } catch (error) {
      await this.donationModel
        .updateOne({ _id: claimed._id }, { $unset: { foodRequestId: 1, claimedAt: 1 } })
        .exec();
      throw error;
    }

    await this.statusHistory.append({
      donationId,
      status: claimed.status,
      actorId: recipientId,
      actorRole: Role.Recipient,
      note: 'Claimed by a recipient',
    });

    await Promise.all([
      this.notifications.sendToUsers([claimed.donorId.toString()], {
        title: 'A recipient claimed your donation',
        body: `${recipient.name.split(' ')[0]} claimed ${claimed.title}.`,
        type: 'donation',
        data: { donationId },
      }),
      this.notifications.sendToAdmins({
        title:
          claimed.status === DonationStatus.PendingApproval
            ? 'Claimed donation awaiting approval'
            : 'Claimed donation ready to dispatch',
        body: `${claimed.title} was claimed by ${recipient.name}. Choose how it will be delivered.`,
        type: 'donation',
        data: { donationId },
      }),
    ]);

    return { donation: claimed, requestId: requestId.toString() };
  }

  /** Admin pairs an unclaimed general donation with an open request, under the same guard. */
  async linkRequest(donationId: string, requestId: string, adminId: string) {
    const now = new Date();
    const donation = await this.donationModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(donationId),
          foodRequestId: { $exists: false },
          status: { $in: CLAIMABLE_STATUSES },
          expiresAt: { $gt: now },
        },
        { $set: { foodRequestId: new Types.ObjectId(requestId), claimedAt: now } },
        { new: true },
      )
      .exec();
    if (!donation) {
      throw new ConflictException('This donation already has a recipient or is no longer open');
    }

    let request: FoodRequest;
    try {
      request = await this.claimRequest(requestId, donationId);
    } catch (error) {
      await this.donationModel
        .updateOne({ _id: donation._id }, { $unset: { foodRequestId: 1, claimedAt: 1 } })
        .exec();
      throw error;
    }

    await this.statusHistory.append({
      donationId,
      status: donation.status,
      actorId: adminId,
      actorRole: Role.Admin,
      note: 'Recipient request linked by admin',
    });

    await this.notifications.sendToUsers([request.recipientId.toString()], {
      title: 'Food found for your request',
      body: `${donation.title} (${donation.servings} servings) has been set aside for you.`,
      type: 'request',
      data: { requestId, donationId },
    });

    return donation;
  }

  /** The recipient a donation is confirmed for, or null for an unclaimed general donation. */
  recipientOf(donation: DonationDocument): Promise<FoodRequestDocument | null> {
    if (!donation.foodRequestId) return Promise.resolve(null);
    return this.requestModel.findById(donation.foodRequestId).exec();
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
    const saved = await donation.save();

    const request = await this.recipientOf(saved);
    await this.notifications.sendToUsers([donation.donorId.toString()], {
      title: 'Donation approved',
      body: request
        ? `${donation.title} was approved. The admin is choosing how it will be delivered.`
        : `${donation.title} was approved and is now visible to recipients who can claim it.`,
      type: 'donation',
      data: { donationId: id },
    });

    if (request) {
      await this.notifications.sendToUsers([request.recipientId.toString()], {
        title: 'Your food was approved',
        body: `${donation.title} passed the safety review. Delivery details are on the way.`,
        type: 'request',
        data: { requestId: request.id as string, donationId: id },
      });
    }

    if (minutesUntilExpiry(saved.expiresAt) <= URGENT_THRESHOLD_MINUTES) {
      await this.alertQuickCollection(saved);
    }

    return saved;
  }

  /**
   * Food close to its safe limit: tell admins, and if a volunteer could take it, the
   * available volunteers close to the pickup. Returns how many volunteers were pinged.
   */
  async alertQuickCollection(donation: DonationDocument): Promise<number> {
    const minutesLeft = Math.max(0, minutesUntilExpiry(donation.expiresAt));
    const area = donation.pickupAddress.city || donation.pickupAddress.line1;
    const body = `${donation.title} — ${donation.servings} servings in ${area}. Safe for ${minutesLeft} more minutes.`;

    await this.notifications.sendToAdmins({
      title: 'Urgent: needs quick collection',
      body,
      type: 'urgent',
      data: { donationId: donation.id as string },
    });

    const volunteerCanTake =
      donation.status === DonationStatus.Approved &&
      Boolean(donation.foodRequestId) &&
      (!donation.deliveryMethod || donation.deliveryMethod === DeliveryMethod.VolunteerRider);
    if (!volunteerCanTake) return 0;

    const volunteers = await this.usersService.findVolunteersNear(
      donation.pickupAddress.location.coordinates,
      QUICK_COLLECTION_RADIUS_KM,
    );
    const ids = volunteers.map((volunteer) => volunteer.id as string);
    await this.notifications.sendToUsers(ids, {
      title: 'Urgent pickup near you',
      body,
      type: 'urgent',
      data: { donationId: donation.id as string },
    });
    return ids.length;
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
    const saved = await donation.save();

    await this.notifications.sendToUsers([donation.donorId.toString()], {
      title: 'Donation not approved',
      body: `${donation.title}: ${reason}`,
      type: 'donation',
      data: { donationId: id },
    });

    return saved;
  }

  /** Admin flags a donation */
  async flag(id: string, adminId: string, reason: string): Promise<DonationDocument> {
    const donation = await this.findById(id);
    donation.isFlagged = true;
    donation.flagReason = reason;
    await donation.save();

    await this.statusHistory.append({
      donationId: id,
      status: donation.status,
      actorId: adminId,
      actorRole: Role.Admin,
      note: `Flagged: ${reason}`,
    });

    return donation;
  }

  async countDonationsStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    delivered: number;
    urgent: number;
  }> {
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const [total, pending, approved, delivered, urgent] = await Promise.all([
      this.donationModel.countDocuments(),
      this.donationModel.countDocuments({ status: DonationStatus.PendingApproval }),
      this.donationModel.countDocuments({ status: DonationStatus.Approved }),
      this.donationModel.countDocuments({ status: DonationStatus.Delivered }),
      this.donationModel.countDocuments({
        status: { $in: [DonationStatus.PendingApproval, DonationStatus.Approved] },
        expiresAt: { $lte: twoHoursFromNow, $gt: new Date() },
      }),
    ]);
    return { total, pending, approved, delivered, urgent };
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

    if (donation.foodRequestId && next === DonationStatus.Delivered) {
      await this.requestModel
        .updateOne(
          { _id: donation.foodRequestId },
          { status: RequestStatus.Fulfilled, fulfilledAt: new Date() },
        )
        .exec();
    }

    if (
      donation.foodRequestId &&
      (next === DonationStatus.Cancelled ||
        next === DonationStatus.Rejected ||
        next === DonationStatus.Expired)
    ) {
      await this.releaseRequest(donation, next);
    }

    return donation;
  }

  /** Take an open recipient request so a second donor cannot answer the same need. */
  private async claimRequest(requestId: string, donationId: string): Promise<FoodRequestDocument> {
    const claimed = await this.requestModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(requestId),
          status: RequestStatus.Open,
          neededBy: { $gt: new Date() },
        },
        {
          status: RequestStatus.Matched,
          matchedDonationId: new Types.ObjectId(donationId),
        },
        { new: true },
      )
      .exec();

    if (!claimed) {
      throw new ConflictException('This request was already answered by another donor');
    }
    return claimed;
  }

  /**
   * When a donation does not go through, a recipient's own request goes back to the donor
   * list; a claim on a general donation has nothing left to wait for, so it is closed.
   */
  private async releaseRequest(donation: DonationDocument, next: DonationStatus): Promise<void> {
    const request = await this.requestModel
      .findOne({
        matchedDonationId: donation._id,
        status: RequestStatus.Matched,
      })
      .exec();
    if (!request) return;

    if (request.origin === 'claim') {
      request.status = RequestStatus.Cancelled;
      request.cancelledAt = new Date();
    } else {
      request.status = RequestStatus.Open;
      request.matchedDonationId = undefined;
    }
    await request.save();

    const reason =
      next === DonationStatus.Expired
        ? 'passed its safe time'
        : next === DonationStatus.Rejected
          ? 'did not pass the safety review'
          : 'was cancelled';
    await this.notifications.sendToUsers([request.recipientId.toString()], {
      title: 'Donation update',
      body:
        request.origin === 'claim'
          ? `${donation.title} ${reason}. Please claim other available food.`
          : `${donation.title} ${reason}. Your request is open again for other donors.`,
      type: 'request',
      data: { requestId: request.id as string },
    });
  }

  timeline(donationId: string) {
    return this.statusHistory.findByDonation(donationId);
  }

  /**
   * FR6 — approved donations near a point that a volunteer may pick up: a recipient is
   * already confirmed and nobody chose a pickup or self-delivery handover instead.
   */
  findApprovedNear(coordinates: [number, number], radiusKm: number) {
    return this.donationModel
      .find({
        status: DonationStatus.Approved,
        expiresAt: { $gt: new Date() },
        foodRequestId: { $exists: true },
        deliveryMethod: { $nin: [DeliveryMethod.RecipientPickup, DeliveryMethod.SelfDrop] },
        'pickupAddress.location': nearSphere(coordinates, radiusKm),
      })
      .limit(50)
      .exec();
  }

  /** Admin confirms how the food will move, once it is approved and has a recipient. */
  async confirmDeliveryMethod(id: string, method: DeliveryMethod): Promise<DonationDocument> {
    const donation = await this.donationModel
      .findOneAndUpdate(
        { _id: id, status: DonationStatus.Approved },
        { $set: { deliveryMethod: method, deliveryMethodConfirmedAt: new Date() } },
        { new: true },
      )
      .exec();
    if (!donation) throw new BadRequestException('Only approved donations can be dispatched');
    return donation;
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
        status: {
          $in: [DonationStatus.PendingApproval, DonationStatus.Approved, DonationStatus.Assigned],
        },
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

  /**
   * General donations a recipient can still claim: not rejected or closed, not yet confirmed
   * for anyone, and inside the safe window. Soonest-expiring first so urgent food goes first.
   */
  async getAvailableForRecipient(
    recipientId: string,
    query: QueryDonationsDto,
  ): Promise<PaginatedDto<AvailableDonationView>> {
    const filter: FilterQuery<Donation> = {
      status: { $in: CLAIMABLE_STATUSES },
      foodRequestId: { $exists: false },
      expiresAt: { $gt: new Date() },
    };

    const [items, total, recipient] = await Promise.all([
      this.donationModel
        .find(filter)
        .populate<{ donorId: { name?: string } | null }>('donorId', 'name')
        .sort({ expiresAt: 1 })
        .skip(query.skip)
        .limit(query.pageSize),
      this.donationModel.countDocuments(filter),
      this.usersService.findById(recipientId).catch(() => null),
    ]);

    const origin = recipient?.address?.location?.coordinates;
    const views = items.map((donation): AvailableDonationView => {
      const minutesLeft = Math.max(0, minutesUntilExpiry(donation.expiresAt));
      const pickup = donation.pickupAddress?.location?.coordinates ?? null;
      const donor = donation.donorId as unknown as { name?: string } | null;
      return {
        id: donation.id as string,
        title: donation.title,
        foodType: donation.foodType,
        servings: donation.servings,
        quantityUnit: donation.quantityUnit ?? null,
        dietaryTags: donation.dietaryTags ?? [],
        description: donation.description ?? null,
        photoUrl: donation.photoUrls?.[0] ?? null,
        status: donation.status,
        areaLabel:
          [donation.pickupAddress?.city, donation.pickupAddress?.district]
            .filter(Boolean)
            .join(', ') || donation.pickupAddress?.line1,
        pickupLocation: pickup,
        distanceKm: origin && pickup ? distanceKm(origin, pickup) : null,
        cookedAt: donation.cookedAt.toISOString(),
        expiresAt: donation.expiresAt.toISOString(),
        minutesLeft,
        isUrgent: minutesLeft <= URGENT_THRESHOLD_MINUTES,
        donorName: donor?.name?.split(' ')[0] || 'A donor',
        preferredDeliveryMethod: donation.deliveryMethod ?? null,
      };
    });

    return paginate(views, total, query);
  }

  /** Delivered servings and counts grouped by food type, for admin analytics. */
  foodTypeBreakdown() {
    return this.donationModel.aggregate<{ foodType: string; count: number; servings: number }>([
      { $match: { status: { $nin: [DonationStatus.Rejected, DonationStatus.Cancelled] } } },
      { $group: { _id: '$foodType', count: { $sum: 1 }, servings: { $sum: '$servings' } } },
      { $project: { _id: 0, foodType: '$_id', count: 1, servings: 1 } },
      { $sort: { count: -1 } },
    ]);
  }

  /** Delivered donations per calendar month since `from`. */
  monthlyDelivered(from: Date) {
    return this.donationModel.aggregate<{
      year: number;
      month: number;
      deliveries: number;
      servings: number;
    }>([
      { $match: { status: DonationStatus.Delivered, updatedAt: { $gte: from } } },
      {
        $group: {
          _id: { year: { $year: '$updatedAt' }, month: { $month: '$updatedAt' } },
          deliveries: { $sum: 1 },
          servings: { $sum: '$servings' },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          deliveries: 1,
          servings: 1,
        },
      },
    ]);
  }

  async deliveredTotals(since?: Date): Promise<{ deliveries: number; servings: number }> {
    const match: FilterQuery<Donation> = { status: DonationStatus.Delivered };
    if (since) match.updatedAt = { $gte: since };
    const [row] = await this.donationModel.aggregate<{ deliveries: number; servings: number }>([
      { $match: match },
      { $group: { _id: null, deliveries: { $sum: 1 }, servings: { $sum: '$servings' } } },
    ]);
    return row ?? { deliveries: 0, servings: 0 };
  }

  countExpired() {
    return this.donationModel.countDocuments({ status: DonationStatus.Expired }).exec();
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Colombo',
  });
}
