import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { AssignmentMode, DeliveryMethod } from '@/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface DeliveryMethodMeta {
  method: DeliveryMethod;
  icon: IconName;
  labelKey: string;
  hintKey: string;
}

/** The three ways food can reach a recipient, in the order they are offered. */
export const DELIVERY_METHODS: DeliveryMethodMeta[] = [
  {
    method: 'volunteer_rider',
    icon: 'bicycle',
    labelKey: 'flow.methodVolunteer',
    hintKey: 'flow.methodVolunteerHint',
  },
  {
    method: 'recipient_pickup',
    icon: 'walk',
    labelKey: 'flow.methodRecipientPickup',
    hintKey: 'flow.methodRecipientPickupHint',
  },
  {
    method: 'self_drop',
    icon: 'car',
    labelKey: 'flow.methodDonorDelivery',
    hintKey: 'flow.methodDonorDeliveryHint',
  },
];

export function deliveryMethodMeta(method?: DeliveryMethod | null): DeliveryMethodMeta | null {
  return DELIVERY_METHODS.find((entry) => entry.method === method) ?? null;
}

export function methodOfMode(mode?: AssignmentMode | null): DeliveryMethod {
  if (mode === 'recipient_pickup') return 'recipient_pickup';
  if (mode === 'donor_delivery') return 'self_drop';
  return 'volunteer_rider';
}
