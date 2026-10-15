import { DonorShell } from '@/components/donor/DonorShell';
import { ProfileScreen } from '@/components/ProfileScreen';

export default function DonorProfile() {
  return (
    <DonorShell active="profile">
      <ProfileScreen role="donor" embedded />
    </DonorShell>
  );
}
