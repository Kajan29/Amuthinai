/** How the donor counted the food on the post-donation form. */
export enum QuantityUnit {
  Packets = 'packets',
  Kilograms = 'kg',
  Pieces = 'pieces',
  Litres = 'litres',
  Portions = 'portions',
}

/** Where the volunteer should collect the food. */
export enum PickupSource {
  Registered = 'registered',
  Custom = 'custom',
}

/** How the food should be carried. */
export enum HandlingInstruction {
  KeepWarm = 'keep_warm',
  RequiresRefrigeration = 'requires_refrigeration',
  IndividuallyPacked = 'individually_packed',
  FragileLiquid = 'fragile_liquid',
}

/**
 * Who moves the food from the donor. The donor states a preference when posting; the admin
 * confirms the final method after approval.
 */
export enum DeliveryMethod {
  VolunteerRider = 'volunteer_rider',
  /** The recipient collects from the donor; the donor checks the recipient's code. */
  RecipientPickup = 'recipient_pickup',
  /** The donor carries the food to the recipient; the recipient's code confirms handover. */
  SelfDrop = 'self_drop',
}

/** Dietary and preparation flags chosen on the food-details step. */
export enum DietaryTag {
  PureVegetarian = 'pure_vegetarian',
  HalalFriendly = 'halal_friendly',
  CookedToday = 'cooked_today',
  NutFree = 'nut_free',
  ContainsEggMeat = 'contains_egg_meat',
}
