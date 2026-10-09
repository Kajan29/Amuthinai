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

import { CreateFoodRequestDto } from './dto/create-food-request.dto';
import { FoodRequest, FoodRequestDocument } from './schemas/food-request.schema';

@Injectable()
export class FoodRequestsService {
  constructor(@InjectModel(FoodRequest.name) private readonly model: Model<FoodRequest>) {}

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

    return this.model.create({
      ...dto,
      recipientId: new Types.ObjectId(recipientId),
      neededBy: new Date(dto.neededBy),
    });
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

    request.status = RequestStatus.Cancelled;
    return request.save();
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

    return request.save();
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
    return this.model
      .find(filter)
      .populate('recipientId', 'name phone email')
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
    await this.model.updateOne({ _id: id }, { status: RequestStatus.Fulfilled }).exec();
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
      { $match: { status: RequestStatus.Open, neededBy: { $gt: new Date() } } },
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

    return {
      activeNeeds: activeNeedsCount,
      totalRequests,
      mealsShared,
      nearbyHubs: 4, // TODO: Calculate based on actual hub/NGO locations
    };
  }
}
