import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { paginate, PaginationQueryDto, type PaginatedDto } from 'src/common/dto/pagination.dto';
import { AssignmentStatus } from 'src/common/enums/assignment-status.enum';
import { DonationStatus } from 'src/common/enums/donation-status.enum';
import { Role } from 'src/common/enums/role.enum';
import { VEHICLE_CAPACITY_SERVINGS } from 'src/common/enums/vehicle-type.enum';
import { minutesUntilExpiry } from 'src/common/utils/freshness.util';
import { distanceKm } from 'src/common/utils/geo.util';
import { generateDeliveryPin } from 'src/common/utils/pin.util';
import { DeliveryProofService } from 'src/modules/delivery-proof/delivery-proof.service';
import type { SubmitProofDto } from 'src/modules/delivery-proof/dto/submit-proof.dto';
import { DonationsService } from 'src/modules/donations/donations.service';
import type { DonationDocument } from 'src/modules/donations/schemas/donation.schema';
import { FoodRequestsService } from 'src/modules/food-requests/food-requests.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { POINTS, PointsService } from 'src/modules/points/points.service';
import type { UserDocument } from 'src/modules/users/schemas/user.schema';
import { UsersService } from 'src/modules/users/users.service';

import { Assignment, AssignmentDocument } from './schemas/assignment.schema';

export interface VolunteerSuggestion {
  volunteer: UserDocument;
  distanceKm: number;
  activeAssignments: number;
  /** 0–1; higher is a better match. */
  score: number;
}

export interface NearbyTask {
  assignment: AssignmentDocument;
  donation: DonationDocument;
  distanceKm: number;
  minutesLeft: number;
}

