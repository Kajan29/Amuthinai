import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ProfileScreen } from '@/components/ProfileScreen';
import { useAuth } from '@/hooks/useAuth';
import { chrome } from '@/theme/chrome';

export default function RecipientProfileScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const hub = [user?.address?.city, user?.address?.district].filter(Boolean).join(', ');

  return (
    <ProfileScreen
      role="recipient"
      menuItems={[
        {
          icon: 'alert-circle-outline',
          label: t('recipient.raiseConcern'),
          onPress: () => router.push('/(recipient)/raise-concern'),
          danger: true,
        },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={18} color={chrome.accent} />
          <Text style={styles.title}>{t('profile.location')}</Text>
        </View>
        <Text style={styles.value}>{hub || t('profile.locationUnset')}</Text>
        {user?.address?.line1 ? <Text style={styles.hint}>{user.address.line1}</Text> : null}
      </View>
    </ProfileScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: chrome.card,
    borderColor: chrome.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 18,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  title: { color: chrome.ink, fontSize: 15, fontWeight: '800' },
  value: { color: chrome.ink, fontSize: 14, fontWeight: '600' },
  hint: { color: chrome.muted, fontSize: 13 },
});
