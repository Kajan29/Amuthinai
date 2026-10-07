import { Injectable } from '@nestjs/common';

import { AssignmentStatus } from 'src/common/enums/assignment-status.enum';
import { DonationStatus, TERMINAL_DONATION_STATUSES } from 'src/common/enums/donation-status.enum';
import { QuantityUnit } from 'src/common/enums/donation-details.enum';
import { FoodType } from 'src/common/enums/food-type.enum';
import { AssignmentsService } from 'src/modules/assignments/assignments.service';
import type { AssignmentDocument } from 'src/modules/assignments/schemas/assignment.schema';
import { DonationsService } from 'src/modules/donations/donations.service';
import type { DonationDocument } from 'src/modules/donations/schemas/donation.schema';
import { FoodRequestsService } from 'src/modules/food-requests/food-requests.service';
import type { FoodRequestDocument } from 'src/modules/food-requests/schemas/food-request.schema';
import { PointsService } from 'src/modules/points/points.service';
import { UsersService } from 'src/modules/users/users.service';

/** City speed used to turn pickup distance into "10 mins away". */
const CITY_SPEED_KMH = 18;

const ALERT_WINDOW_MS = 90 * 60_000;

const IN_MOTION: DonationStatus[] = [
  DonationStatus.Assigned,
  DonationStatus.PickedUp,
  DonationStatus.InTransit,
];

const QUANTITY_UNIT: Record<FoodType, string> = {
  [FoodType.Cooked]: 'pkts',
  [FoodType.Raw]: 'kg',
  [FoodType.Packaged]: 'pcs',
  [FoodType.Bakery]: 'pcs',
  [FoodType.Dairy]: 'pcs',
  [FoodType.Beverage]: 'pcs',
};

const SHORT_UNIT: Record<QuantityUnit, string> = {
  [QuantityUnit.Packets]: 'pkts',
  [QuantityUnit.Kilograms]: 'kg',
  [QuantityUnit.Pieces]: 'pcs',
  [QuantityUnit.Litres]: 'L',
  [QuantityUnit.Portions]: 'portions',
};

export interface DonorDashboardVolunteer {
  name: string;
  minutesAway: number;
}

export interface DonorDashboardDonation {
  id: string;
  title: string;
  status: DonationStatus;
  photoUrl: string | null;
  quantityLabel: string;
  locationLabel: string;
  cookedAt: string;
  pickup: { latitude: number; longitude: number } | null;
  volunteer: DonorDashboardVolunteer | null;
  expiresInMinutes: number | null;
  ridersPinged: number;
  deliveredTo: string | null;
  karmaEarned: number | null;
}

export interface DonorDashboard {
  donor: {
    firstName: string;
    hub: string;
    isVerified: boolean;
    activeContributions: number;
    hasAlerts: boolean;
  };
  stats: {
    mealsShared: number;
    familiesFed: number;
    karmaPoints: number;
  };
  donations: DonorDashboardDonation[];
}

