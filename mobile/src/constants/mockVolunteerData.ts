import type { NearbyTask } from '@/api/assignments.api';

export interface TaskDropOffDestination {
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  contactPerson: string;
  phone: string;
}

export const MOCK_DROP_OFFS: Record<string, TaskDropOffDestination> = {
  'req-hub-1': {
    name: 'Jaffna Community Food Hub',
    address: '45 Main Street, Jaffna',
    city: 'Jaffna',
    latitude: 9.6690,
    longitude: 80.0270,
    contactPerson: 'Mr. Saravanan (Hub Coordinator)',
    phone: '+94 77 234 5678',
  },
  'req-shelter-1': {
    name: 'Karaiyur Community Relief Shelter',
    address: 'Beach Road, Karaiyur',
    city: 'Jaffna',
    latitude: 9.6580,
    longitude: 80.0150,
    contactPerson: 'Sister Mary (Shelter Director)',
    phone: '+94 77 345 6789',
  },
  'req-elderly-1': {
    name: 'St. Anthony Elderly Care Home',
    address: 'Temple Road, Chundikuli',
    city: 'Jaffna',
    latitude: 9.6600,
    longitude: 80.0280,
    contactPerson: 'Dr. Sivakumar',
    phone: '+94 77 456 7890',
  },
  'req-hospital-1': {
    name: 'Teaching Hospital Patient Care Ward',
    address: 'Hospital Road, Jaffna',
    city: 'Jaffna',
    latitude: 9.6660,
    longitude: 80.0230,
    contactPerson: 'Nurse In-Charge Vani',
    phone: '+94 77 567 8901',
  },
  'req-kitchen-1': {
    name: 'Passaiyoor Community Soup Kitchen',
    address: 'Customs Road, Passaiyoor',
    city: 'Jaffna',
    latitude: 9.6540,
    longitude: 80.0220,
    contactPerson: 'Pastor Joseph',
    phone: '+94 77 678 9012',
  },
};

