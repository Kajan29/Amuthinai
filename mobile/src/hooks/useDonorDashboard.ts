import { donationsApi } from '@/api/donations.api';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';

export function useDonorDashboard() {
  return useOfflineQuery('donor.dashboard', () => donationsApi.dashboard());
}
