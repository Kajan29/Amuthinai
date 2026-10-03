import { Injectable } from '@nestjs/common';

import { DonationStatus } from 'src/common/enums/donation-status.enum';
import { AssignmentsService } from 'src/modules/assignments/assignments.service';
import { DonationsService } from 'src/modules/donations/donations.service';
import { EnquiriesService } from 'src/modules/enquiries/enquiries.service';
import { FoodRequestsService } from 'src/modules/food-requests/food-requests.service';

export interface AdminKpis {
  pendingApprovals: number;
  activeDeliveries: number;
  servingsToday: number;
  wasteAvertedKg: number;
  openDisputes: number;
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
  ) {}

  async kpis(): Promise<AdminKpis> {
    const [pending, delivered, activeDeliveries, openDisputes] = await Promise.all([
      this.donationsService.findAll({
        status: [DonationStatus.PendingApproval],
        page: 1,
        pageSize: 1,
        skip: 0,
      }),
      this.donationsService.findAll({
        status: [DonationStatus.Delivered],
        page: 1,
        pageSize: 100,
        skip: 0,
      }),
      this.assignmentsService.countActiveDeliveries(),
      this.enquiriesService.countOpen(),
    ]);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const servingsToday = delivered.items
      .filter((donation) => donation.updatedAt >= startOfDay)
      .reduce((total, donation) => total + donation.servings, 0);

    return {
      pendingApprovals: pending.total,
      activeDeliveries,
      servingsToday,
      wasteAvertedKg: Math.round(servingsToday * KG_PER_SERVING),
      openDisputes: openDisputes,
    };
  }

  /** FR8 — open demand per district, used for the heat-map and the analytics bar list. */
  demandByDistrict() {
    return this.foodRequestsService.aggregateDemandByDistrict();
  }
}
