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
  'req-shelter-stjohns': {
    name: "St. John's Community Hub",
    address: 'Chundikuli, Jaffna (Shelter Dropoff Bay B)',
    city: 'Jaffna',
    latitude: 9.6630,
    longitude: 80.0245,
    contactPerson: 'Sister Mary Teresa (Community Coordinator)',
    phone: '+94 77 345 6789',
  },
  'req-elderly-grace': {
    name: 'Grace Care Elderly Home',
    address: 'Temple Road, Chundikuli',
    city: 'Jaffna',
    latitude: 9.6600,
    longitude: 80.0280,
    contactPerson: 'Sister Rani (Care In-Charge)',
    phone: '+94 77 456 7890',
  },
  'req-kitchen-nallur': {
    name: 'Nallur Relief Community Kitchen',
    address: 'Point Pedro Road, Nallur',
    city: 'Jaffna',
    latitude: 9.6720,
    longitude: 80.0290,
    contactPerson: 'Mr. Murugan (Kitchen Lead)',
    phone: '+94 77 567 8901',
  },
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
};

export const MOCK_VOLUNTEER_TASKS: NearbyTask[] = [
  // 1. TASK 1: Urgent 25 Veg Biryani Lunch Packets (Task #VOL-402 / Order #KP-84920)
  {
    assignment: {
      id: 'asgn-vol-402',
      donationId: 'don-biryani-402',
      requestId: 'req-shelter-stjohns',
      volunteerId: 'user-vol-1',
      status: 'offered',
      deliveryPin: '7491',
      distanceKm: 1.2,
      offeredAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    donation: {
      id: 'don-biryani-402',
      donorId: 'donor-nallur-hall',
      title: '25 Veg Biryani Lunch Packets',
      foodType: 'cooked',
      servings: 25,
      quantityUnit: 'portions',
      dietaryTags: ['pure_vegetarian', 'halal_friendly'],
      foodSafetyVerified: true,
      description: 'Side gate entrance, ask for Master Chef Murugan.',
      photoUrls: [
        'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=60',
      ],
      pickupAddress: {
        line1: 'Nallur Community Hall Kitchen',
        city: 'Block 4B, South Gate Entrance, Jaffna',
        location: {
          type: 'Point',
          coordinates: [80.0290, 9.6740],
        },
      },
      cookedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      safeForHours: 3,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      status: 'assigned',
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    distanceKm: 1.2,
    minutesLeft: 20,
  },

  // 2. TASK 2: Scheduled 40 Fresh Bread & Buns Baskets
  {
    assignment: {
      id: 'asgn-bakery-101',
      donationId: 'don-bakery-101',
      requestId: 'req-elderly-grace',
      volunteerId: 'user-vol-1',
      status: 'offered',
      deliveryPin: '5283',
      distanceKm: 0.8,
      offeredAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    donation: {
      id: 'don-bakery-101',
      donorId: 'donor-jaffna-bakery',
      title: '40 Fresh Bread & Buns Baskets',
      foodType: 'bakery',
      servings: 40,
      quantityUnit: 'packets',
      dietaryTags: ['pure_vegetarian'],
      foodSafetyVerified: true,
      description: 'Fresh warm bakery loaves and sweet buns for elderly care home residents.',
      photoUrls: [
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=60',
      ],
      pickupAddress: {
        line1: 'Jaffna Town Bakery',
        city: '800m away, Main Street, Jaffna',
        location: {
          type: 'Point',
          coordinates: [80.0190, 9.6640],
        },
      },
      cookedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      safeForHours: 6,
      expiresAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      status: 'assigned',
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    distanceKm: 0.8,
    minutesLeft: 90,
  },

  // 3. TASK 3: Standard Drop 15kg Fresh Vegetables Hub
  {
    assignment: {
      id: 'asgn-produce-102',
      donationId: 'don-produce-102',
      requestId: 'req-kitchen-nallur',
      volunteerId: 'user-vol-1',
      status: 'offered',
      deliveryPin: '3941',
      distanceKm: 4.8,
      offeredAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    donation: {
      id: 'don-produce-102',
      donorId: 'donor-chavakachcheri-hub',
      title: '15kg Fresh Vegetables Hub',
      foodType: 'raw',
      servings: 15,
      quantityUnit: 'kg',
      dietaryTags: ['pure_vegetarian'],
      foodSafetyVerified: true,
      description: 'Fresh farm harvest including pumpkins, beans, cabbage, and greens.',
      photoUrls: [
        'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=60',
      ],
      pickupAddress: {
        line1: 'Chavakachcheri Hub',
        city: '4.8 km, Kandy Road, Chavakachcheri',
        location: {
          type: 'Point',
          coordinates: [80.1500, 9.6540],
        },
      },
      cookedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      safeForHours: 12,
      expiresAt: new Date(Date.now() + 240 * 60 * 1000).toISOString(),
      status: 'assigned',
      createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    distanceKm: 4.8,
    minutesLeft: 240,
  },
];

export interface VolunteerAchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  pointsReward: number;
  earnedDate?: string;
}

export const MOCK_VOLUNTEER_ACHIEVEMENTS: VolunteerAchievementItem[] = [
  {
    id: 'ach-first-delivery',
    title: 'First Mile Hero',
    description: 'Completed your first successful food rescue mission',
    icon: '🛡️',
    earned: true,
    pointsReward: 50,
    earnedDate: '2026-03-15',
  },
  {
    id: 'ach-speed-demon',
    title: 'Rapid Responder',
    description: 'Delivered an urgent meal parcel in under 20 minutes',
    icon: '⚡',
    earned: true,
    pointsReward: 75,
    earnedDate: '2026-03-22',
  },
  {
    id: 'ach-community-champion',
    title: 'Community Champion',
    description: 'Delivered over 250 meals to local shelters & elderly homes',
    icon: '❤️',
    earned: true,
    pointsReward: 150,
    earnedDate: '2026-04-02',
  },
  {
    id: 'ach-hundred-club',
    title: 'Century Rescuer',
    description: 'Complete 100 verified rescue missions in Jaffna peninsula',
    icon: '🏆',
    earned: false,
    pointsReward: 300,
  },
  {
    id: 'ach-master-guardian',
    title: 'Zero Waste Legend',
    description: 'Reach 2,500 Karma points and Diamond Volunteer status',
    icon: '👑',
    earned: false,
    pointsReward: 500,
  },
];

export const MOCK_ACHIEVEMENTS = MOCK_VOLUNTEER_ACHIEVEMENTS;
