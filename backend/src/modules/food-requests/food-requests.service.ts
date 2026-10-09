import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { paginate, PaginationQueryDto, type PaginatedDto } from 'src/common/dto/pagination.dto';
import { RequestStatus } from 'src/common/enums/request-status.enum';
import { nearSphere } from 'src/common/utils/geo.util';
import { NgosService } from 'src/modules/ngos/ngos.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';

import { CreateFoodRequestDto } from './dto/create-food-request.dto';
import { FoodRequest, FoodRequestDocument } from './schemas/food-request.schema';

/** Radius used for the "relief hubs near you" counter on the recipient dashboard. */
const HUB_RADIUS_KM = 15;

@Injectable()
export class FoodRequestsService {
  constructor(
    @InjectModel(FoodRequest.name) private readonly model: Model<FoodRequest>,
    private readonly ngosService: NgosService,
    private readonly notifications: NotificationsService,
  ) {}

  /** FR5 — one open request per recipient keeps the matching queue honest. */
  async create(recipientId: string, dto: CreateFoodRequestDto): Promise<FoodRequestDocument> {
    const existing = await this.model.exists({
      recipientId: new Types.ObjectId(recipientId),
      status: { $in: [RequestStatus.Open, RequestStatus.Matched] },
    });

    if (existing) {
      throw new BadRequestException('You already have a request in progress');
    }

    if (new Date(dto.neededBy).getTime() <= Date.now()) {
      throw new BadRequestException('The needed-by time must be in the future');
    }

    const request = await this.model.create({
      ...dto,
      familySize: dto.familySize ?? dto.servingsNeeded,
      recipientId: new Types.ObjectId(recipientId),
      neededBy: new Date(dto.neededBy),
    });

    const area = dto.dropAddress.district || dto.dropAddress.city || dto.dropAddress.line1;
    await this.notifications.sendToAdmins({
      title: 'New food request',
      body: `${request.servingsNeeded} servings needed in ${area}`,
      type: 'request',
      data: { requestId: request.id as string },
    });

    return request;
  }

