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

/** `self_drop` is donor self-delivery; `recipient_pickup` is recipient self-pickup. */
export type DeliveryMethod = 'volunteer_rider' | 'recipient_pickup' | 'self_drop';

/** Who carries the food on an assignment. */
export type AssignmentMode = 'volunteer' | 'recipient_pickup' | 'donor_delivery';

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
  address?: Address;
  pushToken?: string;
  isFlagged?: boolean;
  flagReason?: string;
  nicNumber?: string;
  drivingLicenseNumber?: string;
  badgeTitle?: string;
  avatarUrl?: string;
  completedDeliveriesCount?: number;
  /** Volunteers only — the "Ready for deliveries" toggle. */
  isAvailable?: boolean;
  /** False once an admin deactivates the account. */
  isActive?: boolean;
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
  /** The donor's preference until `deliveryMethodConfirmedAt` is set by an admin. */
  deliveryMethod?: DeliveryMethod;
  deliveryMethodConfirmedAt?: string;
  handoverInstructions?: string;
  /** FR3 — when the food was cooked and how long it stays safe. */
  cookedAt: string;
  safeForHours: number;
  expiresAt: string;
  pickupAddress: Address;
  /** The one recipient request this donation is confirmed for. */
  foodRequestId?: string;
  claimedAt?: string;
  status: DonationStatus;
  rejectionReason?: string;
  isFlagged?: boolean;
  flagReason?: string;
  thermalTemp?: number;
  packagingType?: string;
  pickupBay?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  urgentPrioritySector?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContactPreference = 'call' | 'sms' | 'whatsapp' | 'in_app';

export type RequestDeliveryMethod = 'doorstep' | 'hub_pickup';

export interface FoodRequest {
  id: string;
  recipientId: string;
  servingsNeeded: number;
  familySize?: number;
  neededBy: string;
  notes?: string;
  dietaryRequirements?: string[];
  foodCategory?: string;
  contactPreference?: ContactPreference;
  deliveryMethod?: RequestDeliveryMethod;
  contactPhone?: string;
  dropAddress: Address;
  status: RequestStatus;
  /** Populated with the donation on the recipient's own list. */
  matchedDonationId?: string | Donation;
  /** `claim` when the recipient claimed a general donation. */
  origin?: 'request' | 'claim';
  fulfilledAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Assignment {
  id: string;
  donationId: string;
  requestId?: string;
  volunteerId: string;
  mode?: AssignmentMode;
  ngoId?: string;
  status: AssignmentStatus;
  /** FR9 — only ever present in the recipient's tracking payload. */
  deliveryPin?: string;
  distanceKm: number;
  offeredAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  completedAt?: string;
  declineReason?: string;
  cancelReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryProof {
  id: string;
  assignmentId: string;
  stage: 'pickup' | 'delivery';
  /** Optional for in-person donor/recipient handovers. */
  photoUrl?: string;
  capturedAt: string;
  location?: GeoPoint;
  pinVerified: boolean;
  recordedBy?: 'volunteer' | 'donor' | 'admin';
  quantityConfirmed?: number;
  note?: string;
}

export interface ContactInfo {
  name: string;
  phone: string | null;
}

/** The recipient request a task delivers to. */
export interface TaskRequestInfo {
  id: string;
  servingsNeeded: number;
  familySize: number | null;
  neededBy: string;
  notes: string | null;
  dietaryRequirements: string[];
  foodCategory: string | null;
  deliveryMethod: string;
  contactPreference: string;
  status: RequestStatus;
  dropAddress: Address;
}

/**
 * One volunteer task. Open tasks are approved donations nobody has claimed yet; their
 * assignment id is `open-<donationId>` until a volunteer accepts.
 */
export interface TaskView {
  assignment: Assignment;
  donation: Donation;
  distanceKm: number;
  routeKm: number | null;
  minutesLeft: number;
  isOpen: boolean;
  isUrgent: boolean;
  request: TaskRequestInfo | null;
  /** Revealed only after the volunteer accepts. */
  donor: ContactInfo | null;
  recipient: ContactInfo | null;
  proofs: DeliveryProof[];
}

export type NotificationType =
  | 'donation'
  | 'assignment'
  | 'urgent'
  | 'pickup'
  | 'delivery'
  | 'delay'
  | 'enquiry'
  | 'request'
  | 'points'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
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

export type EnquiryStatus = 'open' | 'in_review' | 'resolved';

export type EnquiryCategory =
  | 'late_delivery'
  | 'not_delivered'
  | 'food_quality'
  | 'wrong_quantity'
  | 'wrong_location'
  | 'volunteer_behaviour'
  | 'road_issue'
  | 'other';

export interface EnquiryResponse {
  authorId: string;
  authorName: string;
  authorRole: Role;
  message: string;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  raisedBy: string;
  raisedByRole?: Role;
  donationId?: string;
  assignmentId?: string;
  requestId?: string;
  category?: EnquiryCategory;
  subject: string;
  body: string;
  status: EnquiryStatus;
  responses?: EnquiryResponse[];
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
  /** Admin list only. */
  raiser?: { id: string; name: string; role: Role; phone: string | null } | null;
  donation?: { id: string; title: string; status: DonationStatus; servings: number } | null;
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
