import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import type { AuthUser } from 'src/common/decorators/current-user.decorator';
import { paginate, PaginationQueryDto, type PaginatedDto } from 'src/common/dto/pagination.dto';
import { AssignmentStatus } from 'src/common/enums/assignment-status.enum';
import { DeliveryMethod } from 'src/common/enums/donation-details.enum';
import { DonationStatus } from 'src/common/enums/donation-status.enum';
import { RequestStatus } from 'src/common/enums/request-status.enum';
import { Role } from 'src/common/enums/role.enum';
import { VEHICLE_CAPACITY_SERVINGS } from 'src/common/enums/vehicle-type.enum';
import { URGENT_THRESHOLD_MINUTES, minutesUntilExpiry } from 'src/common/utils/freshness.util';
import { distanceKm } from 'src/common/utils/geo.util';
import { generateDeliveryPin } from 'src/common/utils/pin.util';
import { DeliveryProofService } from 'src/modules/delivery-proof/delivery-proof.service';
import type { HandoverDto } from 'src/modules/delivery-proof/dto/handover.dto';
import type { SubmitProofDto } from 'src/modules/delivery-proof/dto/submit-proof.dto';
import type { DeliveryProofDocument } from 'src/modules/delivery-proof/schemas/delivery-proof.schema';
import { DonationsService } from 'src/modules/donations/donations.service';
import type { DonationDocument } from 'src/modules/donations/schemas/donation.schema';
import { FoodRequestsService } from 'src/modules/food-requests/food-requests.service';
import type { FoodRequestDocument } from 'src/modules/food-requests/schemas/food-request.schema';
import { NgosService } from 'src/modules/ngos/ngos.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { POINTS, PointsService } from 'src/modules/points/points.service';
import type { UserDocument } from 'src/modules/users/schemas/user.schema';
import { UsersService } from 'src/modules/users/users.service';

import {
  Assignment,
  AssignmentDocument,
  type AssignmentMode,
} from './schemas/assignment.schema';

export type VolunteerAvailability = 'available' | 'busy' | 'off_duty' | 'out_of_range';

export interface VolunteerSuggestion {
  volunteer: UserDocument;
  distanceKm: number;
  /** Rough minutes for the volunteer to reach the pickup. */
  etaMinutes: number;
  activeAssignments: number;
  isAvailable: boolean;
  withinRadius: boolean;
  travelRadiusKm: number;
  capacityServings: number;
  canCarryLoad: boolean;
  completedDeliveries: number;
  availability: VolunteerAvailability;
  /** Only `available` and `busy` volunteers can be assigned. */
  assignable: boolean;
  /** 0–1; higher is a better match. */
  score: number;
}

export interface ContactInfo {
  name: string;
  phone: string | null;
}

export interface TaskRequestInfo {
  id: string;
  servingsNeeded: number;
  familySize: number | null;
  neededBy: Date;
  notes: string | null;
  dietaryRequirements: string[];
  foodCategory: string | null;
  deliveryMethod: string;
  contactPreference: string;
  status: string;
  dropAddress: FoodRequestDocument['dropAddress'];
}

/**
 * One volunteer task. `isOpen` tasks are approved donations nobody has claimed yet; their
 * assignment id is `open-<donationId>` until a volunteer accepts.
 */
export interface TaskView {
  assignment: Record<string, unknown> & { id: string; status: string };
  /** Serialised donation; the donor's contact fields are removed until the task is accepted. */
  donation: Record<string, unknown>;
  distanceKm: number;
  /** Pickup → drop-off distance, when a recipient is linked. */
  routeKm: number | null;
  minutesLeft: number;
  isOpen: boolean;
  isUrgent: boolean;
  request: TaskRequestInfo | null;
  /** Contacts are only revealed once the volunteer has accepted the task. */
  donor: ContactInfo | null;
  recipient: ContactInfo | null;
  proofs: DeliveryProofDocument[];
}

const LIVE_STATUSES = [AssignmentStatus.Offered, AssignmentStatus.Accepted];

/** Recipient search radius around a pickup when auto-matching a destination. */
const MATCH_RADIUS_KM = 25;

/** Default when a volunteer has not set a travel radius yet. */
const DEFAULT_RADIUS_KM = 10;

const OPEN_PREFIX = 'open-';

/** How much each factor contributes to the match score (FR6). */
const WEIGHTS = { proximity: 0.5, capacity: 0.3, workload: 0.2 };

