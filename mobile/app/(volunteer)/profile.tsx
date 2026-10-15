import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { assignmentsApi } from '@/api/assignments.api';
import { pointsApi } from '@/api/points.api';
import { usersApi } from '@/api/users.api';
import { ProfileScreen } from '@/components/ProfileScreen';
import { Button } from '@/components/ui';
import { TRAVEL_RADIUS_OPTIONS_KM, VEHICLE_TYPES } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { useAuthStore } from '@/store/auth.store';
import { radius, typography } from '@/theme';
import { volunteerColors, getTier, KARMA_TIERS } from '@/theme/volunteer';
import type { TaskView, VehicleType } from '@/types';

interface VolunteerAchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  progressLabel: string;
  earnedDate?: string;
}

/** Milestones derived from the volunteer's real delivery history and karma. */
function buildAchievements(
  completed: TaskView[],
  deliveries: number,
  balance: number,
): VolunteerAchievementItem[] {
  const servings = completed.reduce((sum, task) => sum + task.donation.servings, 0);
  const firstDone = [...completed]
    .map((task) => task.assignment.completedAt)
    .filter(Boolean)
    .sort()[0];
  const rapid = completed.some((task) => {
    const { acceptedAt, completedAt } = task.assignment;
    return acceptedAt && completedAt
      ? new Date(completedAt).getTime() - new Date(acceptedAt).getTime() <= 20 * 60_000
      : false;
  });

  return [
    {
      id: 'first',
      title: 'First Mile Hero',
      description: 'Completed your first verified food rescue',
      icon: '🛡️',
      earned: deliveries >= 1,
      progressLabel: `${Math.min(deliveries, 1)}/1`,
      earnedDate: firstDone ? new Date(firstDone).toLocaleDateString() : undefined,
    },
    {
      id: 'rapid',
      title: 'Rapid Responder',
      description: 'Delivered within 20 minutes of accepting a task',
      icon: '⚡',
      earned: rapid,
      progressLabel: rapid ? 'Done' : 'Pending',
    },
    {
      id: 'champion',
      title: 'Community Champion',
      description: 'Delivered 250 servings to families and shelters',
      icon: '❤️',
      earned: servings >= 250,
      progressLabel: `${Math.min(servings, 250)}/250`,
    },
    {
      id: 'century',
      title: 'Century Rescuer',
      description: 'Complete 100 verified rescue missions',
      icon: '🏆',
      earned: deliveries >= 100,
      progressLabel: `${Math.min(deliveries, 100)}/100`,
    },
    {
      id: 'legend',
      title: 'Zero Waste Legend',
      description: 'Reach 2,500 Karma Points',
      icon: '👑',
      earned: balance >= 2500,
      progressLabel: `${Math.min(balance, 2500)}/2500`,
    },
  ];
}

/**
 * Volunteer profile — personal info, Karma Points balance, delivery count,
 * Level Progression System (Bronze -> Silver -> Gold -> Platinum -> Diamond),
 * Achievements & Badges, vehicle settings, and preferences.
 */
export default function VolunteerProfile() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const setUser = useAuthStore((state) => state.setUser);
  const pointsSummary = useOfflineQuery('volunteer.points', () => pointsApi.summary());
  const history = useQuery({
    queryKey: ['volunteer.history', 'all'],
    queryFn: () => assignmentsApi.history({ pageSize: 100 }),
  });
  const balance = pointsSummary.data?.balance ?? user?.karmaPoints ?? 0;
  const tier = getTier(balance);
  const completed = (history.data?.items ?? []).filter((task) => task.assignment.status === 'completed');
  const deliveryCount = user?.completedDeliveriesCount ?? completed.length;
  const achievements = buildAchievements(completed, deliveryCount, balance);

  const [vehicleType, setVehicleType] = useState<VehicleType>(user?.vehicleType ?? 'motorbike');
  const [travelRadiusKm, setTravelRadiusKm] = useState(user?.travelRadiusKm ?? 5);

  const save = useMutation({
    mutationFn: () => assignmentsApi.updateProfile({ vehicleType, travelRadiusKm }),
    async onSuccess() {
      setUser(await usersApi.me());
    },
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
    <ProfileScreen
      role="volunteer"
      menuItems={[
        {
          icon: 'document-text-outline',
          label: t('volunteer.deliveryHistory'),
          onPress: () => router.push('/(volunteer)/tasks'),
        },
        {
          icon: 'heart-outline',
          label: t('volunteer.communityImpact'),
          onPress: () => router.push('/(volunteer)/karma'),
        },
        {
          icon: 'alert-circle-outline',
          label: t('recipient.raiseConcern'),
          onPress: () => router.push('/(volunteer)/raise-concern'),
          danger: true,
        },
      ]}
    >
      <View style={styles.profileCard}>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{balance.toLocaleString()} KP</Text>
            <Text style={styles.quickStatLabel}>{t('volunteer.karma')}</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{deliveryCount}</Text>
            <Text style={styles.quickStatLabel}>{t('volunteer.deliveries')}</Text>
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
          {achievements.map((ach) => (
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
                      <Text style={styles.achEarnedText}>Unlocked</Text>
                    </View>
                  ) : (
                    <View style={styles.achLockedPill}>
                      <Ionicons name="lock-closed" size={10} color={volunteerColors.muted} />
                      <Text style={styles.achievementDesc}> {ach.progressLabel}</Text>
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
            <Text style={styles.savedText}>{t('volunteer.settingsSaved')}</Text>
          </View>
        )}
      </View>
    </ProfileScreen>
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
    marginHorizontal: 0,
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
    marginHorizontal: 0,
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
    marginHorizontal: 0,
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
  saveSection: { paddingHorizontal: 0, marginTop: 14, gap: 8 },
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
    marginHorizontal: 0,
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
    marginHorizontal: 0,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: volunteerColors.urgentRedSoft,
    backgroundColor: volunteerColors.urgentRedSoft,
  },
  signOutText: { ...typography.bodyStrong, color: volunteerColors.urgentRed },
});
