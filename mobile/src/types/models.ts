/**
 * Domain models shared across screens. These mirror the backend schemas in
 * `backend/src/modules/**\/schemas` — keep the two in sync when either changes.
 */

export type Role = 'donor' | 'volunteer' | 'recipient' | 'admin';

export type DonationStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'expired'
  | 'cancelled';

export type RequestStatus = 'open' | 'matched' | 'fulfilled' | 'cancelled';

export type AssignmentStatus = 'offered' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export type FoodType = 'cooked' | 'raw' | 'packaged' | 'bakery' | 'dairy' | 'beverage';

export type QuantityUnit = 'packets' | 'kg' | 'pieces' | 'litres' | 'portions';

export type PickupSource = 'registered' | 'custom';

export type HandlingInstruction =
  | 'keep_warm'
  | 'requires_refrigeration'
  | 'individually_packed'
  | 'fragile_liquid';

export type DeliveryMethod = 'volunteer_rider' | 'self_drop';

export type DietaryTag =
  | 'pure_vegetarian'
  | 'halal_friendly'
  | 'cooked_today'
  | 'nut_free'
  | 'contains_egg_meat';

export type VehicleType = 'foot' | 'bicycle' | 'motorbike' | 'three_wheeler' | 'car' | 'van';

export type Language = 'en' | 'ta' | 'si';

export interface GeoPoint {
  /** GeoJSON order: [longitude, latitude]. */
  coordinates: [number, number];
  type: 'Point';
}

export interface Address {
  line1: string;
  city: string;
  district?: string;
  location: GeoPoint;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  language: Language;
  isVerified: boolean;
  karmaPoints: number;
  /** Volunteers only — FR7. */
  vehicleType?: VehicleType;
  travelRadiusKm?: number;
  createdAt: string;
}

export interface Donation {
  id: string;
  donorId: string;
  title: string;
  foodType: FoodType;
  servings: number;
  quantityUnit?: QuantityUnit;
  dietaryTags?: DietaryTag[];
  foodSafetyVerified?: boolean;
  description?: string;
  photoUrls: string[];
  pickupSource?: PickupSource;
  readyFrom?: string;
  consumeBefore?: string;
  handling?: HandlingInstruction[];
  deliveryMethod?: DeliveryMethod;
  handoverInstructions?: string;
  /** FR3 — when the food was cooked and how long it stays safe. */
  cookedAt: string;
  safeForHours: number;
  expiresAt: string;
  pickupAddress: Address;
  status: DonationStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodRequest {
  id: string;
  recipientId: string;
  servingsNeeded: number;
  neededBy: string;
  notes?: string;
  dropAddress: Address;
  status: RequestStatus;
  createdAt: string;
}

export interface Assignment {
  id: string;
  donationId: string;
  requestId?: string;
  volunteerId: string;
  status: AssignmentStatus;
  /** FR9 — handed to the recipient to confirm delivery. */
  deliveryPin: string;
  distanceKm: number;
  offeredAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export interface DeliveryProof {
  id: string;
  assignmentId: string;
  stage: 'pickup' | 'delivery';
  photoUrl: string;
  capturedAt: string;
  location: GeoPoint;
  pinVerified: boolean;
}

/** FR12 / NFR7 — append-only, hash-chained status log. */
export interface StatusEvent {
  id: string;
  status: DonationStatus;
  note?: string;
  actorId: string;
  actorRole: Role;
  occurredAt: string;
}

export interface ChatMessage {
  id: string;
  donationId: string;
  senderId: string;
  senderRole: Role;
  body: string;
  sentAt: string;
}

export interface Enquiry {
  id: string;
  raisedBy: string;
  donationId?: string;
  subject: string;
  body: string;
  status: 'open' | 'in_review' | 'resolved';
  resolution?: string;
  createdAt: string;
}

export interface Ngo {
  id: string;
  name: string;
  registrationNo: string;
  contactPhone: string;
  address: Address;
  isActive: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
