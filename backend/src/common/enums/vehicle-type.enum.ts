export enum VehicleType {
  Foot = 'foot',
  Bicycle = 'bicycle',
  Motorbike = 'motorbike',
  ThreeWheeler = 'three_wheeler',
  Car = 'car',
  Van = 'van',
}

/** FR7 — how much a volunteer can realistically carry, used when ranking candidates (FR6). */
export const VEHICLE_CAPACITY_SERVINGS: Record<VehicleType, number> = {
  [VehicleType.Foot]: 10,
  [VehicleType.Bicycle]: 20,
  [VehicleType.Motorbike]: 40,
  [VehicleType.ThreeWheeler]: 80,
  [VehicleType.Car]: 120,
  [VehicleType.Van]: 400,
};