/** How much each factor contributes to the match score (FR6). */
const WEIGHTS = { proximity: 0.5, capacity: 0.3, workload: 0.2 };

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Assignment.name) private readonly model: Model<Assignment>,
    private readonly donationsService: DonationsService,
    private readonly foodRequestsService: FoodRequestsService,
    private readonly usersService: UsersService,
    private readonly deliveryProofService: DeliveryProofService,
    private readonly notificationsService: NotificationsService,
    private readonly pointsService: PointsService,
  ) {}

  /**
   * FR6, FR7 — ranks verified volunteers for a donation. A volunteer is excluded when the
   * pickup falls outside their declared travel radius; the rest are scored on how close they
   * are, whether their vehicle can carry the load, and how busy they already are.
   */
  async suggestVolunteers(donationId: string): Promise<VolunteerSuggestion[]> {
    const donation = await this.donationsService.findById(donationId);
    const pickup = donation.pickupAddress.location.coordinates;

    // Search the widest radius any volunteer may declare, then filter per volunteer below.
    const candidates = await this.usersService.findVolunteersNear(pickup, 50);

    const scored = await Promise.all(
      candidates.map(async (volunteer) => {
        const home = volunteer.address?.location.coordinates;
        if (!home) return null;

        const distance = distanceKm(home, pickup);
        const radius = volunteer.travelRadiusKm ?? 5;
        if (distance > radius) return null;

        const activeAssignments = await this.model.countDocuments({
          volunteerId: volunteer._id,
          status: { $in: [AssignmentStatus.Offered, AssignmentStatus.Accepted] },
        });

        const capacity = volunteer.vehicleType
          ? VEHICLE_CAPACITY_SERVINGS[volunteer.vehicleType]
          : 0;

        const proximityScore = 1 - distance / radius;
        const capacityScore = capacity >= donation.servings ? 1 : capacity / donation.servings;
        const workloadScore = 1 / (1 + activeAssignments);

        return {
          volunteer,
          distanceKm: distance,
          activeAssignments,
          score:
            proximityScore * WEIGHTS.proximity +
            capacityScore * WEIGHTS.capacity +
            workloadScore * WEIGHTS.workload,
        } satisfies VolunteerSuggestion;
      }),
    );

    return scored
      .filter((entry): entry is VolunteerSuggestion => entry !== null)
      .sort((a, b) => b.score - a.score);
  }

  /** FR6 — admin creates the offer; the donation moves to `assigned`. */
  async create(
    adminId: string,
    input: { donationId: string; volunteerId: string; requestId?: string },
  ): Promise<AssignmentDocument> {
    const donation = await this.donationsService.findById(input.donationId);
    if (donation.status !== DonationStatus.Approved) {
      throw new BadRequestException('Only an approved donation can be assigned');
    }

    const volunteer = await this.usersService.findById(input.volunteerId);
    if (!volunteer.isVerified || volunteer.role !== Role.Volunteer) {
      throw new BadRequestException('That user is not a verified volunteer');
    }

    const home = volunteer.address?.location.coordinates;
    const assignment = await this.model.create({
      donationId: new Types.ObjectId(input.donationId),
      volunteerId: new Types.ObjectId(input.volunteerId),
      requestId: input.requestId ? new Types.ObjectId(input.requestId) : undefined,
      deliveryPin: generateDeliveryPin(),
      distanceKm: home ? distanceKm(home, donation.pickupAddress.location.coordinates) : 0,
    });

    await this.donationsService.transition(input.donationId, DonationStatus.Assigned, {
      actorId: adminId,
      actorRole: Role.Admin,
      note: `Offered to ${volunteer.name}`,
    });

    if (input.requestId) {
      await this.foodRequestsService.markMatched(input.requestId, input.donationId);
    }

    // FR8
    await this.notificationsService.sendToUsers([input.volunteerId], {
      title: 'New pickup nearby',
      body: `${donation.title} — ${donation.servings} servings, ${assignment.distanceKm} km away`,
      data: { assignmentId: assignment.id as string },
    });

    return assignment;
  }

  /** FR8 — the volunteer's task list, urgent first. */
  async findNearbyFor(volunteerId: string): Promise<NearbyTask[]> {
    const assignments = await this.model
      .find({
        volunteerId,
        status: { $in: [AssignmentStatus.Offered, AssignmentStatus.Accepted] },
      })
      .exec();

    const tasks = await Promise.all(
      assignments.map(async (assignment) => {
        const donation = await this.donationsService.findById(assignment.donationId.toString());

        return {
          assignment,
          donation,
          distanceKm: assignment.distanceKm,
          minutesLeft: minutesUntilExpiry(donation.expiresAt),
        } satisfies NearbyTask;
      }),
    );

    return tasks.sort((a, b) => a.minutesLeft - b.minutesLeft);
  }

  async findMine(
    volunteerId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedDto<AssignmentDocument>> {
    const filter = { volunteerId: new Types.ObjectId(volunteerId) };

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ offeredAt: -1 }).skip(query.skip).limit(query.pageSize),
      this.model.countDocuments(filter),
    ]);

    return paginate(items, total, query);
  }

  async findById(id: string): Promise<AssignmentDocument> {
    const assignment = await this.model.findById(id).exec();
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async accept(id: string, volunteerId: string): Promise<AssignmentDocument> {
    const assignment = await this.findOwned(id, volunteerId);
    if (assignment.status !== AssignmentStatus.Offered) {
      throw new BadRequestException('This offer is no longer open');
    }

    assignment.status = AssignmentStatus.Accepted;
    assignment.acceptedAt = new Date();
    return assignment.save();
  }

  /** A decline returns the donation to the pool so an admin can offer it to someone else. */
  async decline(id: string, volunteerId: string, reason?: string): Promise<AssignmentDocument> {
    const assignment = await this.findOwned(id, volunteerId);
    if (assignment.status !== AssignmentStatus.Offered) {
      throw new BadRequestException('This offer is no longer open');
    }

    assignment.status = AssignmentStatus.Declined;
    assignment.declineReason = reason;
    await assignment.save();

    await this.donationsService.transition(
      assignment.donationId.toString(),
      DonationStatus.Approved,
      { actorId: volunteerId, actorRole: Role.Volunteer, note: reason ?? 'Offer declined' },
    );

    return assignment;
  }

  /** FR9 — pickup proof moves the donation to picked_up, then straight to in_transit. */
  async confirmPickup(id: string, volunteerId: string, dto: SubmitProofDto) {
    const assignment = await this.findOwned(id, volunteerId);
    if (assignment.status !== AssignmentStatus.Accepted) {
      throw new BadRequestException('Accept the assignment before confirming pickup');
    }

    const proof = await this.deliveryProofService.record(id, 'pickup', dto, false);
    const donationId = assignment.donationId.toString();

    await this.donationsService.transition(donationId, DonationStatus.PickedUp, {
      actorId: volunteerId,
      actorRole: Role.Volunteer,
      note: 'Food collected from the donor',
    });
    await this.donationsService.transition(donationId, DonationStatus.InTransit, {
      actorId: volunteerId,
      actorRole: Role.Volunteer,
      note: 'On the way to the recipient',
    });

    return proof;
  }

  /** FR9 — the PIN is what proves the food reached the intended recipient. */
  async confirmDelivery(id: string, volunteerId: string, dto: SubmitProofDto) {
    const assignment = await this.model.findById(id).select('+deliveryPin').exec();
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.volunteerId.toString() !== volunteerId) {
      throw new ForbiddenException('This assignment belongs to another volunteer');
    }

    if (!dto.pin || dto.pin !== assignment.deliveryPin) {
      throw new BadRequestException('That PIN does not match the code shown to the recipient');
    }

    const proof = await this.deliveryProofService.record(id, 'delivery', dto, true);
    const donationId = assignment.donationId.toString();

    await this.donationsService.transition(donationId, DonationStatus.Delivered, {
      actorId: volunteerId,
      actorRole: Role.Volunteer,
      note: 'Delivered and confirmed by PIN',
    });

    assignment.status = AssignmentStatus.Completed;
    assignment.completedAt = new Date();
    await assignment.save();

    if (assignment.requestId) {
      await this.foodRequestsService.markFulfilled(assignment.requestId.toString());
    }

    // FR10
    const donation = await this.donationsService.findById(donationId);
    await Promise.all([
      this.pointsService.award(
        volunteerId,
        'Delivery completed',
        POINTS.deliveryCompleted,
        donationId,
      ),
      this.pointsService.award(
        donation.donorId.toString(),
        'Donation delivered',
        POINTS.donationDelivered,
        donationId,
      ),
    ]);

    return proof;
  }

  countActiveDeliveries() {
    return this.model.countDocuments({ status: AssignmentStatus.Accepted }).exec();
  }

  private async findOwned(id: string, volunteerId: string): Promise<AssignmentDocument> {
    const assignment = await this.findById(id);
    if (assignment.volunteerId.toString() !== volunteerId) {
      throw new ForbiddenException('This assignment belongs to another volunteer');
    }
    return assignment;
  }
}
