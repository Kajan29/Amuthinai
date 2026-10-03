import { useTranslation } from 'react-i18next';

import { Badge } from './ui/Badge';

import type { DonationStatus } from '@/types';

const TONES: Record<DonationStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending_approval: 'warning',
  approved: 'info',
  rejected: 'danger',
  assigned: 'info',
  picked_up: 'info',
  in_transit: 'info',
  delivered: 'success',
  expired: 'danger',
  cancelled: 'neutral',
};

export function StatusBadge({ status }: { status: DonationStatus }) {
  const { t } = useTranslation();
  return <Badge label={t(`status.${status}`)} tone={TONES[status]} />;
}
