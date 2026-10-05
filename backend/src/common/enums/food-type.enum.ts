export enum FoodType {
  Cooked = 'cooked',
  Raw = 'raw',
  Packaged = 'packaged',
  Bakery = 'bakery',
  Dairy = 'dairy',
  Beverage = 'beverage',
}

/** FR3 — upper bound on the safe-consumption window a donor may declare, per food type. */
export const MAX_SAFE_HOURS: Record<FoodType, number> = {
  [FoodType.Cooked]: 6,
  [FoodType.Raw]: 24,
  [FoodType.Packaged]: 72,
  [FoodType.Bakery]: 24,
  [FoodType.Dairy]: 12,
  [FoodType.Beverage]: 12,
};