  async findMine(
    recipientId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedDto<FoodRequestDocument>> {
    const filter = { recipientId: new Types.ObjectId(recipientId) };

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('matchedDonationId')
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.pageSize),
      this.model.countDocuments(filter),
    ]);

    return paginate(items, total, query);
  }

  /** Admin lists all food requests across the system */
  async findAll(
    query: PaginationQueryDto & { status?: RequestStatus },
  ): Promise<PaginatedDto<FoodRequestDocument>> {
    const filter: FilterQuery<FoodRequest> = {};
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('recipientId', 'name phone email address')
        .populate('matchedDonationId', 'title servings foodType pickupAddress status photoUrls')
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.pageSize),
      this.model.countDocuments(filter),
    ]);

    return paginate(items, total, query);
  }

  async countRequestsStats(): Promise<{ total: number; open: number; matched: number; fulfilled: number }> {
    const [total, open, matched, fulfilled] = await Promise.all([
      this.model.countDocuments(),
      this.model.countDocuments({ status: RequestStatus.Open }),
      this.model.countDocuments({ status: RequestStatus.Matched }),
      this.model.countDocuments({ status: RequestStatus.Fulfilled }),
    ]);
    return { total, open, matched, fulfilled };
  }

  findByIds(ids: string[]): Promise<FoodRequestDocument[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.model.find({ _id: { $in: ids } }).exec();
  }

  /** Requests already matched to one of these donations (FR6). */
  findByDonationIds(donationIds: string[]): Promise<FoodRequestDocument[]> {
    if (donationIds.length === 0) return Promise.resolve([]);
    return this.model.find({ matchedDonationId: { $in: donationIds } }).exec();
  }

  async findById(id: string): Promise<FoodRequestDocument> {
    const request = await this.model.findById(id).exec();
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  async cancel(id: string, recipientId: string): Promise<FoodRequestDocument> {
    const request = await this.findById(id);
    if (request.recipientId.toString() !== recipientId) {
      throw new ForbiddenException('This request belongs to another recipient');
    }
    if (request.status !== RequestStatus.Open) {
      throw new BadRequestException(
        request.status === RequestStatus.Matched
          ? 'A volunteer is already assigned. Raise a concern so the admin can help.'
          : 'This request is already closed',
      );
    }

    request.status = RequestStatus.Cancelled;
    request.cancelledAt = new Date();
    return request.save();
  }

  /** Recipients only ever see their own requests; admins see all. */
  async findVisible(id: string, user: { id: string; role: string }): Promise<FoodRequestDocument> {
    const request = await this.findById(id);
    if (user.role !== 'admin' && request.recipientId.toString() !== user.id) {
      throw new ForbiddenException('This request belongs to another recipient');
    }
    return request;
  }

  /** FR6 — closest open request to a pickup point, used when a volunteer claims a donation. */
  async findBestOpenMatch(
    coordinates: [number, number],
    radiusKm: number,
  ): Promise<FoodRequestDocument | null> {
    const [match] = await this.findOpenNear(coordinates, radiusKm);
    return match ?? null;
  }

  async update(
    id: string,
    recipientId: string,
    patch: Partial<CreateFoodRequestDto>,
  ): Promise<FoodRequestDocument> {
    const request = await this.findById(id);
    if (request.recipientId.toString() !== recipientId) {
      throw new ForbiddenException('This request belongs to another recipient');
    }
    if (request.status !== RequestStatus.Open) {
      throw new BadRequestException('Only open requests can be modified');
    }

    if (patch.servingsNeeded) request.servingsNeeded = patch.servingsNeeded;
    if (patch.neededBy) request.neededBy = new Date(patch.neededBy);
    if (patch.notes !== undefined) request.notes = patch.notes;
    if (patch.dropAddress) request.dropAddress = patch.dropAddress as any;
    if (patch.familySize) request.familySize = patch.familySize;
    if (patch.dietaryRequirements) request.dietaryRequirements = patch.dietaryRequirements;
    if (patch.foodCategory !== undefined) request.foodCategory = patch.foodCategory;
    if (patch.contactPreference) request.contactPreference = patch.contactPreference;
    if (patch.deliveryMethod) request.deliveryMethod = patch.deliveryMethod;
    if (patch.contactPhone !== undefined) request.contactPhone = patch.contactPhone;

    return request.save();
  }

  /** Open requests a donor can still answer, soonest deadline first. */
  listOpenForDonors(): Promise<FoodRequestDocument[]> {
    return this.model
      .find({ status: RequestStatus.Open, neededBy: { $gt: new Date() } })
      .sort({ neededBy: 1 })
      .limit(30)
      .exec();
  }

  /** FR6 — open requests near a donation's pickup point, soonest deadline first. */
  findOpenNear(coordinates: [number, number], radiusKm: number) {
    return this.model
      .find({
        status: RequestStatus.Open,
        neededBy: { $gt: new Date() },
        'dropAddress.location': nearSphere(coordinates, radiusKm),
      })
      .limit(25)
      .exec();
  }

  async findNearby(
    coordinates: [number, number],
    radiusKm: number = 1,
    excludeRecipientId?: string,
  ) {
    const filter: any = {
      status: { $in: [RequestStatus.Open, RequestStatus.Matched] },
      'dropAddress.location': nearSphere(coordinates, radiusKm),
    };
    if (excludeRecipientId) {
      filter.recipientId = { $ne: new Types.ObjectId(excludeRecipientId) };
    }
    // Other recipients' identities are never exposed; only enough to spot a duplicate.
    return this.model
      .find(filter)
      .select('servingsNeeded status dropAddress.city dropAddress.district createdAt')
      .limit(10)
      .exec();
  }

  async markMatched(id: string, donationId: string): Promise<void> {
    await this.model
      .updateOne(
        { _id: id },
        { status: RequestStatus.Matched, matchedDonationId: new Types.ObjectId(donationId) },
      )
      .exec();
  }

  async markFulfilled(id: string): Promise<void> {
    await this.model
      .updateOne({ _id: id }, { status: RequestStatus.Fulfilled, fulfilledAt: new Date() })
      .exec();
  }

  /** Puts a matched request back in the open queue, e.g. after its donation expired. */
  async reopen(id: string): Promise<void> {
    await this.model
      .updateOne(
        { _id: id, status: RequestStatus.Matched },
        { status: RequestStatus.Open, $unset: { matchedDonationId: 1 } },
      )
      .exec();
  }

  /** Open demand grouped by city/district, including requests already past their needed-by time. */
  aggregateUnfulfilledByArea() {
    return this.model.aggregate<{
      area: string;
      open: number;
      matched: number;
      overdue: number;
      servingsNeeded: number;
    }>([
      { $match: { status: { $in: [RequestStatus.Open, RequestStatus.Matched] } } },
      {
        $group: {
          _id: { $ifNull: ['$dropAddress.district', '$dropAddress.city'] },
          open: { $sum: { $cond: [{ $eq: ['$status', RequestStatus.Open] }, 1, 0] } },
          matched: { $sum: { $cond: [{ $eq: ['$status', RequestStatus.Matched] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $lt: ['$neededBy', new Date()] }, 1, 0] } },
          servingsNeeded: { $sum: '$servingsNeeded' },
        },
      },
      {
        $project: {
          _id: 0,
          area: { $ifNull: ['$_id', 'Unknown'] },
          open: 1,
          matched: 1,
          overdue: 1,
          servingsNeeded: 1,
        },
      },
      { $sort: { servingsNeeded: -1 } },
    ]);
  }

  async householdsServed(): Promise<number> {
    const recipients = await this.model.distinct('recipientId', {
      status: RequestStatus.Fulfilled,
    });
    return recipients.length;
  }

  async unmetServings(): Promise<number> {
    const [row] = await this.model.aggregate<{ servings: number }>([
      { $match: { status: RequestStatus.Open } },
      { $group: { _id: null, servings: { $sum: '$servingsNeeded' } } },
    ]);
    return row?.servings ?? 0;
  }

  /** FR8 — open demand grouped by district, feeding the admin heat-map. */
  aggregateDemandByDistrict() {
    return this.model.aggregate<{
      district: string;
      latitude: number;
      longitude: number;
      openRequests: number;
      servingsNeeded: number;
    }>([
      { $match: { status: RequestStatus.Open } },
      {
        $group: {
          _id: { $ifNull: ['$dropAddress.district', '$dropAddress.city'] },
          openRequests: { $sum: 1 },
          servingsNeeded: { $sum: '$servingsNeeded' },
          latitude: { $avg: { $arrayElemAt: ['$dropAddress.location.coordinates', 1] } },
          longitude: { $avg: { $arrayElemAt: ['$dropAddress.location.coordinates', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          district: '$_id',
          openRequests: 1,
          servingsNeeded: 1,
          latitude: 1,
          longitude: 1,
        },
      },
      { $sort: { servingsNeeded: -1 } },
    ]);
  }

  /** Stats for recipient dashboard */
  async statsFor(recipientId: string) {
    const [activeNeedsCount, totalRequests, fulfilledCount] = await Promise.all([
      this.model.countDocuments({
        recipientId: new Types.ObjectId(recipientId),
        status: { $in: [RequestStatus.Open, RequestStatus.Matched] },
      }),
      this.model.countDocuments({
        recipientId: new Types.ObjectId(recipientId),
      }),
      this.model.countDocuments({
        recipientId: new Types.ObjectId(recipientId),
        status: RequestStatus.Fulfilled,
      }),
    ]);

    // Calculate total servings received
    const servingsResult = await this.model.aggregate([
      {
        $match: {
          recipientId: new Types.ObjectId(recipientId),
          status: RequestStatus.Fulfilled,
        },
      },
      {
        $group: {
          _id: null,
          totalServings: { $sum: '$servingsNeeded' },
        },
      },
    ]);

    const mealsShared = servingsResult.length > 0 ? servingsResult[0].totalServings : 0;

    const latest = await this.model
      .findOne({ recipientId: new Types.ObjectId(recipientId) })
      .sort({ createdAt: -1 })
      .exec();
    const origin = latest?.dropAddress?.location?.coordinates;
    const nearbyHubs = origin
      ? await this.ngosService.countActiveNear(origin, HUB_RADIUS_KM)
      : await this.ngosService.countActive();

    return {
      activeNeeds: activeNeedsCount,
      totalRequests,
      fulfilled: fulfilledCount,
      mealsShared,
      nearbyHubs,
    };
  }
}