export const MOCK_VOLUNTEER_TASKS: NearbyTask[] = [
  // 1. ACTIVE TASK (Currently in progress / accepted by volunteer)
  {
    assignment: {
      id: 'asgn-active-01',
      donationId: 'don-active-01',
      requestId: 'req-hub-1',
      volunteerId: 'user-vol-1',
      status: 'accepted',
      deliveryPin: '4821',
      distanceKm: 2.4,
      offeredAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      acceptedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    donation: {
      id: 'don-active-01',
      donorId: 'donor-hotel-gnanam',
      title: 'Hotel Gnanam - Vegetarian Meals & Sambhar',
      foodType: 'cooked',
      servings: 35,
      quantityUnit: 'portions',
      dietaryTags: ['pure_vegetarian', 'halal_friendly'],
      foodSafetyVerified: true,
      description: 'Hot vegetarian thali meals with sambhar and rasam, packed in insulated warm containers.',
      photoUrls: [
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60',
      ],
      pickupAddress: {
        line1: 'Clock Tower Road',
        city: 'Jaffna',
        location: {
          type: 'Point',
          coordinates: [80.0195, 9.6645],
        },
      },
      cookedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      safeForHours: 5,
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      status: 'assigned',
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    distanceKm: 2.4,
    minutesLeft: 55,
  },

  // 2. URGENT TASK 1 (High priority - expiring within 20 mins)
  {
    assignment: {
      id: 'asgn-urg-01',
      donationId: 'don-urg-01',
      requestId: 'req-shelter-1',
      volunteerId: 'user-vol-1',
      status: 'offered',
      deliveryPin: '7392',
      distanceKm: 1.2,
      offeredAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    donation: {
      id: 'don-urg-01',
      donorId: 'donor-rio-bakery',
      title: 'Rio Bakery - Fresh Buns, Patties & Pastries',
      foodType: 'bakery',
      servings: 50,
      quantityUnit: 'packets',
      dietaryTags: ['pure_vegetarian'],
      foodSafetyVerified: true,
      description: 'Freshly baked evening buns, vegetable patties, and rolls. Needs immediate collection.',
      photoUrls: [
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=60',
      ],
      pickupAddress: {
        line1: 'Point Pedro Road, Nallur',
        city: 'Jaffna',
        location: {
          type: 'Point',
          coordinates: [80.0290, 9.6720],
        },
      },
      cookedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      safeForHours: 3,
      expiresAt: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
      status: 'assigned',
      createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    distanceKm: 1.2,
    minutesLeft: 18,
  },

  // 3. URGENT TASK 2 (High priority - cooked food expiring in 24 mins)
  {
    assignment: {
      id: 'asgn-urg-02',
      donationId: 'don-urg-02',
      requestId: 'req-elderly-1',
      volunteerId: 'user-vol-1',
      status: 'offered',
      deliveryPin: '3184',
      distanceKm: 2.1,
      offeredAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    },
    donation: {
      id: 'don-urg-02',
      donorId: 'donor-yarl-hotel',
      title: 'Yarl Hotel - Hot Rice, Dhal & Vegetable Curry',
      foodType: 'cooked',
      servings: 40,
      quantityUnit: 'portions',
      dietaryTags: ['pure_vegetarian', 'halal_friendly'],
      foodSafetyVerified: true,
      description: 'Steaming hot rice, spiced dhal and pumpkin curry. Ready packed in sealed heat boxes.',
      photoUrls: [
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=60',
      ],
      pickupAddress: {
        line1: 'Station Road, Near Railway Station',
        city: 'Jaffna',
        location: {
          type: 'Point',
          coordinates: [80.0210, 9.6650],
        },
      },
      cookedAt: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
      safeForHours: 3.5,
      expiresAt: new Date(Date.now() + 24 * 60 * 1000).toISOString(),
      status: 'assigned',
      createdAt: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    },
    distanceKm: 2.1,
    minutesLeft: 24,
  },

  // 4. NEAREST AVAILABLE TASK 1 (Shortest distance - 0.8 km)
  {
    assignment: {
      id: 'asgn-near-01',
      donationId: 'don-near-01',
      requestId: 'req-hospital-1',
      volunteerId: 'user-vol-1',
      status: 'offered',
      deliveryPin: '8520',
      distanceKm: 0.8,
      offeredAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    },
    donation: {
      id: 'don-near-01',
      donorId: 'donor-malayan-cafe',
      title: 'Malayan Cafe - Traditional Vadai & Snack Packets',
      foodType: 'cooked',
      servings: 30,
      quantityUnit: 'packets',
      dietaryTags: ['pure_vegetarian'],
      foodSafetyVerified: true,
      description: 'Crispy Ulundu vadai, masala vadai and snack boxes prepared for community welfare.',
      photoUrls: [
        'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=60',
      ],
      pickupAddress: {
        line1: 'Hospital Road, Near Teaching Hospital',
        city: 'Jaffna',
        location: {
          type: 'Point',
          coordinates: [80.0200, 9.6630],
        },
      },
      cookedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      safeForHours: 6,
      expiresAt: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
      status: 'assigned',
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    },
    distanceKm: 0.8,
    minutesLeft: 180,
  },

  // 5. NEAREST AVAILABLE TASK 2 (1.5 km distance)
  {
    assignment: {
      id: 'asgn-near-02',
      donationId: 'don-near-02',
      requestId: 'req-hub-1',
      volunteerId: 'user-vol-1',
      status: 'offered',
      deliveryPin: '6195',
      distanceKm: 1.5,
      offeredAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    donation: {
      id: 'don-near-02',
      donorId: 'donor-thinakaran',
      title: 'Thinakaran Catering - Rice & Curry Packets',
      foodType: 'cooked',
      servings: 25,
      quantityUnit: 'portions',
      dietaryTags: ['halal_friendly'],
      foodSafetyVerified: true,
      description: 'Surplus wedding catering food: Chicken curry, tempered beans, dhal and samba rice.',
      photoUrls: [
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60',
      ],
      pickupAddress: {
        line1: 'Kantharmadam Junction',
        city: 'Jaffna',
        location: {
          type: 'Point',
          coordinates: [80.0240, 9.6780],
        },
      },
      cookedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      safeForHours: 4,
      expiresAt: new Date(Date.now() + 140 * 60 * 1000).toISOString(),
      status: 'assigned',
      createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    distanceKm: 1.5,
    minutesLeft: 140,
  },

  // 6. NEAREST AVAILABLE TASK 3 (3.2 km distance - Fresh Produce)
  {
    assignment: {
      id: 'asgn-near-03',
      donationId: 'don-near-03',
      requestId: 'req-kitchen-1',
      volunteerId: 'user-vol-1',
      status: 'offered',
      deliveryPin: '9034',
      distanceKm: 3.2,
      offeredAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    donation: {
      id: 'don-near-03',
      donorId: 'donor-green-market',
      title: 'Jaffna Green Market - Fresh Organic Vegetables',
      foodType: 'raw',
      servings: 60,
      quantityUnit: 'kg',
      dietaryTags: ['pure_vegetarian', 'cooked_today'],
      foodSafetyVerified: true,
      description: 'Crates of fresh local brinjals, drumsticks, bananas, and pumpkin for community kitchen.',
      photoUrls: [
        'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=60',
      ],
      pickupAddress: {
        line1: 'Grand Bazaar Wholesale Lane',
        city: 'Jaffna',
        location: {
          type: 'Point',
          coordinates: [80.0170, 9.6610],
        },
      },
      cookedAt: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
      safeForHours: 24,
      expiresAt: new Date(Date.now() + 210 * 60 * 1000).toISOString(),
      status: 'assigned',
      createdAt: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    distanceKm: 3.2,
    minutesLeft: 210,
  },
];

export interface VolunteerAchievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  earned: boolean;
  earnedDate?: string;
  pointsReward: number;
}

export const MOCK_VOLUNTEER_ACHIEVEMENTS: VolunteerAchievement[] = [
  {
    id: 'first_delivery',
    icon: '🚀',
    title: 'First Delivery Hero',
    description: 'Completed your very first food rescue mission in Jaffna.',
    earned: true,
    earnedDate: 'Oct 01, 2026',
    pointsReward: 50,
  },
  {
    id: 'speed_runner',
    icon: '⚡',
    title: 'Lightning Courier',
    description: 'Completed 5 deliveries within 2 hours with verified proof.',
    earned: true,
    earnedDate: 'Oct 04, 2026',
    pointsReward: 100,
  },
  {
    id: 'streak_10',
    icon: '🔥',
    title: '10-Day Impact Streak',
    description: 'Active deliveries for 10 consecutive days without delay.',
    earned: true,
    earnedDate: 'Oct 06, 2026',
    pointsReward: 150,
  },
  {
    id: 'community_star',
    icon: '🌟',
    title: 'Community Star',
    description: 'Delivered over 500 meals to families and community hubs.',
    earned: false,
    pointsReward: 250,
  },
  {
    id: 'heavy_lifter',
    icon: '💪',
    title: 'Heavy Lifter',
    description: 'Transported over 1,000 servings of hot and fresh nutrition.',
    earned: false,
    pointsReward: 300,
  },
  {
    id: 'legend',
    icon: '🏆',
    title: 'Amuthinai Champion',
    description: 'Achieve Gold Champion tier with 100+ flawless verifications.',
    earned: false,
    pointsReward: 500,
  },
];
