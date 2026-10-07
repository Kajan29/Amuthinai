import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { assignmentsApi } from '@/api/assignments.api';
import { pointsApi } from '@/api/points.api';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui';
import { TRAVEL_RADIUS_OPTIONS_KM, VEHICLE_TYPES } from '@/constants';
import { MOCK_VOLUNTEER_ACHIEVEMENTS, type VolunteerAchievementItem } from '@/constants/mockVolunteerData';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { radius, typography } from '@/theme';
import { volunteerColors, getTier, KARMA_TIERS } from '@/theme/volunteer';
import type { VehicleType } from '@/types';

/**
 * Volunteer profile — personal info, Karma Points balance, delivery count,
 * Level Progression System (Bronze -> Silver -> Gold -> Platinum -> Diamond),
 * Achievements & Badges, vehicle settings, and preferences.
 */
export default function VolunteerProfile() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, confirmLogout } = useAuth();

  const pointsSummary = useOfflineQuery('volunteer.points', () => pointsApi.summary());
  const balance = pointsSummary.data?.balance ?? user?.karmaPoints ?? 680;
  const tier = getTier(balance);
  const deliveryCount = Math.floor(balance / 24) || 28;

  const [vehicleType, setVehicleType] = useState<VehicleType>(user?.vehicleType ?? 'motorbike');
  const [travelRadiusKm, setTravelRadiusKm] = useState(user?.travelRadiusKm ?? 5);

  const save = useMutation({
    mutationFn: () => assignmentsApi.updateProfile({ vehicleType, travelRadiusKm }),
  });

  // Vehicle icons
  const vehicleIcons: Record<string, string> = {
    foot: 'walk',
    bicycle: 'bicycle',
    motorbike: 'speedometer',
    three_wheeler: 'car-sport',
    car: 'car',
    van: 'bus',
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(insets.bottom + 80, 100) },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Volunteer Profile</Text>
        <LanguageSwitcher />
      </View>

      {/* Main Profile & Karma Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {user?.name?.charAt(0)?.toUpperCase() ?? 'K'}
            {user?.name?.split(' ')[1]?.charAt(0)?.toUpperCase() ?? 'S'}
          </Text>
        </View>
        <Text style={styles.profileName}>{user?.name ?? 'Kajan Selvarajah'}</Text>
        <Text style={styles.profileEmail}>{user?.email ?? 'kajan.volunteer@amuthinai.org'}</Text>

        {/* Verification badge */}
        <View style={styles.verificationRow}>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={volunteerColors.green} />
            <Text style={styles.verifiedText}>Verified Community Volunteer</Text>
          </View>
        </View>

        {/* Quick Stats: Karma Points, Deliveries, Tier */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{balance.toLocaleString()} KP</Text>
            <Text style={styles.quickStatLabel}>Total Karma</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{deliveryCount}</Text>
            <Text style={styles.quickStatLabel}>Deliveries</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{tier.icon}</Text>
            <Text style={styles.quickStatLabel}>{tier.label}</Text>
          </View>
        </View>

        {/* Current Tier & Progress to Next Level */}
        {tier.next && (
          <View style={styles.tierProgressBox}>
            <View style={styles.tierProgressHeader}>
              <Text style={styles.tierProgressLabel}>Progress to {tier.next.label}</Text>
              <Text style={styles.tierProgressRemaining}>
                {tier.next.minPoints - balance} KP needed
              </Text>
            </View>
            <View style={styles.tierTrack}>
              <View
                style={[
                  styles.tierFill,
                  { width: `${Math.round(tier.progress * 100)}%`, backgroundColor: tier.color },
                ]}
              />
            </View>
            <View style={styles.tierProgressFoot}>
              <Text style={styles.tierFootCurrent}>{tier.label} ({tier.minPoints} KP)</Text>
              <Text style={styles.tierFootNext}>{tier.next.label} ({tier.next.minPoints} KP)</Text>
            </View>
          </View>
        )}
      </View>

      {/* Level & Progression System (Bronze -> Silver -> Gold -> Platinum -> Diamond) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="trophy" size={20} color={volunteerColors.orange} />
          <View>
            <Text style={styles.sectionTitle}>Level & Progression System</Text>
            <Text style={styles.sectionSubtitle}>
              Earn Karma Points to unlock higher community tiers
            </Text>
          </View>
        </View>

        <View style={styles.tierLadder}>
          {KARMA_TIERS.map((t, idx) => {
            const isCompleted = idx < tier.index;
            const isCurrent = idx === tier.index;
            return (
              <View key={t.key} style={styles.ladderItem}>
                {/* Rail line and dot */}
                <View style={styles.ladderRail}>
                  <View
                    style={[
                      styles.ladderDot,
                      isCompleted && styles.ladderDotDone,
                      isCurrent && { backgroundColor: t.color, borderColor: t.color, borderWidth: 3 },
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={10} color="#FFF" />
                    ) : isCurrent ? (
                      <View style={styles.ladderDotInner} />
                    ) : (
                      <Text style={styles.ladderDotNum}>{idx + 1}</Text>
                    )}
                  </View>
                  {idx < KARMA_TIERS.length - 1 && (
                    <View
                      style={[
                        styles.ladderStem,
                        isCompleted && styles.ladderStemDone,
                      ]}
                    />
                  )}
                </View>

                {/* Level info */}
                <View
                  style={[
                    styles.ladderCard,
                    isCurrent && styles.ladderCardCurrent,
                    isCompleted && styles.ladderCardDone,
                  ]}
                >
                  <View style={styles.ladderCardTop}>
                    <Text style={styles.ladderIcon}>{t.icon}</Text>
                    <View style={styles.ladderTitleGroup}>
                      <Text style={[styles.ladderName, isCurrent && styles.ladderNameCurrent]}>
                        {t.label}
                      </Text>
                      <Text style={styles.ladderReq}>
                        {t.minPoints === 0 ? 'Starting Level' : `${t.minPoints.toLocaleString()} Karma Points required`}
                      </Text>
                    </View>
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current Level</Text>
                      </View>
                    )}
                    {isCompleted && (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={volunteerColors.green} />
                        <Text style={styles.completedBadgeText}>Completed</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Achievements & Motivation Badges */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="medal" size={20} color={volunteerColors.maroon} />
          <View>
            <Text style={styles.sectionTitle}>Volunteer Achievements</Text>
            <Text style={styles.sectionSubtitle}>
              Milestone badges unlocked through dedicated service
            </Text>
          </View>
        </View>

        <View style={styles.achievementsGrid}>
          {MOCK_VOLUNTEER_ACHIEVEMENTS.map((ach: VolunteerAchievementItem) => (
            <View
              key={ach.id}
              style={[styles.achievementCard, !ach.earned && styles.achievementCardLocked]}
            >
              <View style={[styles.achievementIconBox, !ach.earned && styles.achievementIconBoxLocked]}>
                <Text style={styles.achievementEmoji}>{ach.icon}</Text>
              </View>
              <View style={styles.achievementInfo}>
                <View style={styles.achievementTitleRow}>
                  <Text style={[styles.achievementTitle, !ach.earned && styles.achievementTitleLocked]}>
                    {ach.title}
                  </Text>
                  {ach.earned ? (
                    <View style={styles.achEarnedPill}>
                      <Text style={styles.achEarnedText}>+{ach.pointsReward} KP</Text>
                    </View>
                  ) : (
                    <View style={styles.achLockedPill}>
                      <Ionicons name="lock-closed" size={10} color={volunteerColors.muted} />
                    </View>
                  )}
                </View>
                <Text style={styles.achievementDesc}>{ach.description}</Text>
                {ach.earned && ach.earnedDate && (
                  <Text style={styles.achEarnedDate}>Unlocked: {ach.earnedDate}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Vehicle Preference */}
      <View style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <Ionicons name="speedometer-outline" size={20} color={volunteerColors.maroon} />
          <Text style={styles.settingsTitle}>{t('volunteer.vehicle')}</Text>
        </View>
        <View style={styles.vehicleGrid}>
          {VEHICLE_TYPES.map((type) => {
            const iconName = (vehicleIcons[type] ?? 'car') as any;
            const isSelected = vehicleType === type;
            return (
              <Pressable
                key={type}
                onPress={() => setVehicleType(type)}
                style={[styles.vehicleChip, isSelected && styles.vehicleChipActive]}
              >
                <Ionicons
                  name={iconName}
                  size={18}
                  color={isSelected ? volunteerColors.maroon : volunteerColors.muted}
                />
                <Text style={[styles.vehicleLabel, isSelected && styles.vehicleLabelActive]}>
                  {type.replace('_', ' ')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Travel Radius */}
      <View style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <Ionicons name="locate-outline" size={20} color={volunteerColors.maroon} />
          <Text style={styles.settingsTitle}>{t('volunteer.travelRadius')}</Text>
        </View>
        <View style={styles.radiusRow}>
          {TRAVEL_RADIUS_OPTIONS_KM.map((km) => {
            const isSelected = travelRadiusKm === km;
            return (
              <Pressable
                key={km}
                onPress={() => setTravelRadiusKm(km)}
                style={[styles.radiusChip, isSelected && styles.radiusChipActive]}
              >
                <Text style={[styles.radiusText, isSelected && styles.radiusTextActive]}>
                  {km} km
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Save Settings Button */}
      <View style={styles.saveSection}>
        <Button label={t('common.submit')} loading={save.isPending} onPress={() => save.mutate()} />
        {save.isSuccess && (
          <View style={styles.savedRow}>
            <Ionicons name="checkmark-circle" size={16} color={volunteerColors.green} />
            <Text style={styles.savedText}>Settings saved successfully</Text>
          </View>
        )}
      </View>

      {/* Navigation Options */}
      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(volunteer)/tasks')}
        >
          <Ionicons name="document-text-outline" size={20} color={volunteerColors.ink} />
          <Text style={styles.menuLabel}>Delivery History & Logs</Text>
          <Ionicons name="chevron-forward" size={18} color={volunteerColors.muted} />
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(volunteer)/karma')}
        >
          <Ionicons name="heart-outline" size={20} color={volunteerColors.ink} />
          <Text style={styles.menuLabel}>Community Impact & Leaderboard</Text>
          <Ionicons name="chevron-forward" size={18} color={volunteerColors.muted} />
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="shield-checkmark-outline" size={20} color={volunteerColors.ink} />
          <Text style={styles.menuLabel}>Food Safety Guidelines</Text>
          <Ionicons name="chevron-forward" size={18} color={volunteerColors.muted} />
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={() => void confirmLogout()}>
        <Ionicons name="log-out-outline" size={20} color={volunteerColors.urgentRed} />
        <Text style={styles.signOutText}>{t('common.signOut')}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: volunteerColors.background },
  scrollContent: { paddingBottom: 110 },

  /* Header */
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { ...typography.h2, color: volunteerColors.ink },

  /* Profile Card */
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: volunteerColors.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: volunteerColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 3,
    borderColor: volunteerColors.orange,
  },
  avatarLargeText: { color: '#FFF', fontWeight: '800', fontSize: 24 },
  profileName: { ...typography.h2, color: volunteerColors.ink },
  profileEmail: { ...typography.body, color: volunteerColors.muted },

  verificationRow: { marginTop: 4 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: volunteerColors.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  verifiedText: { ...typography.caption, color: volunteerColors.green, fontWeight: '700' },

  /* Quick stats */
  quickStatsRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: volunteerColors.line,
  },
  quickStat: { flex: 1, alignItems: 'center', gap: 2 },
  quickStatValue: { ...typography.h3, color: volunteerColors.ink },
  quickStatLabel: { ...typography.caption, color: volunteerColors.muted },
  quickStatDivider: { width: 1, backgroundColor: volunteerColors.line },

  /* Tier progress */
  tierProgressBox: {
    width: '100%',
    marginTop: 14,
    backgroundColor: volunteerColors.surfaceAlt,
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
  },
  tierProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierProgressLabel: { ...typography.caption, color: volunteerColors.ink, fontWeight: '700' },
  tierProgressRemaining: { ...typography.caption, color: volunteerColors.orange, fontWeight: '700' },
  tierTrack: {
    height: 6,
    backgroundColor: '#E2DDD6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tierFill: { height: 6, borderRadius: 3 },
  tierProgressFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  tierFootCurrent: { fontSize: 10, color: volunteerColors.muted, fontWeight: '600' },
  tierFootNext: { fontSize: 10, color: volunteerColors.muted, fontWeight: '600' },

  /* Section Card */
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: volunteerColors.line,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { ...typography.bodyStrong, color: volunteerColors.ink, fontSize: 14 },
  sectionSubtitle: { ...typography.caption, color: volunteerColors.muted, fontSize: 11, marginTop: 1 },

  /* Level ladder */
  tierLadder: { gap: 0, marginTop: 4 },
  ladderItem: { flexDirection: 'row', gap: 10 },
  ladderRail: { width: 22, alignItems: 'center' },
  ladderDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: volunteerColors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: volunteerColors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ladderDotDone: { backgroundColor: volunteerColors.green, borderColor: volunteerColors.green },
  ladderDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  ladderDotNum: { fontSize: 10, color: volunteerColors.muted, fontWeight: '700' },
  ladderStem: { width: 2, height: 46, backgroundColor: volunteerColors.line, marginVertical: 2 },
  ladderStemDone: { backgroundColor: volunteerColors.green },

  ladderCard: {
    flex: 1,
    backgroundColor: volunteerColors.surfaceAlt,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: volunteerColors.line,
  },
  ladderCardCurrent: {
    backgroundColor: volunteerColors.orangeSoft,
    borderColor: volunteerColors.orange,
  },
  ladderCardDone: {
    backgroundColor: '#FFF',
  },
  ladderCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ladderIcon: { fontSize: 20 },
  ladderTitleGroup: { flex: 1 },
  ladderName: { ...typography.bodyStrong, color: volunteerColors.ink, fontSize: 13 },
  ladderNameCurrent: { color: volunteerColors.maroon, fontWeight: '800' },
  ladderReq: { ...typography.caption, color: volunteerColors.muted, fontSize: 11 },
  currentBadge: {
    backgroundColor: volunteerColors.orange,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  currentBadgeText: { fontSize: 10, color: '#FFF', fontWeight: '800' },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: volunteerColors.greenSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  completedBadgeText: { fontSize: 10, color: volunteerColors.green, fontWeight: '700' },

  /* Achievements Grid */
  achievementsGrid: { gap: 10 },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: volunteerColors.surfaceAlt,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: volunteerColors.line,
  },
  achievementCardLocked: { opacity: 0.65 },
  achievementIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementIconBoxLocked: { backgroundColor: volunteerColors.line },
  achievementEmoji: { fontSize: 22 },
  achievementInfo: { flex: 1, gap: 2 },
  achievementTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  achievementTitle: { ...typography.bodyStrong, color: volunteerColors.ink, fontSize: 13 },
  achievementTitleLocked: { color: volunteerColors.muted },
  achievementDesc: { ...typography.caption, color: volunteerColors.muted, fontSize: 11 },
  achEarnedPill: {
    backgroundColor: volunteerColors.orangeSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  achEarnedText: { fontSize: 10, color: volunteerColors.orange, fontWeight: '800' },
  achLockedPill: {
    backgroundColor: volunteerColors.line,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  achEarnedDate: { fontSize: 10, color: volunteerColors.green, fontWeight: '600', marginTop: 1 },

  /* Settings cards */
  settingsCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: volunteerColors.line,
  },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsTitle: { ...typography.bodyStrong, color: volunteerColors.ink },

  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: volunteerColors.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  vehicleChipActive: {
    backgroundColor: volunteerColors.maroonSoft,
    borderColor: volunteerColors.maroon,
  },
  vehicleLabel: {
    ...typography.caption,
    color: volunteerColors.muted,
    textTransform: 'capitalize',
  },
  vehicleLabelActive: { color: volunteerColors.maroon, fontWeight: '700' },

  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radiusChip: {
    borderColor: volunteerColors.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  radiusChipActive: {
    backgroundColor: volunteerColors.maroonSoft,
    borderColor: volunteerColors.maroon,
  },
  radiusText: { ...typography.caption, color: volunteerColors.muted },
  radiusTextActive: { color: volunteerColors.maroon, fontWeight: '700' },

  /* Save */
  saveSection: { paddingHorizontal: 16, marginTop: 14, gap: 8 },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  savedText: { ...typography.caption, color: volunteerColors.green },

  /* Menu */
  menuCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: volunteerColors.line,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLabel: { ...typography.body, color: volunteerColors.ink, flex: 1 },
  menuDivider: { height: 1, backgroundColor: volunteerColors.line, marginLeft: 48 },

  /* Sign out */
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: volunteerColors.urgentRedSoft,
    backgroundColor: volunteerColors.urgentRedSoft,
  },
  signOutText: { ...typography.bodyStrong, color: volunteerColors.urgentRed },
});
