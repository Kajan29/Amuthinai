import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@tanstack/react-query';

import { assignmentsApi } from '@/api/assignments.api';
import { pointsApi } from '@/api/points.api';
import { Badge } from '@/components/ui';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { useAuth } from '@/hooks/useAuth';
import { radius, typography } from '@/theme';
import { volunteerColors, getTier, KARMA_TIERS } from '@/theme/volunteer';
import { formatDateTime } from '@/utils/date';

/** Same conversion factors the admin analytics use. */
const KG_PER_SERVING = 0.4;
const CO2_PER_KG = 2.5;

/** Longest run of consecutive calendar days (YYYY-MM-DD strings). */
function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of sorted) {
    const time = new Date(`${day}T00:00:00Z`).getTime();
    run = previous !== null && time - previous === 86_400_000 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = time;
  }
  return best;
}

/** Impact / Karma tab — progression, achievements, leaderboard, and karma history. */
export default function VolunteerKarma() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const summary = useOfflineQuery('volunteer.points', () => pointsApi.summary());
  const leaderboard = useOfflineQuery('points.leaderboard', () => pointsApi.leaderboard());
  const history = useQuery({
    queryKey: ['volunteer.history', 'all'],
    queryFn: () => assignmentsApi.history({ pageSize: 100 }),
  });

  const balance = summary.data?.balance ?? user?.karmaPoints ?? 0;
  const tier = getTier(balance);
  const rows = leaderboard.data ?? [];
  const entries = summary.data?.entries ?? [];

  const completed = (history.data?.items ?? []).filter((task) => task.assignment.status === 'completed');
  const deliveryCount = user?.completedDeliveriesCount ?? completed.length;
  const servingsDelivered = completed.reduce((sum, task) => sum + task.donation.servings, 0);
  const co2SavedKg = Math.round(servingsDelivered * KG_PER_SERVING * CO2_PER_KG);

  const days = completed
    .map((task) => task.assignment.completedAt?.slice(0, 10))
    .filter((day): day is string => Boolean(day));
  const perDay = days.reduce<Record<string, number>>((acc, day) => {
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});
  const bestDay = Math.max(0, ...Object.values(perDay));
  const streak = longestStreak(Object.keys(perDay));

  const achievements = [
    { icon: '🚀', label: 'First Delivery', description: 'Completed your first delivery', earned: deliveryCount >= 1 },
    { icon: '⚡', label: 'Speed Runner', description: '5 deliveries in one day', earned: bestDay >= 5 },
    { icon: '🔥', label: '10 Streak', description: '10 consecutive days active', earned: streak >= 10 },
    { icon: '🌟', label: 'Community Star', description: '50 deliveries completed', earned: deliveryCount >= 50 },
    { icon: '💪', label: 'Heavy Lifter', description: 'Delivered 500+ servings', earned: servingsDelivered >= 500 },
    { icon: '🏆', label: 'Legend', description: '100 deliveries completed', earned: deliveryCount >= 100 },
  ];

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
        <Text style={styles.headerTitle}>My Impact</Text>
        <Text style={styles.headerSubtitle}>Track your volunteer journey</Text>
      </View>

      {/* Karma Hero Card */}
      <View style={styles.karmaHero}>
        <View style={styles.karmaHeroInner}>
          {/* Tier icon */}
          <View style={[styles.tierCircle, { borderColor: tier.color }]}>
            <Text style={styles.tierEmoji}>{tier.icon}</Text>
          </View>

          {/* Points */}
          <Text style={styles.karmaBalance}>{balance.toLocaleString()}</Text>
          <Text style={styles.karmaLabel}>Karma Points</Text>

          {/* Tier & Rank badges */}
          <View style={styles.karmaBadgeRow}>
            <View style={[styles.tierBadge, { backgroundColor: tier.color + '22' }]}>
              <Text style={[styles.tierBadgeText, { color: tier.color }]}>{tier.icon} {tier.label}</Text>
            </View>
            {summary.data?.rank && (
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>Rank #{summary.data.rank}</Text>
              </View>
            )}
          </View>

          {/* Tier progress bar */}
          {tier.next && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressCurrent}>{tier.label}</Text>
                <Text style={styles.progressNext}>{tier.next.label}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${tier.progress * 100}%`, backgroundColor: tier.color }]} />
              </View>
              <Text style={styles.progressHint}>
                {tier.next.minPoints - balance} more points to {tier.next.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="bicycle-outline" size={24} color={volunteerColors.green} />
          <Text style={styles.statValue}>{deliveryCount}</Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people-outline" size={24} color={volunteerColors.maroon} />
          <Text style={styles.statValue}>{servingsDelivered}</Text>
          <Text style={styles.statLabel}>People Fed</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="leaf-outline" size={24} color={volunteerColors.orange} />
          <Text style={styles.statValue}>{co2SavedKg}kg</Text>
          <Text style={styles.statLabel}>CO₂ Saved</Text>
        </View>
      </View>

      {/* Tier Progression */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Level Progression</Text>
        <View style={styles.tierList}>
          {KARMA_TIERS.map((t, i) => {
            const isCurrentTier = i === tier.index;
            const isCompleted = i < tier.index;
            return (
              <View key={t.key} style={styles.tierRow}>
                <View style={styles.tierRail}>
                  <View
                    style={[
                      styles.tierDot,
                      isCompleted && { backgroundColor: volunteerColors.green },
                      isCurrentTier && { backgroundColor: t.color, borderWidth: 3, borderColor: t.color + '44', width: 20, height: 20, borderRadius: 10 },
                    ]}
                  />
                  {i < KARMA_TIERS.length - 1 && (
                    <View style={[styles.tierLine, isCompleted && { backgroundColor: volunteerColors.green }]} />
                  )}
                </View>
                <View style={[styles.tierInfo, isCurrentTier && styles.tierInfoCurrent]}>
                  <View style={styles.tierInfoHeader}>
                    <Text style={styles.tierIcon}>{t.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tierName, isCurrentTier && styles.tierNameCurrent]}>
                        {t.label}
                      </Text>
                      <Text style={styles.tierPoints}>{t.minPoints.toLocaleString()} pts</Text>
                    </View>
                    {isCompleted && <Ionicons name="checkmark-circle" size={18} color={volunteerColors.green} />}
                    {isCurrentTier && <Badge label="Current" tone="warning" />}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Achievements */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <Text style={styles.achievementCount}>
            {achievements.filter((a) => a.earned).length}/{achievements.length}
          </Text>
        </View>
        <View style={styles.achievementsGrid}>
          {achievements.map((achievement) => (
            <View
              key={achievement.label}
              style={[styles.achievementCard, !achievement.earned && styles.achievementLocked]}
            >
              <Text style={[styles.achievementIcon, !achievement.earned && styles.achievementIconLocked]}>
                {achievement.icon}
              </Text>
              <Text style={[styles.achievementLabel, !achievement.earned && styles.achievementLabelLocked]}>
                {achievement.label}
              </Text>
              <Text style={styles.achievementDesc}>{achievement.description}</Text>
              {!achievement.earned && (
                <View style={styles.lockOverlay}>
                  <Ionicons name="lock-closed" size={12} color={volunteerColors.muted} />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Leaderboard */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Top Volunteers</Text>
        {rows.length === 0 ? (
          <Text style={styles.emptyText}>
            {leaderboard.isLoading ? 'Leaderboard loading...' : 'No karma awarded yet'}
          </Text>
        ) : (
          rows.slice(0, 5).map((row, index) => {
            const isMe = row.userId === user?.id;
            const podium = index < 3;
            return (
              <View key={row.userId} style={[styles.leaderRow, isMe && styles.leaderRowMe]}>
                <View style={[styles.leaderRank, podium && styles.leaderRankPodium]}>
                  <Text style={[styles.leaderRankText, podium && styles.leaderRankTextPodium]}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={[styles.leaderName, isMe && styles.leaderNameMe]} numberOfLines={1}>
                  {row.name}
                  {isMe ? ' (You)' : ''}
                </Text>
                <View style={styles.leaderPointsBadge}>
                  <Text style={styles.leaderPoints}>{row.points.toLocaleString()}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Recent Karma History */}
      {entries.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {entries.slice(0, 5).map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <View style={styles.historyIconFrame}>
                <Ionicons
                  name={entry.points > 0 ? 'add-circle' : 'remove-circle'}
                  size={18}
                  color={entry.points > 0 ? volunteerColors.green : volunteerColors.urgentRed}
                />
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyReason}>{entry.reason}</Text>
                <Text style={styles.historyDate}>{formatDateTime(entry.awardedAt)}</Text>
              </View>
              <Text
                style={[
                  styles.historyPoints,
                  { color: entry.points > 0 ? volunteerColors.green : volunteerColors.urgentRed },
                ]}
              >
                {entry.points > 0 ? '+' : ''}{entry.points}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Bottom spacer */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: volunteerColors.background },
  scrollContent: { paddingBottom: 100 },

  /* Header */
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
  },
  headerTitle: { ...typography.h2, color: volunteerColors.ink },
  headerSubtitle: { ...typography.caption, color: volunteerColors.muted, marginTop: 2 },

  /* Karma Hero */
  karmaHero: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  karmaHeroInner: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: volunteerColors.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tierCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: volunteerColors.surfaceAlt,
  },
  tierEmoji: { fontSize: 28 },
  karmaBalance: {
    fontSize: 42,
    fontWeight: '800',
    color: volunteerColors.maroon,
  },
  karmaLabel: { ...typography.body, color: volunteerColors.muted },
  karmaBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tierBadgeText: { ...typography.caption, fontWeight: '700' },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: volunteerColors.infoBlueSoft,
  },
  rankBadgeText: { ...typography.caption, color: volunteerColors.infoBlue, fontWeight: '700' },

  /* Progress */
  progressSection: { width: '100%', marginTop: 8, gap: 6 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressCurrent: { ...typography.caption, color: volunteerColors.muted, fontWeight: '600' },
  progressNext: { ...typography.caption, color: volunteerColors.muted },
  progressTrack: {
    height: 6,
    backgroundColor: volunteerColors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: radius.pill },
  progressHint: { ...typography.caption, color: volunteerColors.muted, textAlign: 'center' },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: volunteerColors.line,
  },
  statValue: { ...typography.h3, color: volunteerColors.ink },
  statLabel: { ...typography.caption, color: volunteerColors.muted },

  /* Section Card */
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: volunteerColors.line,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { ...typography.h3, color: volunteerColors.ink },
  achievementCount: { ...typography.caption, color: volunteerColors.muted, fontWeight: '700' },

  /* Tier list */
  tierList: { gap: 0 },
  tierRow: { flexDirection: 'row', gap: 12 },
  tierRail: { alignItems: 'center', width: 20 },
  tierDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: volunteerColors.line,
    marginTop: 4,
  },
  tierLine: {
    width: 2,
    flex: 1,
    backgroundColor: volunteerColors.line,
    marginVertical: 2,
  },
  tierInfo: {
    flex: 1,
    paddingBottom: 14,
  },
  tierInfoCurrent: {
    backgroundColor: volunteerColors.orangeSoft,
    borderRadius: radius.md,
    padding: 8,
    marginBottom: 6,
  },
  tierInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierIcon: { fontSize: 18 },
  tierName: { ...typography.body, color: volunteerColors.ink },
  tierNameCurrent: { ...typography.bodyStrong, color: volunteerColors.maroon },
  tierPoints: { ...typography.caption, color: volunteerColors.muted },

  /* Achievements */
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  achievementCard: {
    flexBasis: '29%',
    flexGrow: 1,
    backgroundColor: volunteerColors.orangeSoft,
    borderRadius: radius.md,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  achievementLocked: {
    backgroundColor: volunteerColors.surfaceAlt,
    opacity: 0.6,
  },
  achievementIcon: { fontSize: 24 },
  achievementIconLocked: { opacity: 0.4 },
  achievementLabel: { ...typography.caption, color: volunteerColors.ink, fontWeight: '700', textAlign: 'center' },
  achievementLabelLocked: { color: volunteerColors.muted },
  achievementDesc: { ...typography.caption, color: volunteerColors.muted, fontSize: 9, textAlign: 'center' },
  lockOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
  },

  /* Leaderboard */
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
  },
  leaderRowMe: { backgroundColor: volunteerColors.greenSoft, borderRadius: radius.md, paddingHorizontal: 8 },
  leaderRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: volunteerColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderRankPodium: { backgroundColor: volunteerColors.orangeSoft },
  leaderRankText: { ...typography.caption, color: volunteerColors.muted, fontWeight: '700' },
  leaderRankTextPodium: { color: volunteerColors.orange },
  leaderName: { ...typography.body, color: volunteerColors.ink, flex: 1 },
  leaderNameMe: { color: volunteerColors.green, fontWeight: '700' },
  leaderPointsBadge: {
    backgroundColor: volunteerColors.greenSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  leaderPoints: { ...typography.caption, color: volunteerColors.green, fontWeight: '700' },

  /* History */
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: volunteerColors.line,
  },
  historyIconFrame: { width: 28, alignItems: 'center' },
  historyInfo: { flex: 1, gap: 2 },
  historyReason: { ...typography.body, color: volunteerColors.ink, fontSize: 13 },
  historyDate: { ...typography.caption, color: volunteerColors.muted },
  historyPoints: { ...typography.bodyStrong, fontSize: 14 },

  emptyText: { ...typography.body, color: volunteerColors.muted, textAlign: 'center', paddingVertical: 16 },
});