@Injectable()
export class DonorDashboardService {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly assignmentsService: AssignmentsService,
    private readonly foodRequestsService: FoodRequestsService,
    private readonly pointsService: PointsService,
    private readonly usersService: UsersService,
  ) {}

  async forDonor(donorId: string): Promise<DonorDashboard> {
    const [user, donations, karmaPoints] = await Promise.all([
      this.usersService.findById(donorId),
      this.donationsService.listForDonor(donorId),
      this.pointsService.balanceOf(donorId),
    ]);

    const donationIds = donations.map((donation) => donation.id as string);
    const [assignments, pointsByDonation, matchedRequests] = await Promise.all([
      this.assignmentsService.activityForDonations(donationIds),
      this.pointsService.totalsForDonations(donorId, donationIds),
      this.foodRequestsService.findByDonationIds(donationIds),
    ]);

    const extraRequestIds = assignments
      .map((assignment: AssignmentDocument) => assignment.requestId?.toString())
      .filter((id): id is string => Boolean(id));
    const linkedRequests = await this.foodRequestsService.findByIds(extraRequestIds);

    const requestById = new Map<string, FoodRequestDocument>();
    const requestByDonation = new Map<string, FoodRequestDocument>();
    for (const request of [...matchedRequests, ...linkedRequests]) {
      requestById.set(request.id as string, request);
      if (request.matchedDonationId) {
        requestByDonation.set(request.matchedDonationId.toString(), request);
      }
    }

    const volunteerIds = assignments
      .filter((assignment: AssignmentDocument) => assignment.status === AssignmentStatus.Accepted)
      .map((assignment: AssignmentDocument) => assignment.volunteerId.toString());
    const volunteers = await this.usersService.findManyByIds([...new Set(volunteerIds)]);
    const volunteerName = new Map(
      volunteers.map((volunteer) => [volunteer.id as string, volunteer.name]),
    );

    const cards = donations.map((donation) =>
      this.toCard(donation, {
        assignments: assignments.filter(
          (assignment: AssignmentDocument) => assignment.donationId.toString() === (donation.id as string),
        ),
        requestByDonation,
        requestById,
        volunteerName,
        pointsByDonation,
      }),
    );

    const delivered = donations.filter((donation) => donation.status === DonationStatus.Delivered);
    const city = user.address?.city?.trim();
    const recipientByDonation = new Map<string, string>();
    for (const [donationId, request] of requestByDonation) {
      recipientByDonation.set(donationId, request.recipientId.toString());
    }
    for (const assignment of assignments) {
      const donationId = assignment.donationId.toString();
      if (recipientByDonation.has(donationId) || !assignment.requestId) continue;
      const request = requestById.get(assignment.requestId.toString());
      if (request) recipientByDonation.set(donationId, request.recipientId.toString());
    }

    return {
      donor: {
        firstName: firstNameOf(user.name),
        hub: city ? `${city} Hub` : 'Jaffna Hub',
        isVerified: user.isVerified,
        activeContributions: donations.filter(
          (donation) => !TERMINAL_DONATION_STATUSES.includes(donation.status),
        ).length,
        hasAlerts: donations.some(
          (donation) =>
            !TERMINAL_DONATION_STATUSES.includes(donation.status) &&
            donation.expiresAt.getTime() - Date.now() <= ALERT_WINDOW_MS,
        ),
      },
      stats: {
        mealsShared: delivered.reduce((sum, donation) => sum + donation.servings, 0),
        familiesFed: countFamilies(delivered, recipientByDonation),
        karmaPoints,
      },
      donations: cards,
    };
  }

  private toCard(
    donation: DonationDocument,
    context: {
      assignments: AssignmentDocument[];
      requestByDonation: Map<string, FoodRequestDocument>;
      requestById: Map<string, FoodRequestDocument>;
      volunteerName: Map<string, string>;
      pointsByDonation: Map<string, number>;
    },
  ): DonorDashboardDonation {
    const id = donation.id as string;
    const accepted = context.assignments.find(
      (assignment: AssignmentDocument) => assignment.status === AssignmentStatus.Accepted,
    );
    const ridersPinged = context.assignments.filter(
      (assignment: AssignmentDocument) => assignment.status === AssignmentStatus.Offered,
    ).length;

    const moving = IN_MOTION.includes(donation.status);
    const volunteerName = accepted
      ? context.volunteerName.get(accepted.volunteerId.toString())
      : undefined;
    const volunteer =
      accepted && moving
        ? {
            name: shortName(volunteerName ?? 'Volunteer'),
            minutesAway: minutesFromDistance(accepted.distanceKm),
          }
        : null;

    const request =
      context.requestByDonation.get(id) ??
      (accepted?.requestId ? context.requestById.get(accepted.requestId.toString()) : undefined) ??
      context.assignments
        .map((assignment: AssignmentDocument) =>
          assignment.requestId
            ? context.requestById.get(assignment.requestId.toString())
            : undefined,
        )
        .find((item: FoodRequestDocument | undefined) => item !== undefined);

    const delivered = donation.status === DonationStatus.Delivered;
    const minutesLeft = Math.ceil((donation.expiresAt.getTime() - Date.now()) / 60_000);
    const stillCollectable =
      donation.status === DonationStatus.PendingApproval ||
      donation.status === DonationStatus.Approved ||
      donation.status === DonationStatus.Assigned;

    const coordinates = donation.pickupAddress?.location?.coordinates;

    return {
      id,
      title: donation.title,
      status: donation.status,
      photoUrl: donation.photoUrls[0] ?? null,
      quantityLabel: `${donation.servings} ${
        donation.quantityUnit ? SHORT_UNIT[donation.quantityUnit] : QUANTITY_UNIT[donation.foodType]
      }`,
      locationLabel: donation.pickupAddress.line1,
      cookedAt: donation.cookedAt.toISOString(),
      pickup: coordinates ? { latitude: coordinates[1], longitude: coordinates[0] } : null,
      volunteer,
      expiresInMinutes:
        stillCollectable && minutesLeft > 0 && minutesLeft <= 180 ? minutesLeft : null,
      ridersPinged,
      deliveredTo: delivered ? (request?.dropAddress.line1 ?? null) : null,
      karmaEarned: delivered ? (context.pointsByDonation.get(id) ?? 0) : null,
    };
  }
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return 'Volunteer';
  if (!last || parts.length < 2) return first;
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

function minutesFromDistance(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 1;
  return Math.max(1, Math.round((distanceKm / CITY_SPEED_KMH) * 60));
}

function countFamilies(
  delivered: DonationDocument[],
  recipientByDonation: Map<string, string>,
): number {
  const recipients = new Set<string>();
  let unlinked = 0;

  for (const donation of delivered) {
    const recipientId = recipientByDonation.get(donation.id as string);
    if (recipientId) recipients.add(recipientId);
    else unlinked += 1;
  }

  return recipients.size + unlinked;
}