/** Live-monitoring thresholds, in minutes. */
const DELAY = { awaitingAcceptance: 30, awaitingPickup: 60, inTransit: 90 };

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectModel(Assignment.name) private readonly model: Model<Assignment>,
    private readonly donationsService: DonationsService,
    private readonly foodRequestsService: FoodRequestsService,
    private readonly usersService: UsersService,
    private readonly deliveryProofService: DeliveryProofService,
    private readonly notificationsService: NotificationsService,
    private readonly pointsService: PointsService,
    private readonly ngosService: NgosService,
  ) {}

  // ─── Admin: matching and assignment ───────────────────────────────────────────

  /**
   * FR6, FR7 — every verified volunteer within 50 km of the pickup, with what the admin needs
   * to choose: distance, ETA, availability, current workload and vehicle capacity. Volunteers
   * who are off duty or outside their declared travel radius are listed but cannot be picked.
   */
  async suggestVolunteers(donationId: string): Promise<VolunteerSuggestion[]> {
    const donation = await this.donationsService.findById(donationId);
    const pickup = donation.pickupAddress.location.coordinates;

    const candidates = await this.usersService.findVolunteersNear(pickup, 50, {
      includeUnavailable: true,
    });

    const scored = await Promise.all(
      candidates.map(async (volunteer) => {
        const home = volunteer.address?.location.coordinates;
        if (!home) return null;

        const distance = distanceKm(home, pickup);
        const radius = volunteer.travelRadiusKm ?? DEFAULT_RADIUS_KM;
        const withinRadius = distance <= radius;
        const isAvailable = volunteer.isAvailable !== false;

        const activeAssignments = await this.model.countDocuments({
          volunteerId: volunteer._id,
          mode: { $ne: 'recipient_pickup' },
          status: { $in: LIVE_STATUSES },
        });

        const capacity = volunteer.vehicleType ? VEHICLE_CAPACITY_SERVINGS[volunteer.vehicleType] : 0;

        const proximityScore = Math.max(0, 1 - distance / Math.max(radius, 1));
        const capacityScore = capacity >= donation.servings ? 1 : capacity / donation.servings;
        const workloadScore = 1 / (1 + activeAssignments);

        const availability: VolunteerAvailability = !isAvailable
          ? 'off_duty'
          : !withinRadius
            ? 'out_of_range'
            : activeAssignments > 0
              ? 'busy'
              : 'available';
        const assignable = availability === 'available' || availability === 'busy';

        return {
          volunteer,
          distanceKm: distance,
          etaMinutes: estimateMinutes(distance),
          activeAssignments,
          isAvailable,
          withinRadius,
          travelRadiusKm: radius,
          capacityServings: capacity,
          canCarryLoad: capacity >= donation.servings,
          completedDeliveries: volunteer.completedDeliveriesCount ?? 0,
          availability,
          assignable,
          score: assignable
            ? proximityScore * WEIGHTS.proximity +
              capacityScore * WEIGHTS.capacity +
              workloadScore * WEIGHTS.workload
            : 0,
        } satisfies VolunteerSuggestion;
      }),
    );

    return scored
      .filter((entry): entry is VolunteerSuggestion => entry !== null)
      .sort((a, b) => {
        if (a.assignable !== b.assignable) return a.assignable ? -1 : 1;
        if (a.assignable) return b.score - a.score;
        return a.distanceKm - b.distanceKm;
      });
  }

  /** Everything the admin dispatch screen needs in one call. */
  async assignmentOptions(donationId: string) {
    const donation = await this.donationsService.findById(donationId);
    const pickup = donation.pickupAddress.location.coordinates;

    const linked = await this.donationsService.recipientOf(donation);
    const [volunteers, requests, ngos, current, recipientUser] = await Promise.all([
      this.suggestVolunteers(donationId),
      linked ? Promise.resolve([]) : this.foodRequestsService.findOpenNear(pickup, MATCH_RADIUS_KM),
      this.ngosService.findNear(pickup, MATCH_RADIUS_KM),
      this.model.findOne({ donationId: donation._id, status: { $in: LIVE_STATUSES } }).exec(),
      linked
        ? this.usersService.findById(linked.recipientId.toString()).catch(() => null)
        : Promise.resolve(null),
    ]);

    return {
      donation,
      recipient: linked
        ? {
            ...this.requestInfo(linked),
            origin: linked.origin ?? 'request',
            name: recipientUser?.name ?? 'Recipient',
            phone: linked.contactPhone || recipientUser?.phone || null,
            distanceKm: distanceKm(pickup, linked.dropAddress.location.coordinates),
          }
        : null,
      deliveryMethod: donation.deliveryMethod ?? null,
      deliveryMethodConfirmed: Boolean(donation.deliveryMethodConfirmedAt),
      minutesLeft: minutesUntilExpiry(donation.expiresAt),
      isUrgent: minutesUntilExpiry(donation.expiresAt) <= URGENT_THRESHOLD_MINUTES,
      volunteers,
      requests: requests.map((request) => ({
        ...this.requestInfo(request),
        distanceKm: distanceKm(pickup, request.dropAddress.location.coordinates),
      })),
      ngos: ngos.map((ngo) => ({
        id: ngo.id as string,
        name: ngo.name,
        contactPhone: ngo.contactPhone,
        address: ngo.address,
        distanceKm: distanceKm(pickup, ngo.address.location.coordinates),
      })),
      currentAssignment: current ? current.toJSON() : null,
    };
  }

  /** FR6 — admin offers the delivery to a volunteer; the donation moves to `assigned`. */
  async create(
    adminId: string,
    input: { donationId: string; volunteerId: string; requestId?: string },
  ): Promise<AssignmentDocument> {
    const donation = await this.donationsService.findById(input.donationId);
    if (donation.status !== DonationStatus.Approved) {
      throw new BadRequestException('Only an approved donation can be assigned');
    }
    this.assertFresh(donation);

    const volunteer = await this.usersService.findById(input.volunteerId);
    if (!volunteer.isVerified || volunteer.role !== Role.Volunteer || volunteer.isActive === false) {
      throw new BadRequestException('That user is not an active, verified volunteer');
    }
    if (volunteer.isAvailable === false) {
      throw new BadRequestException(`${volunteer.name} is off duty right now`);
    }

    const request = await this.resolveRequest(donation, adminId, input.requestId);
    if (!request) {
      throw new BadRequestException('Choose a recipient for this donation before assigning');
    }
    const home = volunteer.address?.location.coordinates;

    await this.donationsService.confirmDeliveryMethod(input.donationId, DeliveryMethod.VolunteerRider);
    const assignment = await this.createLive({
      donationId: donation._id,
      volunteerId: volunteer._id,
      requestId: request._id,
      mode: 'volunteer',
      distanceKm: home ? distanceKm(home, donation.pickupAddress.location.coordinates) : 0,
      status: AssignmentStatus.Offered,
    });

    await this.donationsService.transition(input.donationId, DonationStatus.Assigned, {
      actorId: adminId,
      actorRole: Role.Admin,
      note: `Volunteer delivery — offered to ${volunteer.name}`,
    });

    await this.foodRequestsService.markMatched(request.id as string, input.donationId);
    await this.notificationsService.sendToUsers([request.recipientId.toString()], {
      title: 'Volunteer delivery arranged',
      body: `A volunteer has been asked to deliver ${donation.title}. You'll get your delivery code once they accept.`,
      type: 'assignment',
      data: { requestId: request.id as string, assignmentId: assignment.id as string },
    });

    // FR8 — the offer carries what the volunteer needs to decide: food, place, and time.
    const area = [donation.pickupAddress.line1, donation.pickupAddress.city]
      .filter(Boolean)
      .join(', ');
    await this.notificationsService.sendToUsers([input.volunteerId], {
      title: 'New pickup assigned to you',
      body: `${donation.title} — ${donation.servings} servings. Pickup: ${area} (${assignment.distanceKm} km). Safe until ${formatTime(donation.expiresAt)}.`,
      type: 'assignment',
      data: { assignmentId: assignment.id as string, donationId: input.donationId },
    });

    return assignment;
  }

  /**
   * After approval the admin confirms how the food moves. Volunteer delivery waits for a
   * volunteer to be assigned; the two in-person options start straight away and send the
   * recipient the code the donor will check at handover.
   */
  async chooseDeliveryMethod(adminId: string, donationId: string, method: DeliveryMethod) {
    const donation = await this.donationsService.findById(donationId);
    if (donation.status !== DonationStatus.Approved) {
      throw new BadRequestException('Approve the donation before choosing how it is delivered');
    }
    this.assertFresh(donation);

    const request = await this.resolveRequest(donation, adminId);
    if (!request) {
      throw new BadRequestException('Choose a recipient for this donation first');
    }

    if (method === DeliveryMethod.VolunteerRider) {
      const updated = await this.donationsService.confirmDeliveryMethod(donationId, method);
      if (minutesUntilExpiry(updated.expiresAt) <= URGENT_THRESHOLD_MINUTES) {
        await this.donationsService.alertQuickCollection(updated);
      }
      return { donation: updated, assignment: null };
    }

    const mode: AssignmentMode =
      method === DeliveryMethod.RecipientPickup ? 'recipient_pickup' : 'donor_delivery';
    const carrierId = mode === 'recipient_pickup' ? request.recipientId : donation.donorId;
    const routeKm = distanceKm(
      donation.pickupAddress.location.coordinates,
      request.dropAddress.location.coordinates,
    );

    await this.donationsService.confirmDeliveryMethod(donationId, method);
    const assignment = await this.createLive({
      donationId: donation._id,
      volunteerId: carrierId,
      requestId: request._id,
      mode,
      distanceKm: routeKm,
      status: AssignmentStatus.Accepted,
      acceptedAt: new Date(),
    });

    try {
      await this.donationsService.transition(donationId, DonationStatus.Assigned, {
        actorId: adminId,
        actorRole: Role.Admin,
        note:
          mode === 'recipient_pickup'
            ? 'Recipient self-pickup — the recipient will collect from the donor'
            : 'Donor self-delivery — the donor will take the food to the recipient',
      });
    } catch (error) {
      await this.model.deleteOne({ _id: assignment._id }).exec();
      throw error;
    }

    await this.foodRequestsService.markMatched(request.id as string, donationId);
    await this.notifyHandoverCodes(assignment.id as string, donation, request, mode);

    return { donation: await this.donationsService.findById(donationId), assignment };
  }

  /** Donor self-delivery: the donor marks that they have left with the food. */
  async departWithFood(id: string, donorId: string) {
    const assignment = await this.findById(id);
    if (assignment.mode !== 'donor_delivery') {
      throw new BadRequestException('Only a donor self-delivery can be started by the donor');
    }
    const donation = await this.donationsService.findById(assignment.donationId.toString());
    if (donation.donorId.toString() !== donorId) {
      throw new ForbiddenException('This donation belongs to another donor');
    }
    if (assignment.status !== AssignmentStatus.Accepted || donation.status !== DonationStatus.Assigned) {
      throw new BadRequestException('This delivery has already started');
    }
    this.assertFresh(donation);

    const actor = { actorId: donorId, actorRole: Role.Donor };
    await this.donationsService.transition(donation.id as string, DonationStatus.PickedUp, {
      ...actor,
      note: 'Donor collected the food for delivery',
    });
    await this.donationsService.transition(donation.id as string, DonationStatus.InTransit, {
      ...actor,
      note: 'Donor on the way to the recipient',
    });
    assignment.pickedUpAt = new Date();
    await assignment.save();

    if (assignment.requestId) {
      const request = await this.foodRequestsService
        .findById(assignment.requestId.toString())
        .catch(() => null);
      if (request) {
        await this.notificationsService.sendToUsers([request.recipientId.toString()], {
          title: 'The donor is on the way',
          body: `${donation.title} is on its way to you. Keep your handover code ready.`,
          type: 'pickup',
          data: { requestId: request.id as string },
        });
      }
    }
    return this.donationsService.findById(donation.id as string);
  }

  /**
   * Recipient self-pickup and donor self-delivery both finish the same way: the donor types
   * the code the recipient reads out. Only a matching code marks the donation delivered.
   */
  async confirmHandover(id: string, user: AuthUser, dto: HandoverDto) {
    const assignment = await this.model.findById(id).select('+deliveryPin').exec();
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.mode !== 'recipient_pickup' && assignment.mode !== 'donor_delivery') {
      throw new BadRequestException('This delivery is handled by a volunteer');
    }

    const donationId = assignment.donationId.toString();
    const donation = await this.donationsService.findById(donationId);
    if (user.role !== Role.Admin && donation.donorId.toString() !== user.id) {
      throw new ForbiddenException('Only the donor can confirm this handover');
    }
    if (assignment.status !== AssignmentStatus.Accepted) {
      throw new BadRequestException('This handover is already closed');
    }
    this.assertFresh(donation);

    if (dto.pin !== assignment.deliveryPin) {
      throw new BadRequestException("That code does not match the recipient's code");
    }

    const actorRole = user.role === Role.Admin ? Role.Admin : Role.Donor;
    const actor = { actorId: user.id, actorRole };
    if (donation.status === DonationStatus.Assigned) {
      await this.donationsService.transition(donationId, DonationStatus.PickedUp, {
        ...actor,
        note:
          assignment.mode === 'recipient_pickup'
            ? 'Collected by the recipient from the donor'
            : 'Donor collected the food for delivery',
      });
    }
    const proof = await this.deliveryProofService.record(
      id,
      'delivery',
      dto,
      true,
      actorRole === Role.Admin ? 'admin' : 'donor',
    );
    await this.donationsService.transition(donationId, DonationStatus.Delivered, {
      ...actor,
      note: "Handed over — recipient's code verified",
    });

    assignment.status = AssignmentStatus.Completed;
    assignment.pickedUpAt = assignment.pickedUpAt ?? new Date();
    assignment.completedAt = new Date();
    await assignment.save();

    const donorId = donation.donorId.toString();
    const awards = [
      this.pointsService.award(donorId, 'Donation delivered', POINTS.donationDelivered, donationId),
    ];
    if (assignment.mode === 'donor_delivery') {
      awards.push(
        this.pointsService.award(donorId, 'Self delivery completed', POINTS.selfDelivery, donationId),
      );
    }
    await Promise.all(awards);

    const earned =
      POINTS.donationDelivered + (assignment.mode === 'donor_delivery' ? POINTS.selfDelivery : 0);
    await this.notificationsService.sendToUsers([donorId], {
      title: 'Donation delivered',
      body: `${donation.title} reached the recipient. +${earned} reward points.`,
      type: 'points',
      data: { donationId },
    });

    if (assignment.requestId) {
      await this.foodRequestsService.markFulfilled(assignment.requestId.toString());
      const request = await this.foodRequestsService
        .findById(assignment.requestId.toString())
        .catch(() => null);
      if (request) {
        await this.notificationsService.sendToUsers([request.recipientId.toString()], {
          title: 'Food received',
          body: `${donation.title} has been handed over to you. Thank you for using Amuthinai!`,
          type: 'delivery',
          data: { requestId: request.id as string },
        });
      }
    }

    return proof;
  }

  /** Admin moves a live task to a different volunteer. */
  async reassign(
    id: string,
    adminId: string,
    input: { volunteerId: string; reason?: string },
  ): Promise<AssignmentDocument> {
    const current = await this.findById(id);
    if (!LIVE_STATUSES.includes(current.status)) {
      throw new BadRequestException('Only an offered or accepted task can be reassigned');
    }

    const donationId = current.donationId.toString();
    const donation = await this.donationsService.findById(donationId);
    if (donation.status !== DonationStatus.Assigned) {
      throw new BadRequestException('This food has already been collected; it cannot be reassigned');
    }

    current.status = AssignmentStatus.Cancelled;
    current.cancelReason = input.reason ?? 'Reassigned by admin';
    await current.save();

    await this.donationsService.transition(donationId, DonationStatus.Approved, {
      actorId: adminId,
      actorRole: Role.Admin,
      note: current.cancelReason,
    });

    await this.notificationsService.sendToUsers([current.volunteerId.toString()], {
      title: 'Task reassigned',
      body: `${donation.title} has been moved to another volunteer.`,
      type: 'assignment',
      data: { assignmentId: id },
    });

    return this.create(adminId, {
      donationId,
      volunteerId: input.volunteerId,
      requestId: current.requestId?.toString(),
    });
  }

  /** NGO fallback — no volunteer is available, so a partner NGO collects and distributes. */
  async assignToNgo(
    adminId: string,
    input: { donationId: string; ngoId: string; requestId?: string },
  ): Promise<AssignmentDocument> {
    const donation = await this.donationsService.findById(input.donationId);
    if (donation.status !== DonationStatus.Approved) {
      throw new BadRequestException('Only an approved donation can be handed to an NGO');
    }
    this.assertFresh(donation);

    const ngo = await this.ngosService.findById(input.ngoId);
    const request = await this.resolveRequest(donation, adminId, input.requestId);

    // The coordinating admin owns the task so they can record pickup and delivery.
    const assignment = await this.createLive({
      donationId: donation._id,
      volunteerId: new Types.ObjectId(adminId),
      requestId: request?._id,
      ngoId: ngo._id,
      distanceKm: distanceKm(
        ngo.address.location.coordinates,
        donation.pickupAddress.location.coordinates,
      ),
      status: AssignmentStatus.Accepted,
      acceptedAt: new Date(),
    });

    await this.donationsService.transition(input.donationId, DonationStatus.Assigned, {
      actorId: adminId,
      actorRole: Role.Admin,
      note: `Handed to NGO ${ngo.name}`,
    });

    if (request) await this.foodRequestsService.markMatched(request.id as string, input.donationId);

    await this.notificationsService.sendToUsers([donation.donorId.toString()], {
      title: 'Collection arranged',
      body: `${ngo.name} will collect ${donation.title}. Open the donation to see your handover PIN.`,
      type: 'assignment',
      data: { donationId: input.donationId },
    });

    return assignment;
  }

  /** NGO fallback — admin records that the NGO collected and delivered the food. */
  async completeNgo(id: string, adminId: string): Promise<AssignmentDocument> {
    const assignment = await this.findById(id);
    if (!assignment.ngoId) throw new BadRequestException('This is not an NGO task');
    if (assignment.status !== AssignmentStatus.Accepted) {
      throw new BadRequestException('This task is already closed');
    }

    const donationId = assignment.donationId.toString();
    const actor = { actorId: adminId, actorRole: Role.Admin };
    const donation = await this.donationsService.findById(donationId);
    if (donation.status === DonationStatus.Assigned) {
      await this.donationsService.transition(donationId, DonationStatus.PickedUp, {
        ...actor,
        note: 'Collected by NGO',
      });
      await this.donationsService.transition(donationId, DonationStatus.InTransit, {
        ...actor,
        note: 'NGO distributing',
      });
    }
    await this.donationsService.transition(donationId, DonationStatus.Delivered, {
      ...actor,
      note: 'NGO confirmed distribution',
    });

    assignment.status = AssignmentStatus.Completed;
    assignment.completedAt = new Date();
    await assignment.save();

    if (assignment.requestId) {
      await this.foodRequestsService.markFulfilled(assignment.requestId.toString());
    }
    await this.pointsService.award(
      donation.donorId.toString(),
      'Donation delivered',
      POINTS.donationDelivered,
      donationId,
    );

    return assignment;
  }

  // ─── Volunteer: tasks ─────────────────────────────────────────────────────────

  /**
   * FR8 — the volunteer's live tasks plus unclaimed approved donations inside their travel
   * radius, urgent first. `origin` is the device location when the app sends one.
   */
  async findNearbyFor(volunteerId: string, origin?: [number, number]): Promise<TaskView[]> {
    const volunteer = await this.usersService.findById(volunteerId);
    const from = origin ?? volunteer.address?.location?.coordinates;
    const radius = volunteer.travelRadiusKm ?? DEFAULT_RADIUS_KM;

    const own = await this.model
      .find({ volunteerId: volunteer._id, status: { $in: LIVE_STATUSES } })
      .exec();
    const ownViews = await this.toViews(own, { revealContacts: true, from });

    if (volunteer.isAvailable === false) return sortTasks(ownViews);

    const candidates = from
      ? await this.donationsService.findApprovedNear(from, radius)
      : (
          await this.donationsService.findAll({
            status: [DonationStatus.Approved],
            page: 1,
            pageSize: 30,
            skip: 0,
          })
        ).items.filter((donation) => donation.expiresAt.getTime() > Date.now());

    const candidateIds = candidates.map((donation) => donation._id);
    const taken = await this.model
      .find({
        donationId: { $in: candidateIds },
        $or: [
          { status: { $in: LIVE_STATUSES } },
          { status: AssignmentStatus.Declined, volunteerId: volunteer._id },
        ],
      })
      .select('donationId')
      .exec();
    const takenIds = new Set(taken.map((assignment) => assignment.donationId.toString()));

    const openViews = await Promise.all(
      candidates
        .filter((donation) => !takenIds.has(donation.id as string))
        .map((donation) => this.openView(donation, volunteerId, from)),
    );

    return sortTasks([...ownViews, ...openViews]);
  }

  /** Task history: everything this volunteer has accepted, delivered or had cancelled. */
  async historyFor(
    volunteerId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedDto<TaskView>> {
    const filter: FilterQuery<Assignment> = {
      volunteerId: new Types.ObjectId(volunteerId),
      status: { $in: [AssignmentStatus.Completed, AssignmentStatus.Cancelled, AssignmentStatus.Accepted] },
    };

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ updatedAt: -1 }).skip(query.skip).limit(query.pageSize).exec(),
      this.model.countDocuments(filter),
    ]);

    return paginate(await this.toViews(items, { revealContacts: true }), total, query);
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

  /** Full task view for the assignment, pickup and delivery screens. */
  async details(id: string, user: AuthUser): Promise<TaskView> {
    if (id.startsWith(OPEN_PREFIX)) {
      const donation = await this.donationsService.findById(id.slice(OPEN_PREFIX.length));
      const live = await this.model
        .findOne({ donationId: donation._id, status: { $in: LIVE_STATUSES } })
        .exec();
      if (live) {
        if (live.volunteerId.toString() !== user.id && user.role !== Role.Admin) {
          throw new ConflictException('Another volunteer has already taken this task');
        }
        return this.details(live.id as string, user);
      }
      if (donation.status !== DonationStatus.Approved) {
        throw new BadRequestException('This donation is no longer available');
      }
      const volunteer = await this.usersService.findById(user.id).catch(() => null);
      return this.openView(donation, user.id, volunteer?.address?.location?.coordinates);
    }

    const assignment = await this.findById(id);
    if (user.role !== Role.Admin && assignment.volunteerId.toString() !== user.id) {
      throw new ForbiddenException('This assignment belongs to another volunteer');
    }

    const [view] = await this.toViews([assignment], {
      revealContacts: assignment.status !== AssignmentStatus.Offered || user.role === Role.Admin,
      includeProofs: true,
    });
    if (!view) throw new NotFoundException('The donation for this task no longer exists');
    return view;
  }

  async accept(id: string, volunteerId: string): Promise<AssignmentDocument> {
    if (id.startsWith(OPEN_PREFIX)) return this.claim(id.slice(OPEN_PREFIX.length), volunteerId);

    const assignment = await this.findOwned(id, volunteerId);
    if (assignment.status !== AssignmentStatus.Offered) {
      throw new BadRequestException('This offer is no longer open');
    }
    const donation = await this.donationsService.findById(assignment.donationId.toString());
    this.assertFresh(donation);

    if (!assignment.requestId) {
      const request = await this.resolveRequest(donation, volunteerId);
      if (request) {
        assignment.requestId = request._id;
        await this.foodRequestsService.markMatched(request.id as string, donation.id as string);
      }
    }

    assignment.status = AssignmentStatus.Accepted;
    assignment.acceptedAt = new Date();
    await assignment.save();

    await this.notifyAccepted(assignment, donation);
    return assignment;
  }

  /** A volunteer takes an unclaimed approved donation from the nearby list. */
  async claim(donationId: string, volunteerId: string): Promise<AssignmentDocument> {
    const volunteer = await this.usersService.findById(volunteerId);
    if (volunteer.role !== Role.Volunteer) {
      throw new ForbiddenException('Only volunteers can accept delivery tasks');
    }
    if (!volunteer.isVerified) {
      throw new ForbiddenException(
        'Your volunteer account is waiting for admin verification. You can accept tasks once it is approved.',
      );
    }
    if (volunteer.isAvailable === false) {
      throw new BadRequestException('Turn on "Ready for deliveries" to accept new tasks');
    }

    const donation = await this.donationsService.findById(donationId);
    if (donation.status !== DonationStatus.Approved) {
      throw new ConflictException('Another volunteer has already taken this task');
    }
    if (
      donation.deliveryMethod === DeliveryMethod.RecipientPickup ||
      donation.deliveryMethod === DeliveryMethod.SelfDrop
    ) {
      throw new ConflictException('This food is being handed over without a volunteer');
    }
    this.assertFresh(donation);

    const request = await this.resolveRequest(donation, volunteerId);
    if (!request) {
      throw new BadRequestException('This donation is still waiting for a recipient');
    }
    const home = volunteer.address?.location?.coordinates;

    await this.donationsService.confirmDeliveryMethod(donationId, DeliveryMethod.VolunteerRider);
    const assignment = await this.createLive({
      donationId: donation._id,
      volunteerId: volunteer._id,
      requestId: request._id,
      mode: 'volunteer',
      distanceKm: home ? distanceKm(home, donation.pickupAddress.location.coordinates) : 0,
      status: AssignmentStatus.Accepted,
      acceptedAt: new Date(),
    });

    try {
      await this.donationsService.transition(donationId, DonationStatus.Assigned, {
        actorId: volunteerId,
        actorRole: Role.Volunteer,
        note: `Accepted by ${volunteer.name}`,
      });
    } catch (error) {
      await this.model.deleteOne({ _id: assignment._id }).exec();
      throw error;
    }

    await this.foodRequestsService.markMatched(request.id as string, donationId);

    await this.notifyAccepted(assignment, donation);
    await this.notificationsService.sendToAdmins({
      title: 'Volunteer accepted a task',
      body: `${volunteer.name} is collecting ${donation.title}`,
      type: 'assignment',
      data: { assignmentId: assignment.id as string, donationId },
    });

    return assignment;
  }

  /** A decline returns the donation to the pool so an admin can offer it to someone else. */
  async decline(id: string, volunteerId: string, reason?: string): Promise<{ declined: true }> {
    if (id.startsWith(OPEN_PREFIX)) {
      // Recorded so the task stops appearing for this volunteer.
      const donation = await this.donationsService.findById(id.slice(OPEN_PREFIX.length));
      await this.model.create({
        donationId: donation._id,
        volunteerId: new Types.ObjectId(volunteerId),
        deliveryPin: generateDeliveryPin(),
        distanceKm: 0,
        status: AssignmentStatus.Declined,
        declineReason: reason ?? 'Not suitable',
      });
      return { declined: true };
    }

    const assignment = await this.findOwned(id, volunteerId);
    if (assignment.status !== AssignmentStatus.Offered) {
      throw new BadRequestException('This offer is no longer open');
    }

    assignment.status = AssignmentStatus.Declined;
    assignment.declineReason = reason;
    await assignment.save();

    const donation = await this.donationsService.transition(
      assignment.donationId.toString(),
      DonationStatus.Approved,
      { actorId: volunteerId, actorRole: Role.Volunteer, note: reason ?? 'Offer declined' },
    );

    // The recipient stays confirmed for this donation; only the volunteer changes.
    await this.notificationsService.sendToAdmins({
      title: 'Volunteer declined a task',
      body: `${donation.title} needs a new volunteer${reason ? ` — ${reason}` : ''}`,
      type: 'assignment',
      data: { donationId: donation.id as string },
    });

    return { declined: true };
  }

  /** FR9 — pickup proof (photo, location, donor PIN) moves the donation to in_transit. */
  async confirmPickup(id: string, volunteerId: string, dto: SubmitProofDto) {
    const assignment = await this.model.findById(id).select('+pickupPin').exec();
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.volunteerId.toString() !== volunteerId) {
      throw new ForbiddenException('This assignment belongs to another volunteer');
    }
    if (assignment.status !== AssignmentStatus.Accepted) {
      throw new BadRequestException('Accept the assignment before confirming pickup');
    }
    if (assignment.pickupPin && dto.pin !== assignment.pickupPin) {
      throw new BadRequestException('That PIN does not match the code shown to the donor');
    }

    const donationId = assignment.donationId.toString();
    const donation = await this.donationsService.findById(donationId);
    if (donation.status !== DonationStatus.Assigned) {
      throw new BadRequestException('Pickup has already been confirmed for this task');
    }
    this.assertFresh(donation);

    const proof = await this.deliveryProofService.record(id, 'pickup', dto, Boolean(assignment.pickupPin));

    await this.donationsService.transition(donationId, DonationStatus.PickedUp, {
      actorId: volunteerId,
      actorRole: Role.Volunteer,
      note: dto.quantityConfirmed
        ? `Food collected from the donor (${dto.quantityConfirmed} counted)`
        : 'Food collected from the donor',
    });
    await this.donationsService.transition(donationId, DonationStatus.InTransit, {
      actorId: volunteerId,
      actorRole: Role.Volunteer,
      note: 'On the way to the recipient',
    });

    assignment.pickedUpAt = new Date();
    await assignment.save();

    await this.notificationsService.sendToUsers([donation.donorId.toString()], {
      title: 'Food collected',
      body: `${donation.title} was collected by the volunteer and is on the way.`,
      type: 'pickup',
      data: { donationId },
    });

    if (assignment.requestId) {
      const request = await this.foodRequestsService
        .findById(assignment.requestId.toString())
        .catch(() => null);
      if (request) {
        await this.notificationsService.sendToUsers([request.recipientId.toString()], {
          title: 'Food is on the way',
          body: 'Your food has been collected and the volunteer is heading to you. Keep your delivery PIN ready.',
          type: 'pickup',
          data: { requestId: request.id as string, assignmentId: id },
        });
      }
    }

    return proof;
  }

  /** FR9 — the PIN is what proves the food reached the intended recipient. */
  async confirmDelivery(id: string, volunteerId: string, dto: SubmitProofDto) {
    const assignment = await this.model.findById(id).select('+deliveryPin').exec();
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.volunteerId.toString() !== volunteerId) {
      throw new ForbiddenException('This assignment belongs to another volunteer');
    }
    if (assignment.status !== AssignmentStatus.Accepted) {
      throw new BadRequestException('This task is not active');
    }

    const donationId = assignment.donationId.toString();
    const donation = await this.donationsService.findById(donationId);
    if (donation.status !== DonationStatus.InTransit) {
      throw new BadRequestException('Confirm pickup before confirming delivery');
    }

    if (!dto.pin || dto.pin !== assignment.deliveryPin) {
      throw new BadRequestException('That PIN does not match the code shown to the recipient');
    }

    const proof = await this.deliveryProofService.record(id, 'delivery', dto, true);

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
      const request = await this.foodRequestsService
        .findById(assignment.requestId.toString())
        .catch(() => null);
      if (request) {
        await this.notificationsService.sendToUsers([request.recipientId.toString()], {
          title: 'Food delivered',
          body: 'Your delivery is complete. Thank you for using Amuthinai!',
          type: 'delivery',
          data: { requestId: request.id as string, assignmentId: id },
        });
      }
    }

    // FR10 — points are only awarded after a PIN-confirmed delivery.
    await Promise.all([
      this.pointsService.award(volunteerId, 'Delivery completed', POINTS.deliveryCompleted, donationId),
      this.pointsService.award(
        donation.donorId.toString(),
        'Donation delivered',
        POINTS.donationDelivered,
        donationId,
      ),
      this.usersService.incrementCompletedDeliveries(volunteerId),
    ]);

    await this.notificationsService.sendToUsers([donation.donorId.toString()], {
      title: 'Donation delivered',
      body: `${donation.title} reached the recipient. +${POINTS.donationDelivered} reward points.`,
      type: 'points',
      data: { donationId },
    });
    await this.notificationsService.sendToUsers([volunteerId], {
      title: 'Delivery complete',
      body: `Thank you! +${POINTS.deliveryCompleted} karma points for delivering ${donation.title}.`,
      type: 'points',
      data: { assignmentId: id },
    });

    return proof;
  }

  // ─── Admin: monitoring ────────────────────────────────────────────────────────

  /** Admin lists all assignments / active deliveries across the system */
  async findAll(
    query: PaginationQueryDto & { status?: AssignmentStatus },
  ): Promise<PaginatedDto<AssignmentDocument>> {
    const filter: FilterQuery<Assignment> = {};
    if (query.status) filter.status = query.status;
    else filter.status = { $ne: AssignmentStatus.Declined };

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('volunteerId', 'name phone vehicleType travelRadiusKm isVerified karmaPoints avatarUrl')
        .populate(
          'donationId',
          'title foodType servings pickupAddress expiresAt cookedAt status photoUrls description packagingType contactPersonName contactPersonPhone',
        )
        .populate('requestId', 'dropAddress servingsNeeded familySize status recipientId notes neededBy')
        .populate('ngoId', 'name contactPhone')
        .sort({ updatedAt: -1 })
        .skip(query.skip)
        .limit(query.pageSize),
      this.model.countDocuments(filter),
    ]);

    return paginate(items, total, query);
  }

  /** Live assignment monitoring with delay and urgency flags. */
  async monitor() {
    const live = await this.model
      .find({ status: { $in: LIVE_STATUSES } })
      .sort({ offeredAt: -1 })
      .limit(100)
      .exec();
    const recent = await this.model
      .find({
        status: AssignmentStatus.Completed,
        completedAt: { $gte: new Date(Date.now() - 24 * 60 * 60_000) },
      })
      .sort({ completedAt: -1 })
      .limit(30)
      .exec();

    const views = await this.toViews([...live, ...recent], {
      revealContacts: true,
      includeProofs: true,
    });

    const volunteerIds = [...live, ...recent].map((assignment) => assignment.volunteerId.toString());
    const volunteers = await this.usersService.findManyByIds([...new Set(volunteerIds)]);
    const volunteerById = new Map(volunteers.map((volunteer) => [volunteer.id as string, volunteer]));

    return views.map((view) => {
      const alerts = delayAlerts(view);
      const volunteer = volunteerById.get(String(view.assignment.volunteerId));
      return {
        ...view,
        volunteer: volunteer
          ? {
              id: volunteer.id as string,
              name: volunteer.name,
              phone: volunteer.phone ?? null,
              vehicleType: volunteer.vehicleType ?? null,
            }
          : null,
        alerts,
        isDelayed: alerts.length > 0,
      };
    });
  }

  async countAssignmentsStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    offered: number;
  }> {
    const [total, active, completed, offered] = await Promise.all([
      this.model.countDocuments({ status: { $ne: AssignmentStatus.Declined } }),
      this.model.countDocuments({ status: AssignmentStatus.Accepted }),
      this.model.countDocuments({ status: AssignmentStatus.Completed }),
      this.model.countDocuments({ status: AssignmentStatus.Offered }),
    ]);
    return { total, active, completed, offered };
  }

  countActiveDeliveries() {
    return this.model.countDocuments({ status: AssignmentStatus.Accepted }).exec();
  }

  async findById(id: string): Promise<AssignmentDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Assignment not found');
    const assignment = await this.model.findById(id).exec();
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  /** Read-only lookup for the volunteer or an admin; never includes the PINs. */
  async findVisible(id: string, user: AuthUser): Promise<AssignmentDocument> {
    const assignment = await this.findById(id);
    if (user.role !== Role.Admin && assignment.volunteerId.toString() !== user.id) {
      throw new ForbiddenException('This assignment belongs to another volunteer');
    }
    return assignment;
  }

  // ─── Recipient and donor views ────────────────────────────────────────────────

  async getTrackingForRequest(requestId: string, user: AuthUser) {
    const foodReq = await this.foodRequestsService.findById(requestId);
    if (user.role !== Role.Admin && foodReq.recipientId.toString() !== user.id) {
      throw new ForbiddenException('Not authorized to view tracking for this request');
    }

    const assignment = await this.model
      .findOne({
        requestId: new Types.ObjectId(requestId),
        status: { $in: [...LIVE_STATUSES, AssignmentStatus.Completed] },
      })
      .sort({ offeredAt: -1 })
      .select('+deliveryPin')
      .exec();

    let volunteer: UserDocument | null = null;
    let donation: DonationDocument | null = null;
    let proofs: DeliveryProofDocument[] = [];
    const mode: AssignmentMode = assignment?.mode ?? 'volunteer';

    if (assignment) {
      volunteer =
        mode === 'volunteer'
          ? await this.usersService.findById(assignment.volunteerId.toString()).catch(() => null)
          : null;
      donation = await this.donationsService.findById(assignment.donationId.toString()).catch(() => null);
      proofs = await this.deliveryProofService.findByAssignment(assignment.id as string);
    } else if (foodReq.matchedDonationId) {
      donation = await this.donationsService
        .findById(foodReq.matchedDonationId.toString())
        .catch(() => null);
    }

    const timeline = donation ? await this.donationsService.timeline(donation.id as string) : [];
    const ngo = assignment?.ngoId
      ? await this.ngosService.findById(assignment.ngoId.toString()).catch(() => null)
      : null;

    const assignmentJson = assignment ? (assignment.toJSON() as Record<string, unknown>) : null;
    // The code is released only once someone has actually taken on the delivery.
    if (
      assignmentJson &&
      (user.role !== Role.Recipient || assignment?.status === AssignmentStatus.Offered)
    ) {
      delete assignmentJson.deliveryPin;
    }

    const routeKm =
      donation && foodReq.dropAddress?.location
        ? distanceKm(donation.pickupAddress.location.coordinates, foodReq.dropAddress.location.coordinates)
        : null;

    // In-person handovers need the other party's details: where to collect, or who is coming.
    const handoverLive =
      mode !== 'volunteer' &&
      assignment !== null &&
      [AssignmentStatus.Accepted, AssignmentStatus.Completed].includes(assignment.status);
    const donorUser =
      handoverLive && donation
        ? await this.usersService.findById(donation.donorId.toString()).catch(() => null)
        : null;

    return {
      request: foodReq,
      mode,
      deliveryMethod: donation?.deliveryMethod ?? null,
      deliveryMethodConfirmed: Boolean(donation?.deliveryMethodConfirmedAt),
      donor:
        handoverLive && donation
          ? {
              name: donation.contactPersonName || donorUser?.name || 'Donor',
              phone: donation.contactPersonPhone || donorUser?.phone || null,
              pickupAddress: mode === 'recipient_pickup' ? donation.pickupAddress : null,
            }
          : null,
      assignment: assignmentJson,
      volunteer: ngo
        ? { id: ngo.id as string, name: ngo.name, phone: ngo.contactPhone, vehicleType: 'NGO partner' }
        : volunteer
          ? {
              id: volunteer.id as string,
              name: volunteer.name,
              phone: volunteer.phone ?? null,
              vehicleType: volunteer.vehicleType ?? null,
              completedDeliveries: volunteer.completedDeliveriesCount ?? 0,
            }
          : null,
      donation: donation
        ? {
            id: donation.id as string,
            title: donation.title,
            foodType: donation.foodType,
            pickupAddress: { city: donation.pickupAddress.city, district: donation.pickupAddress.district },
            servings: donation.servings,
            status: donation.status,
            cookedAt: donation.cookedAt,
            expiresAt: donation.expiresAt,
            photoUrls: donation.photoUrls,
          }
        : null,
      routeKm,
      etaMinutes: routeKm !== null ? estimateMinutes(routeKm) : null,
      proofs,
      timeline,
    };
  }

  /** Donor's view of who is collecting their donation, including the pickup PIN. */
  async forDonation(donationId: string, user: AuthUser) {
    const donation = await this.donationsService.findById(donationId);
    if (user.role !== Role.Admin && donation.donorId.toString() !== user.id) {
      throw new ForbiddenException('This donation belongs to another donor');
    }

    const assignment = await this.model
      .findOne({
        donationId: donation._id,
        status: { $in: [...LIVE_STATUSES, AssignmentStatus.Completed] },
      })
      .sort({ offeredAt: -1 })
      .select('+pickupPin')
      .exec();

    let requestDoc: FoodRequestDocument | null = null;
    if (assignment?.requestId) {
      requestDoc = await this.foodRequestsService.findById(assignment.requestId.toString()).catch(() => null);
    }
    if (!requestDoc && donation.foodRequestId) {
      requestDoc = await this.foodRequestsService
        .findById(donation.foodRequestId.toString())
        .catch(() => null);
    }
    if (!requestDoc) {
      const matched = await this.foodRequestsService.findByDonationIds([donationId]);
      requestDoc = matched[0] ?? null;
    }

    const pickupCoords = donation.pickupAddress?.location?.coordinates;
    const dropCoords = requestDoc?.dropAddress?.location?.coordinates;
    const routeKm =
      pickupCoords && dropCoords ? distanceKm(pickupCoords, dropCoords) : null;

    const mode: AssignmentMode = assignment?.mode ?? 'volunteer';
    const handoverLive =
      mode !== 'volunteer' && assignment?.status === AssignmentStatus.Accepted;
    const recipientUser = requestDoc
      ? await this.usersService.findById(requestDoc.recipientId.toString()).catch(() => null)
      : null;
    // Donors see who they are feeding; phone and exact address only when they meet in person.
    const recipient = requestDoc
      ? {
          requestId: requestDoc.id as string,
          origin: requestDoc.origin ?? 'request',
          name: recipientUser?.name?.split(' ')[0] ?? 'Recipient',
          phone: handoverLive ? requestDoc.contactPhone || recipientUser?.phone || null : null,
          servingsNeeded: requestDoc.servingsNeeded,
          familySize: requestDoc.familySize ?? null,
          neededBy: requestDoc.neededBy,
          notes: requestDoc.notes ?? null,
          dietaryRequirements: requestDoc.dietaryRequirements ?? [],
          areaLabel:
            [requestDoc.dropAddress?.city, requestDoc.dropAddress?.district]
              .filter(Boolean)
              .join(', ') || null,
        }
      : null;

    const common = {
      mode,
      deliveryMethod: donation.deliveryMethod ?? null,
      deliveryMethodConfirmed: Boolean(donation.deliveryMethodConfirmedAt),
      recipient,
      foodRequestId: requestDoc?.id ?? donation.foodRequestId?.toString() ?? null,
      pickupAddress: donation.pickupAddress,
      dropAddress:
        mode === 'donor_delivery' || mode === 'volunteer' ? (requestDoc?.dropAddress ?? null) : null,
      routeKm,
      etaMinutes: routeKm !== null ? estimateMinutes(routeKm) : null,
      canConfirmHandover:
        handoverLive &&
        [DonationStatus.Assigned, DonationStatus.PickedUp, DonationStatus.InTransit].includes(
          donation.status,
        ),
      canDepart: handoverLive && mode === 'donor_delivery' && donation.status === DonationStatus.Assigned,
    };

    if (!assignment) {
      return { ...common, assignment: null, volunteer: null, proofs: [], pickupPin: null };
    }

    const [volunteer, proofs, ngo] = await Promise.all([
      assignment.ngoId || mode !== 'volunteer'
        ? null
        : this.usersService.findById(assignment.volunteerId.toString()).catch(() => null),
      this.deliveryProofService.findByAssignment(assignment.id as string),
      assignment.ngoId ? this.ngosService.findById(assignment.ngoId.toString()).catch(() => null) : null,
    ]);

    const json = assignment.toJSON() as Record<string, unknown>;
    delete json.pickupPin;
    delete json.deliveryPin;

    // The PIN is only useful (and only shown) until the food has been collected.
    const pickupPin =
      mode === 'volunteer' &&
      assignment.status === AssignmentStatus.Accepted &&
      donation.status === DonationStatus.Assigned
        ? (assignment.pickupPin ?? null)
        : null;

    return {
      ...common,
      assignment: json,
      pickupPin,
      volunteer: ngo
        ? { name: ngo.name, phone: ngo.contactPhone, vehicleType: 'NGO partner' }
        : volunteer
          ? { name: volunteer.name, phone: volunteer.phone ?? null, vehicleType: volunteer.vehicleType ?? null }
          : null,
      proofs,
    };
  }

  async activityForDonations(donationIds: string[]): Promise<AssignmentDocument[]> {
    if (!donationIds.length) return [];
    return this.model
      .find({
        donationId: { $in: donationIds.map((id) => new Types.ObjectId(id)) },
        status: { $ne: AssignmentStatus.Declined },
      })
      .exec();
  }

  /** Called by the freshness scheduler when a donation's safe window closes. */
  async closeForExpiredDonation(donationId: string): Promise<void> {
    const live = await this.model
      .find({ donationId: new Types.ObjectId(donationId), status: { $in: LIVE_STATUSES } })
      .exec();

    // The request itself is released by the donation's move to `expired`.
    for (const assignment of live) {
      assignment.status = AssignmentStatus.Cancelled;
      assignment.cancelReason = 'Food passed its safe window';
      await assignment.save();
      await this.notificationsService.sendToUsers([assignment.volunteerId.toString()], {
        title: 'Task cancelled — food expired',
        body: 'The food passed its 6-hour safe window and must not be delivered.',
        type: 'urgent',
        data: { assignmentId: assignment.id as string },
      });
    }
  }

  /** Live assignments whose donation is close to its deadline, for urgent alerts. */
  findLiveForDonations(donationIds: string[]) {
    if (donationIds.length === 0) return Promise.resolve([]);
    return this.model
      .find({
        donationId: { $in: donationIds.map((id) => new Types.ObjectId(id)) },
        status: { $in: LIVE_STATUSES },
      })
      .exec();
  }

  /** Assignments that have been waiting too long at their current step. */
  async findDelayed(): Promise<AssignmentDocument[]> {
    const now = Date.now();
    return this.model
      .find({
        $or: [
          {
            status: AssignmentStatus.Offered,
            offeredAt: { $lte: new Date(now - DELAY.awaitingAcceptance * 60_000) },
          },
          {
            status: AssignmentStatus.Accepted,
            pickedUpAt: { $exists: false },
            acceptedAt: { $lte: new Date(now - DELAY.awaitingPickup * 60_000) },
          },
          {
            status: AssignmentStatus.Accepted,
            pickedUpAt: { $lte: new Date(now - DELAY.inTransit * 60_000) },
          },
        ],
      })
      .exec();
  }

  // ─── Internals ────────────────────────────────────────────────────────────────

  private async createLive(input: Partial<Assignment>): Promise<AssignmentDocument> {
    try {
      return await this.model.create({
        ...input,
        deliveryPin: generateDeliveryPin(),
        pickupPin: generateDeliveryPin(),
        distanceKm: Math.round((input.distanceKm ?? 0) * 10) / 10,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('This donation already has a delivery in progress');
      }
      throw error;
    }
  }

  /**
   * The recipient a delivery goes to. The donation's own confirmed recipient always wins, so a
   * donor's chosen request or a recipient's claim can never be swapped for someone else. A
   * `requestId` is only used to link a recipient to a general donation that has none yet.
   */
  private async resolveRequest(
    donation: DonationDocument,
    actorId: string,
    requestId?: string,
  ): Promise<FoodRequestDocument | null> {
    if (donation.foodRequestId) {
      const request = await this.foodRequestsService
        .findById(donation.foodRequestId.toString())
        .catch(() => null);
      const stillWaiting =
        request &&
        (request.status === RequestStatus.Open ||
          (request.status === RequestStatus.Matched &&
            request.matchedDonationId?.toString() === (donation.id as string)));
      if (!stillWaiting) {
        throw new BadRequestException('The recipient for this donation is no longer waiting');
      }
      return request;
    }
    if (requestId) {
      await this.donationsService.linkRequest(donation.id as string, requestId, actorId);
      return this.foodRequestsService.findById(requestId);
    }
    return null;
  }

  /** In-person handovers: the recipient gets the code, the donor gets the instructions. */
  private async notifyHandoverCodes(
    assignmentId: string,
    donation: DonationDocument,
    request: FoodRequestDocument,
    mode: AssignmentMode,
  ) {
    const withPin = await this.model.findById(assignmentId).select('+deliveryPin').exec();
    const code = withPin?.deliveryPin ?? '';
    const recipient = await this.usersService
      .findById(request.recipientId.toString())
      .catch(() => null);
    const recipientName = recipient?.name?.split(' ')[0] ?? 'The recipient';
    const pickupAt = [donation.pickupAddress.line1, donation.pickupAddress.city]
      .filter(Boolean)
      .join(', ');
    const dropAt = [request.dropAddress.line1, request.dropAddress.city].filter(Boolean).join(', ');

    await this.notificationsService.sendToUsers([request.recipientId.toString()], {
      title: mode === 'recipient_pickup' ? 'Collect your food' : 'The donor will bring your food',
      body:
        mode === 'recipient_pickup'
          ? `Please collect ${donation.title} from ${pickupAt} before ${formatTime(donation.expiresAt)}. Your handover code is ${code} — show it to the donor.`
          : `${donation.title} will be delivered by the donor. Your handover code is ${code} — share it only when you receive the food.`,
      type: 'assignment',
      data: { requestId: request.id as string, assignmentId },
    });

    await this.notificationsService.sendToUsers([donation.donorId.toString()], {
      title: mode === 'recipient_pickup' ? 'Recipient will collect' : 'Please deliver your donation',
      body:
        mode === 'recipient_pickup'
          ? `${recipientName} will collect ${donation.title} from you. Ask for their 4-digit code and enter it in the app to confirm the handover.`
          : `Please take ${donation.title} to ${recipientName} at ${dropAt}. Ask for their 4-digit code at handover and enter it in the app.`,
      type: 'assignment',
      data: { donationId: donation.id as string },
    });
  }

  private assertFresh(donation: DonationDocument): void {
    if (donation.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('This food has passed its safe window and cannot be delivered');
    }
  }

  /**
   * Once a volunteer accepts, each side receives its own verification code: the donor's
   * pickup code (given to the volunteer at collection) and the recipient's delivery code.
   */
  private async notifyAccepted(assignment: AssignmentDocument, donation: DonationDocument) {
    const [volunteer, withPins] = await Promise.all([
      this.usersService.findById(assignment.volunteerId.toString()).catch(() => null),
      this.model.findById(assignment._id).select('+pickupPin +deliveryPin').exec(),
    ]);
    const name = volunteer?.name ?? 'A volunteer';

    await this.notificationsService.sendToUsers([donation.donorId.toString()], {
      title: 'Volunteer on the way',
      body: withPins?.pickupPin
        ? `${name} will collect ${donation.title}. Your pickup code is ${withPins.pickupPin} — give it to the volunteer at collection.`
        : `${name} will collect ${donation.title}.`,
      type: 'assignment',
      data: { donationId: donation.id as string },
    });

    if (assignment.requestId) {
      const request = await this.foodRequestsService
        .findById(assignment.requestId.toString())
        .catch(() => null);
      if (request) {
        await this.notificationsService.sendToUsers([request.recipientId.toString()], {
          title: 'Volunteer assigned',
          body: `${name} accepted your delivery of ${donation.title}. Your delivery code is ${withPins?.deliveryPin ?? '----'} — share it only when the food reaches you.`,
          type: 'assignment',
          data: { requestId: request.id as string, assignmentId: assignment.id as string },
        });
      }
    }
  }

  private async openView(
    donation: DonationDocument,
    volunteerId: string,
    from?: [number, number],
  ): Promise<TaskView> {
    const pickup = donation.pickupAddress.location.coordinates;
    const request = donation.foodRequestId
      ? await this.foodRequestsService.findById(donation.foodRequestId.toString()).catch(() => null)
      : null;
    const minutesLeft = minutesUntilExpiry(donation.expiresAt);
    const dist = from ? distanceKm(from, pickup) : 0;

    return {
      assignment: {
        id: `${OPEN_PREFIX}${donation.id as string}`,
        donationId: donation.id as string,
        volunteerId,
        requestId: request?.id ?? null,
        status: AssignmentStatus.Offered,
        distanceKm: dist,
        offeredAt: donation.reviewedAt ?? donation.updatedAt,
      },
      donation: withoutContacts(donation),
      distanceKm: dist,
      routeKm: request ? distanceKm(pickup, request.dropAddress.location.coordinates) : null,
      minutesLeft,
      isOpen: true,
      isUrgent: minutesLeft <= URGENT_THRESHOLD_MINUTES,
      request: request ? this.requestInfo(request) : null,
      donor: null,
      recipient: null,
      proofs: [],
    };
  }

  private async toViews(
    assignments: AssignmentDocument[],
    options: { revealContacts: boolean; includeProofs?: boolean; from?: [number, number] },
  ): Promise<TaskView[]> {
    if (assignments.length === 0) return [];

    const donationIds = assignments.map((assignment) => assignment.donationId.toString());

    const [donations, proofs] = await Promise.all([
      Promise.all(
        [...new Set(donationIds)].map((id) => this.donationsService.findById(id).catch(() => null)),
      ),
      options.includeProofs
        ? this.deliveryProofService.findByAssignments(assignments.map((a) => a.id as string))
        : Promise.resolve([] as DeliveryProofDocument[]),
    ]);

    const donationById = new Map(
      donations
        .filter((donation): donation is DonationDocument => donation !== null)
        .map((donation) => [donation.id as string, donation]),
    );
    const requestIdOf = (assignment: AssignmentDocument) =>
      assignment.requestId?.toString() ??
      donationById.get(assignment.donationId.toString())?.foodRequestId?.toString();
    const requestIds = assignments
      .map(requestIdOf)
      .filter((id): id is string => Boolean(id));
    const requests = await this.foodRequestsService.findByIds([...new Set(requestIds)]);
    const requestById = new Map(requests.map((request) => [request.id as string, request]));

    let userById = new Map<string, UserDocument>();
    if (options.revealContacts) {
      const userIds = [
        ...[...donationById.values()].map((donation) => donation.donorId.toString()),
        ...requests.map((request) => request.recipientId.toString()),
      ];
      const users = await this.usersService.findManyByIds([...new Set(userIds)]);
      userById = new Map(users.map((user) => [user.id as string, user]));
    }

    const views: TaskView[] = [];
    for (const assignment of assignments) {
      const donation = donationById.get(assignment.donationId.toString());
      if (!donation) {
        this.logger.warn(`Assignment ${assignment.id as string} points at a missing donation`);
        continue;
      }

      const requestId = requestIdOf(assignment);
      const request = requestId ? requestById.get(requestId) : undefined;
      const pickup = donation.pickupAddress.location.coordinates;
      const minutesLeft = minutesUntilExpiry(donation.expiresAt);
      const dist = options.from ? distanceKm(options.from, pickup) : assignment.distanceKm;

      const donorUser = userById.get(donation.donorId.toString());
      const recipientUser = request ? userById.get(request.recipientId.toString()) : undefined;
      const reveal = options.revealContacts && assignment.status !== AssignmentStatus.Offered;

      views.push({
        assignment: assignment.toJSON() as unknown as TaskView['assignment'],
        donation: reveal ? donation.toJSON() : withoutContacts(donation),
        distanceKm: dist,
        routeKm: request ? distanceKm(pickup, request.dropAddress.location.coordinates) : null,
        minutesLeft,
        isOpen: false,
        isUrgent: minutesLeft <= URGENT_THRESHOLD_MINUTES,
        request: request ? this.requestInfo(request) : null,
        donor:
          reveal && donorUser
            ? {
                name: donation.contactPersonName || donorUser.name,
                phone: donation.contactPersonPhone || donorUser.phone || null,
              }
            : null,
        recipient:
          reveal && request && recipientUser
            ? { name: recipientUser.name, phone: request.contactPhone || recipientUser.phone || null }
            : null,
        proofs: proofs.filter((proof) => proof.assignmentId.toString() === (assignment.id as string)),
      });
    }

    return views;
  }

  private requestInfo(request: FoodRequestDocument): TaskRequestInfo {
    return {
      id: request.id as string,
      servingsNeeded: request.servingsNeeded,
      familySize: request.familySize ?? null,
      neededBy: request.neededBy,
      notes: request.notes ?? null,
      dietaryRequirements: request.dietaryRequirements ?? [],
      foodCategory: request.foodCategory ?? null,
      deliveryMethod: request.deliveryMethod ?? 'doorstep',
      contactPreference: request.contactPreference ?? 'call',
      status: request.status,
      dropAddress: request.dropAddress,
    };
  }

  private async findOwned(id: string, volunteerId: string): Promise<AssignmentDocument> {
    const assignment = await this.findById(id);
    if (assignment.volunteerId.toString() !== volunteerId) {
      throw new ForbiddenException('This assignment belongs to another volunteer');
    }
    return assignment;
  }
}

