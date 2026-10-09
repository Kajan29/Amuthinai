import { Injectable } from '@nestjs/common';

import { FoodType } from 'src/common/enums/food-type.enum';
import { AssignmentsService } from 'src/modules/assignments/assignments.service';
import { DonationsService } from 'src/modules/donations/donations.service';
import { EnquiriesService } from 'src/modules/enquiries/enquiries.service';
import { FoodRequestsService } from 'src/modules/food-requests/food-requests.service';
import { NgosService } from 'src/modules/ngos/ngos.service';
import { UsersService } from 'src/modules/users/users.service';

export interface AdminKpis {
  pendingApprovals: number;
  activeDeliveries: number;
  activePickups: number;
  activeAssignments: number;
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
  unmetServings: number;
  expiredDonations: number;
  foodHubsCount: number;
}

/** Rough conversion used for the impact figure until weights are captured per donation. */
const KG_PER_SERVING = 0.4;

/** Approximate CO2e avoided per kg of food not sent to landfill. */
const CO2_PER_KG = 2.5;

const FOOD_TYPE_LABEL: Record<FoodType, string> = {
  [FoodType.Cooked]: 'Cooked Meals',
  [FoodType.Raw]: 'Raw Vegetables & Fruits',
  [FoodType.Packaged]: 'Packaged & Dry Rations',
  [FoodType.Bakery]: 'Bakery Items',
  [FoodType.Dairy]: 'Dairy',
  [FoodType.Beverage]: 'Beverages',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly foodRequestsService: FoodRequestsService,
    private readonly assignmentsService: AssignmentsService,
    private readonly enquiriesService: EnquiriesService,
    private readonly usersService: UsersService,
    private readonly ngosService: NgosService,
  ) {}

  async kpis(): Promise<AdminKpis> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      donationStats,
      today,
      assignmentStats,
      openDisputes,
      volunteerStats,
      requestStats,
      unmetServings,
      expiredDonations,
      foodHubsCount,
    ] = await Promise.all([
      this.donationsService.countDonationsStats(),
      this.donationsService.deliveredTotals(startOfDay),
      this.assignmentsService.countAssignmentsStats(),
      this.enquiriesService.countOpen(),
      this.usersService.countVolunteers(),
      this.foodRequestsService.countRequestsStats(),
      this.foodRequestsService.unmetServings(),
      this.donationsService.countExpired(),
      this.ngosService.countActive(),
    ]);

    return {
      pendingApprovals: donationStats.pending,
      activeDeliveries: assignmentStats.active,
      activePickups: assignmentStats.active,
      activeAssignments: assignmentStats.active + assignmentStats.offered,
      servingsToday: today.servings,
      wasteAvertedKg: Math.round(today.servings * KG_PER_SERVING),
      openDisputes,
      totalVolunteers: volunteerStats.total,
      verifiedVolunteers: volunteerStats.verified,
      pendingVolunteerKyc: volunteerStats.pending,
      urgentDonations: donationStats.urgent,
      totalDonations: donationStats.total,
      completedDistributions: donationStats.delivered,
      openRecipientRequests: requestStats.open,
      unmetServings,
      expiredDonations,
      foodHubsCount,
    };
  }

  /** FR8 — open demand per district, used for the heat-map and the analytics bar list. */
  demandByDistrict() {
    return this.foodRequestsService.aggregateDemandByDistrict();
  }

  async reports() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [kpis, demand, byFoodType, monthly, top, allTime, households, unfulfilled] =
      await Promise.all([
        this.kpis(),
        this.demandByDistrict(),
        this.donationsService.foodTypeBreakdown(),
        this.donationsService.monthlyDelivered(sixMonthsAgo),
        this.usersService.topVolunteers(5),
        this.donationsService.deliveredTotals(),
        this.foodRequestsService.householdsServed(),
        this.foodRequestsService.aggregateUnfulfilledByArea(),
      ]);

    const totalCount = byFoodType.reduce((sum, row) => sum + row.count, 0);
    const foodTypeBreakdown = byFoodType.map((row) => ({
      label: FOOD_TYPE_LABEL[row.foodType as FoodType] ?? row.foodType,
      count: row.count,
      percentage: totalCount ? Math.round((row.count / totalCount) * 100) : 0,
    }));

    const monthlyTrends = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(sixMonthsAgo);
      date.setMonth(sixMonthsAgo.getMonth() + index);
      const row = monthly.find(
        (entry) => entry.year === date.getFullYear() && entry.month === date.getMonth() + 1,
      );
      const servings = row?.servings ?? 0;
      return {
        month: MONTHS[date.getMonth()]!,
        deliveries: row?.deliveries ?? 0,
        servings,
        wasteKg: Math.round(servings * KG_PER_SERVING),
      };
    });

    const topVolunteers = top.map((volunteer) => ({
      id: volunteer.id as string,
      name: volunteer.name,
      vehicle: volunteer.vehicleType ?? 'Not set',
      deliveries: volunteer.completedDeliveriesCount ?? 0,
      karma: volunteer.karmaPoints ?? 0,
    }));

    const wasteKg = Math.round(allTime.servings * KG_PER_SERVING);

    return {
      kpis,
      demand,
      unfulfilledByArea: unfulfilled,
      foodTypeBreakdown,
      monthlyTrends,
      topVolunteers,
      communityImpact: {
        totalMealsDistributed: allTime.servings,
        totalDeliveries: allTime.deliveries,
        householdsSupported: households,
        wasteAvertedKg: wasteKg,
        carbonOffsetKg: Math.round(wasteKg * CO2_PER_KG),
        activeReliefCentres: kpis.foodHubsCount,
      },
    };
  }
}
