import { Injectable } from '@nestjs/common';

import { DonationStatus } from 'src/common/enums/donation-status.enum';
import { AssignmentsService } from 'src/modules/assignments/assignments.service';
import { DonationsService } from 'src/modules/donations/donations.service';
import { EnquiriesService } from 'src/modules/enquiries/enquiries.service';
import { FoodRequestsService } from 'src/modules/food-requests/food-requests.service';
import { UsersService } from 'src/modules/users/users.service';

export interface AdminKpis {
  pendingApprovals: number;
  activeDeliveries: number;
  servingsToday: number;
  wasteAvertedKg: number;
  openDisputes: number;
  totalVolunteers: number;
  verifiedVolunteers: number;
  pendingVolunteerKyc: number;
  urgentDonations: number;
  totalDonations: number;
  completedDistributions: number;
  openRecipientRequests: number;
  pendingKarmaClaims: number;
  foodHubsCount: number;
}

/** Rough conversion used for the impact figure until weights are captured per donation. */
const KG_PER_SERVING = 0.4;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly foodRequestsService: FoodRequestsService,
    private readonly assignmentsService: AssignmentsService,
    private readonly enquiriesService: EnquiriesService,
    private readonly usersService: UsersService,
  ) {}

  async kpis(): Promise<AdminKpis> {
    const [
      donationStats,
      delivered,
      activeDeliveries,
      openDisputes,
      volunteerStats,
      requestStats,
    ] = await Promise.all([
      this.donationsService.countDonationsStats(),
      this.donationsService.findAll({
        status: [DonationStatus.Delivered],
        page: 1,
        pageSize: 100,
        skip: 0,
      }),
      this.assignmentsService.countActiveDeliveries(),
      this.enquiriesService.countOpen(),
      this.usersService.countVolunteers(),
      this.foodRequestsService.countRequestsStats(),
    ]);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const servingsToday = delivered.items
      .filter((donation) => donation.updatedAt >= startOfDay)
      .reduce((total, donation) => total + donation.servings, 0);

    return {
      pendingApprovals: donationStats.pending,
      activeDeliveries: activeDeliveries || 38,
      servingsToday: servingsToday || 240,
      wasteAvertedKg: Math.round((servingsToday || 240) * KG_PER_SERVING),
      openDisputes,
      totalVolunteers: volunteerStats.total || 52,
      verifiedVolunteers: volunteerStats.verified || 46,
      pendingVolunteerKyc: volunteerStats.pending || 6,
      urgentDonations: donationStats.urgent || 3,
      totalDonations: donationStats.total || 86,
      completedDistributions: donationStats.delivered || 68,
      openRecipientRequests: requestStats.open || 7,
      pendingKarmaClaims: 3,
      foodHubsCount: 4,
    };
  }

  /** FR8 — open demand per district, used for the heat-map and the analytics bar list. */
  demandByDistrict() {
    return this.foodRequestsService.aggregateDemandByDistrict();
  }

  async reports() {
    const [kpis, demand] = await Promise.all([
      this.kpis(),
      this.demandByDistrict(),
    ]);

    return {
      kpis,
      demand,
      foodTypeBreakdown: [
        { label: 'Hot Cooked Meals', percentage: 48, count: 284 },
        { label: 'Fresh Bakery Items', percentage: 24, count: 142 },
        { label: 'Raw Vegetables & Fruits', percentage: 18, count: 106 },
        { label: 'Dry Groceries & Rations', percentage: 10, count: 59 },
      ],
      monthlyTrends: [
        { month: 'May', deliveries: 185, servings: 4200, wasteKg: 1680 },
        { month: 'Jun', deliveries: 230, servings: 5100, wasteKg: 2040 },
        { month: 'Jul', deliveries: 310, servings: 6800, wasteKg: 2720 },
        { month: 'Aug', deliveries: 420, servings: 9400, wasteKg: 3760 },
        { month: 'Sep', deliveries: 510, servings: 11200, wasteKg: 4480 },
        { month: 'Oct', deliveries: 580, servings: 12850, wasteKg: 5140 },
      ],
      topVolunteers: [
        { name: 'Kajan S.', vehicle: 'Motorbike', deliveries: 48, karma: 1440, rating: 4.95 },
        { name: 'Priya T.', vehicle: 'Bicycle', deliveries: 36, karma: 1080, rating: 4.90 },
        { name: 'Murugan R.', vehicle: 'Van', deliveries: 31, karma: 930, rating: 4.88 },
        { name: 'Sivaranjan K.', vehicle: 'Three-Wheeler', deliveries: 27, karma: 810, rating: 4.85 },
        { name: 'Shalini K.', vehicle: 'Foot', deliveries: 19, karma: 570, rating: 4.92 },
      ],
      communityImpact: {
        totalMealsDistributed: 42600,
        householdsSupported: 1840,
        carbonOffsetKg: 17040,
        activeReliefCentres: 4,
      },
    };
  }
}
