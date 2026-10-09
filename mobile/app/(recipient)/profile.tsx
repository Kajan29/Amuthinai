import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usersApi } from '@/api/users.api';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Badge, Button, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, spacing, typography } from '@/theme';

export default function RecipientProfileScreen() {
  const { t } = useTranslation();
  const { user: authUser, confirmLogout } = useAuth();

  const { data: profileUser } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => usersApi.me(),
  });

  const user = profileUser || authUser;
  const displayName = user?.name || 'Recipient';
  const hubCity = user?.address?.city || 'Nallur';
  const hubDistrict = user?.address?.district || 'Jaffna';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/(recipient)/dashboard')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{user?.email || 'recipient@amuthinai.lk'}</Text>
          <View style={styles.roleBadgeWrap}>
            <Badge label="RECIPIENT" tone="info" />
          </View>
        </View>

        {/* Location & Hub Details */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#0F7B4F" />
            <Text style={styles.sectionTitle}>Registered Hub & Location</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Primary Hub</Text>
            <Text style={styles.infoValue}>{hubCity}, {hubDistrict}</Text>
          </View>
          {user?.phone ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          ) : null}
          {user?.address?.line1 ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{user.address.line1}</Text>
            </View>
          ) : null}
        </Card>

        {/* Language & Preferences */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="globe-outline" size={20} color="#0F7B4F" />
            <Text style={styles.sectionTitle}>Language Preferences</Text>
          </View>
          <View style={styles.langRow}>
            <LanguageSwitcher />
          </View>
        </Card>

        {/* Support & Concerns */}
        <Card style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(recipient)/raise-concern')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
              <Text style={styles.menuLabel}>Report an Issue / Concern</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Sign Out */}
        <Button
          label={t('common.signOut') || 'Log Out'}
          variant="danger"
          onPress={() => void confirmLogout()}
          style={styles.logoutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FCFBF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE1',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: '#1A1A1A',
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EAE1',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#5A1626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarInitial: {
    ...typography.h1,
    color: '#FFFFFF',
    fontSize: 26,
  },
  userName: {
    ...typography.h3,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  userEmail: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 8,
  },
  roleBadgeWrap: {
    marginTop: 4,
  },
  sectionCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EAE1',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    color: '#1A1A1A',
    fontSize: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F6F2',
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.caption,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  langRow: {
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuLabel: {
    ...typography.body,
    color: '#1A1A1A',
  },
  logoutButton: {
    marginTop: spacing.md,
    borderColor: '#EF4444',
  },
});
