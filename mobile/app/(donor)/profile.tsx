import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { donorColors } from '@/theme/donor';

export default function DonorProfile() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>{t('donor.navProfile')}</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(user?.name ?? '')}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.isVerified ? (
          <View style={styles.verified}>
            <Text style={styles.verifiedText}>{t('donor.verifiedDonor')}</Text>
          </View>
        ) : null}
      </View>

      <LanguageSwitcher />

      <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.signOut}>
        <Text style={styles.signOutText}>{t('common.signOut')}</Text>
      </Pressable>
    </View>
  );
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  root: { backgroundColor: donorColors.background, flex: 1, gap: 16, paddingHorizontal: 16 },
  title: { color: donorColors.ink, fontSize: 26, fontWeight: '800' },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    gap: 6,
    padding: 20,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#F3D7C4',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 6,
    width: 56,
  },
  avatarText: { color: donorColors.plum, fontSize: 18, fontWeight: '800' },
  name: { color: donorColors.ink, fontSize: 18, fontWeight: '700' },
  email: { color: donorColors.muted, fontSize: 14 },
  verified: {
    backgroundColor: donorColors.greenSoft,
    borderRadius: 999,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedText: { color: donorColors.green, fontSize: 12, fontWeight: '700' },
  signOut: {
    alignItems: 'center',
    borderColor: donorColors.plum,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  signOutText: { color: donorColors.plum, fontSize: 15, fontWeight: '700' },
});