/** Average city speed used for ETA estimates. */
const CITY_SPEED_KMH = 20;

export function estimateMinutes(km: number): number {
  return Math.max(1, Math.round((km / CITY_SPEED_KMH) * 60));
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Colombo',
  });
}

function withoutContacts(donation: DonationDocument): Record<string, unknown> {
  const json = donation.toJSON() as Record<string, unknown>;
  delete json.contactPersonName;
  delete json.contactPersonPhone;
  return json;
}

function sortTasks(tasks: TaskView[]): TaskView[] {
  return tasks.sort((a, b) => {
    const aActive = a.assignment.status === AssignmentStatus.Accepted ? 0 : 1;
    const bActive = b.assignment.status === AssignmentStatus.Accepted ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
    if (a.minutesLeft !== b.minutesLeft) return a.minutesLeft - b.minutesLeft;
    return a.distanceKm - b.distanceKm;
  });
}

function delayAlerts(view: TaskView): string[] {
  const alerts: string[] = [];
  const now = Date.now();
  const assignment = view.assignment as Record<string, unknown>;
  const minutesSince = (value: unknown) =>
    value ? (now - new Date(value as string).getTime()) / 60_000 : 0;

  if (view.assignment.status === AssignmentStatus.Completed) return alerts;

  if (view.minutesLeft <= 0) alerts.push('Food has passed its safe window');
  else if (view.isUrgent) alerts.push(`Only ${view.minutesLeft} min of safe time left`);

  if (
    view.assignment.status === AssignmentStatus.Offered &&
    minutesSince(assignment.offeredAt) > DELAY.awaitingAcceptance
  ) {
    alerts.push('Volunteer has not accepted yet');
  }
  if (
    view.assignment.status === AssignmentStatus.Accepted &&
    !assignment.pickedUpAt &&
    minutesSince(assignment.acceptedAt) > DELAY.awaitingPickup
  ) {
    alerts.push('Pickup is delayed');
  }
  if (assignment.pickedUpAt && minutesSince(assignment.pickedUpAt) > DELAY.inTransit) {
    alerts.push('Delivery is delayed');
  }
  return alerts;
}
